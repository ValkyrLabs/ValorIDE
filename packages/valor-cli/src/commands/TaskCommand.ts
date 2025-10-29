/**
 * TaskCommand - Handles 'valor task' operations
 */

import chalk from 'chalk';
import ora from 'ora';
import { SessionManager } from '../SessionManager';
import { TaskRunOptions } from '../types';

export class TaskCommand {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async execute(action: string, options: any): Promise<void> {
    await this.sessionManager.initialize();

    switch (action) {
      case 'run':
        await this.run(options);
        break;
      case 'list':
        await this.list();
        break;
      default:
        console.error(chalk.red(`Unknown action: ${action}`));
        console.log(chalk.gray('Available actions: run, list'));
        process.exit(1);
    }
  }

  private async run(options: TaskRunOptions): Promise<void> {
    const spinner = ora('Initializing task...').start();
    try {
      // TODO: Implement task run with plan/act mode
      spinner.succeed(chalk.green('Task initialized (stub)'));
      console.log(chalk.gray(`Plan mode: ${options.plan ? 'enabled' : 'disabled'}`));
      console.log(chalk.gray(`Act mode: ${options.act ? 'enabled' : 'disabled'}`));
    } catch (error) {
      spinner.fail(chalk.red('Failed to run task'));
      throw error;
    }
  }

  private async list(): Promise<void> {
    try {
      const sessions = await this.sessionManager.listSessions();
      if (sessions.length === 0) {
        console.log(chalk.gray('No sessions found'));
        return;
      }

      console.log(chalk.bold('Active Sessions:'));
      for (const session of sessions) {
        console.log(
          `  ${chalk.cyan(session.sessionId)} - ${chalk.gray(session.workspaceRoot)} (${session.status})`
        );
      }
    } catch (error) {
      console.error(chalk.red('Failed to list tasks'), error);
      process.exit(1);
    }
  }
}