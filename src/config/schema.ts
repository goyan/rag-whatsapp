import { z } from 'zod';

export const LLMProviderSchema = z.enum(['ollama', 'openai', 'claude']);
export const EmbedProviderSchema = z.enum(['ollama', 'openai']);

export type LLMProvider = z.infer<typeof LLMProviderSchema>;
export type EmbedProvider = z.infer<typeof EmbedProviderSchema>;

export const ConfigSchema = z.object({
  // Server
  port: z.number().default(3000),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  // Providers
  llmProvider: LLMProviderSchema.default('ollama'),
  embedProvider: EmbedProviderSchema.default('ollama'),

  // Ollama
  ollama: z.object({
    baseUrl: z.string().url().default('http://localhost:11434'),
    model: z.string().default('mistral'),
    embedModel: z.string().default('nomic-embed-text'),
  }),

  // OpenAI
  openai: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('gpt-4o-mini'),
    embedModel: z.string().default('text-embedding-3-small'),
  }),

  // Anthropic
  anthropic: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('claude-sonnet-4-20250514'),
  }),

  // Qdrant
  qdrant: z.object({
    url: z.string().url().default('http://localhost:6333'),
    collection: z.string().default('whatsapp_chunks'),
  }),

  // Redis
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
  }),

  // Database
  database: z.object({
    path: z.string().default('./data/metadata.db'),
  }),

  // RAG Settings
  rag: z.object({
    chunkGapMinutes: z.number().default(30),
    chunkMaxMessages: z.number().default(100),
    retrievalTopK: z.number().default(5),
    retrievalMinScore: z.number().default(0.7),
  }),

  // Agents
  agents: z.object({
    maxConcurrent: z.number().default(3),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
