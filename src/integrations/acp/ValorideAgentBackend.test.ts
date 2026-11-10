import type { RequestPermissionResponse, SessionUpdate } from "@agentclientprotocol/sdk";
import { describe, expect, it } from "@jest/globals";
import type { DetachedTaskHooks } from "@core/task/ExternalTaskInteraction";
import { createValorideAgentBackend } from "./ValorideAgentBackend";

const defer = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(accept => { resolve = accept; }); return { promise, resolve }; };
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

function setup() {
  let hooks!: DetachedTaskHooks;
  const task = { abandoned: false, abortTask: jest.fn(async () => undefined) };
  const controller = { createDetachedAcpTask: jest.fn(async (_prompt: string, value: DetachedTaskHooks) => { hooks = value; return task; }) };
  const active = jest.fn(async () => true), idle = jest.fn(() => true), approve = jest.fn(async () => true);
  const backend = createValorideAgentBackend({ controller, cwd: "/workspace", isWorkspaceActive: active, isWorkspaceIdle: idle, approveSession: approve });
  const updates: SessionUpdate[] = [];
  const permission = jest.fn(async (): Promise<RequestPermissionResponse> => ({ outcome: { outcome: "selected", optionId: "allow-once" } }));
  const callbacks = { onUpdate: (value: SessionUpdate) => updates.push(value), onPermission: permission };
  const signal = new AbortController();
  return { backend, task, controller, active, idle, approve, updates, permission, callbacks, signal, hooks: () => hooks };
}

