import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from './SessionManager';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

describe('SessionManager', () => {
  let manager: SessionManager;
  const sessionsDir = join(homedir(), '.valoride', 'sessions');

  beforeEach(async () => {
    manager = new SessionManager();
    await manager.initialize();
  });

  afterEach(async () => {
    // Cleanup test sessions and run artifacts
    try {
      const files = await fs.readdir(sessionsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          await manager.deleteSession(sessionId);
        }

        if (file.endsWith('.run.jsonl')) {
          await fs.unlink(join(sessionsDir, file));
        }

        if (file.endsWith('.artifacts')) {
          await fs.rm(join(sessionsDir, file), { recursive: true, force: true });
        }
      }
    } catch {
      // Directory might not exist
    }
  });

  it('should create a new session', async () => {
    const session = await manager.createSession('/test/workspace');
    expect(session.sessionId).toBeDefined();
    expect(session.workspaceRoot).toBe('/test/workspace');
    expect(session.createdAt).toBeGreaterThan(0);
    expect(session.runStatus).toBe('idle');
  });

  it('should load a saved session', async () => {
    const created = await manager.createSession('/test/workspace');
    const loaded = await manager.loadSession(created.sessionId);
    expect(loaded).toBeDefined();
    expect(loaded?.sessionId).toBe(created.sessionId);
    expect(loaded?.workspaceRoot).toBe('/test/workspace');
  });

  it('should list all sessions', async () => {
    await manager.createSession('/test/workspace1');
    await manager.createSession('/test/workspace2');
    const sessions = await manager.listSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(2);
  });

  it('should delete a session', async () => {
    const created = await manager.createSession('/test/workspace');
    await manager.deleteSession(created.sessionId);
    const loaded = await manager.loadSession(created.sessionId);
    expect(loaded).toBeNull();
  });

  it('should update lastActivity on save', async () => {
    const session = await manager.createSession('/test/workspace');
    const originalActivity = session.lastActivity;

    // Wait a bit to ensure timestamp changes
    await new Promise(r => setTimeout(r, 10));

    await manager.saveSession(session);
    const updated = await manager.loadSession(session.sessionId);
    expect(updated?.lastActivity).toBeGreaterThanOrEqual(originalActivity);
  });

  it('should persist run start, heartbeat, and completion metadata', async () => {
    const session = await manager.createSession('/test/workspace');

    await manager.markRunStarted(session, 'ship feature', 'plan+act');
    expect(session.currentRun).toBeDefined();
    expect(session.runStatus).toBe('running');

    await manager.markRunHeartbeat(session, { stage: 'plan' });
    await manager.markRunFinished(session, 'completed', { summary: 'ok' });

    const loaded = await manager.loadSession(session.sessionId);
    expect(loaded?.runStatus).toBe('completed');
    expect(loaded?.currentRun).toBeUndefined();
    expect((loaded?.runHistory?.length ?? 0) > 0).toBe(true);

    const runLog = await fs.readFile(join(sessionsDir, `${session.sessionId}.run.jsonl`), 'utf-8');
    expect(runLog).toContain('run_started');
    expect(runLog).toContain('heartbeat');
    expect(runLog).toContain('run_finished');
  });
});
