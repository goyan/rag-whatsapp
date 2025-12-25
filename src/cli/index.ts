/**
 * CLI Entry Point
 */

import { Command } from 'commander';
import { ingestCommand } from './commands/ingest.js';
import { queryCommand } from './commands/query.js';
import { serveCommand } from './commands/serve.js';

const program = new Command();

program
  .name('rag-whatsapp')
  .description('RAG system for querying WhatsApp chat history')
  .version('0.1.0');

program.addCommand(ingestCommand);
program.addCommand(queryCommand);
program.addCommand(serveCommand);

export { program };
