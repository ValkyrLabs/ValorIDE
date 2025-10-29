/**
 * ValorIDE CLI Types
 * Defines interfaces for CLI operations, session persistence, and checkpoints
 */

export interface SessionConfig {
  sessionId: string;
  workspaceRoot: string;
  taskId?: string;
  modelProvider?: string;
  modelId?: string;
  createdAt: number;
  lastActivity: number;
}

export interface TaskRunOptions {
  plan?: boolean;
  act?: boolean;
  sessionId?: string;
  modelProvider?: string;
  modelId?: string;
  output?: 'json' | 'text';
}

export interface InstanceInfo {
  sessionId: string;
  workspaceRoot: string;
  taskId?: string;
  status: 'active' | 'idle' | 'completed';
  createdAt: number;
  lastActivity: number;
}

export interface CheckpointInfo {
  task: string;
  step: string;
  repo: string;
  hash: string;
  createdAt: number;
  message?: string;
}

export interface AgentRole {
  name: 'planner' | 'coder' | 'tester' | 'docs' | 'integrator';
  systemPrompt: string;
  maxTokens: number;
  autoApprove: boolean;
}

export interface AgentLedgerEntry {
  timestamp: number;
  agent: string;
  taskId: string;
  turn: number;
  action: string;
  result: string;
  tokensUsed: number;
  cost: number;
}

export interface WorkspaceManifest {
  version: string;
  repos: Array<{
    name: string;
    path: string;
    remote?: string;
    branch?: string;
  }>;
}

export interface CLIError extends Error {
  code: string;
  exitCode: number;
}