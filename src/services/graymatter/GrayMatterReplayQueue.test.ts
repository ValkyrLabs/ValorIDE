import { describe, expect, it, beforeEach } from "vitest";
import {
  DurableStateStore,
  GrayMatterReplayQueue,
} from "./GrayMatterReplayQueue";

class MemoryStateStore implements DurableStateStore {
  public data = new Map<string, unknown>();

  get<T>(key: string, defaultValue: T): T {
    return (this.data.has(key) ? this.data.get(key) : defaultValue) as T;
  }

  async update(key: string, value: unknown): Promise<void> {
    this.data.set(key, value);
  }
}

describe("GrayMatterReplayQueue", () => {
  let store: MemoryStateStore;
  let now: number;
  let queue: GrayMatterReplayQueue;

  beforeEach(() => {
    store = new MemoryStateStore();
    now = 1_783_000_000_000;
    queue = new GrayMatterReplayQueue(
      store,
      "test.graymatter.queue",
      () => now,
    );
  });

  it("persists queued writes in durable extension state", async () => {
    const queued = await queue.enqueue({
      operation: "memory.put",
      payload: { text: "remember the activation decision" },
      provenance: { workspace: "demo", taskId: "task-1" },
    });

    const restored = new GrayMatterReplayQueue(
      store,
      "test.graymatter.queue",
      () => now,
    );

    expect(restored.list()).toEqual([queued]);
    expect(restored.summary()).toEqual({
      total: 1,
      queued: 1,
      replaying: 0,
      blocked: 0,
      failed: 0,
    });
  });

  it("redacts secrets before writes are stored", async () => {
    const queued = await queue.enqueue({
      operation: "memory.put",
      payload: {
        text: "queue this",
        nested: {
          apiKey: "sk-live-should-not-survive",
          authorization: "Bearer bad-news",
        },
      },
      provenance: {
        refreshToken: "refresh-me-not",
        workspace: "demo",
      },
    });

    expect(queued.payload).toEqual({
      text: "queue this",
      nested: {
        apiKey: "[redacted]",
        authorization: "[redacted]",
      },
    });
    expect(queued.provenance).toEqual({
      refreshToken: "[redacted]",
      workspace: "demo",
    });
  });

  it("deduplicates queued writes by caller-provided idempotency key", async () => {
    const write = {
      operation: "memory.put" as const,
      payload: { text: "only once" },
      provenance: { idempotencyKey: "workspace-task-message-1" },
    };

    const first = await queue.enqueue(write);
    const second = await queue.enqueue(write);

    expect(second).toEqual(first);
    expect(queue.list()).toHaveLength(1);
  });

  it("classifies retryable and blocking replay failures separately", async () => {
    const queued = await queue.enqueue({
      operation: "memory.put",
      payload: { text: "classify me" },
    });

    now += 1_000;
    const replaying = await queue.markReplaying(queued.id);
    expect(replaying?.status).toBe("replaying");
    expect(replaying?.attemptCount).toBe(1);

    now += 1_000;
    const retryable = await queue.markFailed(
      queued.id,
      "unavailable",
      "api-0 unavailable",
      now + 30_000,
    );
    expect(retryable?.status).toBe("failed");
    expect(retryable?.nextAttemptAt).toBe(now + 30_000);

    now += 1_000;
    const blocked = await queue.markFailed(
      queued.id,
      "credits",
      "credit recovery required",
    );
    expect(blocked?.status).toBe("blocked");
    expect(blocked?.failureKind).toBe("credits");
  });

  it("removes completed or discarded writes", async () => {
    const queued = await queue.enqueue({
      operation: "memory.put",
      payload: { text: "done" },
    });

    await expect(queue.complete(queued.id)).resolves.toBe(true);
    expect(queue.list()).toEqual([]);
    await expect(queue.discard("missing")).resolves.toBe(false);
  });
});
