import chalk from 'chalk';
import { SessionManager } from '../SessionManager';

export class InstanceCommand {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async execute(action: string, options: any): Promise<void> {
    await this.sessionManager.initialize();

    switch (action) {
      case 'ls':
      case 'list':
        await this.list();
        break;
      case 'start':
        await this.start(options);
        break;
      case 'stop':
        await this.stop(options);
        break;
      default:
        console.error(chalk.red(`Unknown action: ${action}`));
        process.exit(1);
    }
  }

  private async list(): Promise<void> {
    const sessions = await this.sessionManager.listSessions();
    console.log(chalk.bold('Instances:'));
    for (const s of sessions) {
      console.log(`  ${s.sessionId} (${s.status})`);
    }
  }

  private async start(options: any): Promise<void> {
    console.log(chalk.gray('Instance start: stub'));
  }

  private async stop(options: any): Promise<void> {
    if (!options.session) {
      console.error(chalk.red('--session required'));
      process.exit(1);
    }
    await this.sessionManager.deleteSession(options.session);
    console.log(chalk.green(`Stopped session ${options.session}`));
  }
}