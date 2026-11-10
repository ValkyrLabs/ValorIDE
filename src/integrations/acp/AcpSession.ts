import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";

/** A launch description supplied by the trusted editor host, never by the agent. */
export interface AcpAgentLaunch {
  id: string;
  name: string;
  command: string;
  args?: readonly string[];
}

export type AcpSessionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "starting"
  | "authenticating"
  | "ready"
  | "prompting"
  | "cancelling"
  | "closed";

export interface AcpSessionState {
  status: AcpSessionStatus;
  busy: boolean;
  sessionId?: string;
  initialization?: acp.InitializeResponse;
  modes?: acp.SessionModeState;
  error?: string;
}

export interface AcpSessionCallbacks {
  onState?(state: AcpSessionState): void;
  onUpdate?(notification: acp.SessionNotification): void;
  requestPermission(
    request: acp.RequestPermissionRequest,
    signal: AbortSignal,
  ): Promise<acp.RequestPermissionResponse>;
  readTextFile?(
    request: acp.ReadTextFileRequest,
    signal: AbortSignal,
  ): Promise<acp.ReadTextFileResponse>;
  writeTextFile?(
    request: acp.WriteTextFileRequest,
    signal: AbortSignal,
  ): Promise<acp.WriteTextFileResponse>;
}

export interface AcpSessionOptions {
  agent: AcpAgentLaunch;
  cwd: string;
  /** Explicit launch environment, assembled by the host; no IDE secrets are added here. */
  environment: NodeJS.ProcessEnv;
  callbacks: AcpSessionCallbacks;
  clientVersion?: string;
  controlTimeoutMs?: number;
  cancelGraceMs?: number;
}

const cancelledPermission = (): acp.RequestPermissionResponse => ({
  outcome: { outcome: "cancelled" },
});

/**
 * One independently-owned ACP v1 process and conversation. An ACP agent owns its
 * tool loop: its output must never enter ValorIDE's model/XML execution loop.
 */
export class AcpSession {
  private readonly options: AcpSessionOptions;
  private child?: ChildProcessWithoutNullStreams;
  private connection?: acp.ClientConnection;
  private snapshot: AcpSessionState = { status: "disconnected", busy: false };
  private activeOperation = false;
  private promptScope?: AbortController;
  private pendingSessionId?: string;
  private permissionPending = false;
  private cancelTimer?: ReturnType<typeof setTimeout>;
  private killed = false;
  private closing = false;

  constructor(options: AcpSessionOptions) {
    if (!path.isAbsolute(options.cwd))
      throw new Error("ACP requires an absolute workspace path.");
    if (!options.agent.command || options.agent.command.includes("\0"))
      throw new Error("Configure a valid ACP executable.");
    if (
      options.agent.args?.some(
        (arg) => typeof arg !== "string" || arg.includes("\0"),
      )
    )
      throw new Error("ACP arguments must be strings without null characters.");
    // A settings edit must not silently alter a running agent's authority.
    this.options = {
      ...options,
      agent: { ...options.agent, args: [...(options.agent.args ?? [])] },
      environment: { ...options.environment },
      callbacks: { ...options.callbacks },
    };
  }

  get state(): AcpSessionState {
    return structuredClone(this.snapshot);
  }

