import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import { Readable, Writable } from "node:stream";
import * as acp from "@agentclientprotocol/sdk";
import {
  startAcpAgentBridge,
  type ValorideAcpBackend,
} from "../AcpAgentBridge";
import { readHostDescriptor } from "./HostConnection";

let directory: string, executable: string;
const unixOnly = { skip: process.platform === "win32" };
before(async () => {
  if (unixOnly.skip) return;
  directory = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "valoride-acp-agent-test-")),
  );
  // Release qualification can exercise the exact adapter extracted from a VSIX.
  // The default path still builds current source for development regressions.
  if (process.env.VALORIDE_ACP_TEST_ENTRYPOINT) {
    assert(path.isAbsolute(process.env.VALORIDE_ACP_TEST_ENTRYPOINT));
    executable = await fs.realpath(process.env.VALORIDE_ACP_TEST_ENTRYPOINT);
    assert((await fs.stat(executable)).isFile());
    return;
  }
  executable = path.join(directory, "stdio.cjs");
  execFileSync(
    path.resolve("node_modules/.bin/esbuild"),
    [
      "src/integrations/acp/agent/stdio.ts",
      "--bundle",
      "--platform=node",
      "--format=cjs",
      "--target=node20",
      `--outfile=${executable}`,
    ],
    { stdio: "pipe" },
  );
});
after(async () => {
  if (directory) await fs.rm(directory, { recursive: true, force: true });
});

async function start(
  overrides: Partial<ValorideAcpBackend> = {},
  approval: (
    request: acp.RequestPermissionRequest,
  ) => Promise<acp.RequestPermissionResponse> = async () => ({
    outcome: { outcome: "selected", optionId: "yes" },
  }),
) {
  let serial = 0,
    closed = 0;
  const backend: ValorideAcpBackend = {
    newSession: async () => ({ sessionId: `local-${++serial}` }),
    prompt: async (_id, text, _signal, callbacks) => {
      callbacks.onUpdate({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text },
      });
      return { stopReason: "end_turn" };
    },
    cancel: async () => {},
    close: () => {
      closed++;
    },
    ...overrides,
  };
  const bridge = await startAcpAgentBridge({
    cwd: process.cwd(),
    assertActive: () => {},
    createBackend: () => backend,
  });
  const child = spawn(
    process.execPath,
    [executable, "--connection", bridge.connectionFile],
    { stdio: ["pipe", "pipe", "pipe"], shell: false },
  );
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (data) => {
    stdout += String(data);
  });
  child.stderr.on("data", (data) => {
    stderr += String(data);
  });
  const exited = new Promise<number | null>((resolve) =>
    child.once("exit", (code) => resolve(code)),
  );
  const events: acp.SessionNotification[] = [];
  const client = acp
    .client({ name: "independent-editor" })
    .onNotification(acp.methods.client.session.update, (ctx) => {
      events.push(ctx.params);
    })
    .onRequest(acp.methods.client.session.requestPermission, (ctx) =>
      approval(ctx.params),
    )
    .connect(
      acp.ndJsonStream(
        Writable.toWeb(child.stdin) as WritableStream<Uint8Array>,
        Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
      ),
    );
  const initialize = () =>
    client.agent.request(acp.methods.agent.initialize, {
      protocolVersion: 1,
      clientCapabilities: {},
    });
  const newSession = () =>
    client.agent.request(acp.methods.agent.session.new, {
      cwd: process.cwd(),
      mcpServers: [],
    });
  const prompt = (sessionId: string, text: string) =>
    client.agent.request(acp.methods.agent.session.prompt, {
      sessionId,
      prompt: [{ type: "text", text }],
    });
  const close = async () => {
    client.close();
    child.stdin.end();
    const kill = setTimeout(() => child.kill("SIGKILL"), 2000);
    const code = await exited;
    clearTimeout(kill);
    await bridge.close();
    assert.equal(
      code,
      0,
      `ACP stdio process should exit gracefully: ${stderr}`,
    );
    for (const line of stdout.trim().split("\n").filter(Boolean))
      assert.equal(
        JSON.parse(line).jsonrpc,
        "2.0",
        "stdout must contain protocol packets only",
      );
    assert.equal(stderr, "");
  };
  return {
    bridge,
    client,
    events,
    initialize,
    newSession,
    prompt,
    close,
    closed: () => closed,
    exited,
  };
}

