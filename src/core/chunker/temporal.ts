/**
 * Temporal Chunker
 * Groups messages into conversational chunks based on time gaps
 */

import { randomUUID } from 'crypto';
import type { ParsedMessage } from '../parser/types.js';
import type { Chunk, ChunkerOptions, ChunkingResult, ChunkMetadata } from './types.js';

const DEFAULT_OPTIONS: Required<Omit<ChunkerOptions, 'conversationId'>> = {
  gapMinutes: 30,
  maxMessages: 50,
  minMessages: 3,
  maxChunkChars: 4000, // Safe for most embedding models (nomic-embed-text ~8k tokens)
};

/**
 * Chunk messages based on temporal gaps and size limits
 */
export function chunkMessages(
  messages: ParsedMessage[],
  options: ChunkerOptions = {},
): ChunkingResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const conversationId = opts.conversationId || randomUUID();

  if (messages.length === 0) {
    return {
      chunks: [],
      metadata: {
        totalChunks: 0,
        totalMessages: 0,
        averageChunkSize: 0,
        timeSpan: { start: null, end: null },
      },
    };
  }

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  const chunks: Chunk[] = [];
  let currentChunk: ParsedMessage[] = [];
  let currentChunkChars = 0;

  for (let i = 0; i < sortedMessages.length; i++) {
    const message = sortedMessages[i];
    const prevMessage = currentChunk.length > 0 ? currentChunk[currentChunk.length - 1] : null;
    const messageChars = getMessageCharCount(message);

    const shouldSplit = shouldStartNewChunk(
      message,
      prevMessage,
      currentChunk.length,
      currentChunkChars,
      messageChars,
      opts,
    );

    if (shouldSplit && currentChunk.length > 0) {
      chunks.push(createChunk(currentChunk, conversationId));
      currentChunk = [];
      currentChunkChars = 0;
    }

    currentChunk.push(message);
    currentChunkChars += messageChars;
  }

  if (currentChunk.length > 0) {
    chunks.push(createChunk(currentChunk, conversationId));
  }

  const mergedChunks = mergeSmallChunks(chunks, opts.minMessages, opts.maxChunkChars, conversationId);
  const totalMessages = mergedChunks.reduce((sum, c) => sum + c.messages.length, 0);

  return {
    chunks: mergedChunks,
    metadata: {
      totalChunks: mergedChunks.length,
      totalMessages,
      averageChunkSize: mergedChunks.length > 0 ? totalMessages / mergedChunks.length : 0,
      timeSpan: {
        start: sortedMessages[0]?.timestamp || null,
        end: sortedMessages[sortedMessages.length - 1]?.timestamp || null,
      },
    },
  };
}

/**
 * Calculate character count for a message (as it would appear in chunk text)
 */
function getMessageCharCount(message: ParsedMessage): number {
  // Format: [YYYY-MM-DD HH:MM] sender: content\n
  // ~20 chars for timestamp, ~2 for brackets, ~2 for ": ", ~1 for newline
  const overhead = 25;
  return overhead + (message.sender?.length || 0) + (message.content?.length || 0);
}

function shouldStartNewChunk(
  current: ParsedMessage,
  previous: ParsedMessage | null,
  currentChunkSize: number,
  currentChunkChars: number,
  newMessageChars: number,
  options: Required<Omit<ChunkerOptions, 'conversationId'>>,
): boolean {
  // Split if adding this message would exceed character limit
  if (currentChunkChars + newMessageChars > options.maxChunkChars) return true;
  // Split if max messages reached
  if (currentChunkSize >= options.maxMessages) return true;
  if (!previous) return false;

  const gapMs = current.timestamp.getTime() - previous.timestamp.getTime();
  const gapMinutes = gapMs / (1000 * 60);

  return gapMinutes >= options.gapMinutes;
}

