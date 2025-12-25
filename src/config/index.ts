import { config as dotenvConfig } from 'dotenv';
import { ConfigSchema, type Config } from './schema.js';

// Load .env file
dotenvConfig();

function loadConfig(): Config {
  const env = process.env;

  const rawConfig = {
    port: env.PORT ? parseInt(env.PORT, 10) : 3000,
    nodeEnv: env.NODE_ENV || 'development',

    llmProvider: env.LLM_PROVIDER || 'ollama',
    embedProvider: env.EMBED_PROVIDER || 'ollama',

    ollama: {
      baseUrl: env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: env.OLLAMA_MODEL || 'mistral',
      embedModel: env.OLLAMA_EMBED_MODEL || 'nomic-embed-text',
    },

    openai: {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      embedModel: env.OPENAI_EMBED_MODEL || 'text-embedding-3-small',
    },

    anthropic: {
      apiKey: env.ANTHROPIC_API_KEY,
      model: env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    },

    qdrant: {
      url: env.QDRANT_URL || 'http://localhost:6333',
      collection: env.QDRANT_COLLECTION || 'whatsapp_chunks',
    },

    redis: {
      url: env.REDIS_URL || 'redis://localhost:6379',
    },

    database: {
      path: env.DATABASE_PATH || './data/metadata.db',
    },

    rag: {
      chunkGapMinutes: env.CHUNK_GAP_MINUTES ? parseInt(env.CHUNK_GAP_MINUTES, 10) : 30,
      chunkMaxMessages: env.CHUNK_MAX_MESSAGES ? parseInt(env.CHUNK_MAX_MESSAGES, 10) : 100,
      retrievalTopK: env.RETRIEVAL_TOP_K ? parseInt(env.RETRIEVAL_TOP_K, 10) : 5,
      retrievalMinScore: env.RETRIEVAL_MIN_SCORE ? parseFloat(env.RETRIEVAL_MIN_SCORE) : 0.7,
    },

    agents: {
      maxConcurrent: env.AGENT_MAX_CONCURRENT ? parseInt(env.AGENT_MAX_CONCURRENT, 10) : 3,
    },
  };

  const result = ConfigSchema.safeParse(rawConfig);

  if (!result.success) {
    console.error('Configuration validation failed:');
    console.error(result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export const config = loadConfig();

export function validateProviderConfig(): void {
  const { llmProvider, embedProvider, openai, anthropic } = config;

  if (llmProvider === 'openai' && !openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
  }

  if (llmProvider === 'claude' && !anthropic.apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=claude');
  }

  if (embedProvider === 'openai' && !openai.apiKey) {
    throw new Error('OPENAI_API_KEY is required when EMBED_PROVIDER=openai');
  }
}

export * from './schema.js';
