/**
 * RAG Types
 */

import type { StoredChunk } from '../storage/types.js';

export interface QueryRequest {
  question: string;
  filters?: QueryFilters;
  options?: QueryOptions;
}

export interface QueryFilters {
  participants?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  conversationId?: string;
}

export interface QueryOptions {
  /**
   * Number of chunks to retrieve
   */
  topK?: number;

  /**
   * Minimum similarity score
   */
  minScore?: number;

  /**
   * Whether to use the ReAct agent for complex queries
   */
  useAgent?: boolean;

  /**
   * Whether to include sources in response
   */
  includeSources?: boolean;

  /**
   * Maximum tokens for response
   */
  maxTokens?: number;

  /**
   * Temperature for generation
   */
  temperature?: number;
}

export interface ChunkReference {
  chunkId: string;
  score: number;
  participants: string[];
  timeRange: {
    start: Date;
    end: Date;
  };
  preview: string;
}

export interface QueryResponse {
  answer: string;
  sources: ChunkReference[];
  reasoning?: string[];
  metadata: {
    queryTime: number;
    chunksRetrieved: number;
    tokensUsed?: number;
  };
}

export interface RetrievalResult {
  chunks: StoredChunk[];
  scores: number[];
}

/**
 * Prompts for RAG
 */
export const RAG_PROMPTS = {
  system: `You are a helpful assistant that answers questions about WhatsApp conversations.
You have access to conversation excerpts that may contain relevant information.
Always base your answers on the provided context. If the context doesn't contain enough information to answer the question, say so.
Be concise and direct in your responses.
IMPORTANT: Respond in the SAME LANGUAGE as the user's question.
Names like Romane, Agnès, Hervé are PEOPLE in the conversations, not objects.`,

  query: (question: string, context: string) => `Based on the following conversation excerpts, answer the question.

## Conversation Context
${context}

## Question
${question}

## Instructions
- RESPOND IN THE SAME LANGUAGE AS THE QUESTION
- Answer based ONLY on the provided context
- If the answer is not in the context, say you couldn't find this information
- Include relevant details like dates, names, and specific messages when applicable
- Names mentioned are PEOPLE (e.g., Romane, Agnès, Hervé are persons)
- Be concise but complete

## Answer`,

  summarize: (text: string) => `Summarize this conversation excerpt in 1-2 sentences. Focus on the main topics discussed:

${text}

Summary:`,
};