  async connect(): Promise<acp.InitializeResponse> {
    if (this.snapshot.status !== "disconnected")
      throw new Error("This ACP connection has already been started.");
    this.setState({ status: "connecting", busy: true });
    this.activeOperation = true;
    try {
      const child = (this.child = spawn(
        this.options.agent.command,
        [...(this.options.agent.args ?? [])],
        {
          cwd: this.options.cwd,
          env: this.options.environment,
          shell: false,
          windowsHide: true,
          // A private group permits shutdown of descendants spawned by this agent.
          detached: process.platform !== "win32",
          stdio: ["pipe", "pipe", "pipe"],
        },
      ));
      child.stderr.resume(); // Drain diagnostics, but never leak credentials into IDE logs.
      child.once("error", (error: NodeJS.ErrnoException) =>
        this.shutdown(
          `ACP process could not start (${error.code || "process error"}).`,
        ),
      );
      child.once("exit", (code, signal) =>
        this.shutdown(
          `ACP process exited${signal ? ` (${signal})` : ` with code ${code ?? "unknown"}`}.`,
        ),
      );
      const callbacks = this.options.callbacks;
      const client = acp
        .client({ name: "valoride" })
        .onRequest(acp.methods.client.session.requestPermission, (ctx) =>
          this.permission(ctx.params, ctx.signal),
        )
        .onNotification(acp.methods.client.session.update, (ctx) =>
          this.update(ctx.params),
        );
      if (callbacks.readTextFile)
        client.onRequest(acp.methods.client.fs.readTextFile, (ctx) =>
          this.read(ctx.params, ctx.signal),
        );
      if (callbacks.writeTextFile)
        client.onRequest(acp.methods.client.fs.writeTextFile, (ctx) =>
          this.write(ctx.params, ctx.signal),
        );
      this.connection = client.connect(
        acp.ndJsonStream(
          Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
          Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
          { maxMessageBytes: 4 * 1024 * 1024 },
        ),
      );
      this.connection.signal.addEventListener(
        "abort",
        () => this.shutdown("ACP connection closed."),
        { once: true },
      );
      const result = await this.control(
        this.connection.agent.request(acp.methods.agent.initialize, {
          protocolVersion: acp.PROTOCOL_VERSION,
          clientInfo: {
            name: "valoride",
            title: "ValorIDE",
            version: this.options.clientVersion || "development",
          },
          clientCapabilities: {
            fs: {
              readTextFile: !!callbacks.readTextFile,
              writeTextFile: !!callbacks.writeTextFile,
            },
          },
        }),
        "initialization",
      );
      if (result.protocolVersion !== acp.PROTOCOL_VERSION)
        throw new Error(
          `The ACP agent selected unsupported protocol version ${result.protocolVersion}.`,
        );
      this.setState({
        status: "connected",
        busy: false,
        initialization: result,
      });
      return result;
    } catch (error) {
      this.shutdown(
        error instanceof Error ? error.message : "ACP initialization failed.",
      );
      throw error;
    } finally {
      this.activeOperation = false;
    }
  }

  async authenticate(methodId: string): Promise<void> {
    this.assertIdle();
    const method = this.snapshot.initialization?.authMethods?.find(
      (item) => item.id === methodId,
    );
    if (!method)
      throw new Error(
        "Choose an authentication method advertised by this agent.",
      );
    if ("type" in method && method.type === "terminal")
      throw new Error(
        "This authentication method is not supported. Authenticate using the agent's CLI, then reconnect.",
      );
    this.activeOperation = true;
    const status = this.snapshot.sessionId ? "ready" : "connected";
    this.setState({ status: "authenticating", busy: true });
    try {
      await this.control(
        this.connected().agent.request(acp.methods.agent.authenticate, {
          methodId,
        }),
        "authentication",
        Math.max(this.timeout, 120_000),
      );
    } finally {
      this.activeOperation = false;
      if (!this.closing) this.setState({ status, busy: false });
    }
  }

  async newSession(): Promise<acp.NewSessionResponse> {
    this.assertIdle();
    this.activeOperation = true;
    this.pendingSessionId = undefined;
    this.setState({
      status: "starting",
      busy: true,
      sessionId: undefined,
      modes: undefined,
    });
    try {
      const result = await this.control(
        this.connected().agent.request(acp.methods.agent.session.new, {
          cwd: this.options.cwd,
          mcpServers: [],
        }),
        "session creation",
      );
      if (!result.sessionId?.trim() || result.sessionId.length > 4096) {
        this.shutdown("The ACP agent returned an invalid session ID.");
        throw new Error("The ACP agent returned an invalid session ID.");
      }
      this.setState({
        status: "ready",
        busy: false,
        sessionId: result.sessionId,
        modes: result.modes ?? undefined,
      });
      return result;
    } finally {
      this.activeOperation = false;
      if (!this.closing && !this.snapshot.sessionId)
        this.setState({ status: "connected", busy: false });
    }
  }

