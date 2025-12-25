import { describe, it, expect } from 'vitest';
import { chunkMessages, getChunkText, getChunkHeader } from '../src/core/chunker/temporal.js';
import type { ParsedMessage } from '../src/core/parser/types.js';

function createMessage(
  sender: string,
  content: string,
  timestamp: Date,
  type: 'text' | 'media' | 'system' | 'deleted' = 'text',
): ParsedMessage {
  return {
    id: `msg-${timestamp.getTime()}`,
    sender,
    content,
    timestamp,
    type,
    rawLine: `${timestamp.toISOString()} - ${sender}: ${content}`,
  };
}

describe('Temporal Chunker', () => {
  describe('Basic Chunking', () => {
    it('should create single chunk for continuous conversation', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Hello', new Date('2023-01-15T10:00:00')),
        createMessage('Jane', 'Hi John!', new Date('2023-01-15T10:01:00')),
        createMessage('John', 'How are you?', new Date('2023-01-15T10:02:00')),
      ];

      const result = chunkMessages(messages);

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].messages).toHaveLength(3);
      expect(result.chunks[0].participants.sort()).toEqual(['Jane', 'John']);
    });

    it('should split chunks based on time gap', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Morning!', new Date('2023-01-15T10:00:00')),
        createMessage('Jane', 'Hi!', new Date('2023-01-15T10:05:00')),
        createMessage('John', 'Great day!', new Date('2023-01-15T10:10:00')),
        // 2 hour gap
        createMessage('John', 'Afternoon!', new Date('2023-01-15T12:00:00')),
        createMessage('Jane', 'Hey!', new Date('2023-01-15T12:05:00')),
        createMessage('Jane', 'How are you?', new Date('2023-01-15T12:10:00')),
      ];

      const result = chunkMessages(messages, { gapMinutes: 30, minMessages: 3 });

      expect(result.chunks).toHaveLength(2);
      expect(result.chunks[0].messages).toHaveLength(3);
      expect(result.chunks[1].messages).toHaveLength(3);
    });

    it('should respect max messages limit', () => {
      const messages: ParsedMessage[] = [];
      const baseTime = new Date('2023-01-15T10:00:00');

      for (let i = 0; i < 15; i++) {
        messages.push(
          createMessage('User', `Message ${i}`, new Date(baseTime.getTime() + i * 60000)),
        );
      }

      const result = chunkMessages(messages, { maxMessages: 5, minMessages: 1 });

      expect(result.chunks).toHaveLength(3);
      expect(result.chunks[0].messages).toHaveLength(5);
      expect(result.chunks[1].messages).toHaveLength(5);
      expect(result.chunks[2].messages).toHaveLength(5);
    });
  });

  describe('Small Chunk Merging', () => {
    it('should merge chunks smaller than minMessages', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Hello', new Date('2023-01-15T10:00:00')),
        // 1 hour gap - would create chunk with 1 message
        createMessage('Jane', 'Hi', new Date('2023-01-15T11:00:00')),
        createMessage('Jane', 'How are you?', new Date('2023-01-15T11:01:00')),
        createMessage('Jane', 'Are you there?', new Date('2023-01-15T11:02:00')),
        createMessage('Jane', 'Hello?', new Date('2023-01-15T11:03:00')),
      ];

      const result = chunkMessages(messages, { gapMinutes: 30, minMessages: 3 });

      // Should merge the single message with the next chunk
      expect(result.chunks.length).toBeLessThanOrEqual(2);
      expect(result.metadata.totalMessages).toBe(5);
    });

    it('should handle all small chunks', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'A', new Date('2023-01-15T10:00:00')),
        createMessage('Jane', 'B', new Date('2023-01-15T11:00:00')),
      ];

      const result = chunkMessages(messages, { gapMinutes: 30, minMessages: 3 });

      // Should create single chunk even if all are small
      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].messages).toHaveLength(2);
    });
  });

  describe('Chunk Metadata', () => {
    it('should calculate correct time span', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Start', new Date('2023-01-15T10:00:00')),
        createMessage('Jane', 'Middle', new Date('2023-01-15T10:15:00')),
        createMessage('John', 'End', new Date('2023-01-15T10:30:00')),
      ];

      const result = chunkMessages(messages);

      expect(result.chunks[0].metadata.timeSpanMinutes).toBe(30);
    });

    it('should identify dominant participant', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'A', new Date('2023-01-15T10:00:00')),
        createMessage('John', 'B', new Date('2023-01-15T10:01:00')),
        createMessage('John', 'C', new Date('2023-01-15T10:02:00')),
        createMessage('Jane', 'D', new Date('2023-01-15T10:03:00')),
      ];

      const result = chunkMessages(messages);

      expect(result.chunks[0].metadata.dominantParticipant).toBe('John');
    });

    it('should track media presence', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Hello', new Date('2023-01-15T10:00:00'), 'text'),
        createMessage('Jane', 'Photo', new Date('2023-01-15T10:01:00'), 'media'),
        createMessage('John', 'Nice!', new Date('2023-01-15T10:02:00'), 'text'),
      ];

      const result = chunkMessages(messages);

      expect(result.chunks[0].metadata.hasMedia).toBe(true);
      expect(result.chunks[0].metadata.mediaCount).toBe(1);
    });
  });

  describe('Empty Input', () => {
    it('should handle empty messages array', () => {
      const result = chunkMessages([]);

      expect(result.chunks).toHaveLength(0);
      expect(result.metadata.totalChunks).toBe(0);
      expect(result.metadata.totalMessages).toBe(0);
      expect(result.metadata.averageChunkSize).toBe(0);
      expect(result.metadata.timeSpan.start).toBeNull();
      expect(result.metadata.timeSpan.end).toBeNull();
    });
  });

  describe('Message Sorting', () => {
    it('should sort messages by timestamp', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Third', new Date('2023-01-15T10:30:00')),
        createMessage('Jane', 'First', new Date('2023-01-15T10:00:00')),
        createMessage('John', 'Second', new Date('2023-01-15T10:15:00')),
      ];

      const result = chunkMessages(messages);

      expect(result.chunks[0].messages[0].content).toBe('First');
      expect(result.chunks[0].messages[1].content).toBe('Second');
      expect(result.chunks[0].messages[2].content).toBe('Third');
    });
  });

  describe('Chunk Helpers', () => {
    it('getChunkText should format messages correctly', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Hello', new Date('2023-01-15T10:00:00Z')),
        createMessage('Jane', 'Hi there!', new Date('2023-01-15T10:01:00Z')),
      ];

      const result = chunkMessages(messages);
      const text = getChunkText(result.chunks[0]);

      // Check format structure and content (timezone-independent)
      expect(text).toContain('John: Hello');
      expect(text).toContain('Jane: Hi there!');
      expect(text).toMatch(/\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] John: Hello/);
    });

    it('getChunkHeader should create summary', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'Hello', new Date('2023-01-15T10:00:00')),
        createMessage('Jane', 'Hi!', new Date('2023-01-15T10:30:00')),
      ];

      const result = chunkMessages(messages);
      const header = getChunkHeader(result.chunks[0]);

      expect(header).toContain('John');
      expect(header).toContain('Jane');
      expect(header).toContain('2 messages');
    });
  });

  describe('Result Metadata', () => {
    it('should calculate overall statistics', () => {
      const messages: ParsedMessage[] = [
        createMessage('John', 'A', new Date('2023-01-15T10:00:00')),
        createMessage('Jane', 'B', new Date('2023-01-15T10:01:00')),
        createMessage('John', 'C', new Date('2023-01-15T10:02:00')),
        // 2 hour gap
        createMessage('John', 'D', new Date('2023-01-15T12:00:00')),
        createMessage('Jane', 'E', new Date('2023-01-15T12:01:00')),
        createMessage('Jane', 'F', new Date('2023-01-15T12:02:00')),
      ];

      const result = chunkMessages(messages, { gapMinutes: 30, minMessages: 3 });

      expect(result.metadata.totalChunks).toBe(2);
      expect(result.metadata.totalMessages).toBe(6);
      expect(result.metadata.averageChunkSize).toBe(3);
      expect(result.metadata.timeSpan.start).toEqual(new Date('2023-01-15T10:00:00'));
      expect(result.metadata.timeSpan.end).toEqual(new Date('2023-01-15T12:02:00'));
    });
  });
});
