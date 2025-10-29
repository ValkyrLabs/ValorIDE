/**
 * AgentLedger - Persistent JSONL audit trail for multi-agent work
 * Enables resumability, auditability, and handoff verification
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { AgentLedgerEntry } from '../types';

export class AgentLedger {
  private ledgerPath: string;

  constructor(taskId: string) {
    const ledgerDir = join(homedir(), '.valoride', 'tasks', taskId);
    this.ledgerPath = join(ledgerDir, 'agent.ledger');
  }

  /**
   * Initialize ledger file
   */
  async initialize(): Promise<void> {
    try {
      const dir = join(this.ledgerPath, '..');
      await fs.mkdir(dir, { recursive: true });
      // Ledger file will be created on first write
    } catch (error) {
      throw new Error(`Failed to initialize ledger: ${error}`);
    }
  }

  /**
   * Append entry to ledger (JSONL format)
   */
  async append(entry: AgentLedgerEntry): Promise<void> {
    try {
      const line = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.ledgerPath, line, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to append ledger entry: ${error}`);
    }
  }

  /**
   * Read all ledger entries
   */
  async readAll(): Promise<AgentLedgerEntry[]> {
    try {
      const content = await fs.readFile(this.ledgerPath, 'utf-8');
      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as AgentLedgerEntry);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to read ledger: ${error}`);
    }
  }

  /**
   * Get entries for specific agent
   */
  async getByAgent(agentName: string): Promise<AgentLedgerEntry[]> {
    const entries = await this.readAll();
    return entries.filter((e) => e.agent === agentName);
  }

  /**
   * Get entries for specific turn
   */
  async getByTurn(turn: number): Promise<AgentLedgerEntry[]> {
    const entries = await this.readAll();
    return entries.filter((e) => e.turn === turn);
  }

  /**
   * Get last entry
   */
  async getLast(): Promise<AgentLedgerEntry | null> {
    const entries = await this.readAll();
    return entries.length > 0 ? entries[entries.length - 1] : null;
  }

  /**
   * Get total tokens used
   */
  async getTotalTokens(): Promise<number> {
    const entries = await this.readAll();
    return entries.reduce((sum, e) => sum + e.tokensUsed, 0);
  }

  /**
   * Get total cost
   */
  async getTotalCost(): Promise<number> {
    const entries = await this.readAll();
    return entries.reduce((sum, e) => sum + e.cost, 0);
  }

  /**
   * Export ledger as CSV
   */
  async exportCsv(): Promise<string> {
    const entries = await this.readAll();
    const header = 'timestamp,agent,turn,action,tokens,cost\n';
    const rows = entries
      .map(
        (e) =>
          `${e.timestamp},${e.agent},${e.turn},${e.action.replace(/,/g, ';')},${e.tokensUsed},${e.cost}`
      )
      .join('\n');
    return header + rows;
  }
}