#!/usr/bin/env node

/**
 * ValorIDE CLI - Autonomous coding agent
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { TaskCommand } from './commands/TaskCommand';
import { InstanceCommand } from './commands/InstanceCommand';
import { ConfigCommand } from './commands/ConfigCommand';
import { CheckpointCommand } from './commands/CheckpointCommand';

const program = new Command();

program
  .name('valor')
  .description('ValorIDE CLI - Autonomous coding agent')
  .version('0.1.0');

// Task command
program
  .command('task <description>')
  .description('Run an agentic coding task')
  .option('--plan', 'Plan mode (dry-run)')
  .option('--act', 'Act mode (execute)')
  .option('--session <id>', 'Attach to existing session')
  .action(async (description, options) => {
    const cmd = new TaskCommand();
    await cmd.execute(description, options);
  });

program
  .command('task-list')
  .description('List all tasks')
  .action(() => {
    console.log(chalk.gray('(Task list: stub)'));
  });

// Instance command
program
  .command('instance <action>')
  .description('Manage CLI instances/sessions')
  .option('--session <id>', 'Session ID')
  .action(async (action, options) => {
    const cmd = new InstanceCommand();
    await cmd.execute(action, options);
  });

// Config command
program
  .command('config <action>')
  .description('Manage configuration')
  .action(async (action, options) => {
    const cmd = new ConfigCommand();
    await cmd.execute(action, options);
  });

// Checkpoint command
program
  .command('checkpoint <action>')
  .description('Manage workspace checkpoints')
  .option('--task <id>', 'Task ID')
  .option('--step <n>', 'Step number')
  .option('--message <msg>', 'Checkpoint message')
  .action(async (action, options) => {
    const cmd = new CheckpointCommand();
    await cmd.execute(action, options);
  });

program.parse();