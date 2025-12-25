/**
 * Serve Command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { startServer } from '../../api/index.js';
import { config } from '../../config/index.js';

export const serveCommand = new Command('serve')
  .description('Start the API server')
  .option('-p, --port <port>', 'Port to listen on', String(config.port))
  .action(async (options) => {
    console.log(chalk.bold('Starting RAG WhatsApp Server...'));
    console.log('');
    console.log(`  LLM Provider: ${chalk.cyan(config.llmProvider)}`);
    console.log(`  Embed Provider: ${chalk.cyan(config.embedProvider)}`);
    console.log(`  Environment: ${chalk.yellow(config.nodeEnv)}`);
    console.log('');

    // Override port if specified
    if (options.port) {
      process.env.PORT = options.port;
    }

    await startServer();

    console.log('');
    console.log(chalk.green('Server is ready!'));
    console.log('');
    console.log('Endpoints:');
    console.log(`  ${chalk.cyan('POST')} /api/query     - Query conversations`);
    console.log(`  ${chalk.cyan('POST')} /api/ingest    - Ingest WhatsApp export`);
    console.log(`  ${chalk.cyan('GET')}  /health        - Health check`);
    console.log(`  ${chalk.cyan('WS')}   /api/query/stream - Streaming queries`);
    console.log('');
  });
