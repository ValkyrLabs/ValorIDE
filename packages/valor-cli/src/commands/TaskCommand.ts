/**
 * TaskCommand - Run agentic tasks with plan/act modes
 */

import chalk from 'chalk';
import ora from 'ora';
import { SessionManager } from '../SessionManager';
import { Orchestrator, OrchestrationContext } from '../orchestrator/Orchestrator';

export class TaskCommand {
  private sessionManager: SessionManager;

  constructor() {
    this.sessionManager = new SessionManager();
  }

  async execute(description: string, options: any): Promise<void> {
    const { plan = false, act = false, session: sessionId } = options;
    let session: any;

    try {
      await this.sessionManager.initialize();

      // Create or attach to session
      if (sessionId) {
        session = await this.sessionManager.loadSession(sessionId);
        if (!session) {
          console.error(chalk.red(`Session not found: ${sessionId}`));
          process.exit(1);
        }
      } else {
        session = await this.sessionManager.createSession(process.cwd());
      }

      console.log(chalk.cyan(`\n📋 Task: ${description}`));
      console.log(chalk.gray(`Session: ${session.sessionId}\n`));

      const mode: 'plan' | 'act' | 'plan+act' = plan ? 'plan' : act ? 'act' : 'plan+act';
      await this.sessionManager.markRunStarted(session, description, mode);

      if (plan) {
        await this.runPlanMode(description, session);
      } else if (act) {
        await this.runActMode(description, session);
      } else {
        // Default: both
        await this.runPlanMode(description, session);
        console.log();
        await this.runActMode(description, session);
      }

      await this.sessionManager.markRunFinished(session, 'completed');
      console.log(chalk.green('\n✅ Task complete\n'));
    } catch (error) {
      if (session) {
        await this.sessionManager.markRunFinished(session, 'failed', {
          error: String(error),
        });
      }
      console.error(chalk.red(`\n❌ Error: ${error}\n`));
      process.exit(1);
    }
  }

  private async runPlanMode(description: string, session: any): Promise<void> {
    console.log(chalk.blue('📝 PLAN MODE (dry-run)\n'));

    const spinner = ora('Generating plan...').start();

    try {
      const context: OrchestrationContext = {
        taskId: session.sessionId,
        description,
        initialContext: {
          task: description,
          workspace: session.workspaceRoot,
        },
        maxTurns: 1, // Planner only
      };

      const orchestrator = new Orchestrator(context);
      await orchestrator.initialize();

      // Log to ledger
      const ledger = orchestrator.getLedger();
      const entries = await ledger.readAll();

      await this.sessionManager.markRunHeartbeat(session, {
        stage: 'plan',
        ledgerEntries: entries.length,
      });

      spinner.succeed(chalk.green('Plan generated'));
      console.log(
        chalk.gray(`Ledger entries: ${entries.length}`)
      );
      console.log(chalk.gray('Mode: DRY-RUN (no changes applied)\n'));
    } catch (error) {
      spinner.fail(chalk.red(`Plan failed: ${error}`));
      throw error;
    }
  }

  private async runActMode(description: string, session: any): Promise<void> {
    console.log(chalk.blue('⚡ ACT MODE (executing)\n'));

    const spinner = ora('Executing task...').start();

    try {
      const context: OrchestrationContext = {
        taskId: session.sessionId,
        description,
        initialContext: {
          task: description,
          workspace: session.workspaceRoot,
        },
        maxTurns: 20, // Full orchestration
      };

      const orchestrator = new Orchestrator(context);
      await orchestrator.initialize();

      const result = await orchestrator.execute();
      await this.sessionManager.markRunHeartbeat(session, {
        stage: 'act',
        status: result.status,
        turns: result.turn,
        tokens: result.totalTokens,
        cost: Number(result.totalCost.toFixed(4)),
        ledgerEntries: result.ledgerEntries,
      });

      spinner.succeed(chalk.green('Task executed'));
      console.log(chalk.gray(`Status: ${result.status}`));
      console.log(chalk.gray(`Turns: ${result.turn}`));
      console.log(
        chalk.gray(`Tokens: ${result.totalTokens} | Cost: $${result.totalCost.toFixed(4)}`)
      );
      console.log(chalk.gray(`Ledger entries: ${result.ledgerEntries}\n`));
    } catch (error) {
      spinner.fail(chalk.red(`Execution failed: ${error}`));
      throw error;
    }
  }
}