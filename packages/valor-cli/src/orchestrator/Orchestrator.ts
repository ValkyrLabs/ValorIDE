/**
 * Orchestrator - Coordinates multi-agent execution with baton-passing
 */

import { Agent } from './Agent';
import { AgentLedger } from './AgentLedger';
import { getNextRole, getRoleExecutionOrder } from './RoleDefinitions';

export interface OrchestrationContext {
  taskId: string;
  description: string;
  initialContext: any;
  maxTurns?: number;
}

export interface ExecutionResult {
  status: 'success' | 'failed' | 'incomplete';
  turn: number;
  agent: string;
  output: any;
  artifacts: any[];
  ledgerEntries: number;
  totalTokens: number;
  totalCost: number;
}

export class Orchestrator {
  private context: OrchestrationContext;
  private ledger: AgentLedger;
  private agents: Map<string, Agent> = new Map();
  private turn: number = 0;
  private maxTurns: number;

  constructor(context: OrchestrationContext) {
    this.context = context;
    this.ledger = new AgentLedger(context.taskId);
    this.maxTurns = context.maxTurns || 20;
  }

  async initialize(): Promise<void> {
    await this.ledger.initialize();
  }

  registerAgent(agent: Agent): void {
    this.agents.set(agent.getName(), agent);
  }

  async execute(): Promise<ExecutionResult> {
    try {
      const roles = getRoleExecutionOrder();
      let currentContext = this.context.initialContext;
      let currentRole = roles[0];
      let lastOutput: any = null;

      for (this.turn = 1; this.turn <= this.maxTurns; this.turn++) {
        const agent = this.agents.get(currentRole);
        if (!agent) {
          throw new Error(`No agent registered for role: ${currentRole}`);
        }

        console.log(`[Turn ${this.turn}] Executing ${currentRole}...`);

        const executionContext = {
          ...currentContext,
          previousOutput: lastOutput,
          turn: this.turn,
        };

        const { result, artifacts } = await agent.execute(executionContext);
        lastOutput = result;

        let parsedResult: any;
        try {
          parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
        } catch {
          parsedResult = { error: result, nextAgent: null };
        }

        const entry = agent.createLedgerEntry(
          `Execute ${currentRole}`,
          JSON.stringify(parsedResult).substring(0, 500),
          0,
          0
        );
        await this.ledger.append(entry);

        const nextAgent = parsedResult.nextAgent !== undefined ? parsedResult.nextAgent : getNextRole(currentRole);
        if (!nextAgent) {
          console.log(`[Complete] All agents finished`);
          break;
        }

        currentRole = nextAgent;
        agent.nextTurn();
      }

      const entries = await this.ledger.readAll();
      return {
        status: this.turn <= this.maxTurns ? 'success' : 'incomplete',
        turn: this.turn,
        agent: currentRole,
        output: lastOutput,
        artifacts: [],
        ledgerEntries: entries.length,
        totalTokens: await this.ledger.getTotalTokens(),
        totalCost: await this.ledger.getTotalCost(),
      };
    } catch (error) {
      throw new Error(`Orchestration failed: ${error}`);
    }
  }

  getLedger(): AgentLedger {
    return this.ledger;
  }

  getTurn(): number {
    return this.turn;
  }

  async exportHistory(): Promise<string> {
    return await this.ledger.exportCsv();
  }
}