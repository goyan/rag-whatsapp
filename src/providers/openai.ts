import OpenAI from 'openai';
import type {
  LLMProvider,
  EmbedProvider,
  Message,
  GenerateOptions,
  ChatOptions,
} from './types.js';

interface OpenAIConfig {
  apiKey?: string;
  model: string;
  embedModel: string;
}

export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      stop: options?.stopSequences,
    });

    return response.choices[0]?.message?.content || '';
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      stop: options?.stopSequences,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options?.systemPrompt) {
      openaiMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
    });

    return response.choices[0]?.message?.content || '';
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    if (options?.systemPrompt) {
      openaiMessages.unshift({ role: 'system', content: options.systemPrompt });
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      max_tokens: options?.maxTokens,
      temperature: options?.temperature,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

export class OpenAIEmbedProvider implements EmbedProvider {
  readonly name = 'openai';
  readonly dimensions = 1536; // text-embedding-3-small default
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.model = config.embedModel;
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });

    return response.data.map((d) => d.embedding);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }
}
