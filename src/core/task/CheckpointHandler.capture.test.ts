jest.mock("@integrations/checkpoints/CheckpointTracker", () => ({
  __esModule: true,
  default: {},
}));
jest.mock("@integrations/editor/DiffViewProvider", () => ({
  DIFF_VIEW_URI_SCHEME: "test",
}));
const { CheckpointHandler } = jest.requireActual<
  typeof import("./CheckpointHandler")
>("./CheckpointHandler");

describe("tool checkpoint capture barrier", () => {
  it("waits for the actual commit and durable history before releasing the caller", async () => {
    let commit!: (hash: string) => void, persisted!: () => void;
    const commitPromise = new Promise<string>((resolve) => {
      commit = resolve;
    });
    const historyPromise = new Promise<void>((resolve) => {
      persisted = resolve;
    });
    const message = { type: "say", say: "checkpoint_created", ts: 1 } as any;
    const save = jest.fn(() => historyPromise);
    let finished = false;
    const barrier = CheckpointHandler.captureCheckpoint(
      { commit: () => commitPromise },
      message,
      save,
    ).then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    expect(save).not.toHaveBeenCalled();
    commit("exact-snapshot");
    await Promise.resolve();
    await Promise.resolve();
    expect(message.lastCheckpointHash).toBe("exact-snapshot");
    expect(save).toHaveBeenCalledTimes(1);
    expect(finished).toBe(false);
    persisted();
    await barrier;
    expect(finished).toBe(true);
  });
  it("propagates capture and history failure to prevent dependent dispatch", async () => {
    const save = jest.fn(async () => undefined);
    await expect(
      CheckpointHandler.captureCheckpoint(
        {
          commit: async () => {
            throw new Error("capture failed");
          },
        },
        {} as any,
        save,
      ),
    ).rejects.toThrow("capture failed");
    expect(save).not.toHaveBeenCalled();
    await expect(
      CheckpointHandler.captureCheckpoint(
        { commit: async () => "snapshot" },
        {} as any,
        async () => {
          throw new Error("history failed");
        },
      ),
    ).rejects.toThrow("history failed");
  });
  it("respects explicitly disabled checkpoint tracking", async () => {
    const save = jest.fn(async () => undefined);
    await CheckpointHandler.captureCheckpoint(undefined, undefined, save);
    expect(save).not.toHaveBeenCalled();
  });
});
