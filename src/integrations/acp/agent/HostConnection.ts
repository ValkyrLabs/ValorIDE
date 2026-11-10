import { constants } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { randomUUID } from "node:crypto";
import type * as acp from "@agentclientprotocol/sdk";
import type {
  ValorideAgentBackend,
  ValorideAgentPromptCallbacks,
} from "./AgentServer";

const MAX_PACKET = 4 * 1024 * 1024;
type Pending = {
  resolve(value: unknown): void;
  reject(error: Error): void;
  cleanup(): void;
};
type ActivePrompt = {
  callbacks: ValorideAgentPromptCallbacks;
  signal: AbortSignal;
  cancelling: boolean;
  updates: Promise<void>;
};

async function privateDirectory(directory: string, uid: number) {
  const stat = await fs.lstat(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== uid ||
    (stat.mode & 0o077) !== 0 ||
    (await fs.realpath(directory)) !== directory
  )
    throw new Error(
      "ACP host connection directory is not private to the current OS user.",
    );
}

/** Read launch authority through an owner-only descriptor, never argv credentials. */
export async function readHostDescriptor(
  filename: string,
): Promise<{ socket: string; token: string }> {
  if (!process.getuid || !path.isAbsolute(filename))
    throw new Error(
      "ACP host connections require an absolute Unix connection-file path.",
    );
  const uid = process.getuid();
  await privateDirectory(path.dirname(filename), uid);
  const file = await fs.open(
    filename,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const stat = await file.stat();
    if (
      !stat.isFile() ||
      stat.uid !== uid ||
      (stat.mode & 0o077) !== 0 ||
      stat.nlink !== 1 ||
      stat.size > 8192
    )
      throw new Error(
        "ACP host connection file is not private to the current OS user.",
      );
    const contents = Buffer.alloc(8193);
    const { bytesRead } = await file.read(contents, 0, contents.length, 0);
    if (bytesRead > 8192) throw new Error("Invalid ACP host connection file.");
    const value: unknown = JSON.parse(
      contents.subarray(0, bytesRead).toString("utf8"),
    );
    if (!value || typeof value !== "object")
      throw new Error("Invalid ACP host connection file.");
    const data = value as Record<string, unknown>;
    if (
      data.version !== 1 ||
      typeof data.socket !== "string" ||
      !path.isAbsolute(data.socket) ||
      data.socket.includes("\0") ||
      typeof data.token !== "string" ||
      data.token.length < 32 ||
      data.token.length > 4096 ||
      data.token.includes("\0")
    )
      throw new Error("Invalid ACP host connection file.");
    await privateDirectory(path.dirname(data.socket), uid);
    const socket = await fs.lstat(data.socket);
    if (!socket.isSocket() || socket.uid !== uid || (socket.mode & 0o077) !== 0)
      throw new Error("ACP host socket is not private to the current OS user.");
    return { socket: data.socket, token: data.token };
  } finally {
    await file.close();
  }
}

/** Private local bridge. Every invocation owns a fresh socket and session set. */
export class HostConnection implements ValorideAgentBackend {
  private readonly socket: net.Socket;
  private buffer = Buffer.alloc(0);
  private readonly pending = new Map<string, Pending>();
  private readonly sessions = new Set<string>();
  private readonly prompts = new Map<string, ActivePrompt>();
  private readonly permissions = new Set<string>();
  private readonly lifetime = new AbortController();
  private closed = false;

  get signal(): AbortSignal {
    return this.lifetime.signal;
  }

  private constructor(socket: net.Socket) {
    this.socket = socket;
    socket.on("data", (data) =>
      this.receive(Buffer.isBuffer(data) ? data : Buffer.from(data)),
    );
    socket.once("error", () =>
      this.fail(new Error("The local ValorIDE ACP host connection failed.")),
    );
    socket.once("close", () =>
      this.fail(new Error("The local ValorIDE ACP host disconnected.")),
    );
  }

