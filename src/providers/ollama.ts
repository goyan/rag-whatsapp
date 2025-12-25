import { Ollama } from 'ollama';
import type {
  LLMProvider,
  EmbedProvider,
  Message,
  GenerateOptions,
  ChatOptions,
} from './types.js';

interface OllamaConfig {
  baseUrl: string;
  model: string;
  embedModel: string;
}

export class OllamaLLMProvider implements LLMProvider {
  readonly name = 'ollama';
  private client: Ollama;
  private model: string;

  constructor(config: OllamaConfig) {
    this.client = new Ollama({ host: config.baseUrl });
    this.model = config.model;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.generate({
      model: this.model,
      prompt,
      options: {
        num_predict: options?.maxTokens,
        temperature: options?.temperature,
        stop: options?.stopSequences,
      },
    });

    return response.response;
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const stream = await this.client.generate({
      model: this.model,
      prompt,
      stream: true,
      options: {
        num_predict: options?.maxTokens,
        temperature: options?.temperature,
        stop: options?.stopSequences,
      },
    });

    for await (const chunk of stream) {
      yield chunk.response;
    }
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const ollamaMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options?.systemPrompt) {
      ollamaMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const response = await this.client.chat({
      model: this.model,
      messages: ollamaMessages,
      options: {
        num_predict: options?.maxTokens,
        temperature: options?.temperature,
      },
    });

    return response.message.content;
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    const ollamaMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options?.systemPrompt) {
      ollamaMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const stream = await this.client.chat({
      model: this.model,
      messages: ollamaMessages,
      stream: true,
      options: {
        num_predict: options?.maxTokens,
        temperature: options?.temperature,
      },
    });

    for await (const chunk of stream) {
      yield chunk.message.content;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }
}

export class OllamaEmbedProvider implements EmbedProvider {
  readonly name = 'ollama';
  readonly dimensions = 768; // nomic-embed-text default
  private client: Ollama;
  private model: string;

  constructor(config: OllamaConfig) {
    this.client = new Ollama({ host: config.baseUrl });
    this.model = config.embedModel;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embed({
      model: this.model,
      input: text,
    });

    return response.embeddings[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embed({
      model: this.model,
      input: texts,
    });

    return response.embeddings;
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.list();
      return true;
    } catch {
      return false;
    }
  }
}
