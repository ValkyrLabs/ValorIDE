import { randomUUID } from "node:crypto";
import path from "node:path";
import type { PromptResponse, RequestPermissionRequest, RequestPermissionResponse, SessionUpdate, ToolCall, ToolKind } from "@agentclientprotocol/sdk";
import type { ValorIDEMessage } from "@shared/ExtensionMessage";
import type { DetachedTaskHooks, ExternalTaskAnswer } from "@core/task/ExternalTaskInteraction";
import type { ValorideAcpBackend } from "./AcpAgentBridge";

/** Narrow task port keeps the protocol adapter independent from providers and the visible UI. */
export interface DetachedAcpTask {
  abortTask(): Promise<void>;
  abandoned: boolean;
}

export interface ValorideAgentBackendOptions {
  controller: { createDetachedAcpTask(prompt: string, hooks: DetachedTaskHooks): Promise<DetachedAcpTask> };
  cwd: string;
  isWorkspaceActive(): void | boolean | Promise<void | boolean>;
  isWorkspaceIdle(): boolean;
  approveSession(): Promise<boolean>;
}

type Callbacks = Parameters<ValorideAcpBackend["prompt"]>[3];
type ActiveTurn = { callbacks: Callbacks; resolve(result: PromptResponse): void; reject(error: Error): void; signal: AbortSignal; cleanup(): void };
type PendingInput = { resolve(answer: ExternalTaskAnswer): void; reject(error: Error): void };
type Session = {
  id: string;
  task?: DetachedAcpTask;
  initializing?: Promise<void>;
  turn?: ActiveTurn;
  input?: PendingInput;
  stopped: boolean;
  initialTextSeen: boolean;
  text: Map<number, string>;
  tools: Map<number, ToolCall>;
  retainedChars: number;
  toolChars: Map<number, number>;
  lastTextKey?: string;
  pendingPermissions: Set<() => void>;
};
const cancelledPermission = (): RequestPermissionResponse => ({ outcome: { outcome: "cancelled" } });
const errorOf = (error: unknown) => error instanceof Error ? error : new Error(String(error));
const maximumMessages = 20_000;
const maximumMessageChars = 2_000_000;
const maximumTranscriptChars = 8_000_000;
const contentLimit = 60_000;
const bounded = (value: string) => value.length <= contentLimit ? value : value.slice(0, contentLimit) + "\n[Content truncated]";

function questionText(message: Readonly<ValorIDEMessage>): string {
  if (!message.text) return "";
  try {
    const data = JSON.parse(message.text);
    return typeof data.question === "string" ? data.question : typeof data.response === "string" ? data.response : message.text;
  } catch { return message.text; }
}

function toolDetails(message: Readonly<ValorIDEMessage>, sessionId: string): ToolCall {
  let title = message.ask === "command" ? "Run command" : message.ask === "command_output" ? "Continue command" : "Approve " + (message.ask || "tool").replaceAll("_", " ");
  let kind: ToolKind = message.ask === "command" || message.ask === "command_output" ? "execute" : message.ask?.startsWith("browser_action") ? "fetch" : "other";
  try {
    const data = JSON.parse(message.text || "{}");
    if (typeof data.tool === "string") {
      title = data.tool;
      kind = /edited|created|write|replace/i.test(data.tool) ? "edit" : /read|list|search/i.test(data.tool) ? "read" : "other";
    }
    if (message.ask === "use_mcp_server" && typeof data.toolName === "string") title = `MCP: ${data.toolName}`;
  } catch { /* Plain command text is already the canonical approval payload. */ }
  return { toolCallId: `${sessionId}:${message.ts}`, title: bounded(title), kind, status: "pending",
    content: message.text ? [{ type: "content", content: { type: "text", text: bounded(message.text) } }] : [] };
}

