import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, Message, GenerateOptions, ChatOptions } from './types.js';

interface ClaudeConfig {
  apiKey?: string;
  model: string;
}

export class ClaudeLLMProvider implements LLMProvider {
  readonly name = 'claude';
  private client: Anthropic;
  private model: string;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
      stop_sequences: options?.stopSequences,
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  async *generateStream(prompt: string, options?: GenerateOptions): AsyncIterable<string> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens || 1024,
      messages: [{ role: 'user', content: prompt }],
      stop_sequences: options?.stopSequences,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = messages.find((m) => m.role === 'system');
    const system = options?.systemPrompt || systemMessage?.content;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 1024,
      system,
      messages: anthropicMessages,
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : '';
  }

  async *chatStream(messages: Message[], options?: ChatOptions): AsyncIterable<string> {
    const anthropicMessages: Anthropic.MessageParam[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const systemMessage = messages.find((m) => m.role === 'system');
    const system = options?.systemPrompt || systemMessage?.content;

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: options?.maxTokens || 1024,
      system,
      messages: anthropicMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple check - try to create a minimal request
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
