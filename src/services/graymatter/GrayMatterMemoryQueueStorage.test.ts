import {
  loadPendingGrayMatterWrites,
  savePendingGrayMatterWrites,
} from "./GrayMatterMemoryQueueStorage";
import type { PendingGrayMatterWrite } from "./GrayMatterMemoryService";

const createContext = (initial?: unknown) => {
  let stored = initial;
  return {
    globalState: {
      get: jest.fn(async () => stored),
      update: jest.fn(async (_key: string, value: unknown) => {
        stored = value;
      }),
    },
  } as any;
};

describe("GrayMatterMemoryQueueStorage", () => {
  it("retains the verification-only phase and exact receipt across storage reload", async () => {
    const pending: PendingGrayMatterWrite = {
      content: "Uncertain write; do not replay",
      type: "context",
      idempotencyKey: "old-attempt",
      queuedAt: "2026-09-07T17:00:00Z",
      phase: "verification_required",
      memoryId: "883e5d08-fde8-4c68-8b34-c9238a116863",
      lastErrorKind: "unverified",
    };
    const context = createContext();
    await savePendingGrayMatterWrites(context, [pending]);
    await expect(loadPendingGrayMatterWrites(context)).resolves.toEqual([
      pending,
    ]);
  });

  it("loads valid queued writes from durable extension state", async () => {
    const queued: PendingGrayMatterWrite = {
      content: "Replay after restart.",
      idempotencyKey: "todo:restart",
      queuedAt: "2026-06-05T06:33:00.000Z",
      tags: ["graymatter"],
      type: "todo",
    };

    const context = createContext([queued, { malformed: true }]);

    await expect(loadPendingGrayMatterWrites(context)).resolves.toEqual([
      queued,
    ]);
    expect(context.globalState.get).toHaveBeenCalledWith(
      "grayMatterPendingWrites",
    );
  });

  it("clears durable queue state when replay drains all pending writes", async () => {
    const context = createContext([
      {
        content: "old",
        idempotencyKey: "todo:old",
        queuedAt: "2026-06-05T06:33:00.000Z",
        type: "todo",
      },
    ]);

    await savePendingGrayMatterWrites(context, []);

    expect(context.globalState.update).toHaveBeenCalledWith(
      "grayMatterPendingWrites",
      undefined,
    );
  });

  it("persists a defensive copy of queued write arrays", async () => {
    const context = createContext();
    const queued: PendingGrayMatterWrite = {
      content: "Needs replay.",
      idempotencyKey: "context:1",
      metadata: { source: "valoride" },
      queuedAt: "2026-06-05T06:33:00.000Z",
      tags: ["memory"],
      type: "context",
    };

    await savePendingGrayMatterWrites(context, [queued]);

    const [, saved] = context.globalState.update.mock.calls[0];
    expect(saved).toEqual([queued]);
    expect(saved[0]).not.toBe(queued);
    expect(saved[0].tags).not.toBe(queued.tags);
  });
});
