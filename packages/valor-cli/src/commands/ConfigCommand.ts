import chalk from 'chalk';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export class ConfigCommand {
  private configFile: string;

  constructor() {
    this.configFile = join(homedir(), '.valoride', 'config.json');
  }

  async execute(action: string, options: any): Promise<void> {
    switch (action) {
      case 'edit':
        await this.edit();
        break;
      case 'print':
        await this.print();
        break;
      default:
        console.error(chalk.red(`Unknown action: ${action}`));
        process.exit(1);
    }
  }

  private async edit(): Promise<void> {
    console.log(chalk.gray('Config edit: stub'));
  }

  private async print(): Promise<void> {
    try {
      const content = await fs.readFile(this.configFile, 'utf-8');
      console.log(content);
    } catch {
      console.log(chalk.gray('No config file found'));
    }
  }
}