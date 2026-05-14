import { RemoteCodingSessionRegistry } from "./RemoteCodingSessionRegistry";

describe("RemoteCodingSessionRegistry", () => {
  it("starts and lists detached sessions", () => {
    const registry = new RemoteCodingSessionRegistry();
    const started = registry.start({ id: "s1", task: "Run lint", createdAt: 1000, timeoutMs: 5000 });

    expect(started.status).toBe("running");
    expect(registry.list()).toHaveLength(1);
    expect(registry.get("s1")?.task).toBe("Run lint");
  });

  it("tracks heartbeat, logs, artifacts, and completion", () => {
    const registry = new RemoteCodingSessionRegistry();
    registry.start({ id: "s1", task: "Fix tests", createdAt: 1000 });

    registry.heartbeat("s1", 1100);
    registry.appendLog("s1", "step 1 complete", 1200);
    registry.addArtifact("s1", "artifacts/run-1.log", 1300);
    const stopped = registry.stop("s1", "completed", 1400);

    expect(stopped.heartbeatAt).toBe(1100);
    expect(stopped.logs).toEqual(["step 1 complete"]);
    expect(stopped.artifacts).toEqual(["artifacts/run-1.log"]);
    expect(stopped.status).toBe("completed");
    expect(stopped.endedAt).toBe(1400);
  });

  it("supports safe cancel and timeout controls", () => {
    const registry = new RemoteCodingSessionRegistry();
    registry.start({ id: "cancel-me", task: "Refactor", createdAt: 0, timeoutMs: 1000 });
    registry.start({ id: "timeout-me", task: "Docs", createdAt: 0, timeoutMs: 1000 });

    const cancelled = registry.cancel("cancel-me", "user_requested", 500);
    const timedOut = registry.expireTimedOutSessions(1501);

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelReason).toBe("user_requested");
    expect(timedOut.map(s => s.id)).toEqual(["timeout-me"]);
    expect(registry.get("timeout-me")?.status).toBe("timed_out");
  });
});