  async loadSession(sessionId: string): Promise<acp.LoadSessionResponse> {
    this.assertIdle();
    if (!this.snapshot.initialization?.agentCapabilities?.loadSession)
      throw new Error("This agent does not support loading sessions.");
    if (!sessionId?.trim() || sessionId.length > 4096)
      throw new Error("Enter a valid ACP session ID.");
    this.activeOperation = true;
    this.pendingSessionId = sessionId;
    this.setState({
      status: "starting",
      busy: true,
      sessionId: undefined,
      modes: undefined,
    });
    try {
      const result = await this.control(
        this.connected().agent.request(acp.methods.agent.session.load, {
          sessionId,
          cwd: this.options.cwd,
          mcpServers: [],
        }),
        "session loading",
      );
      this.setState({
        status: "ready",
        busy: false,
        sessionId,
        modes: result.modes ?? undefined,
      });
      return result;
    } finally {
      this.activeOperation = false;
      this.pendingSessionId = undefined;
      if (!this.closing && !this.snapshot.sessionId)
        this.setState({ status: "connected", busy: false });
    }
  }

  async setMode(modeId: string): Promise<void> {
    this.assertIdle();
    const sessionId = this.requireSession();
    if (!this.snapshot.modes?.availableModes.some((mode) => mode.id === modeId))
      throw new Error("Choose a mode advertised by this session.");
    this.activeOperation = true;
    this.setState({ busy: true });
    try {
      await this.control(
        this.connected().agent.request(acp.methods.agent.session.setMode, {
          sessionId,
          modeId,
        }),
        "mode selection",
      );
      if (this.snapshot.modes)
        this.setState({
          modes: { ...this.snapshot.modes, currentModeId: modeId },
        });
    } finally {
      this.activeOperation = false;
      if (!this.closing) this.setState({ busy: false });
    }
  }

  async prompt(text: string): Promise<acp.PromptResponse> {
    this.assertIdle();
    const sessionId = this.requireSession();
    if (!text.trim() || Buffer.byteLength(text, "utf8") > 1024 * 1024)
      throw new Error("Enter a prompt smaller than 1 MiB.");
    this.activeOperation = true;
    this.promptScope = new AbortController();
    this.setState({ status: "prompting", busy: true });
    try {
      // No timeout/retry: a working agent may legitimately take a long time and
      // replaying a prompt can duplicate edits or external side effects.
      return await this.connected().agent.request(
        acp.methods.agent.session.prompt,
        { sessionId, prompt: [{ type: "text", text }] },
      );
    } finally {
      this.promptScope?.abort();
      this.promptScope = undefined;
      clearTimeout(this.cancelTimer);
      this.activeOperation = false;
      if (!this.closing) this.setState({ status: "ready", busy: false });
    }
  }

  async cancel(): Promise<void> {
    if (
      !this.promptScope ||
      this.closing ||
      this.snapshot.status === "cancelling"
    )
      return;
    // Permission replies are cancelled immediately, independently of whether
    // the agent honours session/cancel or its own request-cancellation support.
    this.promptScope.abort();
    this.setState({ status: "cancelling", busy: true });
    this.cancelTimer = setTimeout(
      () =>
        this.shutdown(
          "The ACP agent did not stop after cancellation. Reconnect to continue.",
        ),
      this.options.cancelGraceMs ?? 5000,
    );
    this.cancelTimer.unref?.();
    await this.connected().agent.notify(acp.methods.agent.session.cancel, {
      sessionId: this.requireSession(),
    });
  }

  dispose(): void {
    this.shutdown();
  }

  private get timeout(): number {
    return this.options.controlTimeoutMs ?? 30_000;
  }

