import { config } from '../config/index.js';
import type { LLMProvider, EmbedProvider, ProviderHealth } from './types.js';
import { OllamaLLMProvider, OllamaEmbedProvider } from './ollama.js';
import { OpenAILLMProvider, OpenAIEmbedProvider } from './openai.js';
import { ClaudeLLMProvider } from './claude.js';

/**
 * Create LLM provider based on configuration
 */
export function createLLMProvider(): LLMProvider {
  switch (config.llmProvider) {
    case 'ollama':
      return new OllamaLLMProvider(config.ollama);

    case 'openai':
      if (!config.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
      }
      return new OpenAILLMProvider(config.openai);

    case 'claude':
      if (!config.anthropic.apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=claude');
      }
      return new ClaudeLLMProvider(config.anthropic);

    default:
      throw new Error(`Unknown LLM provider: ${config.llmProvider}`);
  }
}

/**
 * Create embedding provider based on configuration
 */
export function createEmbedProvider(): EmbedProvider {
  switch (config.embedProvider) {
    case 'ollama':
      return new OllamaEmbedProvider(config.ollama);

    case 'openai':
      if (!config.openai.apiKey) {
        throw new Error('OPENAI_API_KEY is required when EMBED_PROVIDER=openai');
      }
      return new OpenAIEmbedProvider(config.openai);

    default:
      throw new Error(`Unknown embed provider: ${config.embedProvider}`);
  }
}

/**
 * Check health of all configured providers
 */
export async function checkProvidersHealth(): Promise<ProviderHealth[]> {
  const results: ProviderHealth[] = [];

  // Check LLM provider
  try {
    const llm = createLLMProvider();
    const start = Date.now();
    const available = await llm.isAvailable();
    results.push({
      provider: `llm:${llm.name}`,
      available,
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    results.push({
      provider: `llm:${config.llmProvider}`,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check embed provider
  try {
    const embed = createEmbedProvider();
    const start = Date.now();
    const available = await embed.isAvailable();
    results.push({
      provider: `embed:${embed.name}`,
      available,
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    results.push({
      provider: `embed:${config.embedProvider}`,
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return results;
}

// Singleton instances (lazy loaded)
let llmInstance: LLMProvider | null = null;
let embedInstance: EmbedProvider | null = null;

/**
 * Get LLM provider singleton
 */
export function getLLMProvider(): LLMProvider {
  if (!llmInstance) {
    llmInstance = createLLMProvider();
  }
  return llmInstance;
}

/**
 * Get embed provider singleton
 */
export function getEmbedProvider(): EmbedProvider {
  if (!embedInstance) {
    embedInstance = createEmbedProvider();
  }
  return embedInstance;
}

/**
 * Reset provider singletons (useful for testing)
 */
export function resetProviders(): void {
  llmInstance = null;
  embedInstance = null;
}
