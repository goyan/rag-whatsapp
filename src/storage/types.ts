/**
 * Storage Types
 */

import type { Chunk } from '../core/chunker/types.js';

export interface StoredChunk extends Chunk {
  embedding: number[];
  conversationName?: string;
}

export interface VectorSearchResult {
  chunk: StoredChunk;
  score: number;
}

export interface VectorSearchOptions {
  topK?: number;
  minScore?: number;
  filter?: {
    participants?: string[];
    dateRange?: {
      start?: Date;
      end?: Date;
    };
    conversationId?: string;
  };
}

export interface VectorStore {
  /**
   * Initialize the vector store (create collection if needed)
   */
  initialize(): Promise<void>;

  /**
   * Store a chunk with its embedding
   */
  upsert(chunk: StoredChunk): Promise<void>;

  /**
   * Store multiple chunks
   */
  upsertBatch(chunks: StoredChunk[]): Promise<void>;

  /**
   * Search for similar chunks
   */
  search(embedding: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;

  /**
   * Delete chunks by conversation ID
   */
  deleteByConversation(conversationId: string): Promise<number>;

  /**
   * Get chunk by ID
   */
  getById(id: string): Promise<StoredChunk | null>;

  /**
   * Check if store is available
   */
  isAvailable(): Promise<boolean>;
}
