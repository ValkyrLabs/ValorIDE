import * as crypto from "crypto";
import * as fs from "fs/promises";
import * as path from "path";
import { getValkyraiBasePath } from "../../utils/serverValkyraiHost";

export type GrayMatterFailureKind =
  | "auth"
  | "credits"
  | "forbidden"
  | "validation"
  | "unavailable"
  | "unknown";

export interface GrayMatterMemoryWrite {
  text: string;
  type?: string;
  source?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface PendingGrayMatterWrite {
  id: string;
  idempotencyKey: string;
  status: "queued" | "replaying" | "blocked" | "failed";
  failureKind?: GrayMatterFailureKind;
  attempts: number;
  nextAttemptAt: number;
  createdAt: string;
  updatedAt: string;
  write: GrayMatterMemoryWrite;
}

export interface GrayMatterMemoryClient {
  writeMemory(
    write: GrayMatterMemoryWrite,
    idempotencyKey: string,
  ): Promise<void>;
}

export interface GrayMatterTranscriptSummary {
  queued: number;
  blockedByAuth: number;
  blockedByCredits: number;
  forbidden: number;
  failed: number;
  nextReplayAt?: string;
}

const QUEUE_FILE_NAME = "pending-memory-writes.json";
const SECRET_KEY_PATTERN =
  /(api[-_]?key|authorization|bearer|jwt|password|secret|token)/i;
const SECRET_VALUE_PATTERN =
  /(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|xox[baprs]-[A-Za-z0-9-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,})/g;

export class GrayMatterClientError extends Error {
  public readonly kind: GrayMatterFailureKind;

  constructor(kind: GrayMatterFailureKind, message?: string) {
    super(message || kind);
    this.name = "GrayMatterClientError";
    this.kind = kind;
  }
}

export class HttpGrayMatterMemoryClient implements GrayMatterMemoryClient {
  constructor(
    private readonly getJwtToken: () => Promise<string | undefined>,
    private readonly basePath = getValkyraiBasePath(),
  ) {}

  async writeMemory(
    write: GrayMatterMemoryWrite,
    idempotencyKey: string,
  ): Promise<void> {
    const jwtToken = await this.getJwtToken();
    if (!jwtToken) {
      throw new GrayMatterClientError("auth", "ValorIDE is not signed in.");
    }

    const response = await fetch(`${this.basePath}/memory`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(write),
    });

    if (!response.ok) {
      throw new GrayMatterClientError(
        classifyHttpStatus(response.status),
        `GrayMatter memory write failed with HTTP ${response.status}.`,
      );
    }
  }
}

export class GrayMatterMemoryService {
  private pendingWrites: PendingGrayMatterWrite[] = [];
  private readonly queuePath: string;

  constructor(
    globalStoragePath: string,
    private readonly client: GrayMatterMemoryClient,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.queuePath = path.join(globalStoragePath, "graymatter", QUEUE_FILE_NAME);
  }

  async initialize(): Promise<void> {
    await fs.mkdir(path.dirname(this.queuePath), { recursive: true });
    this.pendingWrites = await this.readQueue();
  }

  async write(write: GrayMatterMemoryWrite): Promise<"written" | "queued"> {
    const sanitized = sanitizeMemoryWrite(write);
    const idempotencyKey = buildIdempotencyKey(sanitized);

    try {
      await this.client.writeMemory(sanitized, idempotencyKey);
      return "written";
    } catch (error) {
      const kind = classifyError(error);
      if (kind !== "unavailable") {
        throw error;
      }

      if (
        !this.pendingWrites.some(
          (entry) => entry.idempotencyKey === idempotencyKey,
        )
      ) {
        this.pendingWrites.push(
          this.createPendingWrite(sanitized, idempotencyKey, kind),
        );
        await this.persistQueue();
      }
      return "queued";
    }
  }

  async replayDueWrites(): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0;
    let failed = 0;
    const replayStartedAt = this.now();

    for (const entry of [...this.pendingWrites]) {
      if (entry.nextAttemptAt > replayStartedAt) {
        continue;
      }

      entry.status = "replaying";
      entry.updatedAt = new Date(this.now()).toISOString();

      try {
        await this.client.writeMemory(entry.write, entry.idempotencyKey);
        this.pendingWrites = this.pendingWrites.filter(
          (queued) => queued.id !== entry.id,
        );
        succeeded += 1;
      } catch (error) {
        failed += 1;
        entry.attempts += 1;
        entry.failureKind = classifyError(error);
        entry.status = isBlockingFailure(entry.failureKind)
          ? "blocked"
          : "failed";
        entry.nextAttemptAt =
          this.now() + retryDelayMs(entry.attempts, entry.failureKind);
        entry.updatedAt = new Date(this.now()).toISOString();
      }
    }

