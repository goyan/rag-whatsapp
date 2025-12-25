/**
 * RAG Generator
 * Generates responses using retrieved context
 */

import { getLLMProvider } from '../providers/index.js';
import { getRetriever, Retriever } from './retriever.js';
import type { QueryRequest, QueryResponse, ChunkReference } from './types.js';
import { RAG_PROMPTS } from './types.js';

export class Generator {
  private retriever: Retriever;

  constructor() {
    this.retriever = getRetriever();
  }

  async initialize(): Promise<void> {
    await this.retriever.initialize();
  }

  /**
   * Generate a response for a query
   */
  async query(request: QueryRequest): Promise<QueryResponse> {
    const startTime = Date.now();
    const {
      question,
      filters,
      options = {},
    } = request;

    const {
      topK = 5,
      minScore = 0.5,
      includeSources = true,
      maxTokens = 500,
      temperature = 0.7,
    } = options;

    // Step 1: Retrieve relevant chunks
    const { chunks, scores } = await this.retriever.retrieve(question, {
      topK,
      minScore,
      filters,
    });

    // Handle no results
    if (chunks.length === 0) {
      return {
        answer: "I couldn't find any relevant information in the conversations for your question.",
        sources: [],
        metadata: {
          queryTime: Date.now() - startTime,
          chunksRetrieved: 0,
        },
      };
    }

    // Step 2: Build context
    const context = this.retriever.buildContext(chunks);

    // Step 3: Generate response
    const llm = getLLMProvider();
    const prompt = RAG_PROMPTS.query(question, context);

    const answer = await llm.chat(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: RAG_PROMPTS.system,
        maxTokens,
        temperature,
      },
    );

    // Build references
    const sources: ChunkReference[] = includeSources
      ? this.retriever.toReferences(chunks, scores)
      : [];

    return {
      answer: answer.trim(),
      sources,
      metadata: {
        queryTime: Date.now() - startTime,
        chunksRetrieved: chunks.length,
      },
    };
  }

  /**
   * Stream a response for a query
   */
  async *queryStream(request: QueryRequest): AsyncIterable<string> {
    const {
      question,
      filters,
      options = {},
    } = request;

    const {
      topK = 5,
      minScore = 0.5,
      maxTokens = 500,
      temperature = 0.7,
    } = options;

    // Retrieve chunks
    const { chunks } = await this.retriever.retrieve(question, {
      topK,
      minScore,
      filters,
    });

    if (chunks.length === 0) {
      yield "I couldn't find any relevant information in the conversations for your question.";
      return;
    }

    // Build context and generate
    const context = this.retriever.buildContext(chunks);
    const llm = getLLMProvider();
    const prompt = RAG_PROMPTS.query(question, context);

    for await (const token of llm.chatStream(
      [{ role: 'user', content: prompt }],
      {
        systemPrompt: RAG_PROMPTS.system,
        maxTokens,
        temperature,
      },
    )) {
      yield token;
    }
  }

  /**
   * Check if generator is available
   */
  async isAvailable(): Promise<boolean> {
    const llm = getLLMProvider();
    const retrieverAvailable = await this.retriever.isAvailable();
    const llmAvailable = await llm.isAvailable();
    return retrieverAvailable && llmAvailable;
  }
}

// Singleton
let generatorInstance: Generator | null = null;

export function getGenerator(): Generator {
  if (!generatorInstance) {
    generatorInstance = new Generator();
  }
  return generatorInstance;
}
