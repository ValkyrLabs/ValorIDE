import {
  InitialCheckpointCoordinator,
  mutatesWorkspaceDuringStreaming,
  requiresInitialCheckpointBarrier,
} from "./InitialCheckpointCoordinator";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

describe("InitialCheckpointCoordinator", () => {
  it("starts capture without blocking read-only tools", async () => {
    const capture = deferred();
    const coordinator = new InitialCheckpointCoordinator();
    const startResult = coordinator.start(() => capture.promise);

    expect(startResult).toBeUndefined();
    await expect(coordinator.beforeTool("read_file")).resolves.toBeUndefined();
    expect(requiresInitialCheckpointBarrier("search_files")).toBe(false);
    expect(mutatesWorkspaceDuringStreaming("use_mcp_tool")).toBe(false);
    expect(mutatesWorkspaceDuringStreaming("write_to_file")).toBe(true);

    capture.resolve();
    await coordinator.onIdle();
  });

  for (const toolName of [
    "execute_command",
    "precision_search_and_replace",
    "replace_in_file",
    "use_mcp_tool",
    "write_to_file",
  ] as const) {
    it(`holds ${toolName} until the initial capture is safe`, async () => {
      const capture = deferred();
      const coordinator = new InitialCheckpointCoordinator();
      coordinator.start(() => capture.promise);

      let passedBarrier = false;
      const barrier = coordinator.beforeTool(toolName).then(() => {
        passedBarrier = true;
      });
      await Promise.resolve();
      expect(passedBarrier).toBe(false);

      capture.resolve();
      await barrier;
      expect(passedBarrier).toBe(true);
    });
  }

  it("can guard a nominally read-only tool when a pre-tool hook may mutate", async () => {
    const capture = deferred();
    const coordinator = new InitialCheckpointCoordinator();
    coordinator.start(() => capture.promise);

    let passedBarrier = false;
    const barrier = coordinator.beforeTool("read_file", true).then(() => {
      passedBarrier = true;
    });
    await Promise.resolve();
    expect(passedBarrier).toBe(false);

    capture.resolve();
    await barrier;
    expect(passedBarrier).toBe(true);
  });

  it("fails open after recording a checkpoint error", async () => {
    const onError = jest.fn();
    const coordinator = new InitialCheckpointCoordinator(onError);
    coordinator.start(async () => {
      throw new Error("shadow git unavailable");
    });

    await expect(
      coordinator.beforeTool("write_to_file"),
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "shadow git unavailable" }),
    );
  });
});
