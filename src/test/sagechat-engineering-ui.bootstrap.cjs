// Test infrastructure: authenticate an isolated real native host. No model,
// task, approval, plan, or outcome is supplied by this bootstrap.
let restoreFetch;
let restoreTransport;
exports.activate = async (context) => {
  const fs = require("node:fs");
  const path = require("node:path");
  const vscode = require("vscode");
  const base = process.env.VALORIDE_ENGINEERING_API;
  const origin = new URL(base);
  if (origin.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(origin.hostname))
    throw new Error("Native engineering acceptance requires the owned loopback backend");
  const response = await fetch(`${base}/v1/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: process.env.VALORIDE_ENGINEERING_USERNAME,
      password: process.env.VALORIDE_ENGINEERING_PASSWORD }),
    signal: AbortSignal.timeout(30000),
  });
  const session = await response.json();
  if (!response.ok || !session.token)
    throw new Error(`Native engineering authentication returned HTTP ${response.status}`);
  await vscode.workspace.getConfiguration("valoride.valkyrai")
    .update("host", `${base}/v1`, vscode.ConfigurationTarget.Global);
  await context.secrets.store("jwtToken", session.token);
  await context.secrets.store("authState", JSON.stringify({
    tokens: { jwtToken: session.token }, user: session.authenticatedPrincipalObject || {},
    timestamp: Date.now(),
  }));
  await context.globalState.update("enableCheckpoints", true);
  const admissionObservations = [], observerErrors = [];
  const bindingKeys = ["schemaVersion", "toolCallId", "workflowExecutionId", "workflowVersionId",
    "runnerInstanceId", "runnerPrincipalId", "llmDetailsId", "integrationAccountId", "providerKind",
    "endpoint", "model", "maxTokens", "temperature", "connectionHash", "commandId", "actionDigest", "scopeDigest"];
  const project = value => Object.fromEntries(bindingKeys.map(key => [key, value?.[key]]));
  const forbiddenFields = value => {
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).flatMap(([key, child]) => [
      ...(/^(?:jwt|jwtToken|accessToken|refreshToken|apiKey|credential|credentialReference)$/i.test(key) ? [key] : []),
      ...forbiddenFields(child),
    ]);
  };
  const record = observation => {
    admissionObservations.push({ sequence: admissionObservations.length + 1, ...observation });
    try { fs.writeFileSync(path.join(process.env.VALORIDE_ENGINEERING_EVIDENCE, "native-core-admissions.json"),
      JSON.stringify(admissionObservations, null, 2), { mode: 0o600 }); }
    catch (error) { observerErrors.push(error.name || "observation-write-error"); }
  };
  const actualFetch = globalThis.fetch;
  // Observe only existing product admission GETs. Never alter their input,
  // result, authentication, provider settings or product control flow.
  globalThis.fetch = async (input, init) => {
    let observation;
    try {
      const target = new URL(typeof input === "string" ? input : input.url || String(input));
      const method = String(init?.method || input.method || "GET").toUpperCase();
      if (method === "GET" && target.origin === origin.origin
        && /^\/v1\/swarm-ops\/commands\/[^/]+\/coding-inference$/.test(target.pathname)) {
        const headers = new Headers(init?.headers || input.headers);
        observation = { operation: "actual-native-canonical-coding-admission", method,
          commandId: decodeURIComponent(target.pathname.split("/")[4]), instanceId: target.searchParams.get("instanceId"),
          requestStartedAt: new Date().toISOString(), authenticated: headers.has("Authorization"),
          approvedProofPresent: headers.has("X-Valkyr-Approval-Signature") };
      }
    } catch { /* Observation cannot reject a product request. */ }
    let result;
    try { result = await actualFetch(input, init); }
    catch (error) {
      if (observation) record({ ...observation, responseAt: new Date().toISOString(), status: "transport-error", errorName: error.name });
      throw error;
    }
    if (observation) {
      let publicBinding;
      if (result.ok) {
        try { publicBinding = project(await result.clone().json()); }
        catch (error) { observerErrors.push(error.name || "observation-json-error"); }
      }
      record({ ...observation, responseAt: new Date().toISOString(), status: result.status, publicBinding });
    }
    return result;
  };
  restoreFetch = () => { globalThis.fetch = actualFetch; };
  const transportFixture = process.env.VALORIDE_ENGINEERING_TRANSPORT_FIXTURE;
  let transportObservation;
  if (transportFixture) {
    if (transportFixture !== "drop-initial-native-receipts-until-cached-terminal-redelivery")
      throw new Error("Select the exact named native transport fixture");
    const ActualWebSocket = globalThis.WebSocket;
    if (typeof ActualWebSocket !== "function" || typeof ActualWebSocket.prototype.send !== "function")
      throw new Error("Actual native WebSocket surface cannot support the named transport fixture");
    const crypto = require("node:crypto");
    const digest = value => crypto.createHash("sha256").update(value).digest("hex");
    const incoming = new Map();
    transportObservation = { boundary: transportFixture, faultPlane: "native-ACK-lifecycle-transport-only",
      reasoningFixture: false, dispatchInjected: false, approvalsInjected: false, effectsInjected: false,
      ownedSocketCount: 0, activeOwnedSocketCount: 0, maxConcurrentOwnedSocketCount: 0,
      closedOwnedSocketCount: 0, socketSendCount: 0, incomingFrameCount: 0, outgoingFrameCount: 0,
      unparsedOutbound: [],
      heldCommandId: null, dropped: [], incomingCommandDeliveries: [], forwardedCachedTerminal: null };
    const saveTransport = () => fs.writeFileSync(path.join(process.env.VALORIDE_ENGINEERING_EVIDENCE,
      "native-transport-fixture.json"), JSON.stringify(transportObservation, null, 2), { mode: 0o600 });
    const text = data => {
      if (typeof data === "string") return data;
      if (Buffer.isBuffer(data)) return data.toString("utf8");
      if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
      if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
      return null;
    };
    const frame = (data, verb, destination) => {
      const raw=text(data); if (!raw) return null;
      // STOMP heartbeats may prefix a frame and some WebSocket implementations
      // expose text frames as ArrayBuffer after stompjs selects binaryType.
      const start=raw.indexOf(verb+"\n"); if (start<0) return null;
      const body=raw.slice(start); if (!body.endsWith("\0")) return null;
      const separator=body.indexOf("\n\n"); if (separator<0) return null;
      const headers=body.slice(0,separator).split("\n");
      if (destination && !headers.includes("destination:"+destination)) return null;
      try { return { payload: JSON.parse(body.slice(separator+2,-1)), raw: body }; } catch { return null; }
    };
    const candidates = (value, depth=0) => {
      if (depth>6) return [];
      if (typeof value === "string") { try { return candidates(JSON.parse(value),depth+1); } catch { return []; } }
      if (!value || typeof value!=="object") return [];
      return [value, ...["payload","command","data","raw"].flatMap(key => candidates(value[key],depth+1))];
    };
    class ObservedWebSocket extends ActualWebSocket {
      constructor(...args) {
        super(...args);
        const endpoint=new URL(String(args[0]));
        this.fixtureOwnedCore=endpoint.hostname===origin.hostname && endpoint.port===origin.port
          && ["ws:","wss:"].includes(endpoint.protocol);
        if (this.fixtureOwnedCore) {
          transportObservation.ownedSocketCount++;
          transportObservation.activeOwnedSocketCount++;
          transportObservation.maxConcurrentOwnedSocketCount=Math.max(
            transportObservation.maxConcurrentOwnedSocketCount,
            transportObservation.activeOwnedSocketCount,
          );
          let fixtureCloseRecorded=false;
          this.addEventListener("close",()=>{
            if (fixtureCloseRecorded) return;
            fixtureCloseRecorded=true;
            transportObservation.closedOwnedSocketCount++;
            transportObservation.activeOwnedSocketCount--;
            saveTransport();
          });
          const nativeSend = data => Reflect.apply(ActualWebSocket.prototype.send, this, [data]);
          // Electron's native WebSocket installs send on the instance, which
          // can shadow a subclass prototype override. Instrument the concrete
          // owned socket method so every real stompjs send crosses this fault
          // boundary.
          Object.defineProperty(this, "send", { configurable: true, value: data => {
            transportObservation.socketSendCount++;
            const outer=frame(data,"SEND","/app/command");
            if (!outer) {
              const raw=text(data) || "";
              if (transportObservation.unparsedOutbound.length < 10)
                transportObservation.unparsedOutbound.push({ at:new Date().toISOString(), dataType:data?.constructor?.name || typeof data,
                  byteLength:Buffer.byteLength(raw), firstLine:raw.split("\n",1)[0].slice(0,40), endsWithNull:raw.endsWith("\0"),
                  hasAppCommand:raw.includes("destination:/app/command"), frameSha256:digest(raw) });
              saveTransport(); return nativeSend(data);
            }
            transportObservation.outgoingFrameCount++;
            const payload=candidates(outer.payload).find(value=>["ack","nack"].includes(String(value.type).toLowerCase()));
            const id=payload && (payload.commandId || payload.ackId);
            if (!payload || typeof id!=="string" || !/^[0-9a-f-]{36}$/i.test(id)) {
              saveTransport(); return nativeSend(data);
            }
            const task=(context.globalState.get("taskHistory")||[]).find(value=>value.governedCodingInference?.commandId===id);
            if (!transportObservation.heldCommandId && incoming.has(id)) {
              transportObservation.heldCommandId=id;transportObservation.incomingCommandDeliveries=incoming.get(id)||[];
            }
            if (transportObservation.heldCommandId!==id) { saveTransport(); return nativeSend(data); }
            const durable=context.globalState.get("valorideSwarmOutcomeHandoffs")?.outcomes?.[id];
            const outcome=payload.result?.outcome || payload.payload?.data?.result?.outcome
              || candidates(payload).map(value=>value.outcome).find(value=>value && typeof value==="object");
            const localDurableTerminal=Boolean(durable && outcome && durable.commandId===id && outcome.commandId===id
              && durable.outcomeHash && durable.outcomeHash===outcome.outcomeHash && durable.status===outcome.status);
            const redelivery=transportObservation.incomingCommandDeliveries.find(row=>row.afterDroppedDurableTerminal);
            const witness={commandId:id, at:new Date().toISOString(), frameSha256:digest(outer.raw), localDurableTerminal,
              outcomeSha256:outcome?digest(JSON.stringify(outcome)):null, localTaskId:task?.id,
              actualProviderRequestCount:task?.governedCodingInference?.requests?.length||0};
            if (!redelivery || !localDurableTerminal) {
              transportObservation.dropped.push(witness);saveTransport();return;
            }
            if (!transportObservation.forwardedCachedTerminal) {
              transportObservation.forwardedCachedTerminal={...witness, observedRedeliveryAt:redelivery.at};saveTransport();
            }
            // Forward the actual cached product receipt byte-for-byte. The fixture
            // never submits a command, changes a payload or schedules a retry.
            return nativeSend(data);
          }, writable: false });
          saveTransport();
        }
        if (this.fixtureOwnedCore) this.addEventListener("message", event => {
          const outer=frame(event.data,"MESSAGE"); if (!outer) return;
          transportObservation.incomingFrameCount++;
          const records=candidates(outer.payload);
          const actions=records.map(value=>value.action).filter(value=>["filesystem.write","valor.execute"].includes(value));
          const ids=[...new Set(records.flatMap(value=>[value.commandId,value.id]).filter(value=>typeof value==="string" && /^[0-9a-f-]{36}$/i.test(value)))];
          if (!actions.length) return;
          for (const id of ids) {
            const row={commandId:id, at:new Date().toISOString(), frameSha256:digest(outer.raw),
              afterDroppedDurableTerminal:transportObservation.dropped.some(value=>value.commandId===id && value.localDurableTerminal===true)};
            incoming.set(id,[...(incoming.get(id)||[]),row]);
            if (transportObservation.heldCommandId===id) transportObservation.incomingCommandDeliveries=incoming.get(id);
          }
          saveTransport();
        });
      }
    }
    globalThis.WebSocket=ObservedWebSocket;
    if (globalThis.WebSocket!==ObservedWebSocket)
      throw new Error("Actual native WebSocket constructor could not be instrumented for the named transport fixture");
    restoreTransport=()=>{if(globalThis.WebSocket===ObservedWebSocket)globalThis.WebSocket=ActualWebSocket;};
    saveTransport();
  }
  const api = await require(process.env.VALORIDE_ENGINEERING_BUNDLE).activate(context);
  return { ...api, engineeringAcceptanceSnapshot: () => ({
    instanceId: context.globalState.get("valorideSwarmInstanceId"),
    handoffs: context.globalState.get("valorideSwarmOutcomeHandoffs"),
    globalStoragePath: context.globalStorageUri.fsPath,
    provider: context.globalState.get("apiProvider"),
    model: context.globalState.get("lmStudioModelId"),
    origin: context.globalState.get("lmStudioBaseUrl"),
    autoApproval: context.globalState.get("autoApprovalSettings"),
    codingBindings: (context.globalState.get("taskHistory") || []).filter(item => item.governedCodingInference)
      .map(item => ({ localTaskId: item.id, binding: project(item.governedCodingInference),
        opaqueApprovalProofPresent: Boolean(item.governedCodingInference.approvalSignature),
        forbiddenCredentialFields: forbiddenFields(item.governedCodingInference),
        requests: (item.governedCodingInference.requests || []).map(receipt => ({
          requestId: receipt.requestId, startedAt: receipt.startedAt, completedAt: receipt.completedAt,
          status: receipt.status, transport: receipt.transport, providerModelId: receipt.providerModelId,
          responseModelId: receipt.responseModelId, responseId: receipt.responseId,
        })) })),
    admissionObserverErrors: observerErrors,
    transportFixture: transportObservation || null,
  }) };
};
exports.deactivate = () => {
  restoreFetch?.();
  restoreTransport?.();
  return require(process.env.VALORIDE_ENGINEERING_BUNDLE).deactivate();
};
