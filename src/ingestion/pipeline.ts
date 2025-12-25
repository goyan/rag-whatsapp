/**
 * Ingestion Pipeline
 * Orchestrates the process of ingesting WhatsApp exports
 */

import { nanoid } from 'nanoid';
import { parseWhatsAppFile } from '../core/parser/index.js';
import { chunkMessages, getChunkText } from '../core/chunker/index.js';
import { getEmbedProvider, getLLMProvider } from '../providers/index.js';
import { QdrantVectorStore } from '../storage/index.js';
import type { StoredChunk } from '../storage/types.js';
import type {
  IngestionOptions,
  IngestionProgress,
  IngestionResult,
} from './types.js';

const DEFAULT_OPTIONS: Required<IngestionOptions> = {
  chunkGapMinutes: 30,
  chunkMaxMessages: 50,
  chunkMaxChars: 4000,
  generateSummaries: false,
  includeSystemMessages: true,
  includeDeletedMessages: false,
};

export class IngestionPipeline {
  private vectorStore: QdrantVectorStore;
  private progress: Map<string, IngestionProgress> = new Map();

  constructor() {
    const embedProvider = getEmbedProvider();
    this.vectorStore = new QdrantVectorStore(embedProvider.dimensions);
  }

  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
  }

  /**
   * Ingest a WhatsApp export file
   */
  async ingest(
    filePath: string,
    conversationName?: string,
    options: IngestionOptions = {},
  ): Promise<IngestionResult> {
    const jobId = nanoid();
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    this.updateProgress(jobId, { status: 'pending', startedAt: new Date() });

    try {
      // Step 1: Parse the file
      this.updateProgress(jobId, { status: 'parsing' });
      const parsed = await parseWhatsAppFile(filePath, {
        includeSystemMessages: opts.includeSystemMessages,
        includeDeletedMessages: opts.includeDeletedMessages,
      });

      this.updateProgress(jobId, { totalMessages: parsed.metadata.totalMessages });

      // Step 2: Chunk the messages
      this.updateProgress(jobId, { status: 'chunking' });
      const chunked = chunkMessages(parsed.messages, {
        gapMinutes: opts.chunkGapMinutes,
        maxMessages: opts.chunkMaxMessages,
        maxChunkChars: opts.chunkMaxChars,
      });

      this.updateProgress(jobId, { totalChunks: chunked.chunks.length });

      // Step 3: Generate embeddings
      this.updateProgress(jobId, { status: 'embedding' });
      const embedProvider = getEmbedProvider();

      const storedChunks: StoredChunk[] = [];

      // Process in batches for embedding
      const batchSize = 10;
      const maxEmbedChars = 6000; // Safe limit for most embedding models

      for (let i = 0; i < chunked.chunks.length; i += batchSize) {
        const batch = chunked.chunks.slice(i, i + batchSize);
        const texts = batch.map((chunk) => {
          const text = getChunkText(chunk);
          // Truncate text if it exceeds embedding model's context limit
          return text.length > maxEmbedChars ? text.slice(0, maxEmbedChars) + '...' : text;
        });

        const embeddings = await embedProvider.embedBatch(texts);

        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          let summary: string | undefined;

          // Generate summary if enabled
          if (opts.generateSummaries) {
            summary = await this.generateSummary(texts[j]);
          }

          storedChunks.push({
            ...chunk,
            embedding: embeddings[j],
            summary,
            conversationName,
          });
        }

        this.updateProgress(jobId, { processedChunks: i + batch.length });
      }

      // Step 4: Store in vector database
      this.updateProgress(jobId, { status: 'storing' });
      await this.vectorStore.upsertBatch(storedChunks);

      // Complete
      const duration = Date.now() - startTime;
      this.updateProgress(jobId, {
        status: 'completed',
        completedAt: new Date(),
      });

      return {
        jobId,
        conversationId: chunked.chunks[0]?.metadata.conversationId || nanoid(),
        conversationName,
        totalMessages: parsed.metadata.totalMessages,
        totalChunks: chunked.chunks.length,
        participants: parsed.participants,
        dateRange: {
          start: parsed.startDate,
          end: parsed.endDate,
        },
        duration,
      };
    } catch (error) {
      this.updateProgress(jobId, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });
      throw error;
    }
  }

  /**
   * Get progress for a job
   */
  getProgress(jobId: string): IngestionProgress | null {
    return this.progress.get(jobId) || null;
  }

  /**
   * Generate a summary for chunk text
   */
  private async generateSummary(text: string): Promise<string> {
    const llm = getLLMProvider();
    const prompt = `Summarize this conversation excerpt in 1-2 sentences. Focus on the main topics discussed:\n\n${text}\n\nSummary:`;

    try {
      return await llm.generate(prompt, { maxTokens: 100, temperature: 0.3 });
    } catch {
      return '';
    }
  }

  private updateProgress(jobId: string, update: Partial<IngestionProgress>): void {
    const current = this.progress.get(jobId) || { jobId, status: 'pending' as const };
    this.progress.set(jobId, { ...current, ...update });
  }
}

// Singleton instance
let pipelineInstance: IngestionPipeline | null = null;

export function getIngestionPipeline(): IngestionPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new IngestionPipeline();
  }
  return pipelineInstance;
}
