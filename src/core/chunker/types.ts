/**
 * Chunker Types
 * Types for grouping messages into conversational chunks
 */

import type { ParsedMessage } from '../parser/types.js';

export interface Chunk {
  id: string;
  messages: ParsedMessage[];
  participants: string[];
  startTime: Date;
  endTime: Date;
  summary?: string;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  messageCount: number;
  conversationId: string;
  timeSpanMinutes: number;
  dominantParticipant?: string;
  hasMedia: boolean;
  mediaCount: number;
}

export interface ChunkerOptions {
  /**
   * Maximum gap in minutes between messages before starting a new chunk
   * Default: 30
   */
  gapMinutes?: number;

  /**
   * Maximum number of messages per chunk
   * Default: 50
   */
  maxMessages?: number;

  /**
   * Minimum number of messages per chunk (will merge small chunks)
   * Default: 3
   */
  minMessages?: number;

  /**
   * Maximum characters per chunk (for embedding model context limits)
   * Default: 4000 (safe for most embedding models)
   */
  maxChunkChars?: number;

  /**
   * Conversation ID to assign to chunks
   */
  conversationId?: string;
}

export interface ChunkingResult {
  chunks: Chunk[];
  metadata: {
    totalChunks: number;
    totalMessages: number;
    averageChunkSize: number;
    timeSpan: {
      start: Date | null;
      end: Date | null;
    };
  };
}

/**
 * Statistics about chunk boundaries
 */
export interface ChunkBoundary {
  reason: 'time_gap' | 'max_messages' | 'end_of_input';
  gapMinutes?: number;
  messageCount: number;
}
