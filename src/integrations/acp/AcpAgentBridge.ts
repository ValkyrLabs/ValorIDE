import net from "node:net";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import type {
  RequestPermissionRequest,
  RequestPermissionResponse,
  SessionUpdate,
  PromptResponse,
} from "@agentclientprotocol/sdk";

export interface ValorideAcpBackend {
  newSession(cwd: string, signal: AbortSignal): Promise<{ sessionId: string }>;
  prompt(
    sessionId: string,
    text: string,
    signal: AbortSignal,
    callbacks: {
      onUpdate(update: SessionUpdate): void;
      onPermission(
        request: RequestPermissionRequest,
      ): Promise<RequestPermissionResponse>;
    },
  ): Promise<PromptResponse>;
  cancel(sessionId: string): Promise<void>;
  close(): void | Promise<void>;
}

const cancelled = (): RequestPermissionResponse => ({
  outcome: { outcome: "cancelled" },
});
const packetLimit = 4 * 1024 * 1024;

/** Opt-in, owner-only local IPC. No TCP listener or workspace-owned endpoint. */
export async function startAcpAgentBridge(options: {
  cwd: string;
  assertActive(): void | Promise<void>;
  createBackend(): ValorideAcpBackend;
}) {
  if (process.platform === "win32")
    throw new Error(
      "Serving ValorIDE over ACP currently requires macOS or Linux (owner-only Unix socket).",
    );
  await options.assertActive();
  const cwd = await fs.realpath(options.cwd);
  const directory = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "valoride-acp-")),
  );
  await fs.chmod(directory, 0o700);
  const socketPath = path.join(directory, "agent.sock"),
    connectionFile = path.join(directory, "connection.json");
  const token = randomBytes(32).toString("hex");
  const sockets = new Set<net.Socket>();
  const connections = new Set<() => Promise<void>>();
  let closePromise: Promise<void> | undefined;
  let owner: net.Socket | undefined,
    closed = false;
  const server = net.createServer((socket) => {
    if (closed || sockets.size >= 4) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    const lifetime = new AbortController(),
      decoder = new StringDecoder("utf8");
    let buffer = "",
      authenticated = false,
      backend: ValorideAcpBackend | undefined;
    let busy = false,
      promptAbort: AbortController | undefined,
      activeSession: string | undefined;
    const sessions = new Set<string>(),
      inFlight = new Set<string>();
    const permissions = new Map<
      string,
      {
        sessionId: string;
        request: RequestPermissionRequest;
        resolve(value: RequestPermissionResponse): void;
      }
    >();
    const send = (packet: unknown) => {
      if (socket.destroyed) return;
      const encoded = JSON.stringify(packet) + "\n";
      if (
        Buffer.byteLength(encoded) > packetLimit ||
        socket.writableLength > 8 * packetLimit
      ) {
        socket.destroy();
        return;
      }
      socket.write(encoded);
    };
    const finishPermissions = () => {
      for (const pending of permissions.values()) pending.resolve(cancelled());
      permissions.clear();
    };
    const handshake = setTimeout(() => socket.destroy(), 5000);
    handshake.unref();
    let cleanup: Promise<void> | undefined;
    const closeConnection = () => {
      if (cleanup) return cleanup;
      clearTimeout(handshake);
      sockets.delete(socket);
      socket.destroy();
      lifetime.abort();
      promptAbort?.abort();
      finishPermissions();
      cleanup = Promise.resolve()
        .then(() => backend?.close())
        .catch(() => undefined)
        .finally(() => {
          if (owner === socket) owner = undefined;
          connections.delete(closeConnection);
        });
      return cleanup;
    };
    connections.add(closeConnection);
    socket.once("close", () => {
      void closeConnection();
    });
    socket.on("error", () => socket.destroy());
    const handle = async (packet: any) => {
      if (!packet || typeof packet !== "object" || lifetime.signal.aborted) {
        socket.destroy();
        return;
      }
      if (packet.type === "permissionResult") {
        if (!authenticated || typeof packet.id !== "string") {
          socket.destroy();
          return;
        }
        const pending = permissions.get(packet.id);
        if (!pending) return;
        permissions.delete(packet.id);
        const outcome = packet.result?.outcome;
        pending.resolve(
          !promptAbort?.signal.aborted &&
            outcome?.outcome === "selected" &&
            pending.request.options.some((o) => o.optionId === outcome.optionId)
            ? { outcome: { outcome: "selected", optionId: outcome.optionId } }
            : cancelled(),
        );
        return;
      }
      const id = packet.id;
      if (
        typeof id !== "string" ||
        !id ||
        id.length > 128 ||
        inFlight.has(id) ||
        inFlight.size > 16
      ) {
        socket.destroy();
        return;
      }
      inFlight.add(id);
      try {
        const params = packet.params;
        if (!params || typeof params !== "object")
          throw new Error("Invalid ACP bridge parameters.");
        if (packet.method === "hello") {
          const supplied =
              typeof params.token === "string"
                ? Buffer.from(params.token)
                : Buffer.alloc(0),
            expected = Buffer.from(token);
          if (
            authenticated ||
            owner ||
            supplied.length !== expected.length ||
            !timingSafeEqual(supplied, expected)
          ) {
            socket.destroy();
            return;
          }
          await options.assertActive();
          if (closed || lifetime.signal.aborted || owner) {
            socket.destroy();
            return;
          }
          authenticated = true;
          owner = socket;
          clearTimeout(handshake);
          backend = options.createBackend();
          send({ id, result: {} });
          return;
        }
        if (!authenticated || !backend) {
          socket.destroy();
          return;
        }
        await options.assertActive();
        if (closed || lifetime.signal.aborted) return;
        if (packet.method === "cancel") {
          if (!sessions.has(params.sessionId))
            throw new Error("Unknown ACP bridge session.");
          if (params.sessionId === activeSession) {
            promptAbort?.abort();
            finishPermissions();
          }
          await backend.cancel(params.sessionId);
          send({ id, result: {} });
          return;
        }
        if (busy)
          throw new Error("ValorIDE is already processing an ACP operation.");
        if (!["newSession", "prompt"].includes(packet.method))
          throw new Error("Unsupported ACP bridge method.");
        busy = true;
        try {
          if (packet.method === "newSession") {
            if (sessions.size > 0)
              throw new Error(
                "ValorIDE supports one ACP session per connection. Reconnect to create another session.",
              );
            if (
              typeof params.cwd !== "string" ||
              !path.isAbsolute(params.cwd) ||
              (await fs.realpath(params.cwd)) !== cwd
            )
              throw new Error(
                "ACP workspace must match the workspace explicitly enabled in ValorIDE.",
              );
            const result = await backend.newSession(cwd, lifetime.signal);
            if (lifetime.signal.aborted) return;
            sessions.add(result.sessionId);
            send({ id, result });
          } else {
            if (
              !sessions.has(params.sessionId) ||
              typeof params.text !== "string" ||
              !params.text.trim() ||
              Buffer.byteLength(params.text) > 1024 * 1024
            )
              throw new Error("Invalid ACP session or prompt.");
            activeSession = params.sessionId;
            promptAbort = new AbortController();
            const scope = AbortSignal.any([
              lifetime.signal,
              promptAbort.signal,
            ]);
            const result = await backend.prompt(
              params.sessionId,
              params.text,
              scope,
              {
                onUpdate: (update) => {
                  if (!lifetime.signal.aborted)
                    send({
                      type: "update",
                      sessionId: params.sessionId,
                      update,
                    });
                },
                onPermission: async (request) => {
                  await options.assertActive();
                  if (
                    scope.aborted ||
                    request.sessionId !== params.sessionId ||
                    permissions.size >= 1
                  )
                    return cancelled();
                  return new Promise<RequestPermissionResponse>((resolve) => {
                    const permissionId = randomUUID();
                    permissions.set(permissionId, {
                      sessionId: params.sessionId,
                      request,
                      resolve,
                    });
                    send({
                      type: "permission",
                      id: permissionId,
                      sessionId: params.sessionId,
                      request,
                    });
                  });
                },
              },
            );
            send({ id, result });
          }
        } finally {
          busy = false;
          activeSession = undefined;
          promptAbort?.abort();
          promptAbort = undefined;
          finishPermissions();
        }
      } catch (error) {
        send({
          id,
          error: {
            message:
              error instanceof Error
                ? error.message
                : "ValorIDE ACP request failed.",
          },
        });
      } finally {
        inFlight.delete(id);
      }
    };
    socket.on("data", (chunk) => {
      buffer += decoder.write(chunk);
      if (Buffer.byteLength(buffer) > packetLimit) {
        socket.destroy();
        return;
      }
      for (;;) {
        const newline = buffer.indexOf("\n");
        if (newline < 0) break;
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        try {
          void handle(JSON.parse(line));
        } catch {
          socket.destroy();
          return;
        }
      }
    });
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, () => {
        server.off("error", reject);
        resolve();
      });
    });
    server.on("error", () => {
      for (const socket of sockets) socket.destroy();
    });
    await fs.chmod(socketPath, 0o600);
    await fs.writeFile(
      connectionFile,
      JSON.stringify({ version: 1, socket: socketPath, token }),
      { mode: 0o600, flag: "wx" },
    );
  } catch (error) {
    server.close();
    await fs.rm(directory, { recursive: true, force: true });
    throw error;
  }
  return {
    connectionFile,
    close() {
      if (closePromise) return closePromise;
      closed = true;
      closePromise = (async () => {
        const cleanup = [...connections].map((dispose) => dispose());
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await Promise.all(cleanup);
        await fs.rm(directory, { recursive: true, force: true });
      })();
      return closePromise;
    },
  };
}
