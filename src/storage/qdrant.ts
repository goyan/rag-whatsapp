/**
 * Qdrant Vector Store Implementation
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from '../config/index.js';
import type { VectorStore, StoredChunk, VectorSearchResult, VectorSearchOptions } from './types.js';

export class QdrantVectorStore implements VectorStore {
  private client: QdrantClient;
  private collection: string;
  private dimensions: number;

  constructor(dimensions: number = 768) {
    const url = new URL(config.qdrant.url);
    this.client = new QdrantClient({
      host: url.hostname,
      port: parseInt(url.port) || 6333,
    });
    this.collection = config.qdrant.collection;
    this.dimensions = dimensions;
  }

  async initialize(): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === this.collection);

    if (!exists) {
      await this.client.createCollection(this.collection, {
        vectors: {
          size: this.dimensions,
          distance: 'Cosine',
        },
      });

      // Create payload indexes for filtering
      await this.client.createPayloadIndex(this.collection, {
        field_name: 'conversationId',
        field_schema: 'keyword',
      });

      await this.client.createPayloadIndex(this.collection, {
        field_name: 'participants',
        field_schema: 'keyword',
      });

      await this.client.createPayloadIndex(this.collection, {
        field_name: 'startTime',
        field_schema: 'datetime',
      });
    }
  }

  async upsert(chunk: StoredChunk): Promise<void> {
    await this.client.upsert(this.collection, {
      wait: true,
      points: [this.chunkToPoint(chunk)],
    });
  }

  async upsertBatch(chunks: StoredChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const points = chunks.map((chunk) => this.chunkToPoint(chunk));

    // Batch in groups of 100
    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await this.client.upsert(this.collection, {
        wait: true,
        points: batch,
      });
    }
  }

  async search(
    embedding: number[],
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    const { topK = 5, minScore = 0.7, filter } = options;

    const must: Array<Record<string, unknown>> = [];

    if (filter?.participants && filter.participants.length > 0) {
      must.push({
        key: 'participants',
        match: { any: filter.participants },
      });
    }

    if (filter?.conversationId) {
      must.push({
        key: 'conversationId',
        match: { value: filter.conversationId },
      });
    }

    if (filter?.dateRange) {
      if (filter.dateRange.start) {
        must.push({
          key: 'startTime',
          range: { gte: filter.dateRange.start.toISOString() },
        });
      }
      if (filter.dateRange.end) {
        must.push({
          key: 'endTime',
          range: { lte: filter.dateRange.end.toISOString() },
        });
      }
    }

    const results = await this.client.search(this.collection, {
      vector: embedding,
      limit: topK,
      score_threshold: minScore,
      filter: must.length > 0 ? { must } : undefined,
      with_payload: true,
    });

    return results.map((result) => ({
      chunk: this.pointToChunk({
        id: result.id,
        payload: result.payload || {},
        vector: Array.isArray(result.vector) ? result.vector as number[] : undefined,
      }),
      score: result.score,
    }));
  }

  async deleteByConversation(conversationId: string): Promise<number> {
    const result = await this.client.delete(this.collection, {
      wait: true,
      filter: {
        must: [
          {
            key: 'conversationId',
            match: { value: conversationId },
          },
        ],
      },
    });

    return typeof result === 'object' && 'status' in result ? 1 : 0;
  }

  async getById(id: string): Promise<StoredChunk | null> {
    try {
      const results = await this.client.retrieve(this.collection, {
        ids: [id],
        with_payload: true,
        with_vector: true,
      });

      if (results.length === 0) return null;

      const point = results[0];
      return this.pointToChunk({
        id: point.id,
        payload: point.payload || {},
        vector: Array.isArray(point.vector) ? point.vector as number[] : undefined,
      });
    } catch {
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.getCollections();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Scroll through all chunks (for keyword search fallback)
   */
  async scrollAll(): Promise<StoredChunk[]> {
    const chunks: StoredChunk[] = [];
    let offset: string | number | null | undefined = undefined;

    while (true) {
      const result = await this.client.scroll(this.collection, {
        limit: 100,
        offset,
        with_payload: true,
      });

      for (const point of result.points) {
        chunks.push(this.pointToChunk({
          id: point.id,
          payload: point.payload || {},
        }));
      }

      if (!result.next_page_offset) {
        break;
      }
      offset = result.next_page_offset as string | number;
    }

    return chunks;
  }

  private chunkToPoint(chunk: StoredChunk) {
    return {
      id: chunk.id,
      vector: chunk.embedding,
      payload: {
        conversationId: chunk.metadata.conversationId,
        participants: chunk.participants,
        startTime: chunk.startTime.toISOString(),
        endTime: chunk.endTime.toISOString(),
        messageCount: chunk.metadata.messageCount,
        timeSpanMinutes: chunk.metadata.timeSpanMinutes,
        hasMedia: chunk.metadata.hasMedia,
        mediaCount: chunk.metadata.mediaCount,
        dominantParticipant: chunk.metadata.dominantParticipant,
        summary: chunk.summary,
        conversationName: chunk.conversationName,
        messages: chunk.messages.map((m) => ({
          id: m.id,
          timestamp: m.timestamp.toISOString(),
          sender: m.sender,
          content: m.content,
          type: m.type,
        })),
      },
    };
  }

  private pointToChunk(point: { id?: string | number; payload?: Record<string, unknown>; vector?: number[] }): StoredChunk {
    const payload = point.payload || {};
    const messages = (payload.messages as Array<Record<string, unknown>>) || [];

    return {
      id: String(point.id),
      embedding: (point.vector as number[]) || [],
      participants: (payload.participants as string[]) || [],
      startTime: new Date(payload.startTime as string),
      endTime: new Date(payload.endTime as string),
      summary: payload.summary as string | undefined,
      conversationName: payload.conversationName as string | undefined,
      messages: messages.map((m) => ({
        id: m.id as string,
        timestamp: new Date(m.timestamp as string),
        sender: m.sender as string,
        content: m.content as string,
        type: m.type as 'text' | 'media' | 'system' | 'deleted',
        rawLine: '',
      })),
      metadata: {
        conversationId: payload.conversationId as string,
        messageCount: payload.messageCount as number,
        timeSpanMinutes: payload.timeSpanMinutes as number,
        hasMedia: payload.hasMedia as boolean,
        mediaCount: payload.mediaCount as number,
        dominantParticipant: payload.dominantParticipant as string | undefined,
      },
    };
  }
}
