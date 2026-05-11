import { RemoteCodingSessionRegistry } from "./RemoteCodingSessionRegistry";
import { RemoteCodingSessionOrchestrator } from "./RemoteCodingSessionOrchestrator";

describe("RemoteCodingSessionOrchestrator", () => {
  it("supports start/list/cancel lifecycle", () => {
    const orchestrator = new RemoteCodingSessionOrchestrator(new RemoteCodingSessionRegistry());

    const started = orchestrator.handle({
      id: "cmd-1",
      type: "remote-coding-session-start",
      payload: { sessionId: "s1", task: "Implement endpoint", timeoutMs: 1000 },
    });
    expect(started.session?.status).toBe("running");

    orchestrator.handle({
      id: "cmd-2",
      type: "remote-coding-session-heartbeat",
      payload: { sessionId: "s1" },
    });

    orchestrator.handle({
      id: "cmd-3",
      type: "remote-coding-session-log",
      payload: { sessionId: "s1", log: "step1" },
    });

    const listed = orchestrator.handle({
      id: "cmd-4",
      type: "remote-coding-session-list",
    });
    expect(listed.sessions?.length).toBe(1);
    expect(listed.sessions?.[0].logs).toEqual(["step1"]);

    const cancelled = orchestrator.handle({
      id: "cmd-5",
      type: "remote-coding-session-cancel",
      payload: { sessionId: "s1", reason: "user_requested" },
    });
    expect(cancelled.session?.status).toBe("cancelled");
  });
});
