/**
 * SessionManager - Manages CLI session persistence and context sharing with IDE
 * Enables CLI tasks to attach to or create new sessions
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { SessionConfig, InstanceInfo, SessionRunStatus } from './types';

export class SessionManager {
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = join(homedir(), '.valoride', 'sessions');
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to initialize sessions directory: ${error}`);
    }
  }

  async createSession(workspaceRoot: string): Promise<SessionConfig> {
    const sessionId = uuidv4();
    const now = Date.now();
    const config: SessionConfig = {
      sessionId,
      workspaceRoot,
      createdAt: now,
      lastActivity: now,
      runStatus: 'idle',
      runHistory: [],
    };

    await this.saveSession(config);
    return config;
  }

  async saveSession(config: SessionConfig): Promise<void> {
    const path = this.getSessionPath(config.sessionId);
    config.lastActivity = Date.now();
    await fs.writeFile(path, JSON.stringify(config, null, 2));
  }

  async loadSession(sessionId: string): Promise<SessionConfig | null> {
    try {
      const path = this.getSessionPath(sessionId);
      const content = await fs.readFile(path, 'utf-8');
      const loaded = JSON.parse(content) as SessionConfig;
      loaded.runStatus = loaded.runStatus ?? (loaded.taskId ? 'running' : 'idle');
      loaded.runHistory = loaded.runHistory ?? [];
      return loaded;
    } catch {
      return null;
    }
  }

  async listSessions(): Promise<InstanceInfo[]> {
    try {
      const files = await fs.readdir(this.sessionsDir);
      const sessions: InstanceInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const config = await this.loadSession(sessionId);
          if (config) {
            sessions.push({
              sessionId: config.sessionId,
              workspaceRoot: config.workspaceRoot,
              taskId: config.taskId,
              status: this.toInstanceStatus(config.runStatus, config.taskId),
              createdAt: config.createdAt,
              lastActivity: config.lastActivity,
            });
          }
        }
      }

      return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    } catch {
      return [];
    }
  }

  async markRunStarted(session: SessionConfig, description: string, mode: 'plan' | 'act' | 'plan+act'): Promise<void> {
    const now = Date.now();
    session.runStatus = 'running';
    session.taskId = session.sessionId;
    session.currentRun = {
      runId: uuidv4(),
      description,
      mode,
      startedAt: now,
      updatedAt: now,
      heartbeatAt: now,
      status: 'running',
      eventsPath: this.getSessionEventsPath(session.sessionId),
      artifactsDir: this.getSessionArtifactsDir(session.sessionId),
    };

    await fs.mkdir(session.currentRun.artifactsDir, { recursive: true });
    await this.appendRunEvent(session.sessionId, {
      type: 'run_started',
      at: now,
      mode,
      description,
      runId: session.currentRun.runId,
    });
    await this.saveSession(session);
  }

  async markRunHeartbeat(session: SessionConfig, data?: Record<string, unknown>): Promise<void> {
    if (!session.currentRun) {
      return;
    }

    const now = Date.now();
    session.currentRun.updatedAt = now;
    session.currentRun.heartbeatAt = now;

    await this.appendRunEvent(session.sessionId, {
      type: 'heartbeat',
      at: now,
      runId: session.currentRun.runId,
      ...(data ?? {}),
    });
    await this.saveSession(session);
  }

  async markRunFinished(
    session: SessionConfig,
    status: Exclude<SessionRunStatus, 'running' | 'idle'>,
    summary?: Record<string, unknown>
  ): Promise<void> {
    if (!session.currentRun) {
      return;
    }

    const now = Date.now();
    const finishedRun = {
      ...session.currentRun,
      updatedAt: now,
      status,
    };

    await this.appendRunEvent(session.sessionId, {
      type: 'run_finished',
      at: now,
      runId: session.currentRun.runId,
      status,
      ...(summary ?? {}),
    });

    session.runStatus = status;
    session.taskId = undefined;
    session.currentRun = undefined;
    session.runHistory = [...(session.runHistory ?? []), finishedRun].slice(-20);

    await this.saveSession(session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const path = this.getSessionPath(sessionId);
      await fs.unlink(path);
    } catch (error) {
      throw new Error(`Failed to delete session: ${error}`);
    }
  }

  private getSessionPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.json`);
  }

  private getSessionEventsPath(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.run.jsonl`);
  }

  private getSessionArtifactsDir(sessionId: string): string {
    return join(this.sessionsDir, `${sessionId}.artifacts`);
  }

  private async appendRunEvent(sessionId: string, payload: Record<string, unknown>): Promise<void> {
    const line = `${JSON.stringify(payload)}\n`;
    await fs.appendFile(this.getSessionEventsPath(sessionId), line, 'utf-8');
  }

  private toInstanceStatus(runStatus: SessionRunStatus | undefined, taskId?: string): InstanceInfo['status'] {
    if (runStatus === 'running' || taskId) {
      return 'active';
    }
    if (runStatus === 'completed' || runStatus === 'failed' || runStatus === 'cancelled' || runStatus === 'timed_out') {
      return 'completed';
    }
    return 'idle';
  }
}