/** Each approved connection owns one detached task, never the controller's current chat task. */
export function createValorideAgentBackend(options: ValorideAgentBackendOptions): ValorideAcpBackend {
  let closed = false, creating = false, session: Session | undefined;
  let shutdown: Promise<void> = Promise.resolve();

  const assertActive = async () => {
    if (closed) throw new Error("The ValorIDE ACP connection is closed.");
    if (await options.isWorkspaceActive() === false) throw new Error("The ACP workspace is no longer active or trusted.");
    if (!options.isWorkspaceIdle()) throw new Error("A local ValorIDE chat is open. Clear it before using ACP.");
  };
  const requireSession = (id: string) => {
    if (!session || id !== session.id) throw new Error("Unknown ValorIDE ACP session.");
    return session;
  };
  const finish = (current: Session, result: PromptResponse | Error) => {
    const turn = current.turn;
    if (!turn) return;
    current.turn = undefined;
    turn.cleanup();
    for (const cancel of current.pendingPermissions) cancel();
    current.pendingPermissions.clear();
    if (result instanceof Error) turn.reject(result); else turn.resolve(result);
  };
  const stop = async (current: Session, result: PromptResponse | Error = { stopReason: "cancelled" }) => {
    current.stopped = true;
    current.input?.reject(new Error("The ACP task was stopped."));
    current.input = undefined;
    finish(current, result);
    for (const cancel of current.pendingPermissions) cancel();
    current.pendingPermissions.clear();
    const task = current.task;
    current.task = undefined;
    if (task) {
      task.abandoned = true;
      try { await task.abortTask(); } catch { /* Already stopped; no visible task is touched. */ }
    }
  };
  const fail = (current: Session, error: unknown) => {
    if (current.stopped) return;
    shutdown = stop(current, errorOf(error));
  };
  const validate = async (current: Session) => {
    if (current.stopped || current !== session) throw new Error("The ACP task is no longer active.");
    try { await assertActive(); } catch (error) { fail(current, error); throw error; }
  };
  const emit = (current: Session, update: SessionUpdate) => current.turn?.callbacks.onUpdate(update);
  const emitText = (current: Session, key: string, text: string, thought = false) => {
    if (!text) return;
    if (current.lastTextKey !== undefined && current.lastTextKey !== key) text = "\n\n" + text;
    current.lastTextKey = key;
    for (let offset = 0; offset < text.length; offset += contentLimit) {
      emit(current, { sessionUpdate: thought ? "agent_thought_chunk" : "agent_message_chunk", content: { type: "text", text: text.slice(offset, offset + contentLimit) } });
    }
  };
  const completeTools = (current: Session) => {
    for (const tool of current.tools.values()) {
      if (tool.status === "in_progress") {
        tool.status = "completed";
        emit(current, { sessionUpdate: "tool_call_update", toolCallId: tool.toolCallId, status: "completed" });
      }
    }
  };
  const publish = (current: Session, message: Readonly<ValorIDEMessage>) => {
    if (!current.turn || current.stopped) return;
    if (current.text.size + current.tools.size > maximumMessages) throw new Error("ACP session transcript limit reached; start a new session.");
    if (message.type === "say" && message.say === "api_req_started") { completeTools(current); return; }
    // Task's first text row is the user's input, not an assistant response.
    if (!current.initialTextSeen && message.type === "say" && message.say === "text") {
      current.initialTextSeen = true; current.text.set(message.ts, message.text || ""); current.retainedChars += message.text?.length || 0; return;
    }
    if (message.type === "ask" && !["followup", "plan_mode_respond", "completion_result"].includes(message.ask || "")) {
      if (!["command", "command_output", "tool", "use_mcp_server", "browser_action", "browser_action_launch"].includes(message.ask || "")) return;
      const tool = toolDetails(message, current.id), previous = current.tools.get(message.ts);
      const size = JSON.stringify(tool).length;
      if (!previous || previous.status === "pending") {
        current.retainedChars += size - (current.toolChars.get(message.ts) || 0);
        current.toolChars.set(message.ts, size);
        if (current.retainedChars > maximumTranscriptChars) throw new Error("ACP transcript size limit reached; reconnect to start a new session.");
      }
      if (!previous) { current.tools.set(message.ts, tool); emit(current, { sessionUpdate: "tool_call", ...tool }); }
      else if (previous.status === "pending") { current.tools.set(message.ts, tool); emit(current, { sessionUpdate: "tool_call_update", ...tool }); }
      return;
    }
    const readable = message.type === "say" && ["text", "reasoning", "completion_result", "error", "command_output", "mcp_server_response", "diff_error"].includes(message.say || "");
    const question = message.type === "ask" && ["followup", "plan_mode_respond"].includes(message.ask || "");
    if (!readable && !question) return;
    const text = question ? questionText(message) : message.text || message.reasoning || "";
    if (text.length > maximumMessageChars) throw new Error("ACP message size limit reached; start a new session.");
    const previous = current.text.get(message.ts) || "";
    if (text === previous) return;
    current.retainedChars += text.length - previous.length;
    if (current.retainedChars > maximumTranscriptChars) throw new Error("ACP transcript size limit reached; reconnect to start a new session.");
    current.text.set(message.ts, text);
    const delta = text.startsWith(previous) ? text.slice(previous.length) : "\n[Updated message]\n" + text;
    emitText(current, String(message.ts), delta, message.say === "reasoning");
  };

  const hooksFor = (current: Session): DetachedTaskHooks => ({
    assertActive: () => validate(current),
    onMessages: async messages => { await validate(current); for (const message of messages) publish(current, message); },
    onMessage: async message => { await validate(current); if (message.type === "partialMessage" && message.partialMessage) publish(current, message.partialMessage); },
    onFatalError: error => fail(current, error),
    onTerminal: event => {
      if (event.kind === "failed" && event.source === "runtime-envelope") fail(current, new Error(event.error?.message || event.summary));
      else if (event.kind === "outcome-uncertain" && event.error?.code === "ERR_TASK_ABORTED" && !current.stopped) fail(current, new Error("The ValorIDE task was interrupted."));
    },
    ask: async message => {
      await validate(current);
      if (!current.turn) throw new Error("No active ACP prompt owns this ask.");
      if (message.ask === "api_req_failed") {
        const error = new Error(message.text || "The selected model request failed.");
        fail(current, error); throw error;
      }
      if (["completion_result", "followup", "plan_mode_respond"].includes(message.ask || "")) {
        publish(current, message);
        const input = new Promise<ExternalTaskAnswer>((resolve, reject) => { current.input = { resolve, reject }; });
        completeTools(current);
        finish(current, { stopReason: "end_turn" });
        return input;
      }
      if (!["command", "command_output", "tool", "use_mcp_server", "browser_action", "browser_action_launch"].includes(message.ask || "")) {
        return { response: "noButtonClicked", text: "This interaction is unavailable through ACP. Use the native ValorIDE chat for this operation." };
      }
      publish(current, message);
      const turn = current.turn, tool = current.tools.get(message.ts)!;
      // Never ask a user to approve a command/diff whose tail was hidden by UI limits.
      if ((message.text?.length || 0) > contentLimit) {
        tool.status = "failed";
        emit(current, { sessionUpdate: "tool_call_update", toolCallId: tool.toolCallId, status: "failed" });
        return { response: "noButtonClicked", text: "Permission payload is too large to display safely through ACP; split this operation into smaller steps." };
      }
      const request: RequestPermissionRequest = { sessionId: current.id, toolCall: tool,
        options: [{ optionId: "allow-once", name: "Allow once", kind: "allow_once" }, { optionId: "reject-once", name: "Reject", kind: "reject_once" }] };
      let cancel!: () => void;
      const cancelled = new Promise<RequestPermissionResponse>(resolve => { cancel = () => resolve(cancelledPermission()); });
      current.pendingPermissions.add(cancel);
      let decision: RequestPermissionResponse;
      try { decision = await Promise.race([turn.callbacks.onPermission(request), cancelled]); }
      catch (error) { fail(current, error); throw error; }
      finally { current.pendingPermissions.delete(cancel); }
      await validate(current);
      if (current.turn !== turn || turn.signal.aborted) throw new Error("The ACP permission request was cancelled.");
      if (decision.outcome.outcome === "cancelled") {
        await stop(current); throw new Error("The ACP permission request was cancelled.");
      }
      const approved = decision.outcome.optionId === "allow-once";
      tool.status = approved ? "in_progress" : "failed";
      emit(current, { sessionUpdate: "tool_call_update", toolCallId: tool.toolCallId, status: tool.status });
      return { response: approved ? "yesButtonClicked" : "noButtonClicked" };
    },
  });

  return {
    async newSession(cwd, signal) {
      if (creating || session?.turn) throw new Error("An ACP session operation is already running.");
      if (session) throw new Error("This connection already owns an ACP session. Reconnect to start a new session.");
      creating = true;
      try {
        await assertActive();
        if (signal.aborted) throw new Error("ACP session creation was cancelled.");
        if (path.resolve(cwd) !== path.resolve(options.cwd)) throw new Error("ACP sessions must use the workspace enabled in ValorIDE.");
        if (!await options.approveSession()) throw new Error("The ValorIDE user declined this ACP session.");
        await assertActive();
        if (signal.aborted) throw new Error("ACP session creation was cancelled.");
        await shutdown;
        session = { id: randomUUID(), stopped: false, initialTextSeen: false, text: new Map(), tools: new Map(), retainedChars: 0, toolChars: new Map(), pendingPermissions: new Set() };
        return { sessionId: session.id };
      } finally { creating = false; }
    },
    async prompt(id, text, signal, callbacks) {
      const current = requireSession(id);
      if (creating || current.turn) throw new Error("An ACP prompt is already running.");
      if (current.stopped) throw new Error("This ACP task was stopped. Reconnect to start a new session.");
      if (!text.trim() || Buffer.byteLength(text) > 1024 * 1024) throw new Error("ACP prompts must contain text smaller than 1 MiB.");
      // Reserve synchronously before trust checks so direct callers cannot race two prompts.
      let resolve!: (value: PromptResponse) => void, reject!: (error: Error) => void;
      const result = new Promise<PromptResponse>((accept, decline) => { resolve = accept; reject = decline; });
      const abort = () => { shutdown = stop(current); };
      current.turn = { callbacks, resolve, reject, signal, cleanup: () => signal.removeEventListener("abort", abort) };
      signal.addEventListener("abort", abort, { once: true });
      current.initializing = (async () => {
        try {
          await validate(current);
          if (signal.aborted) { await stop(current); return; }
          if (current.input) {
            const input = current.input; current.input = undefined;
            input.resolve({ response: "messageResponse", text });
          } else if (!current.task) {
            const task = await options.controller.createDetachedAcpTask(text, hooksFor(current));
            if (current.stopped || closed) { task.abandoned = true; await task.abortTask(); }
            else current.task = task;
          } else throw new Error("The ACP task is not waiting for another prompt.");
        } catch (error) { fail(current, error); }
      })();
      return result;
    },
    async cancel(id) { const current = requireSession(id); await stop(current); await current.initializing; },
    async close() { closed = true; if (session) { await stop(session); await session.initializing; } await shutdown; },
  };
}
