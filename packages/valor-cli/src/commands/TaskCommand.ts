/**
 * TaskCommand - Run agentic tasks with plan/act modes
 */

import chalk from "chalk";
import { SessionManager } from "../SessionManager.js";
import { ValorRuntimeExecutor } from "../runtime/ValorRuntimeExecutor.js";

export class TaskCommand {
  private sessionManager: SessionManager;
  private runtimeExecutor: ValorRuntimeExecutor;

  constructor() {
    this.sessionManager = new SessionManager();
    this.runtimeExecutor = new ValorRuntimeExecutor();
  }

  async execute(description: string, options: any): Promise<void> {
    const { plan = false, act = false, session: sessionId } = options;

    try {
      await this.sessionManager.initialize();

      // Create or attach to session
      let session: any;
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

      // Save session
      await this.sessionManager.saveSession(session);
      console.log(chalk.green("\n✅ Task complete\n"));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}\n`));
      process.exit(1);
    }
  }

  private async runPlanMode(description: string, session: any): Promise<void> {
    console.log(chalk.blue("📝 PLAN MODE (dry-run)\n"));
    const result = await this.runtimeExecutor.execute(
      description,
      "plan",
      session.workspaceRoot,
    );
    console.log(chalk.green("\nPlan generated"));
    console.log(chalk.gray(`Runtime events: ${result.eventCount}`));
    console.log(chalk.gray("Mode: DRY-RUN (no changes applied)\n"));
  }

  private async runActMode(description: string, session: any): Promise<void> {
    console.log(chalk.blue("⚡ ACT MODE (executing)\n"));
    const result = await this.runtimeExecutor.execute(
      description,
      "act",
      session.workspaceRoot,
    );
    console.log(chalk.green("\nTask executed"));
    console.log(chalk.gray(`Status: ${result.status}`));
    console.log(chalk.gray(`Runtime events: ${result.eventCount}\n`));
  }
}
