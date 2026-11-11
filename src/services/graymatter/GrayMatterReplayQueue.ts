export type GrayMatterReplayFailureKind =
  | "unavailable"
  | "auth"
  | "credits"
  | "forbidden"
  | "validation"
  | "unknown";

export type GrayMatterReplayStatus =
  | "queued"
  | "replaying"
  | "blocked"
  | "failed";

export interface GrayMatterReplayWrite {
  operation: "memory.put" | "memory.put_batch" | "memory.link";
  payload: Record<string, unknown>;
  provenance?: Record<string, unknown>;
}

export interface GrayMatterReplayItem extends GrayMatterReplayWrite {
  id: string;
  idempotencyKey: string;
  status: GrayMatterReplayStatus;
  createdAt: number;
  updatedAt: number;
  attemptCount: number;
  nextAttemptAt?: number;
  failureKind?: GrayMatterReplayFailureKind;
  lastError?: string;
}

export interface GrayMatterReplayQueueSummary {
  total: number;
  queued: number;
  replaying: number;
  blocked: number;
  failed: number;
}

export interface DurableStateStore {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): PromiseLike<void>;
}

const DEFAULT_STORAGE_KEY = "graymatter.replayQueue.v1";
const SENSITIVE_KEY_PATTERN =
  /(^|[-_])(authorization|api[-_]?key|jwt|password|refresh[-_]?token|secret|token)($|[-_])/i;
const REDACTED = "[redacted]";

export class GrayMatterReplayQueue {
  constructor(
    private readonly storage: DurableStateStore,
    private readonly storageKey: string = DEFAULT_STORAGE_KEY,
    private readonly now: () => number = Date.now,
  ) {}

  async enqueue(write: GrayMatterReplayWrite): Promise<GrayMatterReplayItem> {
    const timestamp = this.now();
    const sanitizedWrite = sanitizeWrite(write);
    const idempotencyKey =
      typeof sanitizedWrite.provenance?.idempotencyKey === "string"
        ? sanitizedWrite.provenance.idempotencyKey
        : buildIdempotencyKey(sanitizedWrite);
    const existing = this.list().find(
      (item) => item.idempotencyKey === idempotencyKey,
    );

    if (existing) {
      return existing;
    }

    const item: GrayMatterReplayItem = {
      ...sanitizedWrite,
      id: `gmq_${timestamp}_${stableHash(idempotencyKey)}`,
      idempotencyKey,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      attemptCount: 0,
    };

    await this.save([...this.list(), item]);
    return item;
  }

  list(): GrayMatterReplayItem[] {
    const items = this.storage.get<GrayMatterReplayItem[]>(this.storageKey, []);
    return Array.isArray(items) ? items : [];
  }

  async markReplaying(id: string): Promise<GrayMatterReplayItem | null> {
    return this.updateItem(id, (item) => ({
      ...item,
      status: "replaying",
      updatedAt: this.now(),
      attemptCount: item.attemptCount + 1,
      failureKind: undefined,
      lastError: undefined,
    }));
  }

  async markFailed(
    id: string,
    failureKind: GrayMatterReplayFailureKind,
    error: string,
    nextAttemptAt?: number,
  ): Promise<GrayMatterReplayItem | null> {
    return this.updateItem(id, (item) => ({
      ...item,
      status: isBlockingFailure(failureKind) ? "blocked" : "failed",
      updatedAt: this.now(),
      failureKind,
      lastError: error,
      nextAttemptAt,
    }));
  }

  async complete(id: string): Promise<boolean> {
    const before = this.list();
    const after = before.filter((item) => item.id !== id);

    if (after.length === before.length) {
      return false;
    }

    await this.save(after);
    return true;
  }

  async discard(id: string): Promise<boolean> {
    return this.complete(id);
  }

  summary(): GrayMatterReplayQueueSummary {
    return this.list().reduce<GrayMatterReplayQueueSummary>(
      (summary, item) => {
        summary.total += 1;
        summary[item.status] += 1;
        return summary;
      },
      { total: 0, queued: 0, replaying: 0, blocked: 0, failed: 0 },
    );
  }

  private async updateItem(
    id: string,
    updater: (item: GrayMatterReplayItem) => GrayMatterReplayItem,
  ): Promise<GrayMatterReplayItem | null> {
    let updated: GrayMatterReplayItem | null = null;
    const items = this.list().map((item) => {
      if (item.id !== id) {
        return item;
      }

      updated = updater(item);
      return updated;
    });

    if (!updated) {
      return null;
    }

    await this.save(items);
    return updated;
  }

  private async save(items: GrayMatterReplayItem[]): Promise<void> {
    await this.storage.update(this.storageKey, items);
  }
}

function sanitizeWrite(write: GrayMatterReplayWrite): GrayMatterReplayWrite {
  return {
    operation: write.operation,
    payload: redactSensitiveValues(write.payload),
    provenance: write.provenance
      ? redactSensitiveValues(write.provenance)
      : undefined,
  };
}

function redactSensitiveValues(value: unknown): any {
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValues(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((safe, [key, nestedValue]) => {
      safe[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? REDACTED
        : redactSensitiveValues(nestedValue);
      return safe;
    }, {});
  }

  return value;
}

function buildIdempotencyKey(write: GrayMatterReplayWrite): string {
  return `valoride:${write.operation}:${stableHash(stableStringify(write))}`;
}

function isBlockingFailure(failureKind: GrayMatterReplayFailureKind): boolean {
  return ["auth", "credits", "forbidden", "validation"].includes(failureKind);
}

function stableHash(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(36);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableStringify(nestedValue)}`,
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
