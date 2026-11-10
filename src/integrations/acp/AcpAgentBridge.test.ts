import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { startAcpAgentBridge, ValorideAcpBackend } from "./AcpAgentBridge";

test(
  "private ACP bridge isolates sessions, scopes workspace, relays approvals and closes cleanly",
  { skip: process.platform === "win32" },
  async () => {
    const root = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "acp-bridge-test-")),
    );
    let active = true,
      closed = 0;
    const backend: ValorideAcpBackend = {
      async newSession() {
        return { sessionId: "mine" };
      },
      async prompt(sessionId, text, signal, callbacks) {
        callbacks.onUpdate({
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text },
        });
        const permission = await callbacks.onPermission({
          sessionId,
          toolCall: { toolCallId: "tool", title: "Review" },
          options: [{ optionId: "yes", kind: "allow_once", name: "Allow" }],
        });
        return {
          stopReason:
            signal.aborted || permission.outcome.outcome === "cancelled"
              ? "cancelled"
              : "end_turn",
        };
      },
      async cancel() {},
      close() {
        closed++;
      },
    };
    const bridge = await startAcpAgentBridge({
      cwd: root,
      assertActive: () => {
        if (!active) throw new Error("Inactive");
      },
      createBackend: () => backend,
    });
    let socket: net.Socket | undefined;
    try {
      const config = JSON.parse(
        await fs.readFile(bridge.connectionFile, "utf8"),
      );
      assert.equal((await fs.stat(bridge.connectionFile)).mode & 0o777, 0o600);
      assert.equal(
        (await fs.stat(path.dirname(bridge.connectionFile))).mode & 0o777,
        0o700,
      );
      assert.equal((await fs.stat(config.socket)).mode & 0o777, 0o600);
      const wrong = net.connect(config.socket);
      await once(wrong, "connect");
      const denied = once(wrong, "close");
      wrong.write(
        JSON.stringify({
          id: "bad",
          method: "hello",
          params: { token: "wrong" },
        }) + "\n",
      );
      await denied;
      socket = net.connect(config.socket);
      await once(socket, "connect");
      let buffer = "";
      const responses = new Map<string, (value: any) => void>(),
        notifications: any[] = [];
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        for (;;) {
          const at = buffer.indexOf("\n");
          if (at < 0) break;
          const message = JSON.parse(buffer.slice(0, at));
          buffer = buffer.slice(at + 1);
          if (message.id && responses.has(message.id) && !message.type) {
            responses.get(message.id)!(message);
            responses.delete(message.id);
          } else notifications.push(message);
        }
      });
      const request = (method: string, params: unknown) =>
        new Promise<any>((resolve) => {
          const id = randomUUID();
          responses.set(id, resolve);
          socket!.write(JSON.stringify({ id, method, params }) + "\n");
        });
      assert.deepEqual(
        (await request("hello", { token: config.token })).result,
        {},
      );
      assert.match(
        (await request("newSession", { cwd: path.dirname(root) })).error
          .message,
        /workspace/,
      );
      assert.deepEqual((await request("newSession", { cwd: root })).result, {
        sessionId: "mine",
      });
      assert.match(
        (await request("newSession", { cwd: root })).error.message,
        /one ACP session/,
      );
      assert.match(
        (await request("prompt", { sessionId: "not-mine", text: "no" })).error
          .message,
        /Invalid/,
      );
      const result = request("prompt", {
        sessionId: "mine",
        text: "literal <script>",
      });
      const until = async (check: () => boolean) => {
        for (let i = 0; i < 100 && !check(); i++)
          await new Promise((r) => setTimeout(r, 5));
        assert(check());
      };
      await until(() => notifications.some((n) => n.type === "permission"));
      const permission = notifications.find((n) => n.type === "permission");
      assert.equal(notifications[0].update.content.text, "literal <script>");
      socket.write(
        JSON.stringify({
          type: "permissionResult",
          id: permission.id,
          result: { outcome: { outcome: "selected", optionId: "forged" } },
        }) + "\n",
      );
      assert.equal((await result).result.stopReason, "cancelled");
      notifications.length = 0;
      const pending = request("prompt", {
        sessionId: "mine",
        text: "cancel me",
      });
      await until(() => notifications.some((n) => n.type === "permission"));
      await request("cancel", { sessionId: "mine" });
      assert.equal((await pending).result.stopReason, "cancelled");
      active = false;
      assert.match(
        (await request("newSession", { cwd: root })).error.message,
        /Inactive/,
      );
    } finally {
      socket?.destroy();
      await bridge.close();
      await fs.rm(root, { recursive: true, force: true });
    }
    assert.equal(closed, 1);
    await assert.rejects(fs.stat(bridge.connectionFile));
  },
);

test(
  "all bridge close callers wait for the owned backend teardown",
  { skip: process.platform === "win32", timeout: 5000 },
  async () => {
    let release!: () => void, started!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const closing = new Promise<void>((resolve) => {
      started = resolve;
    });
    const backend: ValorideAcpBackend = {
      async newSession() {
        return { sessionId: "one" };
      },
      async prompt() {
        return { stopReason: "end_turn" };
      },
      async cancel() {},
      async close() {
        started();
        await gate;
      },
    };
    const bridge = await startAcpAgentBridge({
      cwd: process.cwd(),
      assertActive() {},
      createBackend: () => backend,
    });
    const descriptor = JSON.parse(
      await fs.readFile(bridge.connectionFile, "utf8"),
    );
    const socket = net.connect(descriptor.socket);
    try {
      await once(socket, "connect");
      const response = once(socket, "data");
      socket.write(
        JSON.stringify({
          id: "hello",
          method: "hello",
          params: { token: descriptor.token },
        }) + "\n",
      );
      await response;
      const first = bridge.close();
      await closing;
      const second = bridge.close();
      assert.equal(first, second);
      let settled = false;
      void second.then(() => {
        settled = true;
      });
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(settled, false);
      await fs.access(bridge.connectionFile);
      release();
      await Promise.all([first, second]);
      await assert.rejects(fs.stat(bridge.connectionFile));
    } finally {
      release();
      socket.destroy();
      await bridge.close();
    }
  },
);
