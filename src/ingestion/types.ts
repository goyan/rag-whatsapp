/**
 * Ingestion Pipeline Types
 */

export interface IngestionJob {
  id: string;
  filePath: string;
  conversationName?: string;
  options?: IngestionOptions;
}

export interface IngestionOptions {
  /**
   * Gap in minutes between messages to start new chunk
   */
  chunkGapMinutes?: number;

  /**
   * Maximum messages per chunk
   */
  chunkMaxMessages?: number;

  /**
   * Maximum characters per chunk (for embedding model context limits)
   * Default: 4000
   */
  chunkMaxChars?: number;

  /**
   * Whether to generate summaries for chunks
   */
  generateSummaries?: boolean;

  /**
   * Include system messages
   */
  includeSystemMessages?: boolean;

  /**
   * Include deleted message placeholders
   */
  includeDeletedMessages?: boolean;
}

export interface IngestionProgress {
  jobId: string;
  status: 'pending' | 'parsing' | 'chunking' | 'embedding' | 'storing' | 'completed' | 'failed';
  totalMessages?: number;
  totalChunks?: number;
  processedChunks?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IngestionResult {
  jobId: string;
  conversationId: string;
  conversationName?: string;
  totalMessages: number;
  totalChunks: number;
  participants: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  duration: number;
}