  static async connect(connectionFile: string): Promise<HostConnection> {
    const descriptor = await readHostDescriptor(connectionFile);
    const socket = net.createConnection(descriptor.socket);
    const connection = new HostConnection(socket);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error("Timed out connecting to the local ValorIDE ACP host."),
            ),
          10_000,
        );
        const fail = () => {
          clearTimeout(timer);
          reject(new Error("Cannot connect to the local ValorIDE ACP host."));
        };
        socket.once("error", fail);
        socket.once("connect", () => {
          clearTimeout(timer);
          socket.removeListener("error", fail);
          resolve();
        });
      });
      await connection.request(
        "hello",
        { token: descriptor.token },
        undefined,
        10_000,
      );
      return connection;
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  async newSession(
    cwd: string,
    signal: AbortSignal,
  ): Promise<{ sessionId: string }> {
    const result = (await this.request(
      "newSession",
      { cwd },
      signal,
      30_000,
    )) as { sessionId?: unknown };
    if (
      typeof result?.sessionId !== "string" ||
      !result.sessionId ||
      result.sessionId.length > 4096 ||
      this.sessions.has(result.sessionId)
    )
      throw new Error("The local ValorIDE host returned an invalid session.");
    this.sessions.add(result.sessionId);
    return { sessionId: result.sessionId };
  }

  async prompt(
    sessionId: string,
    text: string,
    signal: AbortSignal,
    callbacks: ValorideAgentPromptCallbacks,
  ): Promise<acp.PromptResponse> {
    if (
      !this.sessions.has(sessionId) ||
      this.prompts.has(sessionId) ||
      signal.aborted
    )
      throw new Error("ACP session is unavailable or busy.");
    const prompt = {
      callbacks,
      signal,
      cancelling: false,
      updates: Promise.resolve(),
    };
    this.prompts.set(sessionId, prompt);
    const cancel = () => {
      void this.cancel(sessionId).catch(() => this.close());
    };
    signal.addEventListener("abort", cancel, { once: true });
    try {
      const result = (await this.request("prompt", { sessionId, text })) as {
        stopReason?: unknown;
      };
      await prompt.updates;
      if (
        ![
          "end_turn",
          "max_tokens",
          "max_turn_requests",
          "refusal",
          "cancelled",
        ].includes(String(result?.stopReason))
      )
        throw new Error(
          "The local ValorIDE host returned an invalid prompt result.",
        );
      return result as acp.PromptResponse;
    } finally {
      signal.removeEventListener("abort", cancel);
      this.prompts.delete(sessionId);
    }
  }

  async cancel(sessionId: string): Promise<void> {
    const prompt = this.prompts.get(sessionId);
    if (!prompt || prompt.cancelling || this.closed) return;
    prompt.cancelling = true;
    await this.request("cancel", { sessionId }, undefined, 10_000);
  }

  close(): void {
    this.fail(new Error("The local ValorIDE ACP connection closed."));
  }

  private request(
    method: string,
    params: unknown,
    signal?: AbortSignal,
    timeout?: number,
  ): Promise<unknown> {
    if (this.closed || signal?.aborted)
      return Promise.reject(
        new Error("The local ValorIDE ACP connection is unavailable."),
      );
    if (this.pending.size >= 64)
      return Promise.reject(new Error("Too many pending ACP host requests."));
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const abort = () => {
        this.pending.delete(id);
        cleanup();
        reject(new Error("ACP host operation cancelled."));
      };
      const cleanup = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      };
      signal?.addEventListener("abort", abort, { once: true });
      if (timeout)
        timer = setTimeout(
          () =>
            this.fail(
              new Error("The local ValorIDE ACP host operation timed out."),
            ),
          timeout,
        );
      this.pending.set(id, { resolve, reject, cleanup });
      this.send({ id, method, params });
    });
  }

  private send(value: unknown): void {
    if (this.closed) return;
    const encoded = JSON.stringify(value) + "\n";
    if (Buffer.byteLength(encoded) > MAX_PACKET)
      return this.fail(new Error("ACP host packet exceeded its limit."));
    this.socket.write(encoded, (error) => {
      if (error)
        this.fail(
          new Error("The local ValorIDE ACP connection could not write."),
        );
    });
  }

  private receive(chunk: Buffer): void {
    if (this.closed) return;
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const end = this.buffer.indexOf(10);
      if (end < 0) {
        if (this.buffer.length > MAX_PACKET)
          this.fail(new Error("ACP host packet exceeded its limit."));
        return;
      }
      if (end > MAX_PACKET)
        return this.fail(new Error("ACP host packet exceeded its limit."));
      const line = this.buffer.subarray(0, end).toString("utf8");
      this.buffer = this.buffer.subarray(end + 1);
      try {
        const value = JSON.parse(line);
        if (!value || typeof value !== "object" || Array.isArray(value))
          throw new Error();
        if (typeof value.id === "string" && !value.type) {
          const pending = this.pending.get(value.id);
          if (!pending) continue;
          this.pending.delete(value.id);
          pending.cleanup();
          if (value.error)
            pending.reject(
              new Error(
                typeof value.error.message === "string"
                  ? value.error.message.slice(0, 2000)
                  : "The local ValorIDE ACP operation failed.",
              ),
            );
          else if (Object.prototype.hasOwnProperty.call(value, "result"))
            pending.resolve(value.result);
          else pending.reject(new Error("Invalid ACP host response."));
        } else if (
          value.type === "update" &&
          typeof value.sessionId === "string"
        ) {
          const prompt = this.prompts.get(value.sessionId);
          if (
            prompt &&
            !prompt.signal.aborted &&
            value.update &&
            typeof value.update === "object"
          ) {
            prompt.updates = prompt.updates.then(async () => {
              if (!prompt.signal.aborted && !this.closed)
                await prompt.callbacks.onUpdate(value.update);
            });
            void prompt.updates.catch(() => this.close());
          }
        } else if (
          value.type === "permission" &&
          typeof value.id === "string" &&
          typeof value.sessionId === "string"
        ) {
          if (
            value.id.length > 4096 ||
            this.permissions.has(value.id) ||
            this.permissions.size >= 32
          )
            throw new Error();
          this.permissions.add(value.id);
          const prompt = this.prompts.get(value.sessionId);
          const reply = (result: acp.RequestPermissionResponse) => {
            if (!this.permissions.delete(value.id)) return;
            this.send({ type: "permissionResult", id: value.id, result });
          };
          if (
            !prompt ||
            prompt.signal.aborted ||
            value.request?.sessionId !== value.sessionId
          )
            reply({ outcome: { outcome: "cancelled" } });
          else
            void prompt.callbacks
              .onPermission(value.request)
              .then(reply, () => reply({ outcome: { outcome: "cancelled" } }));
        }
      } catch {
        return this.fail(
          new Error("The local ValorIDE ACP host sent an invalid packet."),
        );
      }
    }
  }

  private fail(error: Error): void {
    if (this.closed) return;
    this.closed = true;
    for (const pending of this.pending.values()) {
      pending.cleanup();
      pending.reject(error);
    }
    this.pending.clear();
    this.sessions.clear();
    this.prompts.clear();
    this.permissions.clear();
    this.socket.destroy();
    this.lifetime.abort();
  }
}
