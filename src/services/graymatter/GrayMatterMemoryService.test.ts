import {
  GrayMatterClientError,
  type GrayMatterMemoryInput,
} from "./GrayMatterClient";
import { createHash } from "node:crypto";
import { GrayMatterMemoryService } from "./GrayMatterMemoryService";

const verifiedReceipt = (
  content: string,
  type: GrayMatterMemoryInput["type"],
  id = "883e5d08-fde8-4c68-8b34-c9238a116863",
) => ({
  id,
  type,
  verification: {
    status: "verified",
    purpose: "write_verification",
    contentHash: createHash("sha256").update(content).digest("hex"),
    inputContentHash: createHash("sha256").update(content).digest("hex"),
  },
});

describe("GrayMatterMemoryService", () => {
  it("does not accept a verification receipt for another input", async () => {
    const service = new GrayMatterMemoryService({
      writeMemory: async () => verifiedReceipt("Different input", "decision"),
    });
    expect(
      await service.writeMemory({ content: "Current input", type: "decision" }),
    ).toMatchObject({ status: "unverified" });
  });

  it("retains verification-required records after restart without sending them to a new session", async () => {
    const writeMemory = jest.fn();
    const pending = {
      content: "Uncertain prior write",
      type: "context" as const,
      phase: "verification_required" as const,
      memoryId: "883e5d08-fde8-4c68-8b34-c9238a116863",
      idempotencyKey: "old-attempt",
      queuedAt: "2026-09-07T17:00:00Z",
    };
    const service = new GrayMatterMemoryService({
      writeMemory,
      loadPendingWrites: async () => [pending],
    });
    await service.replayPendingWrites();
    expect(writeMemory).not.toHaveBeenCalled();
    expect(service.getPendingWrites()).toEqual([pending]);
  });
  it("holds unverified write acknowledgements for review and never replays their POST", async () => {
    const id = "883e5d08-fde8-4c68-8b34-c9238a116863";
    const writeMemory = jest.fn(async () => ({ id }));
    const savePendingWrites = jest.fn(async () => undefined);
    const service = new GrayMatterMemoryService({
      writeMemory,
      savePendingWrites,
    });
    expect(
      await service.writeMemory({
        content: "Preserve this evidence.",
        type: "decision",
      }),
    ).toMatchObject({ status: "unverified", memoryId: id });
    expect(service.getPendingWrites()).toEqual([
      expect.objectContaining({ phase: "verification_required", memoryId: id }),
    ]);
    await service.replayPendingWrites();
    expect(writeMemory).toHaveBeenCalledTimes(1);
    expect(service.getPendingWrites()).toHaveLength(1);
    expect(savePendingWrites).toHaveBeenLastCalledWith([
      expect.objectContaining({ phase: "verification_required" }),
    ]);
  });

  it("retains a queued attempt whose acknowledgement cannot establish durable success", async () => {
    const writeMemory = jest.fn(async () => undefined);
    const service = new GrayMatterMemoryService({
      writeMemory,
      loadPendingWrites: async () => [
        {
          content: "Queued evidence.",
          type: "context",
          idempotencyKey: "existing-key",
          queuedAt: "2026-09-07T17:00:00Z",
        },
      ],
    });
    await service.replayPendingWrites();
    await service.replayPendingWrites();
    expect(writeMemory).toHaveBeenCalledTimes(1);
    expect(service.getPendingWrites()).toEqual([
      expect.objectContaining({ phase: "verification_required" }),
    ]);
    expect(
      service
        .getTranscriptSummary()
        .writes.every((write) => write.status !== "written"),
    ).toBe(true);
  });

  it("reports successful durable memory writes in the task transcript summary", async () => {
    const service = new GrayMatterMemoryService({
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      writeMemory: jest.fn(async () =>
        verifiedReceipt(
          "Prefer generated ThorAPI services before custom REST wrappers.",
          "decision",
        ),
      ),
    });

    const result = await service.writeMemory({
      content: "Prefer generated ThorAPI services before custom REST wrappers.",
      tags: ["thorapi", "standards"],
      type: "decision",
    });

    expect(result).toMatchObject({
      memoryId: "883e5d08-fde8-4c68-8b34-c9238a116863",
      status: "written",
      type: "decision",
    });
    expect(service.getPendingWrites()).toEqual([]);
    expect(service.getTranscriptSummary()).toEqual({
      pendingWrites: 0,
      reads: [],
      writes: [
        {
          at: "2026-05-13T12:00:00.000Z",
          id: "883e5d08-fde8-4c68-8b34-c9238a116863",
          status: "written",
          tags: ["thorapi", "standards"],
          type: "decision",
        },
      ],
    });
  });

  it("queues unavailable memory writes without reporting durable success", async () => {
    const service = new GrayMatterMemoryService({
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      writeMemory: jest.fn(async () => {
        throw new GrayMatterClientError(
          "GrayMatter is unavailable.",
          "unavailable",
          503,
        );
      }),
    });

    const result = await service.writeMemory({
      content: "Retry this when api-0 is reachable.",
      type: "todo",
    });

    expect(result).toMatchObject({
      error: "GrayMatter is unavailable.",
      errorKind: "unavailable",
      status: "queued",
      type: "todo",
    });
    expect(result.status).not.toBe("written");
    expect(service.getPendingWrites()).toEqual([
      {
        attempts: 0,
        content: "Retry this when api-0 is reachable.",
        idempotencyKey:
          "todo:2026-05-13T12:00:00.000Z:Retry this when api-0 is reachable.",
        metadata: undefined,
        queuedAt: "2026-05-13T12:00:00.000Z",
        tags: undefined,
        type: "todo",
      },
    ]);
    expect(service.getTranscriptSummary().writes).toEqual([
      {
        at: "2026-05-13T12:00:00.000Z",
        error: "GrayMatter is unavailable.",
        status: "queued",
        tags: undefined,
        type: "todo",
      },
    ]);
  });

  it("marks RBAC failures as failed instead of retrying them offline", async () => {
    const service = new GrayMatterMemoryService({
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      writeMemory: jest.fn(async () => {
        throw new GrayMatterClientError("Forbidden by RBAC", "forbidden", 403);
      }),
    });

    const result = await service.writeMemory({
      content: "This principal cannot write this memory.",
      type: "context",
    });

    expect(result).toMatchObject({
      error: "Forbidden by RBAC",
      errorKind: "forbidden",
      status: "failed",
      type: "context",
    });
    expect(service.getPendingWrites()).toEqual([]);
  });

  it("loads queued writes from storage and replays them once", async () => {
    const writeMemory = jest
      .fn()
      .mockResolvedValueOnce(verifiedReceipt("Queued while offline.", "todo"));
    const savePendingWrites = jest.fn(async () => undefined);
    const service = new GrayMatterMemoryService({
      loadPendingWrites: async () => [
        {
          content: "Queued while offline.",
          idempotencyKey: "todo:1",
          queuedAt: "2026-05-13T11:59:00.000Z",
          type: "todo",
        },
      ],
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      savePendingWrites,
      writeMemory,
    });

    await service.replayPendingWrites();

    expect(writeMemory).toHaveBeenCalledWith({
      content: "Queued while offline.",
      metadata: undefined,
      tags: undefined,
      type: "todo",
    });
    expect(service.getPendingWrites()).toEqual([]);
    expect(savePendingWrites).toHaveBeenCalledWith([]);
  });

  it("keeps queued writes for auth/quota failures and tracks replay attempts", async () => {
    const service = new GrayMatterMemoryService({
      loadPendingWrites: async () => [
        {
          content: "Needs credits",
          idempotencyKey: "todo:2",
          queuedAt: "2026-05-13T11:59:00.000Z",
          type: "todo",
        },
      ],
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      writeMemory: jest.fn(async () => {
        throw new GrayMatterClientError("Need credits", "quota", 402);
      }),
    });

    await service.replayPendingWrites();

    expect(service.getPendingWrites()).toEqual([
      {
        attempts: 1,
        content: "Needs credits",
        idempotencyKey: "todo:2",
        lastError: "Need credits",
        lastErrorKind: "quota",
        lastTriedAt: "2026-05-13T12:00:00.000Z",
        queuedAt: "2026-05-13T11:59:00.000Z",
        type: "todo",
      },
    ]);
  });

  it("redacts sensitive metadata keys before persisting queued writes", async () => {
    const savePendingWrites = jest.fn(async () => undefined);
    const service = new GrayMatterMemoryService({
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      savePendingWrites,
      writeMemory: jest.fn(async () => {
        throw new GrayMatterClientError(
          "GrayMatter is unavailable.",
          "unavailable",
          503,
        );
      }),
    });

    await service.writeMemory({
      content: "Persist with safe metadata",
      metadata: {
        apiKey: "secret",
        source: "valoride",
      },
      type: "context",
    });

    expect(service.getPendingWrites()[0]?.metadata).toEqual({
      source: "valoride",
    });
    expect(savePendingWrites).toHaveBeenCalledWith([
      expect.objectContaining({
        metadata: { source: "valoride" },
      }),
    ]);
  });
});
