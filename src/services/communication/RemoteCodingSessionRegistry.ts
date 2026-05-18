
export type RemoteCodingSessionStatus =
  | "queued"
  | "running"
  | "completed"
  | "cancelled"
  | "timed_out"
  | "failed";

export interface RemoteCodingSession {
  id: string;
  task: string;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  endedAt?: number;
  timeoutMs: number;
  status: RemoteCodingSessionStatus;
  heartbeatAt?: number;
  cancelReason?: string;
  logs: string[];
  artifacts: string[];
}

export interface StartRemoteCodingSessionInput {
  id: string;
  task: string;
  timeoutMs?: number;
  createdAt?: number;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

export class RemoteCodingSessionRegistry {
  private sessions = new Map<string, RemoteCodingSession>();

  start(input: StartRemoteCodingSessionInput): RemoteCodingSession {
    const now = input.createdAt ?? Date.now();
    const existing = this.sessions.get(input.id);
    if (existing && this.isActive(existing)) {
      throw new Error(`Remote coding session already active: ${input.id}`);
    }

    const session: RemoteCodingSession = {
      id: input.id,
      task: input.task,
      timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      createdAt: now,
      updatedAt: now,
      startedAt: now,
      heartbeatAt: now,
      status: "running",
      logs: [],
      artifacts: []
    };

    this.sessions.set(input.id, session);
    return { ...session, logs: [...session.logs], artifacts: [...session.artifacts] };
  }

  list(): RemoteCodingSession[] {
    return Array.from(this.sessions.values()).map(s => ({ ...s, logs: [...s.logs], artifacts: [...s.artifacts] }));
      artifacts: [],
    };

    this.sessions.set(input.id, session);
    return {
      ...session,
      logs: [...session.logs],
      artifacts: [...session.artifacts],
    };
  }

  list(): RemoteCodingSession[] {
    return Array.from(this.sessions.values()).map((s) => ({
      ...s,
      logs: [...s.logs],
      artifacts: [...s.artifacts],
    }));
  }

  get(sessionId: string): RemoteCodingSession | undefined {
    const s = this.sessions.get(sessionId);
    if (!s) {
      return undefined;
    }
    return { ...s, logs: [...s.logs], artifacts: [...s.artifacts] };
  }

  heartbeat(sessionId: string, now: number = Date.now()): RemoteCodingSession {
    const s = this.requireSession(sessionId);
    if (!this.isActive(s)) {
      return this.snapshot(s);
    }
    s.heartbeatAt = now;
    s.updatedAt = now;
    return this.snapshot(s);
  }

  appendLog(
    sessionId: string,
    log: string,
    now: number = Date.now(),
  ): RemoteCodingSession {
    const s = this.requireSession(sessionId);
    s.logs.push(log);
    s.updatedAt = now;
    return this.snapshot(s);
  }

  addArtifact(
    sessionId: string,
    artifact: string,
    now: number = Date.now(),
  ): RemoteCodingSession {
    const s = this.requireSession(sessionId);
    s.artifacts.push(artifact);
    s.updatedAt = now;
    return this.snapshot(s);
  }

  stop(
    sessionId: string,
    status: Extract<
      RemoteCodingSessionStatus,
      "completed" | "failed"
    > = "completed",
    now: number = Date.now(),
  ): RemoteCodingSession {
    const s = this.requireSession(sessionId);
    s.status = status;
    s.endedAt = now;
    s.updatedAt = now;
    return this.snapshot(s);
  }

  cancel(
    sessionId: string,
    reason: string = "user_cancelled",
    now: number = Date.now(),
  ): RemoteCodingSession {
    const s = this.requireSession(sessionId);
    s.status = "cancelled";
    s.cancelReason = reason;
    s.endedAt = now;
    s.updatedAt = now;
    return this.snapshot(s);
  }

  expireTimedOutSessions(now: number = Date.now()): RemoteCodingSession[] {
    const timedOut: RemoteCodingSession[] = [];
    for (const s of this.sessions.values()) {
      if (!this.isActive(s)) {
        continue;
      }
      const heartbeatAt = s.heartbeatAt ?? s.startedAt ?? s.createdAt;
      if (now - heartbeatAt <= s.timeoutMs) {
        continue;
      }
      s.status = "timed_out";
      s.endedAt = now;
      s.updatedAt = now;
      timedOut.push(this.snapshot(s));
    }
    return timedOut;
  }

  private requireSession(sessionId: string): RemoteCodingSession {
    const s = this.sessions.get(sessionId);
    if (!s) {
      throw new Error(`Remote coding session not found: ${sessionId}`);
    }
    return s;
  }

  private isActive(session: RemoteCodingSession): boolean {
    return session.status === "queued" || session.status === "running";
  }

  private snapshot(session: RemoteCodingSession): RemoteCodingSession {
    return {
      ...session,
      logs: [...session.logs],
      artifacts: [...session.artifacts],
    };
  }
}