describe("ValorIDE real-task ACP backend", () => {
  it("requires a local session approval and pinned workspace before creating any real task", async () => {
    const f = setup();
    await expect(f.backend.newSession("/elsewhere", f.signal.signal)).rejects.toThrow("workspace");
    f.approve.mockResolvedValueOnce(false);
    await expect(f.backend.newSession("/workspace", f.signal.signal)).rejects.toThrow("declined");
    expect(f.controller.createDetachedAcpTask).not.toHaveBeenCalled();
    f.idle.mockReturnValueOnce(false);
    await expect(f.backend.newSession("/workspace", f.signal.signal)).rejects.toThrow("local ValorIDE chat");
    await f.backend.close();
  });

  it("owns exactly one session per connection, including after cancellation", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    await expect(f.backend.newSession("/workspace", f.signal.signal)).rejects.toThrow("already owns");
    await f.backend.cancel(sessionId);
    await expect(f.backend.newSession("/workspace", f.signal.signal)).rejects.toThrow("Reconnect");
    expect(f.approve).toHaveBeenCalledTimes(1); await f.backend.close();
  });

  it("streams incremental real task messages without reflecting user input or model request secrets", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Implement ACP", f.signal.signal, f.callbacks);
    await tick();
    expect(f.controller.createDetachedAcpTask).toHaveBeenCalledWith("Implement ACP", expect.any(Object));
    const first = { ts: 1, type: "say" as const, say: "text" as const, text: "Implement ACP" };
    await f.hooks().onMessages([first, { ts: 2, type: "say", say: "api_req_started", text: "secret model config" }]);
    await f.hooks().onMessages([first, { ts: 3, type: "say", say: "text", text: "Hello", partial: true }]);
    await f.hooks().onMessage({ type: "partialMessage", partialMessage: { ts: 3, type: "say", say: "text", text: "Hello world", partial: false } });
    const waiting = f.hooks().ask({ ts: 4, type: "ask", ask: "completion_result", text: "" }).catch(() => undefined);
    await expect(turn).resolves.toEqual({ stopReason: "end_turn" });
    const text = f.updates.filter((u): u is Extract<SessionUpdate, { sessionUpdate: "agent_message_chunk" }> => u.sessionUpdate === "agent_message_chunk").map(u => u.content.type === "text" ? u.content.text : "").join("");
    expect(text).toBe("Hello world");
    expect(JSON.stringify(f.updates)).not.toContain("secret");
    expect(f.task.abortTask).not.toHaveBeenCalled();
    await f.backend.close(); await waiting;
  });

  it("continues the same real task by answering its retained followup ask", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const first = f.backend.prompt(sessionId, "Build it", f.signal.signal, f.callbacks); await tick();
    const answer = f.hooks().ask({ ts: 5, type: "ask", ask: "followup", text: JSON.stringify({ question: "Which directory?" }) });
    await expect(first).resolves.toEqual({ stopReason: "end_turn" });
    const second = f.backend.prompt(sessionId, "src/tools", f.signal.signal, f.callbacks);
    await expect(answer).resolves.toEqual({ response: "messageResponse", text: "src/tools" });
    expect(f.controller.createDetachedAcpTask).toHaveBeenCalledTimes(1);
    await f.backend.cancel(sessionId); await expect(second).resolves.toEqual({ stopReason: "cancelled" });
    await f.backend.close();
  });

  it("requests one-shot permission for the exact tool ask and does not autoapprove", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Inspect", f.signal.signal, f.callbacks); await tick();
    const permission = defer<RequestPermissionResponse>(); f.permission.mockReturnValueOnce(permission.promise);
    const answer = f.hooks().ask({ ts: 8, type: "ask", ask: "command", text: "git status --short" });
    await tick();
    expect(f.permission).toHaveBeenCalledWith(expect.objectContaining({ sessionId, toolCall: expect.objectContaining({ toolCallId: `${sessionId}:8`, status: "pending" }), options: [expect.objectContaining({ kind: "allow_once" }), expect.objectContaining({ kind: "reject_once" })] }));
    permission.resolve({ outcome: { outcome: "selected", optionId: "allow-once" } });
    await expect(answer).resolves.toEqual({ response: "yesButtonClicked" });
    expect(f.updates).toContainEqual(expect.objectContaining({ sessionUpdate: "tool_call_update", status: "in_progress" }));
    await f.backend.cancel(sessionId); await turn; await f.backend.close();
  });

  it.each(["reject-once", "allow-always", "unexpected"])("fails closed for permission %s", async optionId => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Read", f.signal.signal, f.callbacks); await tick();
    f.permission.mockResolvedValueOnce({ outcome: { outcome: "selected", optionId } });
    await expect(f.hooks().ask({ ts: 8, type: "ask", ask: "tool", text: '{"tool":"readFile","path":"README.md"}' })).resolves.toEqual({ response: "noButtonClicked" });
    await f.backend.cancel(sessionId); await turn; await f.backend.close();
  });

  it("cancels an unresolved permission and never accepts its late approval", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Edit", f.signal.signal, f.callbacks); await tick();
    const permission = defer<RequestPermissionResponse>(); f.permission.mockReturnValueOnce(permission.promise);
    const answer = f.hooks().ask({ ts: 8, type: "ask", ask: "command", text: "touch result.txt" });
    const rejected = expect(answer).rejects.toThrow("no longer active"); await tick();
    f.signal.abort(); await expect(turn).resolves.toEqual({ stopReason: "cancelled" }); await rejected;
    permission.resolve({ outcome: { outcome: "selected", optionId: "allow-once" } }); await tick();
    expect(f.task.abortTask).toHaveBeenCalledTimes(1);
    expect(f.updates).not.toContainEqual(expect.objectContaining({ status: "in_progress" }));
    await f.backend.close();
  });

  it("rejects oversized execution payloads rather than approving hidden truncated content", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Run", f.signal.signal, f.callbacks); await tick();
    await expect(f.hooks().ask({ ts: 11, type: "ask", ask: "command", text: "x".repeat(60_001) })).resolves.toEqual(expect.objectContaining({ response: "noButtonClicked" }));
    expect(f.permission).not.toHaveBeenCalled(); await f.backend.cancel(sessionId); await turn; await f.backend.close();
  });

  it("refuses concurrent prompts, unknown sessions and stale cancelled sessions", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "One", f.signal.signal, f.callbacks);
    await expect(f.backend.prompt(sessionId, "Two", f.signal.signal, f.callbacks)).rejects.toThrow("already running");
    await expect(f.backend.prompt("foreign", "Three", f.signal.signal, f.callbacks)).rejects.toThrow("Unknown");
    await tick(); await f.backend.cancel(sessionId); await turn;
    await expect(f.backend.prompt(sessionId, "Again", f.signal.signal, f.callbacks)).rejects.toThrow("stopped");
    await f.backend.close();
  });

  it("aborts only its owned task if native chat starts or trust changes", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Work", f.signal.signal, f.callbacks); const rejected = expect(turn).rejects.toThrow("local ValorIDE chat"); await tick();
    f.idle.mockReturnValue(false);
    await expect(f.hooks().onMessages([])).rejects.toThrow("local ValorIDE chat"); await rejected;
    expect(f.task.abandoned).toBe(true); expect(f.task.abortTask).toHaveBeenCalledTimes(1);
    await f.backend.close();
  });

  it("surfaces provider failure as a failed prompt, not a successful end turn", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Work", f.signal.signal, f.callbacks); const rejected = expect(turn).rejects.toThrow("Invalid API key"); await tick();
    await expect(f.hooks().ask({ ts: 12, type: "ask", ask: "api_req_failed", text: "Invalid API key" })).rejects.toThrow("Invalid API key");
    await rejected; expect(f.permission).not.toHaveBeenCalled(); expect(f.task.abortTask).toHaveBeenCalledTimes(1); await f.backend.close();
  });

  it("fails a prompt if the actual task fails to initialize", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const turn = f.backend.prompt(sessionId, "Work", f.signal.signal, f.callbacks); const rejected = expect(turn).rejects.toThrow("Initialization failed"); await tick();
    f.hooks().onFatalError(new Error("Initialization failed")); await rejected; await f.backend.close();
  });

  it("does not release ownership until a pending construction has been aborted on close", async () => {
    const f = setup(), { sessionId } = await f.backend.newSession("/workspace", f.signal.signal);
    const created = defer<typeof f.task>(); f.controller.createDetachedAcpTask.mockReturnValueOnce(created.promise);
    const turn = f.backend.prompt(sessionId, "Work", f.signal.signal, f.callbacks); await tick();
    let closed = false; const closing = Promise.resolve(f.backend.close()).then(() => { closed = true; });
    await tick(); expect(closed).toBe(false);
    created.resolve(f.task); await closing;
    expect(f.task.abandoned).toBe(true); expect(f.task.abortTask).toHaveBeenCalledTimes(1);
    await expect(turn).resolves.toEqual({ stopReason: "cancelled" });
  });
});
