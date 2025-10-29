#!/usr/bin/env node

/**
 * ValorIDE CLI - Agentic coding companion CLI
 * Entry point for valor command
 */

import { program } from 'commander';
import chalk from 'chalk';
import { TaskCommand } from './commands/TaskCommand';
import { InstanceCommand } from './commands/InstanceCommand';
import { ConfigCommand } from './commands/ConfigCommand';
import { CheckpointCommand } from './commands/CheckpointCommand';

const VERSION = '0.1.0';

async function main(): Promise<void> {
  program
    .name('valor')
    .description('ValorIDE CLI Agent - Autonomous coding companion')
    .version(VERSION)
    .helpOption('-h, --help', 'Display help for command');

  // Task commands
  const taskCmd = new TaskCommand();
  program
    .command('task <action>')
    .description('Manage agentic coding tasks')
    .option('--plan', 'Run task in plan mode (dry-run)')
    .option('--act', 'Run task in act mode (execute)')
    .option('--session <id>', 'Attach to existing session')
    .option('--model <provider:id>', 'Specify model (e.g., anthropic:claude-3-5-sonnet)')
    .option('--output <format>', 'Output format (json|text)', 'text')
    .action(async (action, options) => {
      try {
        await taskCmd.execute(action, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Instance commands
  const instanceCmd = new InstanceCommand();
  program
    .command('instance <action>')
    .description('Manage CLI instances')
    .option('--session <id>', 'Session ID')
    .action(async (action, options) => {
      try {
        await instanceCmd.execute(action, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Config commands
  const configCmd = new ConfigCommand();
  program
    .command('config <action>')
    .description('Manage configuration')
    .option('--key <key>', 'Config key')
    .option('--value <value>', 'Config value')
    .action(async (action, options) => {
      try {
        await configCmd.execute(action, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  // Checkpoint commands
  const checkpointCmd = new CheckpointCommand();
  program
    .command('checkpoint <action>')
    .description('Manage workspace checkpoints')
    .option('--task <id>', 'Task ID')
    .option('--step <step>', 'Checkpoint step')
    .option('--message <msg>', 'Checkpoint message')
    .action(async (action, options) => {
      try {
        await checkpointCmd.execute(action, options);
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error instanceof Error ? error.message : error);
  process.exit(1);
});