function createChunk(messages: ParsedMessage[], conversationId: string): Chunk {
  const participants = [...new Set(messages.map((m) => m.sender).filter(Boolean))];
  const startTime = messages[0].timestamp;
  const endTime = messages[messages.length - 1].timestamp;
  const timeSpanMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

  const participantCounts = messages.reduce(
    (acc, m) => {
      if (m.sender) acc[m.sender] = (acc[m.sender] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const dominantParticipant = Object.entries(participantCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  const mediaMessages = messages.filter((m) => m.type === 'media');

  const metadata: ChunkMetadata = {
    messageCount: messages.length,
    conversationId,
    timeSpanMinutes: Math.round(timeSpanMinutes),
    dominantParticipant,
    hasMedia: mediaMessages.length > 0,
    mediaCount: mediaMessages.length,
  };

  return {
    id: randomUUID(),
    messages,
    participants,
    startTime,
    endTime,
    metadata,
  };
}

/**
 * Calculate total character count for a list of messages
 */
function getMessagesCharCount(messages: ParsedMessage[]): number {
  return messages.reduce((sum, m) => sum + getMessageCharCount(m), 0);
}

function mergeSmallChunks(
  chunks: Chunk[],
  minMessages: number,
  maxChunkChars: number,
  conversationId: string,
): Chunk[] {
  if (chunks.length <= 1) return chunks;

  const result: Chunk[] = [];
  let pendingMessages: ParsedMessage[] = [];
  let pendingChars = 0;

  for (const chunk of chunks) {
    const chunkChars = getMessagesCharCount(chunk.messages);

    if (chunk.messages.length >= minMessages) {
      if (pendingMessages.length > 0) {
        // Check if merging would exceed character limit
        if (pendingMessages.length < minMessages && pendingChars + chunkChars <= maxChunkChars) {
          const allMessages = [...pendingMessages, ...chunk.messages];
          result.push(createChunk(allMessages, conversationId));
        } else {
          result.push(createChunk(pendingMessages, conversationId));
          result.push(chunk);
        }
        pendingMessages = [];
        pendingChars = 0;
      } else {
        result.push(chunk);
      }
    } else {
      // Check if adding would exceed character limit
      if (pendingChars + chunkChars > maxChunkChars && pendingMessages.length > 0) {
        result.push(createChunk(pendingMessages, conversationId));
        pendingMessages = [];
        pendingChars = 0;
      }
      pendingMessages.push(...chunk.messages);
      pendingChars += chunkChars;
      if (pendingMessages.length >= minMessages) {
        result.push(createChunk(pendingMessages, conversationId));
        pendingMessages = [];
        pendingChars = 0;
      }
    }
  }

  if (pendingMessages.length > 0) {
    if (result.length > 0) {
      const lastChunk = result.pop()!;
      const lastChunkChars = getMessagesCharCount(lastChunk.messages);
      // Only merge if within character limit
      if (lastChunkChars + pendingChars <= maxChunkChars) {
        const allMessages = [...lastChunk.messages, ...pendingMessages];
        result.push(createChunk(allMessages, conversationId));
      } else {
        result.push(lastChunk);
        result.push(createChunk(pendingMessages, conversationId));
      }
    } else {
      result.push(createChunk(pendingMessages, conversationId));
    }
  }

  return result;
}

/**
 * Get text content from a chunk for embedding/summarization
 */
export function getChunkText(chunk: Chunk): string {
  return chunk.messages
    .filter((m) => m.type === 'text' || m.type === 'media')
    .map((m) => {
      const timestamp = m.timestamp.toISOString().slice(0, 16).replace('T', ' ');
      return `[${timestamp}] ${m.sender}: ${m.content}`;
    })
    .join('\n');
}

/**
 * Get a brief summary header for a chunk
 */
export function getChunkHeader(chunk: Chunk): string {
  const date = chunk.startTime.toLocaleDateString();
  const timeRange = `${chunk.startTime.toLocaleTimeString()} - ${chunk.endTime.toLocaleTimeString()}`;
  const participants = chunk.participants.slice(0, 3).join(', ');
  const more = chunk.participants.length > 3 ? ` +${chunk.participants.length - 3}` : '';

  return `${date} ${timeRange} | ${participants}${more} | ${chunk.metadata.messageCount} messages`;
}
