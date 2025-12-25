/**
 * RAG Retriever
 * Handles semantic search and context retrieval with hybrid keyword matching
 */

import { getEmbedProvider } from '../providers/index.js';
import { QdrantVectorStore } from '../storage/index.js';
import { getChunkText, getChunkHeader } from '../core/chunker/index.js';
import type { StoredChunk, VectorSearchOptions } from '../storage/types.js';
import type { QueryFilters, RetrievalResult, ChunkReference } from './types.js';

/**
 * Extract keywords from a query (with French contraction handling)
 */
function extractKeywords(query: string): string[] {
  const stopWords = new Set([
    'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'ou', 'à', 'au', 'aux',
    'ce', 'ces', 'on', 'qui', 'que', 'quoi', 'est', 'a', 'ont', 'sont', 'pour',
    'dans', 'sur', 'avec', 'par', 'en', 'quand', 'comment', 'pourquoi',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'about',
    'est-ce', "qu'on", "c'est", "n'est", "j'ai", "t'as",
  ]);

  // French contraction prefixes to remove
  const contractionPrefixes = ["d'", "l'", "j'", "m'", "t'", "s'", "n'", "c'", "qu'"];

  return query
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^\w\s'àâäéèêëïîôùûüç-]/g, ' ')
    .split(/\s+/)
    .flatMap(word => {
      // Handle French contractions: d'antibio -> antibio
      for (const prefix of contractionPrefixes) {
        if (word.startsWith(prefix)) {
          return [word.slice(prefix.length)];
        }
      }
      // Also split on apostrophe in middle: aujourd'hui -> aujourd, hui
      if (word.includes("'")) {
        return word.split("'").filter(w => w.length > 2);
      }
      return [word];
    })
    .filter(word => word.length > 2 && !stopWords.has(word));
}

/**
 * Check if chunk contains any of the keywords
 */
function chunkContainsKeywords(chunk: StoredChunk, keywords: string[]): { matches: boolean; count: number } {
  const text = chunk.messages
    .map(m => `${m.sender} ${m.content}`.toLowerCase())
    .join(' ');

  let count = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      count++;
    }
  }

  return { matches: count > 0, count };
}

export class Retriever {
  private vectorStore: QdrantVectorStore;

  constructor() {
    const embedProvider = getEmbedProvider();
    this.vectorStore = new QdrantVectorStore(embedProvider.dimensions);
  }

  async initialize(): Promise<void> {
    await this.vectorStore.initialize();
  }

  /**
   * Search for chunks containing specific keywords (fallback for short queries)
   */
  async keywordSearch(keywords: string[], limit: number = 10): Promise<StoredChunk[]> {
    const allChunks = await this.vectorStore.scrollAll();
    const matches: Array<{ chunk: StoredChunk; count: number }> = [];

    for (const chunk of allChunks) {
      const { matches: hasMatch, count } = chunkContainsKeywords(chunk, keywords);
      if (hasMatch) {
        matches.push({ chunk, count });
      }
    }

    // Sort by keyword count (most matches first)
    matches.sort((a, b) => b.count - a.count);

    return matches.slice(0, limit).map(m => m.chunk);
  }

  /**
   * Retrieve relevant chunks for a query using hybrid search
   */
  async retrieve(
    query: string,
    options: {
      topK?: number;
      minScore?: number;
      filters?: QueryFilters;
    } = {},
  ): Promise<RetrievalResult> {
    const { topK = 5, minScore = 0.4, filters } = options;

    // Extract keywords for hybrid matching
    const keywords = extractKeywords(query);

    // Generate query embedding
    const embedProvider = getEmbedProvider();
    const queryEmbedding = await embedProvider.embed(query);

    // Fetch more results for re-ranking (5x topK, min 25)
    const searchOptions: VectorSearchOptions = {
      topK: Math.max(topK * 5, 25),
      minScore: Math.max(minScore - 0.3, 0.2), // Lower threshold for initial fetch
      filter: filters ? {
        participants: filters.participants,
        dateRange: filters.dateRange,
        conversationId: filters.conversationId,
      } : undefined,
    };

    // Search vector store
    const results = await this.vectorStore.search(queryEmbedding, searchOptions);

    // Also do keyword search for short/specific queries
    let keywordChunks: StoredChunk[] = [];
    if (keywords.length > 0 && keywords.some(k => k.length >= 4)) {
      keywordChunks = await this.keywordSearch(keywords, 10);
    }

    // Merge results: create a map of chunk ID -> result
    const resultMap = new Map<string, { chunk: StoredChunk; score: number; hasKeywords: boolean }>();

    // Add semantic results
    for (const r of results) {
      const { matches, count } = chunkContainsKeywords(r.chunk, keywords);
      const keywordBoost = matches ? Math.min(0.2 * count, 0.5) : 0;
      resultMap.set(r.chunk.id, {
        chunk: r.chunk,
        score: Math.min(r.score + keywordBoost, 1.0),
        hasKeywords: matches,
      });
    }

    // Add keyword-only results with a base score
    for (const chunk of keywordChunks) {
      if (!resultMap.has(chunk.id)) {
        const { count } = chunkContainsKeywords(chunk, keywords);
        // Give keyword-only matches a base score of 0.6 + boost
        const score = Math.min(0.6 + 0.1 * count, 0.9);
        resultMap.set(chunk.id, {
          chunk,
          score,
          hasKeywords: true,
        });
      }
    }

    // Convert to array and sort
    const allResults = Array.from(resultMap.values());
    allResults.sort((a, b) => b.score - a.score);

    // Filter by minScore and take topK
    const filtered = allResults
      .filter((r) => r.score >= minScore)
      .slice(0, topK);

    return {
      chunks: filtered.map((r) => r.chunk),
      scores: filtered.map((r) => r.score),
    };
  }

  /**
   * Build context string from retrieved chunks
   */
  buildContext(chunks: StoredChunk[], maxLength: number = 8000): string {
    const contextParts: string[] = [];
    let currentLength = 0;

    for (const chunk of chunks) {
      const header = getChunkHeader(chunk);
      const text = getChunkText(chunk);
      const chunkContent = `### ${header}\n${text}\n`;

      if (currentLength + chunkContent.length > maxLength) {
        // Truncate if too long
        const remaining = maxLength - currentLength;
        if (remaining > 200) {
          contextParts.push(chunkContent.slice(0, remaining) + '...');
        }
        break;
      }

      contextParts.push(chunkContent);
      currentLength += chunkContent.length;
    }

    return contextParts.join('\n---\n\n');
  }

  /**
   * Convert chunks to references for response
   */
  toReferences(chunks: StoredChunk[], scores: number[]): ChunkReference[] {
    return chunks.map((chunk, i) => {
      // Get first few messages as preview
      const previewMessages = chunk.messages.slice(0, 3);
      const preview = previewMessages
        .map((m) => `${m.sender}: ${m.content.slice(0, 50)}${m.content.length > 50 ? '...' : ''}`)
        .join(' | ');

      return {
        chunkId: chunk.id,
        score: scores[i],
        participants: chunk.participants,
        timeRange: {
          start: chunk.startTime,
          end: chunk.endTime,
        },
        preview,
      };
    });
  }

  /**
   * Check if retriever is available
   */
  async isAvailable(): Promise<boolean> {
    return this.vectorStore.isAvailable();
  }
}

// Singleton
let retrieverInstance: Retriever | null = null;

export function getRetriever(): Retriever {
  if (!retrieverInstance) {
    retrieverInstance = new Retriever();
  }
  return retrieverInstance;
}
