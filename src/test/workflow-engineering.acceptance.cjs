const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vscode = require("vscode");

const instruction = "In the current workspace, edit only quote-total.cjs so totalCents(items) sums item.unitCents * item.quantity, returning 0 for an empty list. Read quote-total.test.cjs but do not modify it. Run exactly node --test quote-total.test.cjs. Do not install dependencies, access network, edit outside this workspace, commit, or deploy. The test creates test-result.json; do not write it yourself. Finish only after the test passes and preserve your real checkpoint evidence.";
const brief = "Fix the quote total calculation in the available workspace so item quantities are included, run its focused tests, and report the verified result. Keep this local and remember the outcome."
  + "\n\nWhen delegating, pass this exact bounded instruction: " + instruction;
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const read = file => JSON.parse(fs.readFileSync(file, "utf8"));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const streamEvents = text => text.replaceAll("\r\n", "\n").split("\n\n").filter(Boolean).map(frame => {
  const lines = frame.split("\n");
  const event = lines.find(line => line.startsWith("event:"))?.slice(6).trim();
  const raw = lines.filter(line => line.startsWith("data:")).map(line => line.slice(5).trimStart()).join("\n");
  try { return { event, data: JSON.parse(raw) }; } catch { return { event, data: raw }; }
});

exports.run = async ({ extension, report, evidence, browser }) => {
  const base = process.env.VALORIDE_NATIVE_BASE_URL;
  const workspace = process.env.VALORIDE_NATIVE_ENGINEERING_WORKSPACE;
  assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname));
  assert.equal(vscode.workspace.workspaceFolders?.length, 1);
  assert.equal(vscode.workspace.workspaceFolders[0].uri.fsPath, workspace);
  const fixture = read(path.join(evidence, "engineering-fixture.json"));
  const migration = read(path.join(path.dirname(process.env.VALORIDE_NATIVE_REPORT), "core-migration.json"));
  const operator = migration.migrationAdministrator;
  const reviewer = migration.targets.find(item => item.username === "super");
  assert(operator?.principalId && reviewer?.principalId && operator.principalId !== reviewer.principalId);
  const save = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2), { mode: 0o600 });
  const request = async (url, headers, options = {}) => {
    const response = await fetch(new URL(url, base), { headers, signal: AbortSignal.timeout(30_000), ...options });
    assert(response.ok, `${url} returned HTTP ${response.status}`);
    return response.json();
  };
  const login = async username => {
    const session = await request("/v1/auth/login", { "Content-Type": "application/json" }, {
      method: "POST", body: JSON.stringify({ username, password: process.env.VALKYR_ACCEPTANCE_PASSWORD }),
    });
    assert(session.token);
    return { Authorization: `Bearer ${session.token}` };
  };
  const admin = await login("super");
  const accessPath = `/v1/admin/access/principals/${operator.principalId}`;
  const before = await request(accessPath, admin);
  assert.equal(before.username, operator.username);
  assert(!before.roleNames.includes("ADMIN") && !before.roleNames.includes("VALKYR_CORE") && !before.roleNames.includes("SYSTEM"));
  const setRoles = roleNames => request(`${accessPath}/roles`, { ...admin, "Content-Type": "application/json" }, {
    method: "PUT", body: JSON.stringify({ roleNames }),
  });
  let rolesGranted = false;
  let coreGranted = false;
  const approvals = [];
  const localApprovals = [];
  let result;
  let localApprovalTimer;
  let localApprovalWork;
  let localApprovalError;
  const providerRequestsPath = path.join(path.dirname(path.dirname(process.env.VALORIDE_NATIVE_REPORT)),
    "provider", "provider-requests.jsonl");
  const providerOffset = fs.readFileSync(providerRequestsPath, "utf8").split("\n").filter(Boolean).length;
  try {
    await setRoles([...before.roleNames, "ADMIN"]);
    rolesGranted = true;
    await request(`${accessPath}/valkyr-core`, admin, { method: "PUT" });
    coreGranted = true;
    const owner = await login(operator.username);
    const schema = await request("/v1/tenant-schemas/preflight/graymatter_status?operation=skillopt.route", owner);
    assert(schema.ready === true && schema.schemaName === "main");
    await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
    // This isolated host has no coding task yet. Open the existing chat view
    // before dispatch so its real decision controls are mounted, not Account.
    await vscode.commands.executeCommand("valoride.plusButtonClicked");
    const api = extension.exports;
    assert.equal(typeof api.acceptanceSnapshot, "function");
    const waitUntil = async (readValue, description, timeoutMs = 120_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const value = await readValue();
        if (value) return value;
        await sleep(500);
      }
      throw new Error(description);
    };
    const nativeAgent = await waitUntil(async () => {
      const instanceId = api.acceptanceSnapshot().instanceId;
      if (!instanceId) return false;
      const agents = await request("/v1/swarm-ops/agents", owner);
      return agents.find(agent => agent.instanceId === instanceId);
    }, "Actual ValorIDE worker did not register with the loopback runtime");
    assert(nativeAgent.instanceId);
    save("engineering-registered-agent.json", nativeAgent);
    const consume = async (response, file, approvedCheckpoint) => {
      assert(response.ok, `SageChat engineering returned HTTP ${response.status}`);
      let events = streamEvents(await response.text());
      let done = events.findLast(event => event.event === "done")?.data;
      save(file, events);
      const deadline = Date.now() + 180_000;
      const executionId = done?.executionId;
      while (done?.ok && (done.state === "WAITING_UNTIL"
        || (approvedCheckpoint && done.state === "WAITING_FOR_APPROVAL"))) {
        assert(done.executionId === executionId && Number.isFinite(done.cursor),
          "Engineering reconnect lost its original execution or event cursor");
        assert(Date.now() + 2000 < deadline, "SageChat engineering wait exceeded its bound");
        if (done.state === "WAITING_FOR_APPROVAL") {
          const current = await request(`/v1/sagechat/agent/executions/${executionId}`, owner);
          assert.equal(current.id, executionId);
          if (current.state === "WAITING_FOR_APPROVAL") {
            const currentContext = JSON.parse(current.contextData);
            assert(currentContext.workflowApprovalId === approvedCheckpoint.approvalId
              && current.currentCheckpointId === approvedCheckpoint.checkpointId
              && currentContext.approvalActionDigest === approvedCheckpoint.actionDigest,
            "Engineering continuation requires a different, unapproved decision");
          }
        }
        await sleep(2000);
        const resumed = await fetch(new URL(`/v1/sagechat/agent/executions/${done.executionId}/stream?after=${done.cursor}`, base), {
          headers: owner, signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        });
        assert(resumed.ok);
        const next = streamEvents(await resumed.text());
        events.push(...next);
        save(file, events);
        done = next.findLast(event => event.event === "done")?.data;
        assert(!next.some(event => event.event === "error"), "Engineering reconnect emitted a runtime error");
        assert.equal(done?.executionId, executionId, "Engineering reconnect lost the original execution");
      }
      save(file, events);
      assert(!events.some(event => event.event === "error"), "Engineering chat emitted a runtime error");
      assert(done?.ok && done.executionId, "Engineering chat has no durable exact execution");
      return done;
    };
    const submit = (content, sessionId, file) => fetch(new URL(`/v1/sagechat/agent/${report.llmDetailsId}/stream`, base), {
      method: "POST", headers: { ...owner, "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, role: "user", sourceType: "api", content }),
      signal: AbortSignal.timeout(240_000),
    }).then(response => consume(response, file));
    const sessionId = `engineering-${crypto.randomUUID()}`;
    const waiting = await submit(brief, sessionId, "engineering-intent.json");
    assert.equal(waiting.state, "WAITING_FOR_APPROVAL");
    const executionPath = `/v1/sagechat/agent/executions/${waiting.executionId}`;
    const pending = await request(executionPath, owner);
    const context = JSON.parse(pending.contextData);
    const observations = (context.workflowState ?? context).agentToolObservations ?? [];
    const discovered = observations.find(item => item.toolName === "swarm.agents" && item.status === "completed");
    assert(discovered && discovered.data.executionAuthorized === false);
    assert(discovered.data.agents.some(agent => agent.instanceId === nativeAgent.instanceId));
    assert(!observations.some(item => item.toolName === "swarm.dispatch" && item.status === "completed"));
    const approvalId = context.workflowApprovalId;
    const review = await request(`/v1/vaiworkflow/approvals/${approvalId}`, admin);
    const approval = review.approval;
    assert(approval?.id === approvalId && approval.status === "REQUESTED"
      && approval.executionId === pending.id && approval.checkpointId === pending.currentCheckpointId
      && approval.actionDigest === context.approvalActionDigest && approval.actionType === "agent.tool.calls"
      && approval.requestedById === operator.principalId && approval.assignedPrincipalId === reviewer.principalId
      && pending.ownerId === operator.principalId, "Engineering approval lost its exact separated human binding");
    const calls = review.exactPayload?.inputs?.pendingToolCalls;
    assert(Array.isArray(calls) && calls.length === 1 && calls[0].name === "swarm.dispatch");
    const args = calls[0].arguments;
    assert.equal(args.targetInstanceId, nativeAgent.instanceId);
    assert.equal(args.message?.action, "filesystem.write");
    assert.equal(args.message?.instruction ?? args.message?.payload?.instruction, instruction);
    assert.equal(args.message.requiresApproval, true);
    assert(!String(args.message.traceId).startsWith("ceo:"), "Engineering must not invent CEO work lineage");
    const approved = await request(`/v1/vaiworkflow/approvals/${approvalId}/approve`, { ...admin, "Content-Type": "application/json" }, {
      method: "POST", body: JSON.stringify({ actionDigest: approval.actionDigest,
        comment: "Reviewed exact local quote-total edit and focused test in the isolated ValorIDE acceptance workspace" }),
    });
    assert(approved.status === "APPROVED" && approved.id === approvalId && approved.resolvedById === reviewer.principalId
      && approved.actionDigest === approval.actionDigest && approved.checkpointId === pending.currentCheckpointId);
    approvals.push({ approvalId, executionId: pending.id, checkpointId: approval.checkpointId,
      actionDigest: approval.actionDigest, requestedById: approval.requestedById, resolvedById: approved.resolvedById });
    save("engineering-approvals.json", approvals);
    const resumed = await fetch(new URL(`${executionPath}/stream?after=${waiting.cursor}`, base), {
      headers: owner, signal: AbortSignal.timeout(240_000),
    });
    // Observe the persisted dispatch while the parent conversation continues.
    // Native file/command approvals must be serviced before that conversation
    // can truthfully report the requested verified outcome.
    const parent = await waitUntil(async () => {
      const observed = await request(executionPath, owner);
      const state = JSON.parse(observed.contextData);
      const rows = state.agentToolObservations ?? state.workflowState?.agentToolObservations ?? [];
      return rows.some(item => item.toolName === "swarm.dispatch" && item.status === "completed")
        ? observed : false;
    }, "Approved engineering proposal did not persist its exact dispatch", 30_000);
    const parentContext = JSON.parse(parent.contextData);
    const parentObservations = Array.isArray(parentContext.agentToolObservations)
      ? parentContext.agentToolObservations : parentContext.workflowState?.agentToolObservations ?? [];
    const dispatch = parentObservations.find(item => item.toolName === "swarm.dispatch" && item.status === "completed");
    assert(dispatch?.data.commandId && dispatch.data.targetInstanceId === nativeAgent.instanceId);
    const commandId = dispatch.data.commandId;
    assert(!["rejected", "failed"].includes(dispatch.data.status));
    save("engineering-parent-execution.json", parent);
    const approvedAsks = new Set();
    let taskId;
    let taskDir;
    const serviceLocalApproval = async () => {
      const snapshot = api.acceptanceSnapshot();
      const handoff = snapshot.handoffs?.active?.[commandId];
      const outcome = snapshot.handoffs?.outcomes?.[commandId];
      if (outcome && !fs.existsSync(path.join(evidence, "engineering-local-outcome.json")))
        save("engineering-local-outcome.json", outcome);
      taskId = handoff?.localTaskId ?? outcome?.metadata?.localTaskId ?? taskId;
      if (!taskId) return;
      taskDir = path.join(snapshot.globalStoragePath, "tasks", taskId);
      const messagesPath = path.join(taskDir, "ui_messages.json");
      if (!fs.existsSync(messagesPath)) return;
      let messages;
      try { messages = read(messagesPath); } catch { return; }
      const last = messages.at(-1);
      if (last?.type !== "ask" || last.partial || approvedAsks.has(last.ts)) return;
      let detail;
      if (last.ask === "tool") {
        detail = JSON.parse(last.text);
        assert(["editedExistingFile", "newFileCreated", "precisionSearchAndReplace"].includes(detail.tool)
          && ["quote-total.cjs", path.join(workspace, "quote-total.cjs")].includes(detail.path)
          && detail.operationIsLocatedInWorkspace !== false,
        "Worker requested a file edit outside the approved engineering scope");
      } else if (last.ask === "command") {
        // CommandToolHandler appends this UI-only marker when a command needs
        // approval; TaskView removes it before displaying the shell command.
        // Admit only the exact command with or without that single suffix.
        const command = "node --test quote-total.test.cjs";
        const approvalText = last.text.trim();
        assert([command, `${command}REQ_APP`].includes(approvalText),
          "Worker requested a command outside the approved engineering scope");
        detail = { command, approvalText };
      } else if (last.ask === "completion_result") {
        return;
      } else if (last.ask === "command_output") {
        // This continues observing the already approved exact command; it is
        // not permission to run another command.
        assert(localApprovals.some(item => item.ask === "command"));
        detail = { outputSha256: hash(last.text ?? "") };
      } else {
        throw new Error(`Worker requires an unhandled exact local decision: ${last.ask}`);
      }
      const labels = last.ask === "tool" ? ["Approve", "Save"]
        : last.ask === "command" ? ["Run Command"]
          : ["Proceed While Running", "Proceed (Output Unavailable)"];
      const control = await waitUntil(async () => {
        for (const page of await browser.pages()) {
          for (const frame of page.frames()) {
            if (!frame.url().startsWith("vscode-webview://")) continue;
            const label = await frame.evaluate(expected => Array.from(document.querySelectorAll("vscode-button"))
              .find(button => expected.includes(button.textContent.trim()) && !button.hasAttribute("disabled"))?.textContent.trim(), labels);
            if (label) return label;
          }
        }
      }, "Exact engineering decision control did not render in native chat", 15000);
      approvedAsks.add(last.ts);
      localApprovals.push({ ts: last.ts, ask: last.ask, detail, control });
      save("engineering-local-approvals.json", localApprovals);
      await api.pressPrimaryButton();
    };
    let rejectLocalApproval;
    const localApprovalFailed = new Promise((resolve, reject) => { rejectLocalApproval = reject; });
    localApprovalTimer = setInterval(() => {
      if (localApprovalWork || localApprovalError) return;
      localApprovalWork = serviceLocalApproval().catch(error => {
        localApprovalError = error;
        rejectLocalApproval(error);
      }).finally(() => { localApprovalWork = null; });
    }, 500);
    const admitted = await Promise.race([
      consume(resumed, "engineering-admitted.json", {
        approvalId, checkpointId: pending.currentCheckpointId, actionDigest: approval.actionDigest,
      }), localApprovalFailed,
    ]);
    clearInterval(localApprovalTimer);
    if (localApprovalWork) await localApprovalWork;
    if (localApprovalError) throw localApprovalError;
    assert.equal(admitted.executionId, pending.id);
    assert.equal(admitted.state, "SUCCESS");
    let nextReceiptPoll = 0;
    const receipt = await waitUntil(async () => {
      await serviceLocalApproval();
      // Keep local decision checks responsive without issuing a server status
      // read on every 500ms UI tick. The terminal deadline remains unchanged.
      if (Date.now() < nextReceiptPoll) return false;
      nextReceiptPoll = Date.now() + 2000;
      const status = await request(`/v1/swarm-ops/commands/${commandId}/status`, owner);
      if (["succeeded", "failed", "blocked", "outcome_uncertain", "cancelled", "escalated", "rejected"].includes(String(status.status).toLowerCase()))
        return status;
      return false;
    }, "Real ValorIDE engineering task did not produce a canonical terminal receipt", 600_000);
    save("engineering-terminal-receipt.json", receipt);
    assert.equal(receipt.commandId, commandId);
    assert.equal(receipt.targetInstanceId, nativeAgent.instanceId);
    assert.equal(receipt.status.toLowerCase(), "succeeded");
    const payload = JSON.parse(receipt.commandPayloadJson);
    const outcome = payload.result?.outcome ?? payload.outcome;
    assert(outcome?.status === "SUCCEEDED" && outcome.commandId === commandId
      && outcome.targetInstanceId === nativeAgent.instanceId && outcome.source === "runtime-envelope"
      && outcome.confidence === "EXPLICIT" && /^sha256:[a-f0-9]{64}$/.test(outcome.actionDigest)
      && /^sha256:[a-f0-9]{64}$/.test(outcome.scopeDigest));
    assert(outcome.evidenceRefs?.some(ref => /^valoride-checkpoint:[a-f0-9]{40,64}$/.test(ref)),
      "Completion lacks a machine-produced ValorIDE file-change checkpoint");
    assert(taskDir && localApprovals.some(item => item.ask === "tool") && localApprovals.some(item => item.ask === "command"));
    const source = fs.readFileSync(path.join(workspace, "quote-total.cjs"));
    assert.notEqual(hash(source), fixture.originalSourceSha256);
    assert.equal(hash(fs.readFileSync(path.join(workspace, "quote-total.test.cjs"))), fixture.testSourceSha256);
    const workspaceFiles = fs.readdirSync(workspace);
    if (workspaceFiles.includes(".valoride")) {
      // The existing precision editor keeps undo bytes here. Validate this
      // exact metadata tree instead of accepting arbitrary extra files.
      const metadata = path.join(workspace, ".valoride");
      assert(fs.lstatSync(metadata).isDirectory());
      assert.deepEqual(fs.readdirSync(metadata), ["undo"]);
      const undo = path.join(metadata, "undo");
      assert(fs.lstatSync(undo).isDirectory());
      const backups = fs.readdirSync(undo);
      assert(backups.length > 0);
      for (const backup of backups) {
        const match = /^quote-total\.cjs\.([a-f0-9]{8})\.bak$/.exec(backup);
        assert(match && fs.lstatSync(path.join(undo, backup)).isFile(), "Unexpected engineering undo artifact");
        assert.equal(hash(fs.readFileSync(path.join(undo, backup))).slice(0, 8), match[1]);
      }
      assert(backups.includes(`quote-total.cjs.${fixture.originalSourceSha256.slice(0, 8)}.bak`));
      assert.equal(hash(fs.readFileSync(path.join(undo, `quote-total.cjs.${fixture.originalSourceSha256.slice(0, 8)}.bak`))), fixture.originalSourceSha256);
    }
    assert.deepEqual(workspaceFiles.filter(name => name !== ".valoride").sort(), ["quote-total.cjs", "quote-total.test.cjs", "test-result.json"].sort());
    const testResult = read(path.join(workspace, "test-result.json"));
    assert.equal(testResult.schemaVersion, "native-engineering-test/1");
    assert.equal(testResult.status, "passed");
    assert.equal(testResult.assertions, 3);
    assert.equal(testResult.sourceSha256, hash(source));
    const historyBytes = fs.readFileSync(path.join(taskDir, "api_conversation_history.json"));
    const historyText = historyBytes.toString("utf8");
    assert(historyText.includes("node --test quote-total.test.cjs") && historyText.includes("quote totals include every item quantity")
      && /(?:Command executed|exit code 0)/.test(historyText),
      "Worker transcript does not contain its exact executed test and observed assertion output");
    for (const name of ["quote-total.cjs", "quote-total.test.cjs", "test-result.json"])
      fs.copyFileSync(path.join(workspace, name), path.join(evidence, `engineering-${name}`));
    fs.copyFileSync(path.join(taskDir, "ui_messages.json"), path.join(evidence, "engineering-ui-messages.json"));
    const memoryQuery = new URL("/v1/MemoryEntry", base);
    memoryQuery.searchParams.set("example", JSON.stringify({ sourceChannel: "valkyr-swarm:receipts",
      sourceMessageId: `swarm-command:${commandId}:succeeded` }));
    memoryQuery.searchParams.set("size", "2");
    const memory = await waitUntil(async () => {
      const rows = await request(memoryQuery, owner);
      assert(Array.isArray(rows) && rows.length <= 1, "Engineering memory projection is ambiguous");
      return rows[0];
    }, "Canonical engineering terminal outcome was not projected into authorized durable memory", 30_000);
    const memoryArtifact = JSON.parse(memory.text);
    assert(memoryArtifact.commandId === commandId && memoryArtifact.status === "succeeded"
      && memoryArtifact.requesterPrincipalId === operator.principalId
      && memoryArtifact.projectionSource === "server-canonical-swarm-command-response");
    save("engineering-memory.json", memory);
    const reviewSession = `engineering-review-${crypto.randomUUID()}`;
    const reviewed = await submit(`Show the available team and verify the delegated work ${commandId}.`, reviewSession, "engineering-fresh-review.json");
    assert(reviewed.state === "SUCCESS" && reviewed.sessionId === reviewSession && reviewed.executionId !== pending.id);
    const reviewExecution = await request(`/v1/sagechat/agent/executions/${reviewed.executionId}`, owner);
    const reviewContext = JSON.parse(reviewExecution.contextData);
    const reviewedStatus = ((reviewContext.workflowState ?? reviewContext).agentToolObservations ?? []).find(item =>
      item.toolName === "swarm.command.status" && item.status === "completed" && item.data?.commandId === commandId);
    assert(reviewedStatus?.data.terminal === true && reviewedStatus.data.runtimeEvidenceAvailable === true
      && reviewedStatus.data.status === "succeeded");
    await vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
    const pages = await browser.pages();
    await pages[0]?.screenshot({ path: path.join(evidence, "native-engineering-completed.png") });
    const routingRequests = fs.readFileSync(providerRequestsPath, "utf8").split("\n").filter(Boolean)
      .slice(providerOffset).map(line => JSON.parse(line)).filter(row => row.engineeringIntent);
    const routingModel = process.env.VALKYR_ACCEPTANCE_BUSINESS_MODEL?.trim();
    const routingBoundary = routingModel ? "live-local-model" : "deterministic-loopback-fixture";
    assert(routingRequests.length >= 2 && routingRequests.every(row =>
      row.providerBoundary === routingBoundary && (!routingModel || row.liveModel === routingModel)),
    "Engineering routing crossed its declared model boundary or used fixture fallback");
    result = { status: "passed", providerBoundary: routingModel
      ? "live-local-sagechat-model/live-local-valoride-model"
      : "deterministic-sagechat-routing/live-local-valoride-model",
      sageChatRouting: { providerBoundary: routingBoundary, model: routingModel ?? null,
        requests: routingRequests.map(row => ({ requestNumber: row.requestNumber,
          promptSha256: row.promptSha256, responseSha256: row.responseSha256 })) },
      model: process.env.VALORIDE_ACCEPTANCE_ENGINEERING_MODEL, workspace, commandId,
      instanceId: nativeAgent.instanceId, localTaskId: taskId, parentExecutionId: pending.id,
      reviewExecutionId: reviewed.executionId, canonicalApproval: approvals[0], localApprovals,
      terminalStatus: receipt.status, evidenceRefs: outcome.evidenceRefs,
      sourceSha256: hash(source), testSourceSha256: fixture.testSourceSha256,
      transcriptSha256: hash(historyBytes), testResult, memoryId: memory.id,
      memorySourceMessageId: memory.sourceMessageId, originalRoles: before.roleNames };
  } catch (error) {
    save("engineering-failure.json", { error: error.stack ?? String(error),
      approvals, localApprovals,
      workspaceFiles: fs.readdirSync(workspace) });
    console.error("Native engineering acceptance failed:", error);
    try { save("engineering-failure-state.json", extension.exports.acceptanceSnapshot?.()); }
    catch (captureError) { console.error("Native engineering state capture failed:", captureError.message); }
    throw error;
  } finally {
    clearInterval(localApprovalTimer);
    if (localApprovalWork) await localApprovalWork;
    if (coreGranted) await request(`${accessPath}/valkyr-core`, admin, { method: "DELETE" });
    if (rolesGranted) {
      const restored = await setRoles(before.roleNames);
      assert.deepEqual([...restored.roleNames].sort(), [...before.roleNames].sort());
      save("engineering-operator-restored.json", { principalId: operator.principalId, roleNames: restored.roleNames });
      if (result) result.operatorRolesRestored = true;
    }
  }
  save("engineering-verification.json", result);
  return result;
};
