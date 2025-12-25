/**
 * Query Command
 */

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getGenerator, getReActAgent } from '../../rag/index.js';

export const queryCommand = new Command('query')
  .description('Query your WhatsApp conversations')
  .argument('<question>', 'Question to ask')
  .option('-a, --agent', 'Use ReAct agent for complex queries')
  .option('-k, --topk <n>', 'Number of chunks to retrieve', '5')
  .option('-s, --score <n>', 'Minimum similarity score', '0.7')
  .option('-p, --participant <name>', 'Filter by participant')
  .option('--no-sources', 'Hide sources in output')
  .option('--stream', 'Stream the response')
  .action(async (question, options) => {
    const spinner = ora('Thinking...').start();

    try {
      const generator = getGenerator();
      await generator.initialize();

      if (options.stream && !options.agent) {
        spinner.stop();
        process.stdout.write(chalk.cyan('Answer: '));

        for await (const token of generator.queryStream({
          question,
          filters: options.participant ? { participants: [options.participant] } : undefined,
          options: {
            topK: parseInt(options.topk, 10),
            minScore: parseFloat(options.score),
          },
        })) {
          process.stdout.write(token);
        }

        console.log('\n');
        return;
      }

      let result;

      if (options.agent) {
        spinner.text = 'Agent reasoning...';
        const agent = getReActAgent();
        result = await agent.run(
          question,
          options.participant ? { participants: [options.participant] } : undefined,
        );
      } else {
        result = await generator.query({
          question,
          filters: options.participant ? { participants: [options.participant] } : undefined,
          options: {
            topK: parseInt(options.topk, 10),
            minScore: parseFloat(options.score),
            includeSources: options.sources,
          },
        });
      }

      spinner.stop();

      console.log('');
      console.log(chalk.bold.cyan('Answer:'));
      console.log(result.answer);
      console.log('');

      // Show reasoning if using agent
      if (options.agent && result.reasoning && result.reasoning.length > 0) {
        console.log(chalk.bold.yellow('Reasoning:'));
        result.reasoning.forEach((step, i) => {
          console.log(chalk.dim(`${i + 1}. ${step.split('\n')[0]}`));
        });
        console.log('');
      }

      // Show sources
      if (options.sources && result.sources.length > 0) {
        console.log(chalk.bold.green('Sources:'));
        result.sources.forEach((source, i) => {
          const date = source.timeRange.start.toLocaleDateString();
          console.log(chalk.dim(`${i + 1}. [${date}] ${source.participants.join(', ')} (score: ${source.score.toFixed(2)})`));
          console.log(chalk.dim(`   ${source.preview}`));
        });
        console.log('');
      }

      console.log(chalk.dim(`Query time: ${result.metadata.queryTime}ms | Chunks: ${result.metadata.chunksRetrieved}`));
    } catch (error) {
      spinner.fail('Query failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });
