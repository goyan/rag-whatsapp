/**
 * Ingest Command
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getIngestionPipeline } from '../../ingestion/index.js';

export const ingestCommand = new Command('ingest')
  .description('Ingest a WhatsApp export file')
  .argument('<file>', 'Path to WhatsApp export file (.txt)')
  .option('-n, --name <name>', 'Conversation name')
  .option('-g, --gap <minutes>', 'Gap between chunks in minutes', '30')
  .option('-m, --max <messages>', 'Max messages per chunk', '100')
  .option('-s, --summaries', 'Generate summaries for chunks')
  .option('--include-system', 'Include system messages')
  .option('--include-deleted', 'Include deleted messages')
  .action(async (file, options) => {
    const spinner = ora('Initializing...').start();

    try {
      const pipeline = getIngestionPipeline();
      await pipeline.initialize();
      spinner.text = 'Ingesting file...';

      const result = await pipeline.ingest(file, options.name, {
        chunkGapMinutes: parseInt(options.gap, 10),
        chunkMaxMessages: parseInt(options.max, 10),
        generateSummaries: options.summaries || false,
        includeSystemMessages: options.includeSystem || false,
        includeDeletedMessages: options.includeDeleted || false,
      });

      spinner.succeed('Ingestion complete!');

      console.log('');
      console.log(chalk.bold('Results:'));
      console.log(`  Conversation ID: ${chalk.cyan(result.conversationId)}`);
      if (result.conversationName) {
        console.log(`  Name: ${chalk.cyan(result.conversationName)}`);
      }
      console.log(`  Messages: ${chalk.green(result.totalMessages)}`);
      console.log(`  Chunks: ${chalk.green(result.totalChunks)}`);
      console.log(`  Participants: ${chalk.yellow(result.participants.join(', '))}`);

      if (result.dateRange.start && result.dateRange.end) {
        console.log(`  Date range: ${result.dateRange.start.toLocaleDateString()} - ${result.dateRange.end.toLocaleDateString()}`);
      }

      console.log(`  Duration: ${chalk.dim((result.duration / 1000).toFixed(2) + 's')}`);
    } catch (error) {
      spinner.fail('Ingestion failed');
      if (error instanceof Error) {
        console.error(chalk.red(error.message));
        if (error.stack) {
          console.error(chalk.dim(error.stack));
        }
      } else {
        console.error(chalk.red('Unknown error'), error);
      }
      process.exit(1);
    }
  });
