import type { ApiConfiguration } from "@shared/api";
import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings";
import type { SwarmMessage } from "@shared/swarm-protocol";
import type { SwarmInboundCommandContext } from "./SwarmRuntimeOutcome";
import { randomUUID } from "node:crypto";

export const GOVERNED_CODING_VERSION = "workflow-governed-coding-inference/v1";

/**
 * A server-approved SWARM command authorizes the reviewed command envelope. It
 * does not turn every native file, terminal, browser, or MCP prompt into an
 * ambiently approved action. Keep the native task interactive even if the
 * user's ordinary ValorIDE auto-approval preferences change while it runs.
 */
export function governedCodingTaskApprovalSettings(
  settings: AutoApprovalSettings,
): AutoApprovalSettings {
  return {
    ...settings,
    enabled: false,
    actions: {
      readFiles: false,
      readFilesExternally: false,
      editFiles: false,
      editFilesExternally: false,
      executeSafeCommands: false,
      executeAllCommands: false,
      useBrowser: false,
      useMcp: false,
      useProcedures: false,
    },
    enableNotifications: false,
  };
}

export interface GovernedCodingDescriptor {
  schemaVersion: typeof GOVERNED_CODING_VERSION;
  toolCallId: string;
  workflowExecutionId: string;
  workflowVersionId: string;
  runnerInstanceId: string;
  runnerPrincipalId: string;
  llmDetailsId: string;
  integrationAccountId: string;
  providerKind: "lm-studio";
  endpoint: string;
  model: string;
  maxTokens: number | null;
  temperature: number | null;
  connectionHash: string;
}

/** Contains provenance and the existing opaque approval proof; never a provider/JWT key. */
export interface GovernedCodingTaskBinding extends GovernedCodingDescriptor {
  commandId: string;
  actionDigest: string;
  scopeDigest: string;
  approvalSignature: string;
  requests: Array<{
    requestId: string;
    startedAt: string;
    completedAt?: string;
    status: "REQUESTED" | "RECEIVED" | "FAILED";
    transport: "native-lmstudio";
    providerModelId: string;
    responseModelId?: string;
    responseId?: string;
  }>;
}

const descriptorKeys: Array<keyof GovernedCodingDescriptor> = [
  "schemaVersion", "toolCallId", "workflowExecutionId", "workflowVersionId",
  "runnerInstanceId", "runnerPrincipalId", "llmDetailsId", "integrationAccountId",
  "providerKind", "endpoint", "model", "maxTokens", "temperature", "connectionHash",
];

function loopbackOrigin(endpoint: string): string {
  const url = new URL(endpoint);
  if (url.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || !url.port || url.username || url.password || url.search || url.hash
    || !["", "/", "/v1", "/v1/", "/v1/chat/completions"].includes(url.pathname)) {
    throw new Error("Governed coding endpoint must be a credential-free loopback LM Studio URL.");
  }
  return url.origin;
}

export function assertGovernedCodingDescriptor(value: unknown): asserts value is GovernedCodingDescriptor {
  const binding = value as GovernedCodingDescriptor;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!binding || binding.schemaVersion !== GOVERNED_CODING_VERSION || binding.providerKind !== "lm-studio"
    || !binding.toolCallId || !binding.runnerInstanceId || !binding.model || binding.model.length > 240
    || ![binding.workflowExecutionId, binding.workflowVersionId, binding.runnerPrincipalId,
      binding.llmDetailsId, binding.integrationAccountId].every((id) => uuid.test(id))
    || !/^[0-9a-f]{64}$/.test(binding.connectionHash)
    || (binding.maxTokens != null && (!Number.isInteger(binding.maxTokens) || binding.maxTokens < 1 || binding.maxTokens > 131072))
    || (binding.temperature != null && (!Number.isFinite(binding.temperature) || binding.temperature < 0 || binding.temperature > 2))) {
    throw new Error("The reviewed coding command has no valid canonical inference binding.");
  }
  loopbackOrigin(binding.endpoint);
}

