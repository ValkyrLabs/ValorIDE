import { GrayMatterClientError } from "./GrayMatterClient";
import { GrayMatterMemoryService } from "./GrayMatterMemoryService";

describe("GrayMatterMemoryService", () => {
  it("reports successful durable memory writes in the task transcript summary", async () => {
    const service = new GrayMatterMemoryService({
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      writeMemory: jest.fn(async () => ({ id: "memory-1" })),
    });

    const result = await service.writeMemory({
      content: "Prefer generated ThorAPI services before custom REST wrappers.",
      tags: ["thorapi", "standards"],
      type: "decision",
    });

    expect(result).toMatchObject({
      memoryId: "memory-1",
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
          id: "memory-1",
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
        content: "Retry this when api-0 is reachable.",
        queuedAt: "2026-05-13T12:00:00.000Z",
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
});
