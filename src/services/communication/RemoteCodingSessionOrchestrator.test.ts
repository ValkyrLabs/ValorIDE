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

  it("expires timed-out sessions via command", () => {
    const registry = new RemoteCodingSessionRegistry();
    const orchestrator = new RemoteCodingSessionOrchestrator(registry);

    registry.start({ id: "s2", task: "Long run", timeoutMs: 1, createdAt: 100 });

    const expired = orchestrator.handle({
      id: "cmd-6",
      type: "remote-coding-session-expire-timeouts",
    });

    expect(expired.sessions?.length).toBe(1);
    expect(expired.sessions?.[0].id).toBe("s2");
    expect(expired.sessions?.[0].status).toBe("timed_out");
  });

  it("supports template listing and preset-driven starts", () => {
    const orchestrator = new RemoteCodingSessionOrchestrator(new RemoteCodingSessionRegistry());

    const templates = orchestrator.handle({
      id: "cmd-7",
      type: "remote-coding-template-list",
    });
    expect(templates.templates?.length).toBeGreaterThan(0);

    const saved = orchestrator.handle({
      id: "cmd-8",
      type: "remote-coding-preset-save",
      payload: {
        id: "org-docs",
        name: "Org docs preset",
        scope: "org",
        ownerId: "valkyrlabs",
        templateId: "docs",
        params: {
          area: "remote sessions",
        },
      },
    });
    expect(saved.preset?.id).toBe("org-docs");

    const startedFromPreset = orchestrator.handle({
      id: "cmd-9",
      type: "remote-coding-session-start",
      payload: {
        sessionId: "s9",
        presetId: "org-docs",
      },
    });
    expect(startedFromPreset.session?.task).toContain("remote sessions");
  });
});
