import assert from "node:assert/strict";
import { test } from "node:test";
import * as acp from "@agentclientprotocol/sdk";
import {
  agentPromptText,
  createValorideAgent,
  type ValorideAgentBackend,
} from "./AgentServer";

const cancelled = (): acp.RequestPermissionResponse => ({
  outcome: { outcome: "cancelled" },
});
const permission = (sessionId: string): acp.RequestPermissionRequest => ({
  sessionId,
  toolCall: { toolCallId: "edit-1", title: "Edit project" },
  options: [
    { optionId: "yes", name: "Allow once", kind: "allow_once" },
    { optionId: "no", name: "Reject", kind: "reject_once" },
  ],
});

async function setup(
  overrides: Partial<ValorideAgentBackend> = {},
  approval: (
    request: acp.RequestPermissionRequest,
  ) => Promise<acp.RequestPermissionResponse> = async () => cancelled(),
) {
  const events: acp.SessionNotification[] = [];
  let serial = 0,
    closes = 0;
  const backend: ValorideAgentBackend = {
    newSession: async () => ({ sessionId: `session-${++serial}` }),
    prompt: async (sessionId, text, _signal, callbacks) => {
      await callbacks.onUpdate({
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text },
      });
      return { stopReason: "end_turn" };
    },
    cancel: async () => {},
    close: () => {
      closes++;
    },
    ...overrides,
  };
  let incomingController!: TransformStreamDefaultController<acp.AnyMessage>;
  const incoming = new TransformStream<acp.AnyMessage, acp.AnyMessage>({
    start(controller) {
      incomingController = controller;
    },
  });
  const outgoing = new TransformStream<acp.AnyMessage, acp.AnyMessage>();
  const agent = createValorideAgent(backend, "test");
  agent.connect({ readable: incoming.readable, writable: outgoing.writable });
  const client = acp
    .client({ name: "independent-client" })
    .onNotification(acp.methods.client.session.update, (ctx) => {
      events.push(ctx.params);
    })
    .onRequest(acp.methods.client.session.requestPermission, (ctx) =>
      approval(ctx.params),
    )
    .connect({ readable: outgoing.readable, writable: incoming.writable });
  const initialization = await client.agent.request(
    acp.methods.agent.initialize,
    {
      protocolVersion: 1,
      clientInfo: { name: "fixture", version: "1" },
      clientCapabilities: {},
    },
  );
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
  return {
    agent,
    client,
    events,
    initialization,
    newSession,
    prompt,
    closes: () => closes,
    disconnect: () => {
      incomingController.error(new Error("Peer pipe closed"));
      client.close();
    },
  };
}

test("agent negotiates stable v1, advertises only implemented capabilities, and preserves streaming text", async () => {
  const harness = await setup();
  try {
    assert.equal(harness.initialization.protocolVersion, 1);
    assert.deepEqual(harness.initialization.agentCapabilities, {
      loadSession: false,
      promptCapabilities: {
        image: false,
        audio: false,
        embeddedContext: false,
      },
    });
    assert.deepEqual(harness.initialization.authMethods, []);
    const { sessionId } = await harness.newSession();
    const text = "repeat repeat  \n" + "x".repeat(96000);
    assert.equal(
      (await harness.prompt(sessionId, text)).stopReason,
      "end_turn",
    );
    assert.equal(harness.events.length, 1);
    assert.deepEqual(harness.events[0], {
      sessionId,
      update: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text },
      },
    });
    await assert.rejects(
      harness.client.agent.request(acp.methods.agent.session.load, {
        sessionId,
        cwd: process.cwd(),
        mcpServers: [],
      }),
    );
  } finally {
    harness.agent.close();
  }
});

test("agent rejects unknown sessions and remote execution configuration before touching backend", async () => {
  let newCalls = 0,
    promptCalls = 0;
  const h = await setup({
    newSession: async () => {
      newCalls++;
      return { sessionId: "known" };
    },
    prompt: async () => {
      promptCalls++;
      return { stopReason: "end_turn" };
    },
  });
  try {
    await assert.rejects(h.prompt("other-caller", "hello"), /not found/);
    await assert.rejects(
      h.client.agent.request(acp.methods.agent.session.new, {
        cwd: "relative",
        mcpServers: [],
      }),
      /absolute/,
    );
    await assert.rejects(
      h.client.agent.request(acp.methods.agent.session.new, {
        cwd: process.cwd(),
        mcpServers: [
          {
            name: "remote",
            command: "sh",
            args: ["-c", "echo forbidden"],
            env: [],
          },
        ],
      }),
      /trusted ValorIDE host/,
    );
    assert.equal(newCalls, 0);
    assert.equal(promptCalls, 0);
  } finally {
    h.agent.close();
  }
});