  private async control<T>(
    operation: Promise<T>,
    label: string,
    timeout = this.timeout,
  ): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error(
              `ACP ${label} timed out. The connection was closed; the operation was not retried.`,
            );
            this.shutdown(error.message);
            reject(error);
          }, timeout);
        }),
      ]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private connected(): acp.ClientConnection {
    if (!this.connection || this.closing || this.connection.signal.aborted)
      throw new Error("Connect to an ACP agent first.");
    return this.connection;
  }

  private assertIdle(): void {
    this.connected();
    if (!this.snapshot.initialization)
      throw new Error("ACP initialization has not completed.");
    if (this.activeOperation)
      throw new Error("Wait for the current ACP operation or cancel it first.");
  }

  private requireSession(): string {
    if (!this.snapshot.sessionId)
      throw new Error("Start an ACP session first.");
    return this.snapshot.sessionId;
  }

  private requestScope(sessionId: string): AbortSignal {
    const scope = this.promptScope;
    if (
      !scope ||
      scope.signal.aborted ||
      this.closing ||
      sessionId !== this.snapshot.sessionId
    )
      throw new acp.RequestError(
        -32600,
        "This request is not part of the active ACP prompt.",
      );
    return scope.signal;
  }

  private async permission(
    params: acp.RequestPermissionRequest,
    requestSignal: AbortSignal,
  ): Promise<acp.RequestPermissionResponse> {
    let signal: AbortSignal;
    try {
      signal = AbortSignal.any([
        this.requestScope(params.sessionId),
        requestSignal,
      ]);
    } catch {
      return cancelledPermission();
    }
    if (signal.aborted) return cancelledPermission();
    if (params.options.length > 20 || this.permissionPending)
      return cancelledPermission();
    this.permissionPending = true;
    try {
      const result = await this.abortable(signal, () =>
        this.options.callbacks.requestPermission(params, signal),
      );
      if (signal.aborted) return cancelledPermission();
      const selected =
        result.outcome.outcome === "selected"
          ? result.outcome.optionId
          : undefined;
      if (
        selected !== undefined &&
        !params.options.some((option) => option.optionId === selected)
      )
        return cancelledPermission();
      return result;
    } catch {
      return cancelledPermission();
    } finally {
      this.permissionPending = false;
    }
  }

  private async read(
    params: acp.ReadTextFileRequest,
    requestSignal: AbortSignal,
  ): Promise<acp.ReadTextFileResponse> {
    const signal = AbortSignal.any([
      this.requestScope(params.sessionId),
      requestSignal,
    ]);
    const response = await this.abortable(signal, () =>
      this.options.callbacks.readTextFile!(params, signal),
    );
    this.requestScope(params.sessionId);
    return response;
  }

  private async write(
    params: acp.WriteTextFileRequest,
    requestSignal: AbortSignal,
  ): Promise<acp.WriteTextFileResponse> {
    const signal = AbortSignal.any([
      this.requestScope(params.sessionId),
      requestSignal,
    ]);
    const response = await this.abortable(signal, () =>
      this.options.callbacks.writeTextFile!(params, signal),
    );
    this.requestScope(params.sessionId);
    return response;
  }

  private async abortable<T>(
    signal: AbortSignal,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (signal.aborted)
      throw new acp.RequestError(-32800, "ACP request cancelled.");
    let abort: () => void;
    try {
      const cancelled = new Promise<never>((_, reject) => {
        abort = () =>
          reject(new acp.RequestError(-32800, "ACP request cancelled."));
        signal.addEventListener("abort", abort, { once: true });
      });
      return await Promise.race([cancelled, operation()]);
    } finally {
      signal.removeEventListener("abort", abort!);
    }
  }

  private update(params: acp.SessionNotification): void {
    if (
      this.closing ||
      params.sessionId !== (this.snapshot.sessionId ?? this.pendingSessionId)
    )
      return;
    if (
      params.update.sessionUpdate === "current_mode_update" &&
      this.snapshot.modes
    )
      this.setState({
        modes: {
          ...this.snapshot.modes,
          currentModeId: params.update.currentModeId,
        },
      });
    try {
      this.options.callbacks.onUpdate?.(params);
    } catch {
      /* UI disposal must not break the wire. */
    }
  }

  private setState(update: Partial<AcpSessionState>): void {
    this.snapshot = { ...this.snapshot, ...update };
    try {
      this.options.callbacks.onState?.(this.state);
    } catch {
      /* UI disposal must not break the wire. */
    }
  }

  private shutdown(error?: string): void {
    if (this.closing) return;
    this.closing = true;
    clearTimeout(this.cancelTimer);
    this.promptScope?.abort();
    this.connection?.close(new Error(error || "ACP session closed."));
    this.setState({ status: "closed", busy: false, error });
    const child = this.child;
    if (!child || this.killed) return;
    this.killed = true;
    const signal = (kind: NodeJS.Signals) => {
      try {
        if (process.platform !== "win32" && child.pid)
          process.kill(-child.pid, kind);
        else child.kill(kind);
      } catch {
        /* The process may already have exited. */
      }
    };
    signal("SIGTERM");
    const force = setTimeout(() => signal("SIGKILL"), 750);
    force.unref?.();
    // On POSIX a descendant can outlive its parent after ignoring SIGTERM,
    // including when it closed all inherited pipes. Keep the group escalation.
    if (process.platform === "win32")
      child.once("close", () => clearTimeout(force));
  }
}
