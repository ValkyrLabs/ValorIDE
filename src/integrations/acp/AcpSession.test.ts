import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { AcpSession, type AcpSessionCallbacks } from "./AcpSession";
import type * as acp from "@agentclientprotocol/sdk";

let directory: string;
let fixture: string;
const sdk = pathToFileURL(
  require.resolve("@agentclientprotocol/sdk", { paths: [process.cwd()] }),
).href;

before(async () => {
  directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "valoride acp protocol "),
  );
  fixture = path.join(directory, "independent-agent.mjs");
  // The child uses the actual official SDK, independently of the bundled client.
  await fs.writeFile(
    fixture,
    `
import * as acp from ${JSON.stringify(sdk)};
import {Readable, Writable} from 'node:stream';
const kind = process.env.ACP_FIXTURE;
let count = 0, authenticated = false, mode = 'safe', cancel;
const app = acp.agent({name:'fixture'})
 .onRequest(acp.methods.agent.initialize, async ctx => {
   if (kind === 'init-hang') return await new Promise(() => {});
   if (ctx.params.protocolVersion !== 1) throw new Error('v1 expected');
   if (ctx.params.clientCapabilities?.terminal) throw new Error('terminal must not be advertised');
   return {protocolVersion:kind === 'wrong-version'?999:1,agentInfo:{name:'fixture',version:'1'},
     agentCapabilities:{loadSession:kind !== 'no-load'},authMethods:[{id:'login',name:'Fixture sign in'}]};
 })
 .onRequest(acp.methods.agent.authenticate, ctx => {
   if(ctx.params.methodId !== 'login') throw new Error('unknown method');authenticated=true;return {};
 })
 .onRequest(acp.methods.agent.session.new, () => {
   if(kind==='auth'&&!authenticated)throw acp.RequestError.authRequired();
   return {sessionId:kind==='empty-session'?'':'session-'+(++count),modes:{currentModeId:mode,availableModes:[{id:'safe',name:'Review'},{id:'act',name:'Act'}]}};
 })
 .onRequest(acp.methods.agent.session.load, async ctx => {
   if(kind==='no-load')throw new Error('load must not be sent');
   await ctx.client.notify(acp.methods.client.session.update,{sessionId:ctx.params.sessionId,update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'replayed'}}});
   return {};
 })
 .onRequest(acp.methods.agent.session.setMode, async ctx => {
   mode=ctx.params.modeId;
   await ctx.client.notify(acp.methods.client.session.update,{sessionId:ctx.params.sessionId,update:{sessionUpdate:'current_mode_update',currentModeId:mode}});
   return {};
 })
 .onNotification(acp.methods.agent.session.cancel, () => cancel?.())
 .onRequest(acp.methods.agent.session.prompt, async ctx => {
   const sessionId=ctx.params.sessionId, text=ctx.params.prompt[0].text;
   const update=update=>ctx.client.notify(acp.methods.client.session.update,{sessionId,update});
   const say=text=>update({sessionUpdate:'agent_message_chunk',content:{type:'text',text}});
   await ctx.client.notify(acp.methods.client.session.update,{sessionId:'other-session',update:{sessionUpdate:'agent_message_chunk',content:{type:'text',text:'MUST NOT APPEAR'}}});
   if(text==='exit') process.exit(7);
   if(text==='oversized'){process.stdout.write('x'.repeat(4*1024*1024+1)+'\\n'); return await new Promise(()=>{});}
   if(text==='cancel'||text==='ignore-cancel'){
     await say('started');
     await new Promise(resolve=>{if(text==='cancel')cancel=resolve;});
     return {stopReason:'cancelled'};
   }
   if(text==='permission'||text==='foreign-permission'){
     const permission=await ctx.client.request(acp.methods.client.session.requestPermission,{sessionId:text==='foreign-permission'?'foreign':sessionId,
       toolCall:{toolCallId:'write-1',title:'Write fixture'},options:[{optionId:'once',name:'Allow once',kind:'allow_once'},{optionId:'no',name:'Reject',kind:'reject_once'}]});
     await say(JSON.stringify(permission));
     return {stopReason:permission.outcome.outcome==='cancelled'?'cancelled':'end_turn'};
   }
   if(text==='permission-flood'){
     const request={sessionId,toolCall:{toolCallId:'flood',title:'Review'},options:[{optionId:'once',name:'Allow once',kind:'allow_once'}]};
     const first=ctx.client.request(acp.methods.client.session.requestPermission,request);
     const second=await ctx.client.request(acp.methods.client.session.requestPermission,request);
     await say(second.outcome.outcome);
     await first;return {stopReason:'cancelled'};
   }
   if(text==='fs'){
     const read=await ctx.client.request(acp.methods.client.fs.readTextFile,{sessionId,path:process.cwd()+'/file.txt',line:2,limit:1});
     await ctx.client.request(acp.methods.client.fs.writeTextFile,{sessionId,path:process.cwd()+'/file.txt',content:read.content+' changed'});
     await say(read.content);return {stopReason:'end_turn'};
   }
   if(text==='foreign-fs'){
     try{await ctx.client.request(acp.methods.client.fs.readTextFile,{sessionId:'foreign',path:process.cwd()+'/file.txt'});throw Error('foreign FS accepted');}
     catch(e){await say(String(e.code));return {stopReason:'end_turn'};}
   }
   if(text==='fs-cancel'){
     try{await ctx.client.request(acp.methods.client.fs.readTextFile,{sessionId,path:process.cwd()+'/file.txt'});}
     catch(e){await say(String(e.code));}
     return {stopReason:'cancelled'};
   }
   if(text==='environment'){await say(process.env.ACP_HOST_SECRET_SENTINEL || 'not-inherited');return {stopReason:'end_turn'};}
   if(text==='stream'){
     await update({sessionUpdate:'agent_thought_chunk',content:{type:'text',text:'Public working summary'}});
     await update({sessionUpdate:'tool_call',toolCallId:'tool-1',title:'Inspect project',kind:'read',status:'in_progress'});
     await update({sessionUpdate:'tool_call_update',toolCallId:'tool-1',status:'completed'});
     await update({sessionUpdate:'plan',entries:[{content:'Inspect project',priority:'medium',status:'completed'}]});
     for(const chunk of ['same',' ', 'same', '\\n', 'x'.repeat(96000)])await say(chunk);
     return {stopReason:'end_turn'};
   }
   if(text==='slow')await new Promise(resolve=>setTimeout(resolve,1100));
   await say(text);return {stopReason:'end_turn'};
 });
app.connect(acp.ndJsonStream(Writable.toWeb(process.stdout),Readable.toWeb(process.stdin)));
`,
  );
});
after(async () => {
  await fs.rm(directory, { recursive: true, force: true });
});