test(
  "published stdio executable round trips an independent ACP client through the actual private host bridge",
  { ...unixOnly, timeout: 8000 },
  async () => {
    let received = "";
    const h = await start({
      prompt: async (_id, text, _signal, callbacks) => {
        received = text;
        for (const chunk of ["same", " ", "same", "\n", "x".repeat(96000)])
          callbacks.onUpdate({
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: chunk },
          });
        callbacks.onUpdate({
          sessionUpdate: "tool_call",
          toolCallId: "tool-1",
          title: "Read",
          status: "completed",
          kind: "read",
        });
        return { stopReason: "end_turn" };
      },
    });
    try {
      const initialized = await h.initialize();
      assert.equal(initialized.protocolVersion, 1);
      const { sessionId } = await h.newSession();
      assert.equal(
        (await h.prompt(sessionId, "hello host")).stopReason,
        "end_turn",
      );
      assert.equal(received, "hello host");
      assert.equal(h.events.length, 6);
      assert.equal(
        h.events.every((event) => event.sessionId === sessionId),
        true,
      );
      assert.deepEqual(
        h.events.slice(0, 4).map((event) => (event.update as any).content.text),
        ["same", " ", "same", "\n"],
      );
    } finally {
      await h.close();
    }
    assert.equal(h.closed(), 1);
  },
);

test(
  "external client tool approval is returned through private IPC and cancellation releases an unanswered approval",
  { ...unixOnly, timeout: 8000 },
  async () => {
    for (const shouldCancel of [false, true]) {
      let requested!: () => void;
      const ready = new Promise<void>((resolve) => {
        requested = resolve;
      });
      let outcome: acp.RequestPermissionResponse | undefined;
      const h = await start(
        {
          prompt: async (sessionId, _text, _signal, callbacks) => {
            outcome = await callbacks.onPermission({
              sessionId,
              toolCall: { toolCallId: "edit", title: "Edit project" },
              options: [
                { optionId: "yes", name: "Allow once", kind: "allow_once" },
              ],
            });
            return {
              stopReason:
                outcome.outcome.outcome === "cancelled"
                  ? "cancelled"
                  : "end_turn",
            };
          },
        },
        async () => {
          requested();
          return shouldCancel
            ? await new Promise(() => {})
            : { outcome: { outcome: "selected", optionId: "yes" } };
        },
      );
      try {
        await h.initialize();
        const { sessionId } = await h.newSession();
        const result = h.prompt(sessionId, "edit");
        await ready;
        if (shouldCancel)
          await h.client.agent.notify(acp.methods.agent.session.cancel, {
            sessionId,
          });
        assert.equal(
          (await result).stopReason,
          shouldCancel ? "cancelled" : "end_turn",
        );
        assert.deepEqual(
          outcome,
          shouldCancel
            ? { outcome: { outcome: "cancelled" } }
            : { outcome: { outcome: "selected", optionId: "yes" } },
        );
      } finally {
        await h.close();
      }
    }
  },
);

test(
  "private host shutdown disconnects the ACP executable and rejects a pending prompt",
  { ...unixOnly, timeout: 8000 },
  async () => {
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    const h = await start({
      prompt: async (_id, _text, signal) => {
        started();
        return await new Promise((resolve) =>
          signal.addEventListener(
            "abort",
            () => resolve({ stopReason: "cancelled" }),
            { once: true },
          ),
        );
      },
    });
    try {
      await h.initialize();
      const { sessionId } = await h.newSession();
      const rejected = assert.rejects(h.prompt(sessionId, "wait"));
      await ready;
      await h.bridge.close();
      await rejected;
      assert.equal(await h.exited, 0);
    } finally {
      await h.close();
    }
  },
);

test(
  "connection descriptor rejects shared permissions, symlinks and non-private directories",
  unixOnly,
  async () => {
    const privateDir = path.join(directory, "private");
    await fs.mkdir(privateDir, { mode: 0o700 });
    const descriptor = path.join(privateDir, "connection.json");
    await fs.writeFile(descriptor, "{}", { mode: 0o644 });
    await assert.rejects(readHostDescriptor(descriptor), /not private/);
    await fs.chmod(descriptor, 0o600);
    const link = path.join(privateDir, "link.json");
    await fs.symlink(descriptor, link);
    await assert.rejects(readHostDescriptor(link));
    await fs.chmod(privateDir, 0o755);
    await assert.rejects(
      readHostDescriptor(descriptor),
      /directory is not private/,
    );
  },
);
