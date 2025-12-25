/**
 * LLM Provider Interface
 * Unified interface for all LLM providers (Ollama, OpenAI, Claude)
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

export interface ChatOptions extends GenerateOptions {
  systemPrompt?: string;
}

export interface LLMProvider {
  readonly name: string;

  /**
   * Generate text from a prompt
   */
  generate(prompt: string, options?: GenerateOptions): Promise<string>;

  /**
   * Generate text with streaming
   */
  generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;

  /**
   * Chat with message history
   */
  chat(messages: Message[], options?: ChatOptions): Promise<string>;

  /**
   * Chat with streaming response
   */
  chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Embedding Provider Interface
 * Unified interface for embedding providers (Ollama, OpenAI)
 */
export interface EmbedProvider {
  readonly name: string;
  readonly dimensions: number;

  /**
   * Generate embedding for a single text
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for multiple texts (batch)
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Check if provider is available
   */
  isAvailable(): Promise<boolean>;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: string;
  available: boolean;
  latencyMs?: number;
  error?: string;
}
