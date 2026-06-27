import type { BuildModeScopeContext } from "@shared/BuildMode";
import { redactCommandSecrets } from "./BuildModeCommandPolicy";

export interface BuildModeConnectorReadDescriptor {
  action: string;
  connectorId: string;
  connectorName: string;
  dataClass: string;
  queryRef: string;
  receiptRef?: string;
  recordCount?: number;
  resourceUri?: string;
  scopeRef?: string;
  status: "authorized" | "blocked" | "failed" | "partial";
  traceId?: string;
}

export interface BuildModeConnectorIntentDescriptor
  extends BuildModeConnectorReadDescriptor {
  intent: "mutation" | "read";
}

const READ_ACTIONS = new Set(["get", "list", "read", "search"]);
const MUTATION_ACTIONS = new Set([
  "archive",
  "compose",
  "create",
  "delete",
  "deliver",
  "forward",
  "move",
  "mutate",
  "reply",
  "send",
  "trash",
  "update",
]);

export const parseBuildModeConnectorReadCommand = (
  command: string,
  scope?: BuildModeScopeContext,
): BuildModeConnectorReadDescriptor | undefined => {
  const intent = parseBuildModeConnectorIntent(command, scope);
  if (intent?.intent !== "read") {
    return undefined;
  }
  return {
    action: intent.action,
    connectorId: intent.connectorId,
    connectorName: intent.connectorName,
    dataClass: intent.dataClass,
    queryRef: intent.queryRef,
    receiptRef: intent.receiptRef,
    recordCount: intent.recordCount,
    resourceUri: intent.resourceUri,
    scopeRef: intent.scopeRef,
    status: intent.status,
    traceId: intent.traceId,
  };
};

export const parseBuildModeConnectorIntent = (
  command: string,
  scope?: BuildModeScopeContext,
): BuildModeConnectorIntentDescriptor | undefined => {
  const target = command.match(
    /^connector:(?<target>[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i,
  )?.groups?.target;
  if (!target) {
    return undefined;
  }
  const [connectorId, action] = target.split(".");
  const normalizedAction = action.toLowerCase();
  const intent = READ_ACTIONS.has(normalizedAction)
    ? "read"
    : MUTATION_ACTIONS.has(normalizedAction)
      ? "mutation"
      : undefined;
  if (!connectorId || !intent) {
    return undefined;
  }

  const dataClass =
    readCommandField(command, "data") ??
    (intent === "mutation" ? "connector.mutation" : undefined);
  const queryRef =
    readCommandField(command, "query") ??
    readCommandField(command, "intent") ??
    (intent === "mutation"
      ? `${connectorId.toLowerCase()}:${normalizedAction}`
      : undefined);
  if (!dataClass || !queryRef) {
    return undefined;
  }
  const receiptRef = readCommandField(command, "receipt");
  const recordCount = toOptionalNumber(readCommandField(command, "records"));
  const resourceUri =
    readCommandField(command, "resource") ??
    deriveConnectorResourceUri(connectorId, queryRef);

  return {
    action: normalizedAction,
    connectorId: connectorId.toLowerCase(),
    connectorName: toConnectorDisplayName(connectorId),
    dataClass: redactConnectorValue(dataClass),
    intent,
    queryRef: redactConnectorValue(queryRef),
    receiptRef: receiptRef ? redactConnectorValue(receiptRef) : undefined,
    recordCount,
    resourceUri: resourceUri ? redactConnectorValue(resourceUri) : undefined,
    scopeRef: scope
      ? redactConnectorValue(`${scope.tenantId}/${scope.principalId}`)
      : redactOptionalConnectorValue(readCommandField(command, "scope")),
    status:
      intent === "mutation"
        ? "blocked"
        : (toConnectorStatus(readCommandField(command, "status")) ??
          (receiptRef ? "authorized" : "partial")),
    traceId: redactOptionalConnectorValue(readCommandField(command, "trace")),
  };
};

export const serializeBuildModeConnectorReadArtifact = (
  descriptor: BuildModeConnectorReadDescriptor,
  taskId: string,
  commandId: string,
): string =>
  JSON.stringify(
    {
      commandId,
      connectorId: descriptor.connectorId,
      connectorName: descriptor.connectorName,
      dataClass: descriptor.dataClass,
      queryRef: descriptor.queryRef,
      receiptRef: descriptor.receiptRef,
      recordCount: descriptor.recordCount,
      resourceUri: descriptor.resourceUri,
      scopeRef: descriptor.scopeRef,
      status: descriptor.status,
      taskId,
      traceId: descriptor.traceId,
      warning:
        "Connector artifact stores receipt metadata only. Record bodies are not persisted in Build Mode artifacts.",
    },
    null,
    2,
  );

export const summarizeBuildModeConnectorRead = (
  descriptor: BuildModeConnectorReadDescriptor,
): string =>
  descriptor.receiptRef
    ? `${descriptor.connectorName} ${descriptor.dataClass} read is backed by connector receipt ${descriptor.receiptRef}.`
    : `${descriptor.connectorName} ${descriptor.dataClass} read metadata captured; attach the external connector receipt to prove record access.`;

export const summarizeBlockedConnectorMutation = (
  descriptor: BuildModeConnectorIntentDescriptor,
): string =>
  `${descriptor.connectorName} ${descriptor.action} was blocked in Build Mode. Connector mutations require an external approved connector workflow and are not executed by the connector read lane.`;

const readCommandField = (
  command: string,
  field: string,
): string | undefined => {
  const match = command.match(
    new RegExp(`\\b${field}:(?:"([^"]*)"|'([^']*)'|(\\S+))`, "i"),
  );
  return (match?.[1] ?? match?.[2] ?? match?.[3])?.trim();
};

const toOptionalNumber = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

const toConnectorStatus = (
  value: string | undefined,
): BuildModeConnectorReadDescriptor["status"] | undefined => {
  switch (value?.toLowerCase()) {
    case "authorized":
    case "blocked":
    case "failed":
    case "partial":
      return value.toLowerCase() as BuildModeConnectorReadDescriptor["status"];
    default:
      return undefined;
  }
};

const deriveConnectorResourceUri = (
  connectorId: string,
  queryRef: string,
): string | undefined => {
  const prefix = `${connectorId}:`;
  return queryRef.toLowerCase().startsWith(prefix.toLowerCase())
    ? `${connectorId.toLowerCase()}://${queryRef.slice(prefix.length)}`
    : undefined;
};

const toConnectorDisplayName = (connectorId: string): string => {
  const normalized = connectorId.toLowerCase();
  if (normalized === "gmail") {
    return "Gmail";
  }
  if (normalized === "google-calendar") {
    return "Google Calendar";
  }
  return normalized
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

const redactOptionalConnectorValue = (
  value: string | undefined,
): string | undefined => (value ? redactConnectorValue(value) : undefined);

const redactConnectorValue = (value: string): string =>
  redactCommandSecrets(value);