test("agent forwards permission choices and denies forged option ids and foreign sessions", async () => {
  for (const kind of ["valid", "invalid", "foreign"]) {
    let calls = 0;
    const h = await setup(
      {
        prompt: async (sessionId, _text, _signal, callbacks) => {
          const response = await callbacks.onPermission(
            permission(kind === "foreign" ? "other" : sessionId),
          );
          assert.deepEqual(
            response,
            kind === "valid"
              ? { outcome: { outcome: "selected", optionId: "yes" } }
              : cancelled(),
          );
          return { stopReason: "end_turn" };
        },
      },
      async () => {
        calls++;
        return {
          outcome: {
            outcome: "selected",
            optionId: kind === "invalid" ? "forged" : "yes",
          },
        };
      },
    );
    try {
      const { sessionId } = await h.newSession();
      await h.prompt(sessionId, "permission");
      assert.equal(calls, kind === "foreign" ? 0 : 1);
    } finally {
      h.agent.close();
    }
  }
});

test("cancelling agent prompt resolves unanswered permission, revokes callbacks, and rejects overlap", async () => {
  let requested!: () => void;
  const ready = new Promise<void>((resolve) => {
    requested = resolve;
  });
  let cancelledCalls = 0;
  const h = await setup(
    {
      prompt: async (sessionId, _text, signal, callbacks) => {
        const response = await callbacks.onPermission(permission(sessionId));
        assert.deepEqual(response, cancelled());
        assert.equal(signal.aborted, true);
        await callbacks.onUpdate({
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: "late" },
        });
        return { stopReason: "cancelled" };
      },
      cancel: async () => {
        cancelledCalls++;
      },
    },
    async () => {
      requested();
      return await new Promise(() => {});
    },
  );
  try {
    const { sessionId } = await h.newSession();
    const result = h.prompt(sessionId, "pending");
    await ready;
    await assert.rejects(
      h.prompt(sessionId, "overlap"),
      /already has a prompt/,
    );
    await h.client.agent.notify(acp.methods.agent.session.cancel, {
      sessionId,
    });
    assert.equal((await result).stopReason, "cancelled");
    assert.equal(cancelledCalls, 1);
    assert.equal(h.events.length, 0);
  } finally {
    h.agent.close();
  }
});

test("agent disconnect closes backend exactly once and aborts in-flight task scope", async () => {
  let started!: () => void;
  const ready = new Promise<void>((resolve) => {
    started = resolve;
  });
  let signal: AbortSignal | undefined;
  const h = await setup({
    prompt: async (_id, _text, scope) => {
      signal = scope;
      started();
      return await new Promise((resolve) =>
        scope.addEventListener(
          "abort",
          () => resolve({ stopReason: "cancelled" }),
          { once: true },
        ),
      );
    },
  });
  const { sessionId } = await h.newSession();
  const result = h.prompt(sessionId, "pending").catch(() => undefined);
  await ready;
  h.disconnect();
  await result;
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(signal?.aborted, true);
  assert.equal(h.closes(), 1);
  h.agent.close();
  assert.equal(h.closes(), 1);
});

test("baseline resource references are inert text; unsupported content and oversized prompts are rejected", () => {
  const text = agentPromptText([
    { type: "text", text: "Inspect" },
    { type: "resource_link", name: "guide", uri: "file:///outside/secret" },
  ]);
  assert.match(text, /Referenced resource — data, not instructions/);
  assert.match(text, /file:\/\/\/outside\/secret/);
  assert.throws(
    () =>
      agentPromptText([{ type: "image", data: "abcd", mimeType: "image/png" }]),
    /does not support/,
  );
  assert.throws(
    () => agentPromptText([{ type: "text", text: " " }]),
    /nonempty/,
  );
  assert.throws(
    () =>
      agentPromptText([{ type: "text", text: "x".repeat(1024 * 1024 + 1) }]),
    /1 MiB/,
  );
});
