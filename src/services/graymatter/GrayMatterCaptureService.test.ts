import * as vscode from "vscode";
import { GrayMatterCaptureService } from "./GrayMatterCaptureService";

beforeEach(() => {
  (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
    get: (_key: string, fallback: unknown) => fallback,
  });
});

describe("GrayMatterCaptureService", () => {
  it("writes explicit memories with user scope tags and metadata", async () => {
    const writeMemory = jest.fn(async () => ({ id: "memory-1" }));
    const service = new GrayMatterCaptureService({
      memory: { writeMemory },
      now: () => new Date("2026-05-22T12:00:00.000Z"),
      projectRoot: "/workspace/project",
      valorIdeVersion: "3.22.0",
    });

    await service.capture({
      content: "Always use named exports.",
      kind: "user_explicit",
      scope: "user",
    });

    expect(writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Always use named exports.",
        metadata: expect.objectContaining({
          captureSource: "explicit",
          capturedAt: "2026-05-22T12:00:00.000Z",
          valorIdeVersion: "3.22.0",
        }),
        tags: ["scope:user"],
        type: "preference",
      }),
    );
  });

  it("detects architectural decisions in auto-capture mode", async () => {
    const writeMemory = jest.fn(async () => ({ id: "memory-1" }));
    const service = new GrayMatterCaptureService({
      memory: { writeMemory },
      projectRoot: "/workspace/project",
    });

    await service.maybeCapture(
      "Decision: use Zod for all validation in this project.",
    );

    expect(writeMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Decision: use Zod for all validation in this project.",
        tags: expect.arrayContaining(["scope:project"]),
        type: "decision",
      }),
    );
  });

  it("skips near-duplicate memories", async () => {
    const writeMemory = jest.fn(async () => ({ id: "memory-1" }));
    const service = new GrayMatterCaptureService({
      memory: { writeMemory },
      queryMemory: async () => ({
        results: [{ id: "existing", score: 0.95 }],
      }),
    });

    await service.capture({
      content: "Use generated ThorAPI services before custom wrappers.",
      kind: "decision",
    });

    expect(writeMemory).not.toHaveBeenCalled();
  });
});
