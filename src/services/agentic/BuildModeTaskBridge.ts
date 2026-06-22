import path from "path";
import type {
  AppBundle,
  GrayMatterContextPack,
  ProviderCredentialRef,
  ProviderRoute,
  ValorTaskBridgePayload,
} from "@shared/BuildMode";
import { redactCommandSecrets } from "./BuildModeCommandPolicy";

export interface BuildModeTaskLaunchValidationResult {
  issues: string[];
  payload?: Partial<ValorTaskBridgePayload> &
    Pick<
      ValorTaskBridgePayload,
      "appBundle" | "grayMatterContextPack" | "taskId"
    >;
}

export interface BuildModeTaskLaunchValidationOptions {
  now?: () => Date;
  workspaceRoot?: string;
}

const providerRoutes = new Set<ProviderRoute>([
  "bring-your-own-key",
  "valkyr-credits",
  "local-model",
  "enterprise-proxy",
]);

export const coerceBuildModeTaskLaunchPayload = (
  value: unknown,
  options: BuildModeTaskLaunchValidationOptions = {},
): BuildModeTaskLaunchValidationResult => {
  const issues: string[] = [];
  if (!isRecord(value)) {
    return { issues: ["Build Mode task payload must be an object."] };
  }

  const taskId = readNonEmptyString(value.taskId);
  if (!taskId) {
    issues.push("Build Mode task payload requires a taskId.");
  }

  const appBundle = coerceAppBundle(value.appBundle, taskId, options, issues);
  const grayMatterContextPack = coerceGrayMatterContextPack(
    value.grayMatterContextPack,
    options,
    issues,
  );
  const scope = isRecord(value.scope) ? { ...value.scope } : undefined;
  const scopeWorkspaceRoot = scope
    ? readNonEmptyString(scope.workspaceRoot)
    : undefined;
  if (scope) {
    if (!scopeWorkspaceRoot) {
      issues.push("Build Mode task scope requires an explicit workspaceRoot.");
    } else if (
      options.workspaceRoot &&
      !isWorkspaceRootWithin(scopeWorkspaceRoot, options.workspaceRoot)
    ) {
      issues.push(
        `Build Mode task workspaceRoot is outside the active workspace: ${scopeWorkspaceRoot}.`,
      );
    }
  } else {
    issues.push("Build Mode task payload requires tenant/principal scope.");
  }

  if (issues.length || !taskId || !appBundle || !grayMatterContextPack) {
    return { issues };
  }

  const providerCredentials = sanitizeCredentialRefs(value.providerCredentials);
  const secretPaths = findSecretMaterialPaths({
    ...value,
    providerCredentials,
  });
  if (secretPaths.length) {
    issues.push(
      `Build Mode task payload contains inline secret material at ${secretPaths.join(", ")}.`,
    );
  }

  if (issues.length) {
    return { issues };
  }

  const selectedProviderRoute = providerRoutes.has(
    value.selectedProviderRoute as ProviderRoute,
  )
    ? (value.selectedProviderRoute as ProviderRoute)
    : undefined;

  return {
    issues: [],
    payload: {
      ...value,
      appBundle,
      grayMatterContextPack,
      providerCredentials,
      scope: coerceScope(scope, scopeWorkspaceRoot),
      selectedProviderRoute,
      source: readLaunchSource(value.source),
      taskId,
    },
  };
};

const coerceAppBundle = (
  value: unknown,
  taskId: string | undefined,
  options: BuildModeTaskLaunchValidationOptions,
  issues: string[],
): AppBundle | undefined => {
  if (!isRecord(value)) {
    issues.push("Build Mode task payload requires an appBundle.");
    return undefined;
  }
  const id = readNonEmptyString(value.id);
  const name = readNonEmptyString(value.name);
  if (!id) issues.push("Build Mode appBundle requires an id.");
  if (!name) issues.push("Build Mode appBundle requires a name.");
  if (!id || !name) {
    return undefined;
  }

  return {
    artifacts: Array.isArray(value.artifacts) ? value.artifacts : [],
    componentBundleIds: readStringArray(value.componentBundleIds),
    createdAt:
      readNonEmptyString(value.createdAt) ??
      options.now?.().toISOString() ??
      new Date(0).toISOString(),
    execModuleIds: readStringArray(value.execModuleIds),
    id,
    intent:
      readNonEmptyString(value.intent) ??
      "Launch ValorIDE Build Mode from SageChat/App Gallery.",
    name,
    productLine: readNonEmptyString(value.productLine) ?? "ValkyrAI",
    sourceSessionId:
      readNonEmptyString(value.sourceSessionId) ?? taskId ?? "unknown",
    version: readNonEmptyString(value.version) ?? "0.0.0",
  };
};

