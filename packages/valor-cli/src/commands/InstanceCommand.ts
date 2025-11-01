/**
 * InstanceCommand - Manage CLI sessions/instances
 */

import chalk from 'chalk';
import { SessionManager } from '../SessionManager';

export class InstanceCommand {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async execute(action: string, options: any): Promise<void> {
    try {
      await this.sessionManager.initialize();

      switch (action) {
        case 'ls':
          await this.listInstances();
          break;
        case 'start':
          await this.startInstance();
          break;
        case 'stop':
          await this.stopInstance(options.session);
          break;
        default:
          console.error(chalk.red(`Unknown action: ${action}`));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  }

  private async listInstances(): Promise<void> {
    const sessions = await this.sessionManager.listSessions();
    
    if (sessions.length === 0) {
      console.log(chalk.gray('No active instances'));
      return;
    }

    console.log(chalk.cyan('\n📋 Active Instances:\n'));
    for (const session of sessions) {
      const elapsed = Math.round((Date.now() - session.createdAt) / 1000);
      console.log(
        `${chalk.green('✓')} ${chalk.cyan(session.sessionId)} ${chalk.gray(`(${session.workspaceRoot}) — ${elapsed}s`)}`
      );
    }
    console.log();
  }

  private async startInstance(): Promise<void> {
    const session = await this.sessionManager.createSession(process.cwd());
    console.log(chalk.green(`\n✅ Instance started: ${session.sessionId}\n`));
  }

  private async stopInstance(sessionId: string): Promise<void> {
    if (!sessionId) {
      console.error(chalk.red('Session ID required: --session <id>'));
      process.exit(1);
    }

    await this.sessionManager.deleteSession(sessionId);
    console.log(chalk.green(`\n✅ Instance stopped: ${sessionId}\n`));
  }
}