    await this.persistQueue();
    return { succeeded, failed };
  }

  async discard(id: string): Promise<boolean> {
    const before = this.pendingWrites.length;
    this.pendingWrites = this.pendingWrites.filter((entry) => entry.id !== id);
    const discarded = this.pendingWrites.length !== before;
    if (discarded) {
      await this.persistQueue();
    }
    return discarded;
  }

  getPendingWrites(): PendingGrayMatterWrite[] {
    return this.pendingWrites.map((entry) => ({
      ...entry,
      write: { ...entry.write },
    }));
  }

  getTranscriptSummary(): GrayMatterTranscriptSummary {
    const nextReplayAt = this.pendingWrites
      .filter((entry) => !isBlockingFailure(entry.failureKind))
      .map((entry) => entry.nextAttemptAt)
      .sort((a, b) => a - b)[0];

    return {
      queued: this.pendingWrites.filter((entry) => entry.status === "queued")
        .length,
      blockedByAuth: this.pendingWrites.filter(
        (entry) => entry.failureKind === "auth",
      ).length,
      blockedByCredits: this.pendingWrites.filter(
        (entry) => entry.failureKind === "credits",
      ).length,
      forbidden: this.pendingWrites.filter(
        (entry) => entry.failureKind === "forbidden",
      ).length,
      failed: this.pendingWrites.filter((entry) => entry.status === "failed")
        .length,
      nextReplayAt: nextReplayAt ? new Date(nextReplayAt).toISOString() : undefined,
    };
  }

  private createPendingWrite(
    write: GrayMatterMemoryWrite,
    idempotencyKey: string,
    failureKind: GrayMatterFailureKind,
  ): PendingGrayMatterWrite {
    const timestamp = new Date(this.now()).toISOString();
    return {
      id: idempotencyKey.slice(0, 24),
      idempotencyKey,
      status: "queued",
      failureKind,
      attempts: 0,
      nextAttemptAt: this.now(),
      createdAt: timestamp,
      updatedAt: timestamp,
      write,
    };
  }

  private async readQueue(): Promise<PendingGrayMatterWrite[]> {
    try {
      const raw = await fs.readFile(this.queuePath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.pendingWrites)
        ? parsed.pendingWrites.map(normalizePendingWrite).filter(Boolean)
        : [];
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async persistQueue(): Promise<void> {
    await fs.mkdir(path.dirname(this.queuePath), { recursive: true });
    await fs.writeFile(
      this.queuePath,
      JSON.stringify({ version: 1, pendingWrites: this.pendingWrites }, null, 2),
      "utf8",
    );
  }
}

export function classifyHttpStatus(status: number): GrayMatterFailureKind {
  if (status === 401) return "auth";
  if (status === 402 || status === 429) return "credits";
  if (status === 403) return "forbidden";
  if (status >= 400 && status < 500) return "validation";
  if (status >= 500) return "unavailable";
  return "unknown";
}

function classifyError(error: unknown): GrayMatterFailureKind {
  if (error instanceof GrayMatterClientError) {
    return error.kind;
  }
  return "unknown";
}

function isBlockingFailure(kind?: GrayMatterFailureKind): boolean {
  return kind === "auth" || kind === "credits" || kind === "forbidden" || kind === "validation";
}

function retryDelayMs(attempts: number, kind?: GrayMatterFailureKind): number {
  if (isBlockingFailure(kind)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.min(5 * 60 * 1000, 1000 * Math.pow(2, Math.max(0, attempts - 1)));
}

function buildIdempotencyKey(write: GrayMatterMemoryWrite): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(write))
    .digest("hex");
}

function sanitizeMemoryWrite(write: GrayMatterMemoryWrite): GrayMatterMemoryWrite {
  return {
    ...write,
    text: redactSecretValues(write.text || ""),
    metadata: redactMetadata(write.metadata || {}),
  };
}

function redactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if (SECRET_KEY_PATTERN.test(key)) {
        return [key, "[redacted]"];
      }
      if (typeof value === "string") {
        return [key, redactSecretValues(value)];
      }
      return [key, value];
    }),
  );
}

function redactSecretValues(value: string): string {
  return value.replace(SECRET_VALUE_PATTERN, "[redacted]");
}

function normalizePendingWrite(value: any): PendingGrayMatterWrite | null {
  if (!value || typeof value !== "object" || !value.write?.text || !value.idempotencyKey) {
    return null;
  }
  return {
    id: String(value.id || value.idempotencyKey).slice(0, 64),
    idempotencyKey: String(value.idempotencyKey),
    status: value.status || "queued",
    failureKind: value.failureKind,
    attempts: Number(value.attempts || 0),
    nextAttemptAt: Number(value.nextAttemptAt || 0),
    createdAt: String(value.createdAt || new Date().toISOString()),
    updatedAt: String(value.updatedAt || new Date().toISOString()),
    write: sanitizeMemoryWrite(value.write),
  };
}