const coerceGrayMatterContextPack = (
  value: unknown,
  options: BuildModeTaskLaunchValidationOptions,
  issues: string[],
): GrayMatterContextPack | undefined => {
  if (!isRecord(value)) {
    issues.push("Build Mode task payload requires a GrayMatter context pack.");
    return undefined;
  }
  const id = readNonEmptyString(value.id);
  const retrievalReceiptIds = readStringArray(value.retrievalReceiptIds);
  if (!id) issues.push("GrayMatter context pack requires an id.");
  if (!retrievalReceiptIds.length) {
    issues.push("GrayMatter context pack requires retrieval receipt ids.");
  }
  if (value.invariantPreflightStatus !== "passed") {
    issues.push("GrayMatter invariant preflight must be passed.");
  }
  if (value.retrievalStatus !== "ready") {
    issues.push("GrayMatter context retrieval status must be ready.");
  }
  if (!id || !retrievalReceiptIds.length) {
    return undefined;
  }
  return {
    answerPolicy: readGrayMatterAnswerPolicy(value.answerPolicy),
    compiledAt:
      readNonEmptyString(value.compiledAt) ??
      options.now?.().toISOString() ??
      new Date(0).toISOString(),
    id,
    invariantPreflightStatus: "passed",
    majorTaskRefs: readStringArray(value.majorTaskRefs),
    memoryEntryIds: readStringArray(value.memoryEntryIds),
    policy: readGrayMatterPolicy(value.policy),
    preflightReceiptId: readNonEmptyString(value.preflightReceiptId),
    retrievalReceiptIds,
    retrievalStatus: "ready",
    retrievalTraceId: readNonEmptyString(value.retrievalTraceId),
    source: readNonEmptyString(value.source) ?? "GrayMatter retrieval receipts",
    sourceRefs: readStringArray(value.sourceRefs),
    summary:
      readNonEmptyString(value.summary) ??
      "GrayMatter context pack validated for Build Mode launch.",
  };
};

const sanitizeCredentialRefs = (
  value: unknown,
): ProviderCredentialRef[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter(isRecord).map((ref) => {
    const sanitized: ProviderCredentialRef = {
      displayName: readNonEmptyString(ref.displayName) ?? "Provider",
      id: readNonEmptyString(ref.id) ?? "credential-ref",
      route: providerRoutes.has(ref.route as ProviderRoute)
        ? (ref.route as ProviderRoute)
        : "valkyr-credits",
      secretAvailable: Boolean(ref.secretAvailable),
      tenantScoped: Boolean(ref.tenantScoped),
    };
    return sanitized;
  });
};

const coerceScope = (
  value: Record<string, unknown> | undefined,
  workspaceRoot: string | undefined,
): ValorTaskBridgePayload["scope"] => ({
  principalId: readNonEmptyString(value?.principalId) ?? "unknown-principal",
  projectId: readNonEmptyString(value?.projectId),
  roles: readStringArray(value?.roles),
  tenantId: readNonEmptyString(value?.tenantId) ?? "unknown-tenant",
  workspaceRoot: workspaceRoot ?? "",
  policyRefs: readStringArray(value?.policyRefs),
});

const readLaunchSource = (value: unknown): ValorTaskBridgePayload["source"] => {
  switch (value) {
    case "AppGallery":
    case "Mock":
    case "SageChat":
    case "Workflow":
      return value;
    default:
      return "SageChat";
  }
};

const readGrayMatterPolicy = (
  value: unknown,
): GrayMatterContextPack["policy"] =>
  value === "requires-review" || value === "do-not-answer"
    ? value
    : "answer-confidently";

const readGrayMatterAnswerPolicy = (
  value: unknown,
): GrayMatterContextPack["answerPolicy"] =>
  value === "requires-review" ||
  value === "do-not-answer" ||
  value === "retry" ||
  value === "clarify"
    ? value
    : "answer-confidently";

const isWorkspaceRootWithin = (
  candidateRoot: string,
  workspaceRoot: string,
): boolean => {
  const candidate = path.resolve(candidateRoot);
  const root = path.resolve(workspaceRoot);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
};

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const readNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const findSecretMaterialPaths = (
  value: unknown,
  path: string = "payload",
  seen: Set<unknown> = new Set(),
): string[] => {
  if (typeof value === "string") {
    return redactCommandSecrets(value) === value ? [] : [path];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  if (seen.has(value)) {
    return [];
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findSecretMaterialPaths(item, `${path}[${index}]`, seen),
    );
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, nested]) => findSecretMaterialPaths(nested, `${path}.${key}`, seen),
  );
};
