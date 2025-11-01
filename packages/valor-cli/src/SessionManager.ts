/**
 * SessionManager - Manages CLI session persistence and context sharing with IDE
 * Enables CLI tasks to attach to or create new sessions
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { SessionConfig, InstanceInfo } from './types';

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
    };

    await this.saveSession(config);
    return config;
  }

  async saveSession(config: SessionConfig): Promise<void> {
    const path = join(this.sessionsDir, `${config.sessionId}.json`);
    config.lastActivity = Date.now();
    await fs.writeFile(path, JSON.stringify(config, null, 2));
  }

  async loadSession(sessionId: string): Promise<SessionConfig | null> {
    try {
      const path = join(this.sessionsDir, `${sessionId}.json`);
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content) as SessionConfig;
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
              status: config.taskId ? 'active' : 'idle',
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

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const path = join(this.sessionsDir, `${sessionId}.json`);
      await fs.unlink(path);
    } catch (error) {
      throw new Error(`Failed to delete session: ${error}`);
    }
  }
}