function session(
  kind = "normal",
  callbacks: Partial<AcpSessionCallbacks> = {},
  extra: { controlTimeoutMs?: number; cancelGraceMs?: number } = {},
) {
  const updates: acp.SessionNotification[] = [];
  const instance = new AcpSession({
    agent: {
      id: "fixture",
      name: "Fixture",
      command: process.execPath,
      args: [fixture],
    },
    cwd: directory,
    environment: { ACP_FIXTURE: kind },
    callbacks: {
      requestPermission: async () => ({ outcome: { outcome: "cancelled" } }),
      onUpdate: (n) => updates.push(n),
      ...callbacks,
    },
    ...extra,
  });
  return {
    instance,
    updates,
    text: () =>
      updates
        .flatMap((n) =>
          n.update.sessionUpdate === "agent_message_chunk" &&
          n.update.content.type === "text"
            ? [n.update.content.text]
            : [],
        )
        .join(""),
  };
}

async function ready(instance: AcpSession) {
  await instance.connect();
  return instance.newSession();
}
async function eventually(check: () => boolean, limit = 2000) {
  const deadline = Date.now() + limit;
  while (!check()) {
    if (Date.now() > deadline) throw Error("Condition did not settle");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("negotiates stable ACP through a real subprocess and streams full messages, thoughts, tools and plans", async () => {
  const fixture = session();
  try {
    await ready(fixture.instance);
    const result = await fixture.instance.prompt("stream");
    assert.equal(result.stopReason, "end_turn");
    assert.equal(fixture.text(), "same same\n" + "x".repeat(96000));
    assert.deepEqual(
      fixture.updates.slice(0, 4).map((n) => n.update.sessionUpdate),
      ["agent_thought_chunk", "tool_call", "tool_call_update", "plan"],
    );
    assert.equal(fixture.instance.state.status, "ready");
    assert.equal(fixture.instance.state.initialization?.protocolVersion, 1);
  } finally {
    fixture.instance.dispose();
  }
});

test("per-session modes and load replay are accepted only for the current session", async () => {
  const f = session();
  try {
    await ready(f.instance);
    await f.instance.setMode("act");
    assert.equal(f.instance.state.modes?.currentModeId, "act");
    await assert.rejects(f.instance.setMode("made-up"), /advertised/);
    await f.instance.newSession();
    assert.equal(f.instance.state.sessionId, "session-2");
    await f.instance.loadSession("previous-session");
    assert.equal(f.text(), "replayed");
    assert.equal(f.instance.state.sessionId, "previous-session");
  } finally {
    f.instance.dispose();
  }
});

test("never sends load when capability is absent", async () => {
  const f = session("no-load");
  try {
    await ready(f.instance);
    await assert.rejects(
      f.instance.loadSession("previous"),
      /does not support/,
    );
    assert.equal(f.instance.state.status, "ready");
  } finally {
    f.instance.dispose();
  }
});

test("auth-required preserves a connection for an explicitly chosen advertised authentication method", async () => {
  const f = session("auth");
  try {
    await f.instance.connect();
    await assert.rejects(f.instance.newSession());
    assert.equal(f.instance.state.status, "connected");
    await assert.rejects(f.instance.authenticate("unadvertised"), /advertised/);
    await f.instance.authenticate("login");
    await f.instance.newSession();
    assert.equal(f.instance.state.status, "ready");
  } finally {
    f.instance.dispose();
  }
});

test("selected permission uses only a real option and rejects foreign-session requests", async () => {
  let calls = 0;
  const f = session("normal", {
    requestPermission: async () => {
      calls++;
      return { outcome: { outcome: "selected", optionId: "once" } };
    },
  });
  try {
    await ready(f.instance);
    await f.instance.prompt("permission");
    assert.equal(JSON.parse(f.text()).outcome.optionId, "once");
    await f.instance.prompt("foreign-permission");
    assert.equal(calls, 1);
  } finally {
    f.instance.dispose();
  }
});

test("invalid permission options and callback errors cannot grant approval", async () => {
  for (const callback of [
    async () => ({
      outcome: { outcome: "selected" as const, optionId: "injected" },
    }),
    async () => {
      throw Error("dialog closed");
    },
  ]) {
    const f = session("normal", { requestPermission: callback });
    try {
      await ready(f.instance);
      const result = await f.instance.prompt("permission");
      assert.equal(result.stopReason, "cancelled");
    } finally {
      f.instance.dispose();
    }
  }
});

test("cancelling immediately answers an outstanding permission even when its UI promise never settles", async () => {
  let entered = false,
    signal: AbortSignal | undefined;
  const f = session("normal", {
    requestPermission: async (_, value) => {
      entered = true;
      signal = value;
      return new Promise(() => {});
    },
  });
  try {
    await ready(f.instance);
    const prompt = f.instance.prompt("permission");
    await eventually(() => entered);
    await f.instance.cancel();
    assert.equal(signal?.aborted, true);
    assert.equal((await prompt).stopReason, "cancelled");
    assert.equal(f.instance.state.status, "ready");
  } finally {
    f.instance.dispose();
  }
});

test("cancels a running prompt and rejects overlapping work without replay", async () => {
  const f = session();
  try {
    await ready(f.instance);
    const prompt = f.instance.prompt("cancel");
    await eventually(() => f.text() === "started");
    await assert.rejects(
      f.instance.prompt("must not run"),
      /current ACP operation/,
    );
    await assert.rejects(f.instance.newSession(), /current ACP operation/);
    await f.instance.cancel();
    assert.equal((await prompt).stopReason, "cancelled");
  } finally {
    f.instance.dispose();
  }
});

test("kills an uncooperative cancelled agent and rejects its pending prompt", async () => {
  const f = session("normal", {}, { cancelGraceMs: 50 });
  try {
    await ready(f.instance);
    const prompt = f.instance.prompt("ignore-cancel");
    const rejected = assert.rejects(prompt, /did not stop|closed/);
    await eventually(() => f.text() === "started");
    await f.instance.cancel();
    await rejected;
    assert.equal(f.instance.state.status, "closed");
  } finally {
    f.instance.dispose();
  }
});

test("filesystem callbacks use the active session and cancellation scope", async () => {
  const reads: acp.ReadTextFileRequest[] = [],
    writes: acp.WriteTextFileRequest[] = [];
  const f = session("normal", {
    readTextFile: async (r, s) => {
      assert.equal(s.aborted, false);
      reads.push(r);
      return { content: "unsaved editor text" };
    },
    writeTextFile: async (r, s) => {
      assert.equal(s.aborted, false);
      writes.push(r);
      return {};
    },
  });
  try {
    await ready(f.instance);
    await f.instance.prompt("fs");
    assert.equal(reads[0].line, 2);
    assert.equal(reads[0].limit, 1);
    assert.equal(writes[0].content, "unsaved editor text changed");
    await f.instance.prompt("foreign-fs");
    assert.equal(reads.length, 1);
  } finally {
    f.instance.dispose();
  }
});

test("prompt duration is not subject to the control-operation timeout", async () => {
  const f = session("normal", {}, { controlTimeoutMs: 1000 });
  try {
    await ready(f.instance);
    assert.equal((await f.instance.prompt("slow")).stopReason, "end_turn");
  } finally {
    f.instance.dispose();
  }
});

test("handshake timeout and incompatible protocol fail closed", async () => {
  for (const kind of ["init-hang", "wrong-version"]) {
    const f = session(kind, {}, { controlTimeoutMs: 500 });
    try {
      await assert.rejects(
        f.instance.connect(),
        /timed out|unsupported protocol/,
      );
      assert.equal(f.instance.state.status, "closed");
    } finally {
      f.instance.dispose();
    }
  }
});

test("process exit and oversized protocol frames reject active requests", async () => {
  for (const prompt of ["exit", "oversized"]) {
    const f = session();
    try {
      await ready(f.instance);
      await assert.rejects(f.instance.prompt(prompt));
      assert.equal(f.instance.state.status, "closed");
    } finally {
      f.instance.dispose();
    }
  }
});

test("disposing during work revokes callbacks and rejects the live request", async () => {
  const f = session();
  await ready(f.instance);
  const result = assert.rejects(f.instance.prompt("ignore-cancel"));
  f.instance.dispose();
  await result;
  assert.equal(f.instance.state.status, "closed");
  await assert.rejects(f.instance.prompt("after disposal"), /Connect/);
});

test("invalid launch descriptions are rejected before a process starts", () => {
  const opts = {
    agent: { id: "test", name: "test", command: process.execPath },
    cwd: "relative",
    environment: {},
    callbacks: {
      requestPermission: async () => ({
        outcome: { outcome: "cancelled" as const },
      }),
    },
  };
  assert.throws(() => new AcpSession(opts), /absolute/);
  assert.throws(
    () =>
      new AcpSession({
        ...opts,
        cwd: directory,
        agent: { ...opts.agent, command: "bad\0command" },
      }),
    /valid ACP executable/,
  );
});

test("an executable failure settles initialization instead of leaving a working spinner", async () => {
  const instance = new AcpSession({
    agent: {
      id: "missing",
      name: "Missing",
      command: path.join(directory, "not-installed"),
    },
    cwd: directory,
    environment: {},
    callbacks: {
      requestPermission: async () => ({ outcome: { outcome: "cancelled" } }),
    },
  });
  try {
    await assert.rejects(instance.connect(), /could not start|closed/);
    assert.equal(instance.state.status, "closed");
  } finally {
    instance.dispose();
  }
});

test("does not implicitly inherit extension-host environment secrets", async () => {
  const previous = process.env.ACP_HOST_SECRET_SENTINEL;
  process.env.ACP_HOST_SECRET_SENTINEL = "fixture-host-only";
  const f = session();
  try {
    await ready(f.instance);
    await f.instance.prompt("environment");
    assert.equal(f.text(), "not-inherited");
  } finally {
    f.instance.dispose();
    if (previous === undefined) delete process.env.ACP_HOST_SECRET_SENTINEL;
    else process.env.ACP_HOST_SECRET_SENTINEL = previous;
  }
});

test("state snapshots cannot mutate session authority", async () => {
  const f = session();
  try {
    await ready(f.instance);
    const view = f.instance.state;
    view.sessionId = "foreign";
    view.initialization!.agentCapabilities!.loadSession = false;
    assert.equal(f.instance.state.sessionId, "session-1");
    assert.equal(
      f.instance.state.initialization?.agentCapabilities?.loadSession,
      true,
    );
  } finally {
    f.instance.dispose();
  }
});

test("cancellation settles an in-flight filesystem callback even if the host callback ignores its signal", async () => {
  let entered = false;
  const f = session("normal", {
    readTextFile: async () => {
      entered = true;
      return new Promise(() => {});
    },
  });
  try {
    await ready(f.instance);
    const prompt = f.instance.prompt("fs-cancel");
    await eventually(() => entered);
    await f.instance.cancel();
    assert.equal((await prompt).stopReason, "cancelled");
    assert.equal(f.text(), "-32800");
  } finally {
    f.instance.dispose();
  }
});

test("reentrant cancellation during a permission callback cannot lose the abort signal", async () => {
  const f = session("normal", {
    requestPermission: async () => {
      void f.instance.cancel();
      return new Promise(() => {});
    },
  });
  try {
    await ready(f.instance);
    assert.equal(
      (await f.instance.prompt("permission")).stopReason,
      "cancelled",
    );
  } finally {
    f.instance.dispose();
  }
});

test("bounds simultaneous permission dialogs without granting the excess request", async () => {
  let calls = 0;
  const f = session("normal", {
    requestPermission: async () => {
      calls++;
      return new Promise(() => {});
    },
  });
  try {
    await ready(f.instance);
    const prompt = f.instance.prompt("permission-flood");
    await eventually(() => f.text() === "cancelled");
    assert.equal(calls, 1);
    await f.instance.cancel();
    assert.equal((await prompt).stopReason, "cancelled");
  } finally {
    f.instance.dispose();
  }
});

test("rejects an empty agent session ID without exposing a ready session", async () => {
  const f = session("empty-session");
  try {
    await f.instance.connect();
    await assert.rejects(f.instance.newSession(), /invalid session ID/);
    assert.equal(f.instance.state.status, "closed");
  } finally {
    f.instance.dispose();
  }
});
