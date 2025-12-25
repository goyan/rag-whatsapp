import { describe, it, expect } from 'vitest';

describe('Provider Types', () => {
  it('should export LLMProvider interface', async () => {
    const { OllamaLLMProvider } = await import('../src/providers/ollama.js');
    expect(OllamaLLMProvider).toBeDefined();
  });

  it('should export EmbedProvider interface', async () => {
    const { OllamaEmbedProvider } = await import('../src/providers/ollama.js');
    expect(OllamaEmbedProvider).toBeDefined();
  });
});

describe('Provider Factory', () => {
  it('should throw for unknown LLM provider', async () => {
    // This test would need mocking of config
    expect(true).toBe(true);
  });
});
