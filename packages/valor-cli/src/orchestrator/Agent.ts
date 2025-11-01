/**
 * Base Agent class for role-scoped agentic work
 */

import { AgentRole, AgentLedgerEntry } from '../types';

export abstract class Agent {
  protected role: AgentRole;
  protected taskId: string;
  protected turn: number = 0;

  constructor(role: AgentRole, taskId: string) {
    this.role = role;
    this.taskId = taskId;
  }

  /**
   * Execute agent task and return result
   */
  abstract execute(context: any): Promise<{ result: string; artifacts: any[] }>;

  /**
   * Get agent role
   */
  getRole(): AgentRole {
    return this.role;
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.role.name;
  }

  /**
   * Increment turn counter
   */
  nextTurn(): void {
    this.turn++;
  }

  /**
   * Get current turn
   */
  getTurn(): number {
    return this.turn;
  }

  /**
   * Create audit log entry for this agent's work
   */
  createLedgerEntry(action: string, result: string, tokensUsed: number, cost: number): AgentLedgerEntry {
    return {
      timestamp: Date.now(),
      agent: this.role.name,
      taskId: this.taskId,
      turn: this.turn,
      action,
      result,
      tokensUsed,
      cost,
    };
  }
}