/** Uses configured Core connection only. Model configuration comes exclusively from the command. */
export async function materializeGovernedCodingTask(
  coreHost: string,
  jwt: string | (() => Promise<string | undefined>),
  expected: GovernedCodingDescriptor,
  commandId: string,
  actionDigest: string,
  scopeDigest: string,
  approvalSignature: string,
  request: typeof fetch = fetch,
): Promise<ApiConfiguration> {
  assertGovernedCodingDescriptor(expected);
  const bearer = typeof jwt === "function" ? await jwt() : jwt;
  if (!bearer || !commandId || !approvalSignature || !/^sha256:[0-9a-f]{64}$/.test(actionDigest)
    || !/^sha256:[0-9a-f]{64}$/.test(scopeDigest)) throw new Error("Exact authenticated coding command proof is required.");
  const endpoint = new URL(`/v1/swarm-ops/commands/${encodeURIComponent(commandId)}/coding-inference`, coreHost);
  endpoint.searchParams.set("instanceId", expected.runnerInstanceId);
  const response = await request(endpoint, {
    headers: { Authorization: `Bearer ${bearer}`, "X-Valkyr-Approval-Signature": approvalSignature },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Canonical coding admission was rejected (${response.status}).`);
  const current = await response.json() as GovernedCodingDescriptor & { commandId: string; actionDigest: string; scopeDigest: string };
  assertGovernedCodingDescriptor(current);
  if (descriptorKeys.some((key) => expected[key] !== current[key]) || current.commandId !== commandId
    || current.actionDigest !== actionDigest || current.scopeDigest !== scopeDigest
    || "credentialReference" in current || "apiKey" in current) {
    throw new Error("Canonical coding configuration differs from the exact approved command.");
  }
  const origin = loopbackOrigin(current.endpoint);
  const modelsResponse = await request(`${origin}/v1/models`, { signal: AbortSignal.timeout(10000) });
  if (!modelsResponse.ok) throw new Error("The selected node cannot access its approved LM Studio provider.");
  const models = await modelsResponse.json() as { data?: Array<{ id?: string }> };
  if (!models.data?.some((model) => model.id === current.model)) throw new Error("The approved provider model is unavailable on this node.");
  const binding: GovernedCodingTaskBinding = Object.freeze({ ...expected, commandId, actionDigest, scopeDigest, approvalSignature, requests: [] });
  // Deliberately construct a fresh provider configuration. Ambient keys/provider/model are absent.
  return { apiProvider: "lmstudio", lmStudioBaseUrl: origin, lmStudioModelId: current.model,
    governedCodingInference: binding,
    governedCodingRevalidate: async () => {
      // Reuses the current SecretStorage credential accessor and the exact existing signed proof.
      // A refreshed JWT is read for every request; no credential is captured in the history marker.
      await materializeGovernedCodingTask(coreHost, jwt, binding, commandId, actionDigest,
        scopeDigest, approvalSignature, request);
    } };
}

export async function resolveInboundGovernedCodingTask(
  coreHost: string, jwt: () => Promise<string | undefined>, instanceId: string, message: SwarmMessage,
  context: SwarmInboundCommandContext,
): Promise<ApiConfiguration> {
  const expected = message.payload.data?.governedCodingInference;
  assertGovernedCodingDescriptor(expected);
  if (expected.runnerInstanceId !== instanceId
    || context.correlation.targetInstanceId !== instanceId
    || context.correlation.workflowExecutionRef !== `workflow_execution:${expected.workflowExecutionId}`) {
    throw new Error("The reviewed coding configuration belongs to a different node or workflow.");
  }
  return materializeGovernedCodingTask(coreHost, jwt, expected, context.correlation.commandId,
    context.correlation.actionDigest ?? "", context.correlation.scopeDigest ?? "",
    context.approvalProof?.signature ?? "");
}

/** Read-only reachability observation; it grants no filesystem/terminal capabilities. */
export async function observeNativeCodingProvider(configuration: ApiConfiguration): Promise<Record<string, unknown> | null> {
  if (configuration.apiProvider !== "lmstudio" || !configuration.lmStudioBaseUrl) return null;
  try {
    const origin = loopbackOrigin(configuration.lmStudioBaseUrl);
    const response = await fetch(`${origin}/v1/models`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) return null;
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    const models = payload.data?.map((model) => model.id).filter((id): id is string => !!id && id.length <= 240).slice(0, 100) ?? [];
    return { providerKind: "lm-studio", endpoint: `${origin}/v1/chat/completions`, models, verifiedAt: new Date().toISOString() };
  } catch { return null; }
}

export function beginGovernedCodingRequest(binding: GovernedCodingTaskBinding) {
  const receipt: GovernedCodingTaskBinding["requests"][number] = {
    requestId: randomUUID(), startedAt: new Date().toISOString(), status: "REQUESTED",
    transport: "native-lmstudio", providerModelId: binding.model,
  };
  binding.requests.push(receipt);
  return receipt;
}

export function governedCodingEvidenceRefs(binding: GovernedCodingTaskBinding): string[] {
  return binding.requests.filter((receipt) => receipt.status === "RECEIVED").map((receipt) =>
    `valkyr-native-inference:${receipt.requestId}:${binding.commandId}:${binding.workflowExecutionId}:${binding.workflowVersionId}:${binding.runnerInstanceId}:${binding.llmDetailsId}:${binding.integrationAccountId}:${binding.connectionHash}`);
}
