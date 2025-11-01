import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Orchestrator, OrchestrationContext } from './Orchestrator';
import { Agent } from './Agent';
import { AgentLedger } from './AgentLedger';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

class MockAgent extends Agent {
  private responseIndex: number = 0;
  private responses: any[];

  constructor(roleName: string, taskId: string, responses: any[] = []) {
    const role = {
      name: roleName as any,
      systemPrompt: `Mock ${roleName} agent`,
      maxTokens: 4000,
      autoApprove: true,
    };
    super(role, taskId);
    this.responses = responses;
  }

  async execute(context: any): Promise<{ result: string; artifacts: any[] }> {
    const response = this.responses[this.responseIndex] || { nextAgent: null };
    this.responseIndex++;
    return {
      result: JSON.stringify(response),
      artifacts: [],
    };
  }
}

describe('Orchestrator', () => {
  let orchestrator: Orchestrator;
  const taskId = `test-task-${Date.now()}`;
  const ledgerDir = join(homedir(), '.valoride', 'tasks', taskId);

  beforeEach(async () => {
    const context: OrchestrationContext = {
      taskId,
      description: 'Test orchestration',
      initialContext: { testData: 'hello' },
      maxTurns: 10,
    };
    orchestrator = new Orchestrator(context);
    await orchestrator.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(ledgerDir, { recursive: true, force: true });
    } catch {
      // OK if doesn't exist
    }
  });

  it('should initialize successfully', async () => {
    expect(orchestrator).toBeDefined();
    expect(orchestrator.getTurn()).toBe(0);
  });

  it('should register agents', () => {
    const mockAgent = new MockAgent('planner', taskId);
    orchestrator.registerAgent(mockAgent);
  });

  it('should execute single agent orchestration', async () => {
    const plannerAgent = new MockAgent('planner', taskId, [
      { subtasks: ['task1', 'task2'], nextAgent: null },
    ]);
    orchestrator.registerAgent(plannerAgent);

    const result = await orchestrator.execute();
    expect(result.status).toBe('success');
    expect(result.turn).toBe(1);
    expect(result.agent).toBe('planner');
  });

  it('should execute multi-agent orchestration', async () => {
    const plannerAgent = new MockAgent('planner', taskId, [
      { subtasks: ['task1'], nextAgent: 'coder' },
    ]);
    const coderAgent = new MockAgent('coder', taskId, [
      { completed: ['file1.ts'], nextAgent: 'tester' },
    ]);
    const testerAgent = new MockAgent('tester', taskId, [
      { testsPassed: 5, nextAgent: 'docs' },
    ]);
    const docsAgent = new MockAgent('docs', taskId, [
      { files: ['README.md'], nextAgent: 'integrator' },
    ]);
    const integratorAgent = new MockAgent('integrator', taskId, [
      { ready: true, nextAgent: null },
    ]);

    orchestrator.registerAgent(plannerAgent);
    orchestrator.registerAgent(coderAgent);
    orchestrator.registerAgent(testerAgent);
    orchestrator.registerAgent(docsAgent);
    orchestrator.registerAgent(integratorAgent);

    const result = await orchestrator.execute();
    expect(result.status).toBe('success');
    expect(result.turn).toBe(5);
    expect(result.ledgerEntries).toBe(5);
  });

  it('should track total tokens and cost', async () => {
    const plannerAgent = new MockAgent('planner', taskId, [
      { subtasks: ['t1'], nextAgent: null },
    ]);
    orchestrator.registerAgent(plannerAgent);

    const result = await orchestrator.execute();
    expect(result.totalTokens).toBeGreaterThanOrEqual(0);
    expect(result.totalCost).toBeGreaterThanOrEqual(0);
  });

  it('should export history as CSV', async () => {
    const plannerAgent = new MockAgent('planner', taskId, [
      { plan: 'complete', nextAgent: null },
    ]);
    orchestrator.registerAgent(plannerAgent);

    await orchestrator.execute();
    const csv = await orchestrator.exportHistory();

    expect(csv).toContain('timestamp');
    expect(csv).toContain('agent');
  });
});