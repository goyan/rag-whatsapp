import { config } from './config/index.js';
import { checkProvidersHealth } from './providers/index.js';

async function main() {
  console.log('RAG WhatsApp System');
  console.log('===================');
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`LLM Provider: ${config.llmProvider}`);
  console.log(`Embed Provider: ${config.embedProvider}`);
  console.log('');

  console.log('Checking providers health...');
  const health = await checkProvidersHealth();

  for (const h of health) {
    const status = h.available ? '✓' : '✗';
    const latency = h.latencyMs ? ` (${h.latencyMs}ms)` : '';
    const error = h.error ? ` - ${h.error}` : '';
    console.log(`  ${status} ${h.provider}${latency}${error}`);
  }

  console.log('');
  console.log('Ready to start server on port', config.port);
}

main().catch(console.error);
