import crypto from "crypto";
import path from "path";
import type {
  AppBundle,
  BuildModeApprovalThreshold,
  BuildModeCommand,
  CreditEstimate,
  BuildModeGuardrail,
  BuildModeMcpToolBinding,
  BuildModeSwarmRole,
  ExecModuleMetadata,
  GrayMatterContextPack,
  PromptBundle,
  ProviderCredentialRef,
  ProviderRoute,
  ScheduledAutomationBinding,
  ValorTaskBridgePayload,
} from "@shared/BuildMode";
import {
  evaluateBuildModeCommandPolicy,
  redactCommandSecrets,
  type BuildModeCommandPolicyOptions,
} from "./BuildModeCommandPolicy";
import { loadWorkspaceIgnorePatterns } from "../access/PathAccess";

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
const appBundleArtifactKinds = new Set([
  "generated",
  "editable",
  "asset",
  "config",
]);
const componentBundleGeneratedByValues = new Set([
  "Aurora",
  "ThorAPI",
  "Manual",
  "Workflow",
]);
const componentBundleStatuses = new Set(["ready", "needs-review", "blocked"]);
const execModuleSafetyLevels = new Set([
  "readonly",
  "approval-required",
  "destructive",
]);
const mcpServerStatuses = new Set([
  "connected",
  "available",
  "requires-approval",
  "blocked",
]);
const mcpServerTransports = new Set(["stdio", "sse", "http", "workflow"]);
const mcpServerScopes = new Set(["private", "workspace", "tenant", "public"]);
const mcpToolStatuses = new Set([
  "available",
  "requires-approval",
  "blocked",
]);
const connectorBindingStatuses = new Set([
  "authorized",
  "available",
  "requires-approval",
  "blocked",
]);
const connectorReadActions = new Set(["get", "list", "read", "search"]);
const sensitiveWorkflowActionClasses = new Set([
  "billing-mutation",
  "email-send",
  "public-mcp-publication",
  "production-deploy",
  "destructive-operation",
]);
const grayMatterPolicies = new Set([
  "answer-confidently",
  "requires-review",
  "do-not-answer",
]);
const grayMatterAnswerPolicies = new Set([
  "answer-confidently",
  "requires-review",
  "do-not-answer",
  "retry",
  "clarify",
]);
const grayMatterRetrievalStatuses = new Set([
  "ready",
  "partial-coverage",
  "low-confidence",
  "stale-context",
  "conflicting-context",
  "blocked",
]);
const grayMatterInvariantPreflightStatuses = new Set([
  "passed",
  "warning",
  "blocked",
  "missing",
]);
const receiptKinds = new Set([
  "checkpoint",
  "context",
  "generation",
  "final_report",
  "file_write",
  "shell_command",
  "connector_data",
  "workflow",
  "mcp_tool",
  "scheduled_automation",
  "browser_verification",
  "credit_usage",
]);
const receiptStatuses = new Set([
  "pending",
  "approved",
  "running",
  "succeeded",
  "failed",
]);
const creditCurrencies = new Set(["ValkyrCredits", "USD"]);
const promptBundleSources = new Set(["Valkyr", "Workspace", "Enterprise"]);
const promptBundlePolicies = new Set(["locked", "editable", "review-required"]);
const scheduledAutomationStatuses = new Set([
  "draft",
  "scheduled",
  "paused",
  "blocked",
]);
const scheduledAutomationRunStatuses = new Set([
  "failed",
  "skipped",
  "succeeded",
]);
const commandKinds = new Set([
  "test",
  "build",
  "inspect",
  "edit",
  "deploy",
  "verify",
  "automation",
  "checkpoint",
  "connector",
  "mcp",
  "report",
  "swarm",
  "workflow",
]);
const commandStatuses = new Set([
  "queued",
  "approval-required",
  "running",
  "succeeded",
  "failed",
  "rejected",
]);
const policyDecisions = new Set(["allow", "approval-required", "reject"]);
const commandExecutionModes = new Set([
  "agentic-command-bus",
  "approval-gate",
  "operator-handoff",
  "policy-blocked",
]);
const nextOperatorActions = new Set([
  "approve",
  "continue",
  "inspect",
  "monitor",
  "none",
  "revise",
]);
const commandPolicyEffects = new Set(["allow", "approval-required", "deny"]);
const toolPermissionDecisions = commandPolicyEffects;
const approvalThresholds = new Set(["none", "operator", "owner", "admin"]);
const capabilityKinds = new Set([
  "automation",
  "browser",
  "checkpoint",
  "connector",
  "filesystem",
  "graymatter",
  "mcp",
  "psr",
  "swarm",
  "terminal",
  "thorapi",
  "workflow",
]);
const risks = new Set(["low", "medium", "high"]);
const guardrailEnforcements = new Set([
  "hard-block",
  "approval-required",
  "receipt-required",
]);
const checkpointStatuses = new Set([
  "planned",
  "created",
  "rollback-ready",
  "restored",
  "failed",
]);
const safeEditTools = new Set(["psr.edit", "filesystem.write"]);
const safeEditStatuses = new Set([
  "draft",
  "queued",
  "approval-required",
  "applied",
  "blocked",
]);
const swarmRoleStatuses = new Set([
  "idle",
  "assigned",
  "running",
  "blocked",
  "complete",
]);
const agentLoopStatuses = new Set([
  "pending",
  "ready",
  "running",
  "blocked",
  "complete",
]);
const agentRuntimeKinds = new Set([
  "Codex",
  "OpenClaw",
  "ValorIDE",
  "ThorAPI",
  "VAIX",
]);
const runtimeStatuses = new Set([
  "available",
  "selected",
  "running",
  "blocked",
  "offline",
]);
const runtimeHandoffPolicies = new Set([
  "supervised",
  "operator-approved",
  "autonomous-local",
]);
const localModelExecutionModes = new Set([
  "workspace-local",
  "developer-machine",
  "tenant-isolated",
]);
const thorApiVaixSurfaces = new Set(["ThorAPI", "VAIX"]);
const thorApiVaixPolicies = new Set([
  "readonly-generated",
  "approval-required",
  "blocked",
]);
const autonomyModes = new Set([
  "manual",
  "approval-gated",
  "autonomous-local",
  "disabled",
]);
const readinessGateStatuses = new Set([
  "passed",
  "pending",
  "blocked",
  "failed",
]);
const executionPlanStepStatuses = new Set([
  "pending",
  "ready",
  "running",
  "approval-required",
  "blocked",
  "complete",
  "failed",
]);
const evidenceArtifactKinds = new Set([
  "app_bundle_diff",
  "browser_console",
  "browser_screenshot",
  "checkpoint",
  "command_stdout",
  "connector_data",
  "final_report",
  "file_write",
  "graymatter_context",
  "mcp_result",
  "swarm_handoff",
  "workflow_receipt",
]);
const browserVerificationStatuses = new Set([
  "not-started",
  "running",
  "passed",
  "failed",
]);
const finalReportStatuses = new Set(["draft", "ready"]);
const requiredSwarmRoles: BuildModeSwarmRole[] = [
  "Supervisor",
  "Spec Architect",
  "ThorAPI Generator",
  "Workflow Engineer",
  "Aurora UI Engineer",
  "Security Auditor",
  "Test Runner",
  "Browser Verifier",
  "Deploy Operator",
];
const swarmRoles = new Set<BuildModeSwarmRole>(requiredSwarmRoles);
const secretFieldPattern =
  /(?:api[_-]?key|token|secret|password|private[_-]?key|access[_-]?key|access[_-]?token)/i;
const approvalMaxAgeMs = 15 * 60 * 1000;
const approvalFutureSkewMs = 60 * 1000;

export const coerceBuildModeTaskLaunchPayload = (
  value: unknown,
  options: BuildModeTaskLaunchValidationOptions = {},
): BuildModeTaskLaunchValidationResult => {
  const issues: string[] = [];
  if (!isRecord(value)) {
    return failBuildModeTaskLaunchValidation([
      "Build Mode task payload must be an object.",
    ]);
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
    return failBuildModeTaskLaunchValidation(issues);
  }

  const providerCredentialSecretPaths = findSecretMaterialPaths(
    value.providerCredentials,
    "payload.providerCredentials",
  );
  const providerCredentials = sanitizeCredentialRefs(value.providerCredentials);
  validateBuildModeLaunchGraph(value, appBundle, options.now(), issues);
  const secretPaths = findSecretMaterialPaths({
    ...value,
    providerCredentials,
  });
  const allSecretPaths = [...providerCredentialSecretPaths, ...secretPaths];
  if (allSecretPaths.length) {
    issues.push(
      `Build Mode task payload contains inline secret material at ${allSecretPaths.join(", ")}.`,
    );
  }

  if (issues.length) {
    return failBuildModeTaskLaunchValidation(issues);
  }

  const selectedProviderRoute = providerRoutes.has(
    value.selectedProviderRoute as ProviderRoute,
  )
    ? (value.selectedProviderRoute as ProviderRoute)
    : undefined;
  const scheduledAutomations = normalizeScheduledAutomations(
    value.scheduledAutomations,
  );
  const creditEstimate = coerceCreditEstimate(value.creditEstimate);

  return {
    issues: [],
    payload: {
      ...value,
      appBundle,
      creditEstimate,
      grayMatterContextPack,
      providerCredentials,
      scheduledAutomations,
      scope: coerceScope(scope, scopeWorkspaceRoot),
      selectedProviderRoute,
      source: readLaunchSource(value.source),
      taskId,
    },
  };
};

const failBuildModeTaskLaunchValidation = (
  issues: string[],
): BuildModeTaskLaunchValidationResult => ({
  issues: issues.map(redactCommandSecrets),
});

const validateBuildModeLaunchGraph = (
  value: Record<string, unknown>,
  appBundle: AppBundle,
  now: Date,
  issues: string[],
): void => {
  const componentBundleIds = collectIds(
    readRecordArrayProperty(value, "componentBundles", issues),
    "componentBundles",
    issues,
    value.componentBundles !== undefined,
  );
  const execModuleIds = collectIds(
    readRecordArrayProperty(value, "execModules", issues),
    "execModules",
    issues,
    value.execModules !== undefined,
  );
  const execModuleContracts = collectExecModuleContracts(value, issues);
  for (const componentBundleId of appBundle.componentBundleIds) {
    if (
      componentBundleIds.provided &&
      !componentBundleIds.ids.has(componentBundleId)
    ) {
      issues.push(
        `Build Mode appBundle references missing componentBundle ${componentBundleId}.`,
      );
    }
  }
  for (const execModuleId of appBundle.execModuleIds) {
    if (execModuleIds.provided && !execModuleIds.ids.has(execModuleId)) {
      issues.push(
        `Build Mode appBundle references missing execModule ${execModuleId}.`,
      );
    }
  }

  const capabilities = collectIds(
    readRecordArrayProperty(value, "capabilities", issues),
    "capabilities",
    issues,
    value.capabilities !== undefined,
  );
  const promptProfiles = collectIds(
    readRecordArrayProperty(value, "promptProfiles", issues),
    "promptProfiles",
    issues,
    value.promptProfiles !== undefined,
  );
  const promptBundles = collectIds(
    readRecordArrayProperty(value, "promptBundles", issues),
    "promptBundles",
    issues,
    value.promptBundles !== undefined,
  );
  const promptBundleContracts = collectPromptBundleContracts(value, issues);
  const mcpServers = collectIds(
    readRecordArrayProperty(value, "mcpServers", issues),
    "mcpServers",
    issues,
    value.mcpServers !== undefined,
  );
  const mcpTools = collectIds(
    readRecordArrayProperty(value, "mcpTools", issues),
    "mcpTools",
    issues,
    value.mcpTools !== undefined,
  );
  const agentLoop = collectIds(
    readRecordArrayProperty(value, "agentLoop", issues),
    "agentLoop",
    issues,
    value.agentLoop !== undefined,
  );
  const agentRuntimes = collectIds(
    readRecordArrayProperty(value, "agentRuntimes", issues),
    "agentRuntimes",
    issues,
    value.agentRuntimes !== undefined,
  );
  const localModelRuntimes = collectIds(
    readRecordArrayProperty(value, "localModelRuntimes", issues),
    "localModelRuntimes",
    issues,
    value.localModelRuntimes !== undefined,
  );
  const readinessGates = collectIds(
    readRecordArrayProperty(value, "readinessGates", issues),
    "readinessGates",
    issues,
    value.readinessGates !== undefined,
  );
  const executionPlan = collectIds(
    readRecordArrayProperty(value, "executionPlan", issues),
    "executionPlan",
    issues,
    value.executionPlan !== undefined,
  );
  const receipts = collectIds(
    readRecordArrayProperty(value, "receipts", issues),
    "receipts",
    issues,
    value.receipts !== undefined,
  );
  const commandReceipts = collectIds(
    readRecordArrayProperty(value, "commandReceipts", issues),
    "commandReceipts",
    issues,
    value.commandReceipts !== undefined,
  );
  const evidenceArtifacts = collectIds(
    readRecordArrayProperty(value, "evidenceArtifacts", issues),
    "evidenceArtifacts",
    issues,
    value.evidenceArtifacts !== undefined,
  );
  const latestCommandReceiptProofs =
    collectLatestCommandReceiptProofByCommandId(value, issues);
  const providerRouteRefs = collectProviderCredentialRouteRefs(value, issues);
  const declaredSwarmRoles = collectSwarmRoles(value, issues);

  validateBuildModeEnumContracts(value, issues);
  validateAppBundleReceiptProof(value, appBundle, receipts, commandReceipts, issues);
  validateSelectedProviderRoute(
    value,
    providerRouteRefs,
    receipts,
    commandReceipts,
    issues,
  );
  validateCreditContracts(
    value,
    providerRouteRefs,
    receipts,
    commandReceipts,
    latestCommandReceiptProofs,
    issues,
  );
  validateSelectedPromptRefs(
    value,
    promptProfiles,
    promptBundles,
    promptBundleContracts,
    receipts,
    commandReceipts,
    issues,
  );
  validatePromptProfiles(value, promptBundles, issues);
  validatePromptBundles(value, receipts, issues);
  validateAgentLoopReceiptRefs(value, receipts, commandReceipts, issues);
  const agentRuntimeSummary = validateAgentRuntimes(
    value,
    promptProfiles,
    agentLoop,
    providerRouteRefs,
    declaredSwarmRoles,
    receipts,
    commandReceipts,
    issues,
  );
  validateRuntimeAndSwarmLiveStateProof(value, issues);
  validateThorApiVaixBindingReceiptRefs(value, receipts, commandReceipts, issues);
  validateCapabilityReceiptRefs(value, receipts, commandReceipts, issues);
  validateGuardrailReceiptRefs(value, receipts, commandReceipts, issues);
  validateCommandPolicyRuleReceiptRefs(value, receipts, commandReceipts, issues);
  validateComponentBundleReceiptRefs(value, receipts, commandReceipts, issues);
  validateExecModuleReceiptRefs(value, receipts, commandReceipts, issues);
  validateMcpRegistry(
    value,
    mcpServers,
    mcpTools,
    execModuleIds,
    execModuleContracts,
    receipts,
    commandReceipts,
    issues,
  );

  const commandCatalog = collectBuildModeCommandCatalogIds(value, issues);
  validateLocalModelRuntimeBindings(
    value,
    localModelRuntimes,
    agentRuntimes,
    commandCatalog,
    capabilities,
    receipts,
    commandReceipts,
    issues,
  );
  validateConnectorBindings(
    value,
    commandCatalog,
    receipts,
    commandReceipts,
    issues,
  );
  validateRequiredSwarmRoles(declaredSwarmRoles, issues);
  validateWorkflowMcpBindings(
    value,
    execModuleIds,
    execModuleContracts,
    receipts,
    commandReceipts,
    issues,
  );
  validateAppBundleDiffs(
    value,
    appBundle,
    receipts,
    commandReceipts,
    evidenceArtifacts,
    issues,
  );
  validateCommands(
    value,
    commandCatalog,
    capabilities,
    agentRuntimes,
    executionPlan,
    declaredSwarmRoles,
    commandReceipts,
    issues,
  );
  validateExecutionPlan(
    value,
    commandCatalog,
    agentRuntimes,
    readinessGates,
    executionPlan,
    commandReceipts,
    issues,
  );
  validateReadinessGates(
    value,
    commandCatalog,
    capabilities,
    commandReceipts,
    issues,
  );
  validateToolAndAutonomyCapabilityRefs(
    value,
    capabilities,
    agentRuntimeSummary,
    receipts,
    commandReceipts,
    issues,
  );
  validateSafeEditAndCheckpointRefs(
    value,
    commandCatalog,
    commandReceipts,
    issues,
  );
  validateScheduledAutomations(
    value,
    commandCatalog,
    promptProfiles,
    promptBundles,
    promptBundleContracts,
    providerRouteRefs,
    issues,
  );
  validateReceiptRefs(
    value,
    commandCatalog,
    capabilities,
    receipts,
    commandReceipts,
    evidenceArtifacts,
    promptProfiles,
    promptBundles,
    promptBundleContracts,
    now,
    issues,
  );
  validateFinalReportDurableMemoryProof(value, issues);
};

const validateAppBundleReceiptProof = (
  value: Record<string, unknown>,
  appBundle: AppBundle,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const diffReceiptIds = readRecordArrayProperty(
    value,
    "appBundleDiffs",
    issues,
  )
    .filter(
      (diff) =>
        readNonEmptyString(diff.appBundleId) === appBundle.id ||
        !readNonEmptyString(diff.appBundleId),
    )
    .flatMap((diff) => readStringArray(diff.receiptIds));
  const receiptIds = Array.from(
    new Set([...readStringArray(appBundle.receiptIds), ...diffReceiptIds]),
  );
  if (!receiptIds.length) {
    if (
      value.appBundleDiffs !== undefined ||
      readStringArray(appBundle.receiptIds).length
    ) {
      issues.push(
        `Build Mode appBundle ${appBundle.id} requires receipt proof.`,
      );
    }
    return;
  }
  validateReceiptReferenceList(
    receiptIds,
    receipts,
    commandReceipts,
    `Build Mode appBundle ${appBundle.id}`,
    issues,
  );
  const receiptStatusById = collectReceiptStatusById(value, issues);
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode appBundle ${appBundle.id} requires receipt status proof.`,
    );
    return;
  }
  if (
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode appBundle ${appBundle.id} has no acceptable receipt status.`,
    );
  }
};

const validateBuildModeEnumContracts = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  if (isRecord(value.appBundle)) {
    for (const [index, artifact] of readRecordArrayProperty(
      value.appBundle,
      "artifacts",
      issues,
    ).entries()) {
      validateEnumField(
        artifact,
        "kind",
        appBundleArtifactKinds,
        `appBundle.artifacts[${index}]`,
        issues,
      );
    }
  }
  if (isRecord(value.grayMatterContextPack)) {
    validateEnumField(
      value.grayMatterContextPack,
      "policy",
      grayMatterPolicies,
      "grayMatterContextPack",
      issues,
    );
    validateEnumField(
      value.grayMatterContextPack,
      "answerPolicy",
      grayMatterAnswerPolicies,
      "grayMatterContextPack",
      issues,
    );
    validateEnumField(
      value.grayMatterContextPack,
      "retrievalStatus",
      grayMatterRetrievalStatuses,
      "grayMatterContextPack",
      issues,
    );
    validateEnumField(
      value.grayMatterContextPack,
      "invariantPreflightStatus",
      grayMatterInvariantPreflightStatuses,
      "grayMatterContextPack",
      issues,
    );
  }
  validateRecordArrayEnums(value, "componentBundles", issues, [
    ["generatedBy", componentBundleGeneratedByValues],
    ["status", componentBundleStatuses],
  ]);
  validateRecordArrayEnums(value, "execModules", issues, [
    ["safetyLevel", execModuleSafetyLevels],
  ]);
  validateRecordArrayEnums(value, "receipts", issues, [
    ["kind", receiptKinds],
    ["status", receiptStatuses],
  ]);
  if (isRecord(value.creditEstimate)) {
    validateEnumField(
      value.creditEstimate,
      "currency",
      creditCurrencies,
      "creditEstimate",
      issues,
    );
    validateEnumField(
      value.creditEstimate,
      "providerRoute",
      providerRoutes,
      "creditEstimate",
      issues,
    );
  }
  validateCreditUsageReceiptEnums(
    readRecordArrayProperty(value, "creditUsageReceipts", issues),
    "creditUsageReceipts",
    issues,
  );
  validateRecordArrayEnums(value, "providerCredentials", issues, [
    ["route", providerRoutes],
  ]);
  validateRecordArrayEnums(value, "promptBundles", issues, [
    ["source", promptBundleSources],
    ["policy", promptBundlePolicies],
  ]);
  validateRecordArrayEnums(value, "mcpServers", issues, [
    ["transport", mcpServerTransports],
    ["status", mcpServerStatuses],
    ["scope", mcpServerScopes],
  ]);
  validateRecordArrayEnums(value, "mcpTools", issues, [
    ["status", mcpToolStatuses],
  ]);
  validateConnectorBindingEnums(value, issues);
  validateScheduledAutomationEnums(value, issues);
  validateRecordArrayEnums(value, "capabilities", issues, [
    ["kind", capabilityKinds],
    ["risk", risks],
  ]);
  validateRecordArrayEnums(value, "guardrails", issues, [
    ["enforcement", guardrailEnforcements],
  ]);
  validateRecordArrayEnums(value, "toolPermissions", issues, [
    ["decision", toolPermissionDecisions],
    ["approvalThreshold", approvalThresholds],
  ]);
  validateCommandPolicyRuleEnums(value, issues);
  validateRecordArrayEnums(value, "checkpoints", issues, [
    ["status", checkpointStatuses],
  ]);
  validateRecordArrayEnums(value, "safeEditPlans", issues, [
    ["tool", safeEditTools],
    ["status", safeEditStatuses],
  ]);
  validateSwarmRoleEnums(value, issues);
  validateRecordArrayEnums(value, "agentLoop", issues, [
    ["status", agentLoopStatuses],
  ]);
  validateAgentRuntimeEnums(value, issues);
  validateRecordArrayEnums(value, "localModelRuntimes", issues, [
    ["status", runtimeStatuses],
    ["executionMode", localModelExecutionModes],
  ]);
  validateRecordArrayEnums(value, "thorApiVaixBindings", issues, [
    ["surface", thorApiVaixSurfaces],
    ["policy", thorApiVaixPolicies],
  ]);
  if (isRecord(value.autonomyPolicy)) {
    validateEnumField(
      value.autonomyPolicy,
      "mode",
      autonomyModes,
      "autonomyPolicy",
      issues,
    );
  }
  validateRecordArrayEnums(value, "readinessGates", issues, [
    ["status", readinessGateStatuses],
  ]);
  validateRecordArrayEnums(value, "executionPlan", issues, [
    ["status", executionPlanStepStatuses],
  ]);
  validateCommandEnums(value, issues);
  validateCommandReceiptEnums(value, issues);
  validateRecordArrayEnums(value, "evidenceArtifacts", issues, [
    ["kind", evidenceArtifactKinds],
  ]);
  if (isRecord(value.browserVerification)) {
    validateEnumField(
      value.browserVerification,
      "status",
      browserVerificationStatuses,
      "browserVerification",
      issues,
    );
  }
  if (isRecord(value.finalReport)) {
    validateEnumField(
      value.finalReport,
      "status",
      finalReportStatuses,
      "finalReport",
      issues,
    );
  }
};

const validateRecordArrayEnums = (
  value: Record<string, unknown>,
  property: string,
  issues: string[],
  fields: [string, Set<string>][],
): void => {
  for (const [index, record] of readRecordArrayProperty(
    value,
    property,
    issues,
  ).entries()) {
    for (const [field, allowedValues] of fields) {
      validateEnumField(
        record,
        field,
        allowedValues,
        `${property}[${index}]`,
        issues,
      );
    }
  }
};

const validateEnumField = (
  record: Record<string, unknown>,
  field: string,
  allowedValues: Set<string>,
  owner: string,
  issues: string[],
): void => {
  const value = readNonEmptyString(record[field]);
  if (!value) {
    return;
  }
  if (!allowedValues.has(value)) {
    issues.push(`Build Mode ${owner}.${field} has unsupported enum value.`);
  }
};

const validateCreditUsageReceiptEnums = (
  records: Record<string, unknown>[],
  owner: string,
  issues: string[],
): void => {
  for (const [index, receipt] of records.entries()) {
    validateEnumField(
      receipt,
      "providerRoute",
      providerRoutes,
      `${owner}[${index}]`,
      issues,
    );
    validateEnumField(
      receipt,
      "commandStatus",
      commandStatuses,
      `${owner}[${index}]`,
      issues,
    );
  }
};

const validateScheduledAutomationEnums = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  for (const [index, automation] of readRecordArrayProperty(
    value,
    "scheduledAutomations",
    issues,
  ).entries()) {
    validateEnumField(
      automation,
      "scheduler",
      new Set(["valkyrai-cron"]),
      `scheduledAutomations[${index}]`,
      issues,
    );
    validateEnumField(
      automation,
      "status",
      scheduledAutomationStatuses,
      `scheduledAutomations[${index}]`,
      issues,
    );
    validateEnumField(
      automation,
      "providerRoute",
      providerRoutes,
      `scheduledAutomations[${index}]`,
      issues,
    );
    validateEnumField(
      automation,
      "lastRunStatus",
      scheduledAutomationRunStatuses,
      `scheduledAutomations[${index}]`,
      issues,
    );
    if (isRecord(automation.promptContext)) {
      validateEnumField(
        automation.promptContext,
        "promptBundlePolicy",
        promptBundlePolicies,
        `scheduledAutomations[${index}].promptContext`,
        issues,
      );
    }
    for (const [runIndex, run] of readRecordArrayProperty(
      automation,
      "runHistory",
      issues,
    ).entries()) {
      validateEnumField(
        run,
        "status",
        scheduledAutomationRunStatuses,
        `scheduledAutomations[${index}].runHistory[${runIndex}]`,
        issues,
      );
    }
  }
};

const validateConnectorBindingEnums = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  for (const [index, binding] of readRecordArrayProperty(
    value,
    "connectorBindings",
    issues,
  ).entries()) {
    validateEnumField(
      binding,
      "status",
      connectorBindingStatuses,
      `connectorBindings[${index}]`,
      issues,
    );
    for (const [actionIndex, action] of readStringArray(
      binding.allowedActions,
    ).entries()) {
      if (!connectorReadActions.has(action)) {
        issues.push(
          `Build Mode connectorBindings[${index}].allowedActions[${actionIndex}] has unsupported enum value.`,
        );
      }
    }
  }
};

const validateCommandPolicyRuleEnums = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  for (const [index, rule] of readRecordArrayProperty(
    value,
    "commandPolicyRules",
    issues,
  ).entries()) {
    validateEnumField(
      rule,
      "effect",
      commandPolicyEffects,
      `commandPolicyRules[${index}]`,
      issues,
    );
    for (const [kindIndex, kind] of readStringArray(
      rule.commandKinds,
    ).entries()) {
      if (!commandKinds.has(kind)) {
        issues.push(
          `Build Mode commandPolicyRules[${index}].commandKinds[${kindIndex}] has unsupported enum value.`,
        );
      }
    }
  }
};

const validateSwarmRoleEnums = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  for (const [index, roleAssignment] of readRecordArrayProperty(
    value,
    "swarmRoles",
    issues,
  ).entries()) {
    validateEnumField(
      roleAssignment,
      "role",
      swarmRoles,
      `swarmRoles[${index}]`,
      issues,
    );
    validateEnumField(
      roleAssignment,
      "status",
      swarmRoleStatuses,
      `swarmRoles[${index}]`,
      issues,
    );
  }
};

const validateAgentRuntimeEnums = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  for (const [index, runtime] of readRecordArrayProperty(
    value,
    "agentRuntimes",
    issues,
  ).entries()) {
    validateEnumField(
      runtime,
      "runtime",
      agentRuntimeKinds,
      `agentRuntimes[${index}]`,
      issues,
    );
    validateEnumField(
      runtime,
      "status",
      runtimeStatuses,
      `agentRuntimes[${index}]`,
      issues,
    );
    validateEnumField(
      runtime,
      "ownerRole",
      swarmRoles,
      `agentRuntimes[${index}]`,
      issues,
    );
    validateEnumField(
      runtime,
      "providerRoute",
      providerRoutes,
      `agentRuntimes[${index}]`,
      issues,
    );
    validateEnumField(
      runtime,
      "handoffPolicy",
      runtimeHandoffPolicies,
      `agentRuntimes[${index}]`,
      issues,
    );
  }
};

const validateCommandEnums = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  for (const [index, command] of readRecordArrayProperty(
    value,
    "commands",
    issues,
  ).entries()) {
    validateEnumField(
      command,
      "kind",
      commandKinds,
      `commands[${index}]`,
      issues,
    );
    validateEnumField(
      command,
      "status",
      commandStatuses,
      `commands[${index}]`,
      issues,
    );
    validateEnumField(
      command,
      "assignedSwarmRole",
      swarmRoles,
      `commands[${index}]`,
      issues,
    );
  }
};

const validateCommandReceiptEnums = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  for (const [index, receipt] of readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  ).entries()) {
    const owner = `commandReceipts[${index}]`;
    validateEnumField(receipt, "status", commandStatuses, owner, issues);
    validateEnumField(
      receipt,
      "executionMode",
      commandExecutionModes,
      owner,
      issues,
    );
    validateEnumField(
      receipt,
      "nextOperatorAction",
      nextOperatorActions,
      owner,
      issues,
    );
    validateEnumField(
      receipt,
      "policyDecision",
      policyDecisions,
      owner,
      issues,
    );
    validateEnumField(
      receipt,
      "requiredApprovalThreshold",
      approvalThresholds,
      owner,
      issues,
    );
    validateEnumField(receipt, "assignedSwarmRole", swarmRoles, owner, issues);
    if (isRecord(receipt.approval)) {
      validateEnumField(
        receipt.approval,
        "threshold",
        approvalThresholds,
        `${owner}.approval`,
        issues,
      );
    }
    if (isRecord(receipt.promptContext)) {
      validateEnumField(
        receipt.promptContext,
        "promptBundlePolicy",
        promptBundlePolicies,
        `${owner}.promptContext`,
        issues,
      );
    }
    if (isRecord(receipt.grayMatterContextProof)) {
      validateEnumField(
        receipt.grayMatterContextProof,
        "answerPolicy",
        grayMatterAnswerPolicies,
        `${owner}.grayMatterContextProof`,
        issues,
      );
      validateEnumField(
        receipt.grayMatterContextProof,
        "invariantPreflightStatus",
        grayMatterInvariantPreflightStatuses,
        `${owner}.grayMatterContextProof`,
        issues,
      );
      validateEnumField(
        receipt.grayMatterContextProof,
        "retrievalStatus",
        grayMatterRetrievalStatuses,
        `${owner}.grayMatterContextProof`,
        issues,
      );
    }
    if (isRecord(receipt.creditUsageReceipt)) {
      validateCreditUsageReceiptEnums(
        [receipt.creditUsageReceipt],
        `${owner}.creditUsageReceipt`,
        issues,
      );
    }
    for (const [artifactIndex, artifact] of readRecordArrayProperty(
      receipt,
      "artifacts",
      issues,
    ).entries()) {
      validateEnumField(
        artifact,
        "kind",
        evidenceArtifactKinds,
        `${owner}.artifacts[${artifactIndex}]`,
        issues,
      );
    }
  }
};

const collectExecModuleContracts = (
  value: Record<string, unknown>,
  issues: string[],
): Map<
  string,
  Pick<ExecModuleMetadata, "inputSchemaRef" | "name" | "outputSchemaRef">
> => {
  const contracts = new Map<
    string,
    Pick<ExecModuleMetadata, "inputSchemaRef" | "name" | "outputSchemaRef">
  >();
  for (const [index, module] of readRecordArrayProperty(
    value,
    "execModules",
    issues,
  ).entries()) {
    const id = readNonEmptyString(module.id);
    if (!id) {
      continue;
    }
    const name = readNonEmptyString(module.name);
    const inputSchemaRef = readNonEmptyString(module.inputSchemaRef);
    const outputSchemaRef = readNonEmptyString(module.outputSchemaRef);
    if (!name) {
      issues.push(`Build Mode execModule ${id} requires a name.`);
    }
    if (!inputSchemaRef) {
      issues.push(`Build Mode execModule ${id} requires an inputSchemaRef.`);
    }
    contracts.set(id, {
      inputSchemaRef: inputSchemaRef ?? "",
      name: name ?? `execModule[${index}]`,
      outputSchemaRef: outputSchemaRef ?? "",
    });
  }
  return contracts;
};

type PromptBundleContract = Pick<
  PromptBundle,
  "policy" | "receiptIds" | "version"
>;

const collectPromptBundleContracts = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, PromptBundleContract> => {
  const contracts = new Map<string, PromptBundleContract>();
  for (const bundle of readRecordArrayProperty(
    value,
    "promptBundles",
    issues,
  )) {
    const id = readNonEmptyString(bundle.id);
    if (!id) {
      continue;
    }
    contracts.set(id, {
      policy:
        bundle.policy === "locked" ||
        bundle.policy === "editable" ||
        bundle.policy === "review-required"
          ? bundle.policy
          : "review-required",
      receiptIds: readStringArray(bundle.receiptIds),
      version: readNonEmptyString(bundle.version) ?? "",
    });
  }
  return contracts;
};

const validateWorkflowMcpBindings = (
  value: Record<string, unknown>,
  execModuleIds: CollectedIds,
  execModuleContracts: Map<
    string,
    Pick<ExecModuleMetadata, "inputSchemaRef" | "name" | "outputSchemaRef">
  >,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptUniverseProvided = receipts.provided || commandReceipts.provided;
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const binding of readRecordArrayProperty(
    value,
    "workflowMcpBindings",
    issues,
  )) {
    const id = readNonEmptyString(binding.id) ?? "unknown";
    const execModuleId = readNonEmptyString(binding.execModuleId);
    if (!execModuleId) {
      issues.push(
        `Build Mode workflowMcpBinding ${id} requires an execModuleId.`,
      );
      continue;
    }
    if (execModuleIds.provided && !execModuleIds.ids.has(execModuleId)) {
      issues.push(
        `Build Mode workflowMcpBinding ${id} references missing execModule ${execModuleId}.`,
      );
      continue;
    }
    const contract = execModuleContracts.get(execModuleId);
    if (!contract) {
      continue;
    }
    const toolName = readNonEmptyString(binding.toolName);
    if (toolName && toolName !== contract.name) {
      issues.push(
        `Build Mode workflowMcpBinding ${id} toolName ${toolName} does not match execModule ${execModuleId} name ${contract.name}.`,
      );
    }
    const inputContractRef = readNonEmptyString(binding.inputContractRef);
    if (inputContractRef && inputContractRef !== contract.inputSchemaRef) {
      issues.push(
        `Build Mode workflowMcpBinding ${id} inputContractRef ${inputContractRef} does not match execModule ${execModuleId} inputSchemaRef ${contract.inputSchemaRef}.`,
      );
    }
    if (receiptUniverseProvided) {
      const receiptIds = readStringArray(binding.receiptIds);
      validateReceiptReferenceList(
        receiptIds,
        receipts,
        commandReceipts,
        `Build Mode workflowMcpBinding ${id}`,
        issues,
      );
      validateWorkflowMcpBindingReceiptProof(
        id,
        binding.approvalRequired === true,
        receiptIds,
        receiptStatusById,
        issues,
      );
    }
  }
};

type MpcToolContract = Pick<
  BuildModeMcpToolBinding,
  | "approvalRequired"
  | "capabilityId"
  | "execModuleId"
  | "inputSchemaRef"
  | "name"
  | "outputSchemaRef"
  | "receiptIds"
  | "serverId"
  | "status"
  | "workflowRef"
> & {
  serverName?: string;
};

const validateMcpRegistry = (
  value: Record<string, unknown>,
  mcpServers: CollectedIds,
  mcpTools: CollectedIds,
  execModuleIds: CollectedIds,
  execModuleContracts: Map<
    string,
    Pick<ExecModuleMetadata, "inputSchemaRef" | "name" | "outputSchemaRef">
  >,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptUniverseProvided = receipts.provided || commandReceipts.provided;
  const receiptStatusById = collectReceiptStatusById(value, issues);
  const serverNameById = new Map<string, string>();
  for (const server of readRecordArrayProperty(value, "mcpServers", issues)) {
    const id = readNonEmptyString(server.id) ?? "unknown";
    const name = readNonEmptyString(server.name);
    if (!name) {
      issues.push(`Build Mode mcpServer ${id} requires a name.`);
    } else {
      serverNameById.set(id, name);
    }
    if (mcpTools.provided) {
      for (const toolId of readStringArray(server.toolIds)) {
        if (!mcpTools.ids.has(toolId)) {
          issues.push(
            `Build Mode mcpServer ${id} references missing mcpTool ${toolId}.`,
          );
        }
      }
    }
    if (receiptUniverseProvided) {
      const receiptIds = readStringArray(server.receiptIds);
      validateReceiptReferenceList(
        receiptIds,
        receipts,
        commandReceipts,
        `Build Mode mcpServer ${id}`,
        issues,
      );
      validateMcpStatusReceiptProof(
        `mcpServer ${id}`,
        readNonEmptyString(server.status),
        receiptIds,
        receiptStatusById,
        issues,
      );
      validatePublicMcpServerPublicationProof(
        id,
        readNonEmptyString(server.scope),
        readNonEmptyString(server.status),
        receiptIds,
        value,
        issues,
      );
    }
  }

  const toolContracts = new Map<string, MpcToolContract>();
  for (const tool of readRecordArrayProperty(value, "mcpTools", issues)) {
    const id = readNonEmptyString(tool.id) ?? "unknown";
    const serverId = readNonEmptyString(tool.serverId);
    if (!serverId) {
      issues.push(`Build Mode mcpTool ${id} requires a serverId.`);
    } else if (mcpServers.provided && !mcpServers.ids.has(serverId)) {
      issues.push(
        `Build Mode mcpTool ${id} references missing mcpServer ${serverId}.`,
      );
    }
    const name = readNonEmptyString(tool.name);
    if (!name) {
      issues.push(`Build Mode mcpTool ${id} requires a name.`);
    }
    const capabilityId = readNonEmptyString(tool.capabilityId);
    if (!capabilityId) {
      issues.push(`Build Mode mcpTool ${id} requires a capabilityId.`);
    }
    const execModuleId = readNonEmptyString(tool.execModuleId);
    if (execModuleId && execModuleIds.provided && !execModuleIds.ids.has(execModuleId)) {
      issues.push(
        `Build Mode mcpTool ${id} references missing execModule ${execModuleId}.`,
      );
    }
    if (execModuleId) {
      validateMcpToolExecModuleContract(
        id,
        {
          inputSchemaRef: readNonEmptyString(tool.inputSchemaRef),
          name,
          outputSchemaRef: readNonEmptyString(tool.outputSchemaRef),
        },
        execModuleContracts.get(execModuleId),
        execModuleId,
        issues,
      );
    }
    if (receiptUniverseProvided) {
      const receiptIds = readStringArray(tool.receiptIds);
      validateReceiptReferenceList(
        receiptIds,
        receipts,
        commandReceipts,
        `Build Mode mcpTool ${id}`,
        issues,
      );
      validateMcpStatusReceiptProof(
        `mcpTool ${id}`,
        readNonEmptyString(tool.status),
        receiptIds,
        receiptStatusById,
        issues,
      );
    }
    if (name) {
      toolContracts.set(id, {
        approvalRequired: tool.approvalRequired === true,
        capabilityId: capabilityId ?? "",
        execModuleId,
        inputSchemaRef: readNonEmptyString(tool.inputSchemaRef),
        name,
        outputSchemaRef: readNonEmptyString(tool.outputSchemaRef),
        receiptIds: readStringArray(tool.receiptIds),
        serverId: serverId ?? "",
        serverName: serverId ? serverNameById.get(serverId) : undefined,
        status: readNonEmptyString(tool.status) as MpcToolContract["status"],
        workflowRef: readNonEmptyString(tool.workflowRef),
      });
    }
  }
  validateWorkflowMcpBindingsAgainstToolRegistry(value, toolContracts, issues);
};

const validateMcpToolExecModuleContract = (
  id: string,
  tool: {
    inputSchemaRef?: string;
    name?: string;
    outputSchemaRef?: string;
  },
  contract:
    | Pick<ExecModuleMetadata, "inputSchemaRef" | "name" | "outputSchemaRef">
    | undefined,
  execModuleId: string,
  issues: string[],
): void => {
  if (!contract) {
    return;
  }
  if (tool.name && tool.name !== contract.name) {
    issues.push(
      `Build Mode mcpTool ${id} name ${tool.name} does not match execModule ${execModuleId} name ${contract.name}.`,
    );
  }
  if (tool.inputSchemaRef && tool.inputSchemaRef !== contract.inputSchemaRef) {
    issues.push(
      `Build Mode mcpTool ${id} inputSchemaRef ${tool.inputSchemaRef} does not match execModule ${execModuleId} inputSchemaRef ${contract.inputSchemaRef}.`,
    );
  }
  if (
    tool.outputSchemaRef &&
    tool.outputSchemaRef !== contract.outputSchemaRef
  ) {
    issues.push(
      `Build Mode mcpTool ${id} outputSchemaRef ${tool.outputSchemaRef} does not match execModule ${execModuleId} outputSchemaRef ${contract.outputSchemaRef}.`,
    );
  }
};

const validateMcpStatusReceiptProof = (
  owner: string,
  status: string | undefined,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (
    !status ||
    (!mcpServerStatuses.has(status) && !mcpToolStatuses.has(status))
  ) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(`Build Mode ${owner} status ${status} requires receipt proof.`);
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode ${owner} status ${status} requires receipt status proof.`,
    );
    return;
  }
  const acceptableStatuses =
    status === "blocked"
      ? ["failed", "rejected", "approval-required"]
      : status === "requires-approval"
        ? ["approved", "succeeded", "approval-required", "running"]
        : ["approved", "succeeded", "running"];
  if (
    !statuses.some((receiptStatus) =>
      acceptableStatuses.includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode ${owner} status ${status} has no acceptable receipt status.`,
    );
  }
};

const validatePublicMcpServerPublicationProof = (
  id: string,
  scope: string | undefined,
  status: string | undefined,
  receiptIds: string[],
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    scope !== "public" ||
    (status !== "connected" && status !== "available")
  ) {
    return;
  }
  const commandReceiptById = new Map(
    readRecordArrayProperty(payload, "commandReceipts", issues)
      .map((receipt) => [readNonEmptyString(receipt.id), receipt] as const)
      .filter(
        (entry): entry is [string, Record<string, unknown>] =>
          Boolean(entry[0]),
      ),
  );
  const hasOwnerApproval = receiptIds.some((receiptId) => {
    const receipt = commandReceiptById.get(receiptId);
    if (!receipt) {
      return false;
    }
    const approval = isRecord(receipt.approval) ? receipt.approval : undefined;
    const requiredThreshold = readApprovalThreshold(
      receipt.requiredApprovalThreshold,
    );
    const approvalThreshold = readApprovalThreshold(approval?.threshold);
    return (
      readNonEmptyString(receipt.policyDecision) === "approval-required" &&
      requiredThreshold === "owner" &&
      receipt.approved === true &&
      readNonEmptyString(receipt.status) === "succeeded" &&
      approval?.approved === true &&
      approvalThreshold !== undefined &&
      approvalThresholdRank[approvalThreshold] >= approvalThresholdRank.owner
    );
  });

  if (!hasOwnerApproval) {
    issues.push(
      `Build Mode mcpServer ${id} public scope with status ${status} requires a succeeded owner-approved commandReceipt for public MCP publication.`,
    );
  }
};

const validateWorkflowMcpBindingsAgainstToolRegistry = (
  value: Record<string, unknown>,
  toolContracts: Map<string, MpcToolContract>,
  issues: string[],
): void => {
  if (value.mcpTools === undefined) {
    return;
  }
  const tools = Array.from(toolContracts.values());
  for (const binding of readRecordArrayProperty(
    value,
    "workflowMcpBindings",
    issues,
  )) {
    const id = readNonEmptyString(binding.id) ?? "unknown";
    const serverName = readNonEmptyString(binding.serverName);
    const toolName = readNonEmptyString(binding.toolName);
    const execModuleId = readNonEmptyString(binding.execModuleId);
    const workflowRef = readNonEmptyString(binding.workflowRef);
    const match = tools.find(
      (tool) =>
        tool.serverName === serverName &&
        tool.name === toolName &&
        (!execModuleId || tool.execModuleId === execModuleId),
    );
    if (!match) {
      issues.push(
        `Build Mode workflowMcpBinding ${id} has no matching mcpTool registry entry for ${serverName}.${toolName}.`,
      );
      continue;
    }
    if (workflowRef && match.workflowRef && workflowRef !== match.workflowRef) {
      issues.push(
        `Build Mode workflowMcpBinding ${id} workflowRef ${workflowRef} does not match mcpTool ${match.name} workflowRef ${match.workflowRef}.`,
      );
    }
  }
};

const validateWorkflowMcpBindingReceiptProof = (
  id: string,
  approvalRequired: boolean,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!receiptIds.length) {
    issues.push(`Build Mode workflowMcpBinding ${id} requires receipt proof.`);
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode workflowMcpBinding ${id} requires receipt status proof.`,
    );
    return;
  }
  const acceptableStatuses = approvalRequired
    ? ["approved", "succeeded", "approval-required", "running"]
    : ["approved", "succeeded"];
  if (
    !statuses.some((receiptStatus) => acceptableStatuses.includes(receiptStatus))
  ) {
    issues.push(
      `Build Mode workflowMcpBinding ${id} has no acceptable receipt status.`,
    );
  }
};

const validateConnectorBindings = (
  value: Record<string, unknown>,
  commandCatalog: CollectedIds,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptUniverseProvided = receipts.provided || commandReceipts.provided;
  const receiptStatusById = collectReceiptStatusById(value, issues);
  const commandById = new Map<string, Record<string, unknown>>();
  for (const command of readRecordArrayProperty(value, "commands", issues)) {
    const id = readNonEmptyString(command.id);
    if (id) {
      commandById.set(id, command);
    }
  }
  for (const binding of readRecordArrayProperty(
    value,
    "connectorBindings",
    issues,
  )) {
    const id = readNonEmptyString(binding.id) ?? "unknown";
    const connectorId = readNonEmptyString(binding.connectorId);
    if (!connectorId) {
      issues.push(`Build Mode connectorBinding ${id} requires a connectorId.`);
    }
    if (!readNonEmptyString(binding.connectorName)) {
      issues.push(`Build Mode connectorBinding ${id} requires a connectorName.`);
    }
    if (!readStringArray(binding.dataClasses).length) {
      issues.push(`Build Mode connectorBinding ${id} requires dataClasses.`);
    }
    if (!readStringArray(binding.allowedActions).length) {
      issues.push(`Build Mode connectorBinding ${id} requires allowedActions.`);
    }
    for (const commandId of readStringArray(binding.commandIds)) {
      if (commandCatalog.provided && !commandCatalog.ids.has(commandId)) {
        issues.push(
          `Build Mode connectorBinding ${id} references missing command ${commandId}.`,
        );
        continue;
      }
      const command = commandById.get(commandId);
      if (command && readNonEmptyString(command.capabilityId) !== "connector.read") {
        issues.push(
          `Build Mode connectorBinding ${id} command ${commandId} is not a connector.read command.`,
        );
      }
      const commandText = readNonEmptyString(command?.command);
      if (connectorId && commandText) {
        const target = commandText.match(
          /^connector:(?<connectorId>[A-Za-z0-9_-]+)\.(?<action>[A-Za-z0-9_-]+)/i,
        )?.groups;
        if (
          target?.connectorId &&
          target.connectorId.toLowerCase() !== connectorId.toLowerCase()
        ) {
          issues.push(
            `Build Mode connectorBinding ${id} command ${commandId} targets connector ${target.connectorId.toLowerCase()} instead of ${connectorId}.`,
          );
        }
        const action = target?.action?.toLowerCase();
        if (
          action &&
          readStringArray(binding.allowedActions).length &&
          !readStringArray(binding.allowedActions).includes(action)
        ) {
          issues.push(
            `Build Mode connectorBinding ${id} command ${commandId} action ${action} is not allowed by the binding.`,
          );
        }
      }
    }
    if (receiptUniverseProvided) {
      const receiptIds = readStringArray(binding.receiptIds);
      validateReceiptReferenceList(
        receiptIds,
        receipts,
        commandReceipts,
        `Build Mode connectorBinding ${id}`,
        issues,
      );
      validateConnectorBindingReceiptProof(
        id,
        readNonEmptyString(binding.status),
        receiptIds,
        receiptStatusById,
        issues,
      );
    }
  }
};

const validateConnectorBindingReceiptProof = (
  id: string,
  status: string | undefined,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!status || !connectorBindingStatuses.has(status)) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode connectorBinding ${id} status ${status} requires receipt proof.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode connectorBinding ${id} status ${status} requires receipt status proof.`,
    );
    return;
  }
  const acceptableStatuses =
    status === "blocked"
      ? ["failed", "rejected", "approval-required"]
      : status === "requires-approval"
        ? ["approved", "succeeded", "approval-required", "running"]
        : ["approved", "succeeded", "running"];
  if (
    !statuses.some((receiptStatus) =>
      acceptableStatuses.includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode connectorBinding ${id} status ${status} has no acceptable receipt status.`,
    );
  }
};

type ProviderCredentialRouteRefs = {
  provided: boolean;
  routes: Set<ProviderRoute>;
  receiptIdsByRoute: Map<ProviderRoute, string[]>;
};

type AgentRuntimeValidationSummary = {
  hasAvailableLocalAutonomousRuntime: boolean;
};

const collectProviderCredentialRouteRefs = (
  value: Record<string, unknown>,
  issues: string[],
): ProviderCredentialRouteRefs => {
  const records = readRecordArrayProperty(value, "providerCredentials", issues);
  const credentialIds = new Set<string>();
  const routes = new Set<ProviderRoute>();
  const receiptIdsByRoute = new Map<ProviderRoute, Set<string>>();
  for (const [index, credential] of records.entries()) {
    const id = readNonEmptyString(credential.id);
    if (!id) {
      issues.push(`Build Mode providerCredentials[${index}] requires an id.`);
    } else {
      addUniqueId(credentialIds, id, "providerCredentials", issues);
    }

    const route = readNonEmptyString(credential.route);
    if (!route) {
      issues.push(
        `Build Mode providerCredential ${id ?? index} requires a route.`,
      );
      continue;
    }
    if (!providerRoutes.has(route as ProviderRoute)) {
      issues.push(
        `Build Mode providerCredential ${id ?? index} has unsupported route.`,
      );
      continue;
    }
    const providerRoute = route as ProviderRoute;
    routes.add(providerRoute);
    const existingReceiptIds =
      receiptIdsByRoute.get(providerRoute) ?? new Set<string>();
    for (const receiptId of readStringArray(credential.receiptIds)) {
      existingReceiptIds.add(receiptId);
    }
    receiptIdsByRoute.set(providerRoute, existingReceiptIds);
    if (
      providerRoute === "bring-your-own-key" &&
      credential.secretAvailable !== true
    ) {
      issues.push(
        `Build Mode providerCredential ${id ?? index} for bring-your-own-key must have secretAvailable true.`,
      );
    }
    if (
      providerRoute === "enterprise-proxy" &&
      credential.tenantScoped !== true
    ) {
      issues.push(
        `Build Mode providerCredential ${id ?? index} for enterprise-proxy must be tenant scoped.`,
      );
    }
  }
  return {
    provided: value.providerCredentials !== undefined,
    receiptIdsByRoute: new Map(
      Array.from(receiptIdsByRoute.entries()).map(([route, receiptIds]) => [
        route,
        Array.from(receiptIds),
      ]),
    ),
    routes,
  };
};

const validateSelectedProviderRoute = (
  value: Record<string, unknown>,
  providerRouteRefs: ProviderCredentialRouteRefs,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const selectedProviderRoute = readNonEmptyString(value.selectedProviderRoute);
  if (!selectedProviderRoute) {
    return;
  }
  validateProviderRouteRef(
    selectedProviderRoute,
    "selectedProviderRoute",
    providerRouteRefs,
    issues,
  );
  validateSelectedProviderCredentialProof(
    selectedProviderRoute,
    providerRouteRefs,
    receipts,
    commandReceipts,
    value,
    issues,
  );
};

const validateSelectedProviderCredentialProof = (
  selectedProviderRoute: string,
  providerRouteRefs: ProviderCredentialRouteRefs,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  value: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    (!receipts.provided && !commandReceipts.provided) ||
    !providerRoutes.has(selectedProviderRoute as ProviderRoute)
  ) {
    return;
  }
  const receiptIds =
    providerRouteRefs.receiptIdsByRoute.get(
      selectedProviderRoute as ProviderRoute,
    ) ?? [];
  validateReceiptReferenceList(
    receiptIds,
    receipts,
    commandReceipts,
    `Build Mode selectedProviderRoute ${selectedProviderRoute}`,
    issues,
  );
  if (!receiptIds.length) {
    issues.push(
      `Build Mode selectedProviderRoute ${selectedProviderRoute} requires provider credential receipt proof.`,
    );
    return;
  }
  const receiptStatusById = collectReceiptStatusById(value, issues);
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode selectedProviderRoute ${selectedProviderRoute} requires provider credential receipt status proof.`,
    );
    return;
  }
  if (
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode selectedProviderRoute ${selectedProviderRoute} has no acceptable provider credential receipt status.`,
    );
  }
};

const validateProviderRouteRef = (
  route: string,
  owner: string,
  providerRouteRefs: ProviderCredentialRouteRefs,
  issues: string[],
): void => {
  if (!providerRoutes.has(route as ProviderRoute)) {
    issues.push(`Build Mode ${owner} has unsupported providerRoute.`);
    return;
  }
  if (
    providerRouteRefs.provided &&
    !providerRouteRefs.routes.has(route as ProviderRoute)
  ) {
    issues.push(
      `Build Mode ${owner} references providerRoute ${route} without a ProviderCredentialRef.`,
    );
  }
};

const validateCreditContracts = (
  value: Record<string, unknown>,
  providerRouteRefs: ProviderCredentialRouteRefs,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  latestCommandReceiptProofs: Map<string, CommandReceiptExecutionProof>,
  issues: string[],
): void => {
  const creditEstimate = isRecord(value.creditEstimate)
    ? value.creditEstimate
    : undefined;
  const estimateId = creditEstimate
    ? readNonEmptyString(creditEstimate.id)
    : undefined;
  if (creditEstimate) {
    const providerRoute = readNonEmptyString(creditEstimate.providerRoute);
    if (providerRoute) {
      validateProviderRouteRef(
        providerRoute,
        `creditEstimate ${estimateId ?? "unknown"}`,
        providerRouteRefs,
        issues,
      );
    }
    const estimatedCredits = readFiniteNumber(creditEstimate.estimatedCredits);
    const estimatedHostedCredits = readFiniteNumber(
      creditEstimate.estimatedHostedInfrastructureCredits,
    );
    if (
      estimatedCredits !== undefined &&
      estimatedCredits > 0 &&
      (providerRoute === "bring-your-own-key" ||
        providerRoute === "local-model") &&
      (!estimatedHostedCredits || estimatedHostedCredits <= 0)
    ) {
      issues.push(
        `Build Mode creditEstimate ${estimateId ?? "unknown"} must include hosted infrastructure credits for ${providerRoute}.`,
      );
    }
    validateCreditEstimateReceiptProof(
      value,
      creditEstimate,
      estimateId ?? "unknown",
      receipts,
      commandReceipts,
      issues,
    );
  }

  for (const creditReceipt of readRecordArrayProperty(
    value,
    "creditUsageReceipts",
    issues,
  )) {
    const id = readNonEmptyString(creditReceipt.id) ?? "unknown";
    const receiptEstimateId = readNonEmptyString(creditReceipt.estimateId);
    if (estimateId && receiptEstimateId && receiptEstimateId !== estimateId) {
      issues.push(
        `Build Mode creditUsageReceipt ${id} references estimate ${receiptEstimateId}, expected ${estimateId}.`,
      );
    }
    const providerRoute = readNonEmptyString(creditReceipt.providerRoute);
    if (providerRoute) {
      validateProviderRouteRef(
        providerRoute,
        `creditUsageReceipt ${id}`,
        providerRouteRefs,
        issues,
      );
    }
    validateCreditUsageReceiptCommandProof(
      creditReceipt,
      id,
      latestCommandReceiptProofs,
      issues,
    );
    const actualCredits = readFiniteNumber(creditReceipt.actualCredits);
    const providerCredits = readFiniteNumber(creditReceipt.providerCredits);
    const hostedCredits = readFiniteNumber(
      creditReceipt.hostedInfrastructureCredits,
    );
    validateCreditUsageReceiptAmounts(
      creditReceipt,
      id,
      providerRoute,
      actualCredits,
      providerCredits,
      hostedCredits,
      issues,
    );
  }
};

const validateCreditEstimateReceiptProof = (
  value: Record<string, unknown>,
  creditEstimate: Record<string, unknown>,
  estimateId: string,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const explicitReceiptIds = readStringArray(creditEstimate.receiptIds);
  const targetReceiptIds = readRecordArrayProperty(value, "receipts", issues)
    .filter(
      (receipt) =>
        readNonEmptyString(receipt.kind) === "credit_usage" &&
        readNonEmptyString(receipt.targetRef) === estimateId,
    )
    .map((receipt) => readNonEmptyString(receipt.id))
    .filter((receiptId): receiptId is string => Boolean(receiptId));
  const receiptIds = Array.from(
    new Set([...explicitReceiptIds, ...targetReceiptIds]),
  );
  if (!receiptIds.length) {
    issues.push(
      `Build Mode creditEstimate ${estimateId} requires credit usage receipt proof.`,
    );
    return;
  }
  validateReceiptReferenceList(
    receiptIds,
    receipts,
    commandReceipts,
    `Build Mode creditEstimate ${estimateId}`,
    issues,
  );
  const receiptStatusById = collectReceiptStatusById(value, issues);
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode creditEstimate ${estimateId} requires credit usage receipt status proof.`,
    );
    return;
  }
  if (
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode creditEstimate ${estimateId} has no acceptable credit usage receipt status.`,
    );
  }
};

const validateCreditUsageReceiptAmounts = (
  creditReceipt: Record<string, unknown>,
  id: string,
  providerRoute: string | undefined,
  actualCredits: number | undefined,
  providerCredits: number | undefined,
  hostedCredits: number | undefined,
  issues: string[],
): void => {
  if (
    actualCredits !== undefined &&
    providerCredits !== undefined &&
    hostedCredits !== undefined &&
    actualCredits !== providerCredits + hostedCredits
  ) {
    issues.push(
      `Build Mode creditUsageReceipt ${id} actualCredits must equal providerCredits plus hostedInfrastructureCredits.`,
    );
  }

  const commandStatus = readNonEmptyString(creditReceipt.commandStatus);
  if (
    commandStatus &&
    commandStatus !== "succeeded" &&
    ((actualCredits !== undefined && actualCredits !== 0) ||
      (providerCredits !== undefined && providerCredits !== 0) ||
      (hostedCredits !== undefined && hostedCredits !== 0))
  ) {
    issues.push(
      `Build Mode creditUsageReceipt ${id} with commandStatus ${commandStatus} must have zero actualCredits, providerCredits, and hostedInfrastructureCredits.`,
    );
  }

  if (
    actualCredits !== undefined &&
    actualCredits > 0 &&
    (providerRoute === "bring-your-own-key" ||
      providerRoute === "local-model")
  ) {
    if (providerCredits !== undefined && providerCredits !== 0) {
      issues.push(
        `Build Mode creditUsageReceipt ${id} must not charge provider credits for ${providerRoute}.`,
      );
    }
    if (!hostedCredits || hostedCredits <= 0) {
      issues.push(
        `Build Mode creditUsageReceipt ${id} must include hosted infrastructure credits for ${providerRoute}.`,
      );
    }
  }
};

const validateCreditUsageReceiptCommandProof = (
  creditReceipt: Record<string, unknown>,
  id: string,
  latestCommandReceiptProofs: Map<string, CommandReceiptExecutionProof>,
  issues: string[],
): void => {
  const commandId = readNonEmptyString(creditReceipt.commandId);
  if (!commandId) {
    return;
  }
  const proof = latestCommandReceiptProofs.get(commandId);
  if (!proof) {
    if (latestCommandReceiptProofs.size > 0) {
      issues.push(
        `Build Mode creditUsageReceipt ${id} requires matching commandReceipt proof for command ${commandId}.`,
      );
    }
    return;
  }

  const commandStatus = readNonEmptyString(creditReceipt.commandStatus);
  if (commandStatus && proof.status && commandStatus !== proof.status) {
    issues.push(
      `Build Mode creditUsageReceipt ${id} commandStatus ${commandStatus} does not match latest commandReceipt status ${proof.status} for command ${commandId}.`,
    );
  }

  const capabilityId = readNonEmptyString(creditReceipt.capabilityId);
  if (capabilityId && proof.capabilityId && capabilityId !== proof.capabilityId) {
    issues.push(
      `Build Mode creditUsageReceipt ${id} capabilityId ${capabilityId} does not match latest commandReceipt capability ${proof.capabilityId} for command ${commandId}.`,
    );
  }
};

const collectSwarmRoles = (
  value: Record<string, unknown>,
  issues: string[],
): CollectedIds => {
  const ids = new Set<string>();
  const records = readRecordArrayProperty(value, "swarmRoles", issues);
  for (const [index, roleAssignment] of records.entries()) {
    const role = readNonEmptyString(roleAssignment.role);
    if (!role) {
      issues.push(`Build Mode swarmRoles[${index}] requires a role.`);
      continue;
    }
    if (!swarmRoles.has(role as BuildModeSwarmRole)) {
      issues.push(`Build Mode swarmRoles[${index}].role is unsupported.`);
      continue;
    }
    addUniqueId(ids, role, "swarmRoles", issues);
  }
  return { ids, provided: value.swarmRoles !== undefined };
};

const validateRequiredSwarmRoles = (
  declaredSwarmRoles: CollectedIds,
  issues: string[],
): void => {
  if (!declaredSwarmRoles.provided) {
    return;
  }
  for (const role of requiredSwarmRoles) {
    if (!declaredSwarmRoles.ids.has(role)) {
      issues.push(`Build Mode swarmRoles missing required role ${role}.`);
    }
  }
};

const collectBuildModeCommandCatalogIds = (
  value: Record<string, unknown>,
  issues: string[],
): { ids: Set<string>; provided: boolean } => {
  const commandRecords = readRecordArrayProperty(value, "commands", issues);
  const workflowBindings = readRecordArrayProperty(
    value,
    "workflowMcpBindings",
    issues,
  );
  const scheduledAutomations = readRecordArrayProperty(
    value,
    "scheduledAutomations",
    issues,
  );
  const commandCatalog = collectIds(commandRecords, "commands", issues);
  for (const binding of workflowBindings) {
    const id = readNonEmptyString(binding.id);
    if (id) {
      addUniqueId(commandCatalog.ids, `cmd-workflow-${id}`, "commands", issues);
    }
  }
  for (const automation of scheduledAutomations) {
    const id = readNonEmptyString(automation.id);
    if (id) {
      addUniqueId(
        commandCatalog.ids,
        `cmd-automation-${id}`,
        "commands",
        issues,
      );
    }
  }
  return {
    ids: commandCatalog.ids,
    provided:
      value.commands !== undefined ||
      commandCatalog.provided ||
      workflowBindings.length > 0 ||
      scheduledAutomations.length > 0,
  };
};

const validateSelectedPromptRefs = (
  value: Record<string, unknown>,
  promptProfiles: CollectedIds,
  promptBundles: CollectedIds,
  promptBundleContracts: Map<string, PromptBundleContract>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const selectedPromptProfileId = readNonEmptyString(
    value.selectedPromptProfileId,
  );
  if (
    selectedPromptProfileId &&
    promptProfiles.provided &&
    !promptProfiles.ids.has(selectedPromptProfileId)
  ) {
    issues.push(
      `Build Mode selectedPromptProfileId references missing promptProfile ${selectedPromptProfileId}.`,
    );
  }
  const selectedPromptBundleId = readNonEmptyString(
    value.selectedPromptBundleId,
  );
  if (
    selectedPromptBundleId &&
    promptBundles.provided &&
    !promptBundles.ids.has(selectedPromptBundleId)
  ) {
    issues.push(
      `Build Mode selectedPromptBundleId references missing promptBundle ${selectedPromptBundleId}.`,
    );
  }
  if (selectedPromptProfileId && selectedPromptBundleId) {
    for (const profile of readRecordArrayProperty(
      value,
      "promptProfiles",
      issues,
    )) {
      if (readNonEmptyString(profile.id) !== selectedPromptProfileId) {
        continue;
      }
      const promptBundleRef = readNonEmptyString(profile.promptBundleRef);
      if (promptBundleRef && promptBundleRef !== selectedPromptBundleId) {
        issues.push(
          `Build Mode selectedPromptProfileId ${selectedPromptProfileId} points to promptBundle ${promptBundleRef}, but selectedPromptBundleId is ${selectedPromptBundleId}.`,
        );
      }
      validateSelectedPromptProfileProof(
        profile,
        selectedPromptProfileId,
        receipts,
        commandReceipts,
        value,
        issues,
      );
    }
  }
  if (
    selectedPromptBundleId &&
    promptBundleContracts.has(selectedPromptBundleId) &&
    !promptBundleContracts.get(selectedPromptBundleId)!.receiptIds.length
  ) {
    issues.push(
      `Build Mode selectedPromptBundleId ${selectedPromptBundleId} requires prompt bundle receipt proof.`,
    );
  }
};

const validateSelectedPromptProfileProof = (
  profile: Record<string, unknown>,
  selectedPromptProfileId: string,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  value: Record<string, unknown>,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const receiptIds = readStringArray(profile.receiptIds);
  validateReceiptReferenceList(
    receiptIds,
    receipts,
    commandReceipts,
    `Build Mode selectedPromptProfileId ${selectedPromptProfileId}`,
    issues,
  );
  if (!receiptIds.length) {
    issues.push(
      `Build Mode selectedPromptProfileId ${selectedPromptProfileId} requires prompt profile receipt proof.`,
    );
    return;
  }
  const receiptStatusById = collectReceiptStatusById(value, issues);
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode selectedPromptProfileId ${selectedPromptProfileId} requires prompt profile receipt status proof.`,
    );
    return;
  }
  if (
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode selectedPromptProfileId ${selectedPromptProfileId} has no acceptable prompt profile receipt status.`,
    );
  }
};

const validatePromptProfiles = (
  value: Record<string, unknown>,
  promptBundles: CollectedIds,
  issues: string[],
): void => {
  if (!promptBundles.provided) return;
  for (const profile of readRecordArrayProperty(
    value,
    "promptProfiles",
    issues,
  )) {
    const id = readNonEmptyString(profile.id) ?? "unknown";
    const promptBundleRef = readNonEmptyString(profile.promptBundleRef);
    if (promptBundleRef && !promptBundles.ids.has(promptBundleRef)) {
      issues.push(
        `Build Mode promptProfile ${id} references missing promptBundle ${promptBundleRef}.`,
      );
    }
  }
};

const validatePromptBundles = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  issues: string[],
): void => {
  for (const bundle of readRecordArrayProperty(
    value,
    "promptBundles",
    issues,
  )) {
    const id = readNonEmptyString(bundle.id) ?? "unknown";
    for (const receiptId of readStringArray(bundle.receiptIds)) {
      if (receipts.provided && !receipts.ids.has(receiptId)) {
        issues.push(
          `Build Mode promptBundle ${id} references missing receipt ${receiptId}.`,
        );
      }
    }
    for (const section of readRecordArrayProperty(bundle, "sections", issues)) {
      const sectionId = readNonEmptyString(section.id) ?? "unknown";
      if (!readNonEmptyString(section.sourceRef)) {
        issues.push(
          `Build Mode promptBundle ${id} section ${sectionId} requires a sourceRef.`,
        );
      }
      if (!readNonEmptyString(section.purpose)) {
        issues.push(
          `Build Mode promptBundle ${id} section ${sectionId} requires a purpose.`,
        );
      }
    }
  }
};

const validateAgentRuntimes = (
  value: Record<string, unknown>,
  promptProfiles: CollectedIds,
  agentLoop: CollectedIds,
  providerRouteRefs: ProviderCredentialRouteRefs,
  declaredSwarmRoles: CollectedIds,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): AgentRuntimeValidationSummary => {
  let hasAvailableLocalAutonomousRuntime = false;
  for (const runtime of readRecordArrayProperty(
    value,
    "agentRuntimes",
    issues,
  )) {
    const id = readNonEmptyString(runtime.id) ?? "unknown";
    const ownerRole = readNonEmptyString(runtime.ownerRole);
    if (ownerRole) {
      if (!swarmRoles.has(ownerRole as BuildModeSwarmRole)) {
        issues.push(`Build Mode agentRuntime ${id} has unsupported ownerRole.`);
      } else if (
        declaredSwarmRoles.provided &&
        !declaredSwarmRoles.ids.has(ownerRole)
      ) {
        issues.push(
          `Build Mode agentRuntime ${id} references missing swarmRole ${ownerRole}.`,
        );
      }
    }
    const promptProfileId = readNonEmptyString(runtime.promptProfileId);
    if (
      promptProfileId &&
      promptProfiles.provided &&
      !promptProfiles.ids.has(promptProfileId)
    ) {
      issues.push(
        `Build Mode agentRuntime ${id} references missing promptProfile ${promptProfileId}.`,
      );
    }
    const providerRoute = readNonEmptyString(runtime.providerRoute);
    if (providerRoute) {
      validateProviderRouteRef(
        providerRoute,
        `agentRuntime ${id}`,
        providerRouteRefs,
        issues,
      );
    }
    const handoffPolicy = readNonEmptyString(runtime.handoffPolicy);
    const status = readNonEmptyString(runtime.status);
    if (handoffPolicy === "autonomous-local") {
      if (providerRoute !== "local-model") {
        issues.push(
          `Build Mode agentRuntime ${id} with autonomous-local handoffPolicy must use providerRoute local-model.`,
        );
      }
      if (status === "blocked" || status === "offline") {
        issues.push(
          `Build Mode agentRuntime ${id} with autonomous-local handoffPolicy must be available, selected, or running.`,
        );
      }
      if (
        providerRoute === "local-model" &&
        status !== "blocked" &&
        status !== "offline"
      ) {
        hasAvailableLocalAutonomousRuntime = true;
      }
    }
    for (const loopPhaseId of readStringArray(runtime.loopPhaseIds)) {
      if (agentLoop.provided && !agentLoop.ids.has(loopPhaseId)) {
        issues.push(
          `Build Mode agentRuntime ${id} references missing agentLoop phase ${loopPhaseId}.`,
        );
      }
    }
    validateReceiptReferenceList(
      readStringArray(runtime.receiptIds),
      receipts,
      commandReceipts,
      `Build Mode agentRuntime ${id}`,
      issues,
    );
  }
  return { hasAvailableLocalAutonomousRuntime };
};

const validateLocalModelRuntimeBindings = (
  value: Record<string, unknown>,
  localModelRuntimes: CollectedIds,
  agentRuntimes: CollectedIds,
  commandCatalog: CollectedIds,
  capabilities: CollectedIds,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const records = readRecordArrayProperty(value, "localModelRuntimes", issues);
  if (
    readNonEmptyString(value.selectedProviderRoute) === "local-model" &&
    localModelRuntimes.provided &&
    !records.length
  ) {
    issues.push(
      "Build Mode selectedProviderRoute local-model requires a localModelRuntime binding.",
    );
  }

  const providerCredentialRouteById = new Map<string, string>();
  for (const credential of readRecordArrayProperty(
    value,
    "providerCredentials",
    issues,
  )) {
    const id = readNonEmptyString(credential.id);
    if (id) {
      providerCredentialRouteById.set(
        id,
        readNonEmptyString(credential.route) ?? "",
      );
    }
  }

  const agentRuntimeById = new Map<string, Record<string, unknown>>();
  for (const runtime of readRecordArrayProperty(value, "agentRuntimes", issues)) {
    const id = readNonEmptyString(runtime.id);
    if (id) {
      agentRuntimeById.set(id, runtime);
    }
  }

  for (const binding of records) {
    const id = readNonEmptyString(binding.id) ?? "unknown";
    const runtimeId = readNonEmptyString(binding.runtimeId);
    if (!runtimeId) {
      issues.push(`Build Mode localModelRuntime ${id} requires a runtimeId.`);
    } else {
      if (agentRuntimes.provided && !agentRuntimes.ids.has(runtimeId)) {
        issues.push(
          `Build Mode localModelRuntime ${id} references missing agentRuntime ${runtimeId}.`,
        );
      }
      const runtime = agentRuntimeById.get(runtimeId);
      if (runtime) {
        if (readNonEmptyString(runtime.providerRoute) !== "local-model") {
          issues.push(
            `Build Mode localModelRuntime ${id} runtime ${runtimeId} must use providerRoute local-model.`,
          );
        }
        if (readNonEmptyString(runtime.handoffPolicy) !== "autonomous-local") {
          issues.push(
            `Build Mode localModelRuntime ${id} runtime ${runtimeId} must use autonomous-local handoffPolicy.`,
          );
        }
      }
    }

    const providerCredentialId = readNonEmptyString(binding.providerCredentialId);
    if (!providerCredentialId) {
      issues.push(
        `Build Mode localModelRuntime ${id} requires a providerCredentialId.`,
      );
    } else {
      const route = providerCredentialRouteById.get(providerCredentialId);
      if (value.providerCredentials !== undefined && route === undefined) {
        issues.push(
          `Build Mode localModelRuntime ${id} references missing providerCredential ${providerCredentialId}.`,
        );
      } else if (route && route !== "local-model") {
        issues.push(
          `Build Mode localModelRuntime ${id} providerCredential ${providerCredentialId} must use route local-model.`,
        );
      }
    }

    if (
      readNonEmptyString(binding.status) === "blocked" ||
      readNonEmptyString(binding.status) === "offline"
    ) {
      issues.push(
        `Build Mode localModelRuntime ${id} must be available, selected, or running.`,
      );
    }

    for (const capabilityId of readStringArray(binding.capabilityIds)) {
      if (capabilities.provided && !capabilities.ids.has(capabilityId)) {
        issues.push(
          `Build Mode localModelRuntime ${id} references missing capability ${capabilityId}.`,
        );
      }
    }

    const healthCheckCommandId = readNonEmptyString(binding.healthCheckCommandId);
    if (
      healthCheckCommandId &&
      commandCatalog.provided &&
      !commandCatalog.ids.has(healthCheckCommandId)
    ) {
      issues.push(
        `Build Mode localModelRuntime ${id} references missing healthCheckCommand ${healthCheckCommandId}.`,
      );
    }

    const receiptIds = readStringArray(binding.receiptIds);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode localModelRuntime ${id}`,
      issues,
    );
    if ((receipts.provided || commandReceipts.provided) && !receiptIds.length) {
      issues.push(`Build Mode localModelRuntime ${id} requires receipt proof.`);
    }
  }
};

const validateAgentLoopReceiptRefs = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const phase of readRecordArrayProperty(value, "agentLoop", issues)) {
    const id = readNonEmptyString(phase.id) ?? "unknown";
    const receiptIds = readStringArray(phase.receiptIds);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode agentLoop phase ${id}`,
      issues,
    );
    validateAgentLoopStateReceiptProof(
      id,
      readNonEmptyString(phase.status),
      receiptIds,
      receiptStatusById,
      issues,
    );
  }
};

const collectReceiptStatusById = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, string> => {
  const statuses = new Map<string, string>();
  for (const receipt of readRecordArrayProperty(value, "receipts", issues)) {
    const id = readNonEmptyString(receipt.id);
    const status = readNonEmptyString(receipt.status);
    if (id && status) {
      statuses.set(id, status);
    }
  }
  for (const receipt of readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  )) {
    const id = readNonEmptyString(receipt.id);
    const status = readNonEmptyString(receipt.status);
    if (id && status) {
      statuses.set(id, status);
    }
  }
  return statuses;
};

const validateAgentLoopStateReceiptProof = (
  id: string,
  status: string | undefined,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!status || status === "pending" || status === "ready") {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode agentLoop phase ${id} status ${status} requires receipt proof.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode agentLoop phase ${id} status ${status} requires receipt status proof.`,
    );
    return;
  }
  if (
    status === "complete" &&
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode agentLoop phase ${id} status complete requires an approved or succeeded receipt.`,
    );
  }
  if (
    status === "running" &&
    !statuses.some((receiptStatus) => receiptStatus === "running")
  ) {
    issues.push(
      `Build Mode agentLoop phase ${id} status running requires a running receipt.`,
    );
  }
  if (
    status === "blocked" &&
    !statuses.some((receiptStatus) =>
      ["approval-required", "failed", "rejected"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode agentLoop phase ${id} status blocked requires an approval-required, failed, or rejected receipt.`,
    );
  }
};

const validateThorApiVaixBindingReceiptRefs = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const binding of readRecordArrayProperty(
    value,
    "thorApiVaixBindings",
    issues,
  )) {
    const id = readNonEmptyString(binding.id) ?? "unknown";
    const receiptIds = readStringArray(binding.receiptIds);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode thorApiVaixBinding ${id}`,
      issues,
    );
    validateThorApiVaixPolicyReceiptProof(
      id,
      readNonEmptyString(binding.policy),
      receiptIds,
      receiptStatusById,
      issues,
    );
  }
};

const validateThorApiVaixPolicyReceiptProof = (
  id: string,
  policy: string | undefined,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!policy || !receiptIds.length) {
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    return;
  }
  if (
    policy === "readonly-generated" &&
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode thorApiVaixBinding ${id} policy readonly-generated requires an approved or succeeded receipt.`,
    );
  }
  if (
    policy === "approval-required" &&
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded", "approval-required", "running"].includes(
        receiptStatus,
      ),
    )
  ) {
    issues.push(
      `Build Mode thorApiVaixBinding ${id} policy approval-required requires an approved, succeeded, approval-required, or running receipt.`,
    );
  }
  if (
    policy === "blocked" &&
    !statuses.some((receiptStatus) =>
      ["approval-required", "failed", "rejected"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode thorApiVaixBinding ${id} policy blocked requires an approval-required, failed, or rejected receipt.`,
    );
  }
};

const validateGuardrailReceiptRefs = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const guardrail of readRecordArrayProperty(
    value,
    "guardrails",
    issues,
  )) {
    const id = readNonEmptyString(guardrail.id) ?? "unknown";
    const enforcement = readNonEmptyString(guardrail.enforcement);
    const receiptIds = readStringArray(guardrail.receiptIds);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode guardrail ${id}`,
      issues,
    );
    validateGuardrailEnforcementReceiptProof(
      id,
      enforcement,
      receiptIds,
      receiptStatusById,
      issues,
    );
  }
};

const validateGuardrailEnforcementReceiptProof = (
  id: string,
  enforcement: string | undefined,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (
    !enforcement ||
    !guardrailEnforcements.has(enforcement as BuildModeGuardrail["enforcement"])
  ) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode guardrail ${id} enforcement ${enforcement} requires receipt proof.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode guardrail ${id} enforcement ${enforcement} requires receipt status proof.`,
    );
    return;
  }
  if (
    enforcement === "hard-block" &&
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode guardrail ${id} enforcement hard-block requires an approved or succeeded receipt.`,
    );
  }
  if (
    enforcement === "approval-required" &&
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded", "approval-required", "running"].includes(
        receiptStatus,
      ),
    )
  ) {
    issues.push(
      `Build Mode guardrail ${id} enforcement approval-required requires an approved, succeeded, approval-required, or running receipt.`,
    );
  }
  if (
    enforcement === "receipt-required" &&
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode guardrail ${id} enforcement receipt-required requires an approved or succeeded receipt.`,
    );
  }
};

const validateCommandPolicyRuleReceiptRefs = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const rule of readRecordArrayProperty(
    value,
    "commandPolicyRules",
    issues,
  )) {
    const id = readNonEmptyString(rule.id) ?? "unknown";
    const receiptIds = readStringArray(rule.receiptIds);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode commandPolicyRule ${id}`,
      issues,
    );
    validateCommandPolicyRuleEffectReceiptProof(
      id,
      readNonEmptyString(rule.effect),
      rule.enabled === true,
      receiptIds,
      receiptStatusById,
      receipts.provided || commandReceipts.provided,
      issues,
    );
  }
};

const validateCommandPolicyRuleEffectReceiptProof = (
  id: string,
  effect: string | undefined,
  enabled: boolean,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  receiptUniverseProvided: boolean,
  issues: string[],
): void => {
  if (!enabled || !receiptUniverseProvided) {
    return;
  }
  if (!effect || !commandPolicyEffects.has(effect)) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode commandPolicyRule ${id} effect ${effect} requires receipt proof.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode commandPolicyRule ${id} effect ${effect} requires receipt status proof.`,
    );
    return;
  }
  const acceptableStatuses =
    effect === "deny"
      ? ["approved", "succeeded", "failed", "rejected"]
      : effect === "approval-required"
        ? ["approved", "succeeded", "approval-required", "running"]
        : ["approved", "succeeded"];
  if (
    !statuses.some((receiptStatus) =>
      acceptableStatuses.includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode commandPolicyRule ${id} effect ${effect} has no acceptable receipt status.`,
    );
  }
};

const validateExecModuleReceiptRefs = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const module of readRecordArrayProperty(value, "execModules", issues)) {
    const id = readNonEmptyString(module.id) ?? "unknown";
    const receiptIds = readStringArray(module.receiptIds);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode execModule ${id}`,
      issues,
    );
    validateExecModuleSafetyReceiptProof(
      id,
      readNonEmptyString(module.safetyLevel),
      receiptIds,
      receiptStatusById,
      issues,
    );
  }
};

const validateComponentBundleReceiptRefs = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const bundle of readRecordArrayProperty(
    value,
    "componentBundles",
    issues,
  )) {
    const id = readNonEmptyString(bundle.id) ?? "unknown";
    const receiptIds = readStringArray(bundle.receiptIds);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode componentBundle ${id}`,
      issues,
    );
    validateComponentBundleStatusReceiptProof(
      id,
      readNonEmptyString(bundle.status),
      receiptIds,
      receiptStatusById,
      issues,
    );
  }
};

const validateCapabilityReceiptRefs = (
  value: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const receiptStatusById = collectReceiptStatusById(value, issues);
  const derivedReceiptIdsByCapability =
    collectDerivedCapabilityReceiptIdsByCapability(value, issues);
  for (const capability of readRecordArrayProperty(
    value,
    "capabilities",
    issues,
  )) {
    const id = readNonEmptyString(capability.id) ?? "unknown";
    const explicitReceiptIds = readStringArray(capability.receiptIds);
    const receiptIds = explicitReceiptIds.length
      ? explicitReceiptIds
      : (derivedReceiptIdsByCapability.get(id) ?? []);
    validateReceiptReferenceList(
      receiptIds,
      receipts,
      commandReceipts,
      `Build Mode capability ${id}`,
      issues,
    );
    validateCapabilityEnabledReceiptProof(
      id,
      capability.enabled === true,
      capability.requiresApproval === true,
      receiptIds,
      receiptStatusById,
      issues,
    );
  }
};

const collectDerivedCapabilityReceiptIdsByCapability = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, string[]> => {
  const receiptIdsByCapability = new Map<string, Set<string>>();
  const addReceiptIds = (
    capabilityId: string | undefined,
    receiptIds: string[],
  ) => {
    if (!capabilityId || !receiptIds.length) {
      return;
    }
    const existing = receiptIdsByCapability.get(capabilityId) ?? new Set<string>();
    for (const receiptId of receiptIds) {
      existing.add(receiptId);
    }
    receiptIdsByCapability.set(capabilityId, existing);
  };

  for (const permission of readRecordArrayProperty(
    value,
    "toolPermissions",
    issues,
  )) {
    addReceiptIds(
      readNonEmptyString(permission.capabilityId),
      readStringArray(permission.receiptIds),
    );
  }
  for (const receipt of readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  )) {
    const receiptId = readNonEmptyString(receipt.id);
    addReceiptIds(
      readNonEmptyString(receipt.capabilityId),
      receiptId ? [receiptId] : [],
    );
  }

  return new Map(
    Array.from(receiptIdsByCapability.entries()).map(([capabilityId, ids]) => [
      capabilityId,
      Array.from(ids),
    ]),
  );
};

const validateCapabilityEnabledReceiptProof = (
  id: string,
  enabled: boolean,
  requiresApproval: boolean,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!enabled) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode capability ${id} enabled state requires receipt proof.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode capability ${id} enabled state requires receipt status proof.`,
    );
    return;
  }
  const acceptableStatuses = requiresApproval
    ? ["approved", "succeeded", "approval-required", "queued", "running"]
    : ["approved", "succeeded", "running"];
  if (
    !statuses.some((receiptStatus) => acceptableStatuses.includes(receiptStatus))
  ) {
    issues.push(
      `Build Mode capability ${id} enabled state has no acceptable receipt status.`,
    );
  }
};

const validateComponentBundleStatusReceiptProof = (
  id: string,
  status: string | undefined,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!status || !componentBundleStatuses.has(status)) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode componentBundle ${id} status ${status} requires receipt proof.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode componentBundle ${id} status ${status} requires receipt status proof.`,
    );
    return;
  }
  const acceptableStatuses =
    status === "blocked"
      ? ["approval-required", "failed", "rejected"]
      : status === "needs-review"
        ? ["approved", "succeeded", "approval-required", "running"]
        : ["approved", "succeeded"];
  if (
    !statuses.some((receiptStatus) =>
      acceptableStatuses.includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode componentBundle ${id} status ${status} has no acceptable receipt status.`,
    );
  }
};

const validateExecModuleSafetyReceiptProof = (
  id: string,
  safetyLevel: string | undefined,
  receiptIds: string[],
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!safetyLevel || !execModuleSafetyLevels.has(safetyLevel)) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode execModule ${id} safetyLevel ${safetyLevel} requires receipt proof.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode execModule ${id} safetyLevel ${safetyLevel} requires receipt status proof.`,
    );
    return;
  }
  const acceptableStatuses =
    safetyLevel === "approval-required"
      ? ["approved", "succeeded", "approval-required", "running"]
      : ["approved", "succeeded"];
  if (
    !statuses.some((receiptStatus) =>
      acceptableStatuses.includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode execModule ${id} safetyLevel ${safetyLevel} has no acceptable receipt status.`,
    );
  }
};

const validateReceiptReferenceList = (
  receiptIds: string[],
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  owner: string,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  for (const receiptId of receiptIds) {
    if (!receipts.ids.has(receiptId) && !commandReceipts.ids.has(receiptId)) {
      issues.push(`${owner} references missing receipt ${receiptId}.`);
    }
  }
};

const validateRuntimeAndSwarmLiveStateProof = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  const commandReceipts = readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  );

  for (const runtime of readRecordArrayProperty(
    value,
    "agentRuntimes",
    issues,
  )) {
    const id = readNonEmptyString(runtime.id) ?? "unknown";
    if (readNonEmptyString(runtime.status) !== "running") {
      continue;
    }
    const receiptIds = new Set(readStringArray(runtime.receiptIds));
    const hasRunningReceiptProof = commandReceipts.some(
      (receipt) =>
        receiptIds.has(readNonEmptyString(receipt.id) ?? "") &&
        readNonEmptyString(receipt.assignedRuntimeId) === id &&
        readNonEmptyString(receipt.status) === "running",
    );
    if (!hasRunningReceiptProof) {
      issues.push(
        `Build Mode agentRuntime ${id} status running requires a running commandReceipt in receiptIds with assignedRuntimeId ${id}.`,
      );
    }
  }

  for (const role of readRecordArrayProperty(value, "swarmRoles", issues)) {
    const roleName = readNonEmptyString(role.role) ?? "unknown";
    if (readNonEmptyString(role.status) !== "running") {
      continue;
    }
    const hasRunningReceiptProof = commandReceipts.some(
      (receipt) =>
        readNonEmptyString(receipt.assignedSwarmRole) === roleName &&
        readNonEmptyString(receipt.status) === "running",
    );
    if (!hasRunningReceiptProof) {
      issues.push(
        `Build Mode swarmRole ${roleName} status running requires a running commandReceipt with assignedSwarmRole ${roleName}.`,
      );
    }
  }
};

const validateAppBundleDiffs = (
  value: Record<string, unknown>,
  appBundle: AppBundle,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  evidenceArtifacts: CollectedIds,
  issues: string[],
): void => {
  const artifactPaths = new Set(
    appBundle.artifacts.map((artifact) => artifact.path),
  );
  for (const diff of readRecordArrayProperty(value, "appBundleDiffs", issues)) {
    const id = readNonEmptyString(diff.id) ?? "unknown";
    const appBundleId = readNonEmptyString(diff.appBundleId);
    if (appBundleId && appBundleId !== appBundle.id) {
      issues.push(
        `Build Mode appBundleDiff ${id} references appBundle ${appBundleId}, expected ${appBundle.id}.`,
      );
    }
    if (!appBundleId) {
      issues.push(`Build Mode appBundleDiff ${id} requires an appBundleId.`);
    }
    if (!readNonEmptyString(diff.generatedAt)) {
      issues.push(
        `Build Mode appBundleDiff ${id} requires a generatedAt timestamp.`,
      );
    }
    for (const [field, paths] of [
      ["addedArtifacts", readStringArray(diff.addedArtifacts)],
      ["changedArtifacts", readStringArray(diff.changedArtifacts)],
      ["removedArtifacts", readStringArray(diff.removedArtifacts)],
    ] as const) {
      for (const artifactPath of paths) {
        if (!artifactPaths.has(artifactPath)) {
          issues.push(
            `Build Mode appBundleDiff ${id} ${field} references unknown app artifact ${artifactPath}.`,
          );
        }
      }
    }
    for (const receiptId of readStringArray(diff.receiptIds)) {
      if (
        (receipts.provided || commandReceipts.provided) &&
        !receipts.ids.has(receiptId) &&
        !commandReceipts.ids.has(receiptId)
      ) {
        issues.push(
          `Build Mode appBundleDiff ${id} references missing receipt ${receiptId}.`,
        );
      }
    }
    for (const artifactId of readStringArray(diff.evidenceArtifactIds)) {
      if (
        evidenceArtifacts.provided &&
        !evidenceArtifacts.ids.has(artifactId)
      ) {
        issues.push(
          `Build Mode appBundleDiff ${id} references missing evidenceArtifact ${artifactId}.`,
        );
      }
    }
  }
};

const validateCommands = (
  value: Record<string, unknown>,
  commandCatalog: CollectedIds,
  capabilities: CollectedIds,
  agentRuntimes: CollectedIds,
  executionPlan: CollectedIds,
  declaredSwarmRoles: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const latestReceiptStatusByCommandId =
    collectLatestCommandReceiptStatusByCommandId(value, issues);
  for (const command of readRecordArrayProperty(value, "commands", issues)) {
    const id = readNonEmptyString(command.id) ?? "unknown";
    const capabilityId = readNonEmptyString(command.capabilityId);
    if (
      capabilityId &&
      capabilities.provided &&
      !capabilities.ids.has(capabilityId)
    ) {
      issues.push(
        `Build Mode command ${id} references missing capability ${capabilityId}.`,
      );
    }
    const assignedRuntimeId = readNonEmptyString(command.assignedRuntimeId);
    if (
      assignedRuntimeId &&
      agentRuntimes.provided &&
      !agentRuntimes.ids.has(assignedRuntimeId)
    ) {
      issues.push(
        `Build Mode command ${id} references missing agentRuntime ${assignedRuntimeId}.`,
      );
    }
    const assignedSwarmRole = readNonEmptyString(command.assignedSwarmRole);
    if (assignedSwarmRole) {
      if (!swarmRoles.has(assignedSwarmRole as BuildModeSwarmRole)) {
        issues.push(
          `Build Mode command ${id} has unsupported assignedSwarmRole.`,
        );
      } else if (
        declaredSwarmRoles.provided &&
        !declaredSwarmRoles.ids.has(assignedSwarmRole)
      ) {
        issues.push(
          `Build Mode command ${id} references missing swarmRole ${assignedSwarmRole}.`,
        );
      }
    }
    const executionPlanStepId = readNonEmptyString(command.executionPlanStepId);
    if (
      executionPlanStepId &&
      executionPlan.provided &&
      !executionPlan.ids.has(executionPlanStepId)
    ) {
      issues.push(
        `Build Mode command ${id} references missing executionPlan step ${executionPlanStepId}.`,
      );
    }
    const status = readNonEmptyString(command.status);
    if (
      commandReceipts.provided &&
      isReceiptProvedCommandStatus(status) &&
      !latestReceiptStatusByCommandId.has(id)
    ) {
      issues.push(
        `Build Mode command ${id} status ${status} requires a matching commandReceipt.`,
      );
    }
    const latestStatus = latestReceiptStatusByCommandId.get(id);
    if (
      status &&
      latestStatus &&
      isReceiptProvedCommandStatus(status) &&
      latestStatus !== status
    ) {
      issues.push(
        `Build Mode command ${id} status ${status} does not match latest commandReceipt status ${latestStatus}.`,
      );
    }
  }
  if (commandCatalog.provided && !commandCatalog.ids.size) {
    issues.push(
      "Build Mode command catalog must include at least one command.",
    );
  }
};

type CommandReceiptExecutionProof = {
  capabilityId?: string;
  commandId: string;
  createdAt: string;
  id?: string;
  status?: string;
};

const collectLatestCommandReceiptProofByCommandId = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, CommandReceiptExecutionProof> => {
  const latest = new Map<string, CommandReceiptExecutionProof>();
  for (const receipt of readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  )) {
    const commandId = readNonEmptyString(receipt.commandId);
    if (!commandId) {
      continue;
    }
    const createdAt = readNonEmptyString(receipt.createdAt) ?? "";
    const current = latest.get(commandId);
    if (!current || createdAt >= current.createdAt) {
      latest.set(commandId, {
        capabilityId: readNonEmptyString(receipt.capabilityId),
        commandId,
        createdAt,
        id: readNonEmptyString(receipt.id),
        status: readNonEmptyString(receipt.status),
      });
    }
  }
  return latest;
};

const collectLatestCommandReceiptStatusByCommandId = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, string> => {
  return new Map(
    Array.from(
      collectLatestCommandReceiptProofByCommandId(value, issues).entries(),
    ).flatMap(([commandId, proof]) =>
      proof.status ? [[commandId, proof.status] as [string, string]] : [],
    ),
  );
};

const isReceiptProvedCommandStatus = (status: string | undefined): boolean =>
  status === "succeeded" ||
  status === "failed" ||
  status === "rejected" ||
  status === "approval-required";

const collectCommandContracts = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, BuildModeCommand> => {
  const commands = new Map<string, BuildModeCommand>();
  for (const command of readRecordArrayProperty(value, "commands", issues)) {
    const id = readNonEmptyString(command.id);
    const capabilityId = readNonEmptyString(command.capabilityId);
    const commandText = readNonEmptyString(command.command);
    const kind = readNonEmptyString(command.kind);
    if (!id || !capabilityId || !commandText || !kind) {
      continue;
    }
    commands.set(id, {
      id,
      capabilityId,
      command: commandText,
      executionPlanStepId: readNonEmptyString(command.executionPlanStepId),
      kind: kind as BuildModeCommand["kind"],
      label: readNonEmptyString(command.label) ?? id,
      protectedPaths: readStringArray(command.protectedPaths),
      requiresApproval: command.requiresApproval === true,
      status:
        (readNonEmptyString(command.status) as BuildModeCommand["status"]) ??
        "queued",
      targetPaths: readStringArray(command.targetPaths),
      assignedRuntimeId: readNonEmptyString(command.assignedRuntimeId),
      assignedSwarmRole: readNonEmptyString(
        command.assignedSwarmRole,
      ) as BuildModeCommand["assignedSwarmRole"],
    });
  }
  return commands;
};

const validateCommandReceiptCommandIdentity = (
  receipt: Record<string, unknown>,
  receiptId: string,
  command: BuildModeCommand | undefined,
  issues: string[],
): void => {
  if (!command) {
    return;
  }
  const capabilityId = readNonEmptyString(receipt.capabilityId);
  if (capabilityId && capabilityId !== command.capabilityId) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} capabilityId ${capabilityId} does not match command ${command.id} capabilityId ${command.capabilityId}.`,
    );
  }
  const assignedRuntimeId = readNonEmptyString(receipt.assignedRuntimeId);
  if (
    assignedRuntimeId &&
    command.assignedRuntimeId &&
    assignedRuntimeId !== command.assignedRuntimeId
  ) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} assignedRuntimeId ${assignedRuntimeId} does not match command ${command.id} assignedRuntimeId ${command.assignedRuntimeId}.`,
    );
  }
  const assignedSwarmRole = readNonEmptyString(receipt.assignedSwarmRole);
  if (
    assignedSwarmRole &&
    command.assignedSwarmRole &&
    assignedSwarmRole !== command.assignedSwarmRole
  ) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} assignedSwarmRole ${assignedSwarmRole} does not match command ${command.id} assignedSwarmRole ${command.assignedSwarmRole}.`,
    );
  }
  const executionPlanStepId = readNonEmptyString(receipt.executionPlanStepId);
  if (
    executionPlanStepId &&
    command.executionPlanStepId &&
    executionPlanStepId !== command.executionPlanStepId
  ) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} executionPlanStepId ${executionPlanStepId} does not match command ${command.id} executionPlanStepId ${command.executionPlanStepId}.`,
    );
  }
};

const validateCommandReceiptPolicyClaim = (
  receipt: Record<string, unknown>,
  receiptId: string,
  commands: Map<string, BuildModeCommand>,
  payload: Record<string, unknown>,
  now: Date,
  issues: string[],
): void => {
  const commandId = readNonEmptyString(receipt.commandId);
  const command = commandId ? commands.get(commandId) : undefined;
  if (!command) {
    return;
  }

  const scope = isRecord(payload.scope) ? payload.scope : undefined;
  const evaluation = evaluateBuildModeCommandPolicy(command, {
    approval: isRecord(receipt.approval)
      ? (receipt.approval as unknown as BuildModeCommandPolicyOptions["approval"])
      : undefined,
    approvalEvaluatedAt: isRecord(receipt.approval) ? now : undefined,
    autonomyPolicy: isRecord(payload.autonomyPolicy)
      ? (payload.autonomyPolicy as unknown as BuildModeCommandPolicyOptions["autonomyPolicy"])
      : undefined,
    commandPolicyRules: readRecordArrayProperty(
      payload,
      "commandPolicyRules",
      issues,
    ) as unknown as BuildModeCommandPolicyOptions["commandPolicyRules"],
    commandReceipts: readRecordArrayProperty(
      payload,
      "commandReceipts",
      issues,
    ) as unknown as BuildModeCommandPolicyOptions["commandReceipts"],
    executionPlan: readRecordArrayProperty(
      payload,
      "executionPlan",
      issues,
    ) as unknown as BuildModeCommandPolicyOptions["executionPlan"],
    readinessGates: readRecordArrayProperty(
      payload,
      "readinessGates",
      issues,
    ) as unknown as BuildModeCommandPolicyOptions["readinessGates"],
    agentRuntimes: readRecordArrayProperty(
      payload,
      "agentRuntimes",
      issues,
    ) as unknown as BuildModeCommandPolicyOptions["agentRuntimes"],
    scope: scope as unknown as BuildModeCommandPolicyOptions["scope"],
    swarmRoles: readRecordArrayProperty(
      payload,
      "swarmRoles",
      issues,
    ) as unknown as BuildModeCommandPolicyOptions["swarmRoles"],
    toolPermissions: readRecordArrayProperty(
      payload,
      "toolPermissions",
      issues,
    ) as unknown as BuildModeCommandPolicyOptions["toolPermissions"],
    workspaceRoot: readNonEmptyString(scope?.workspaceRoot),
  });

  const status = readNonEmptyString(receipt.status);
  const policyDecision = readNonEmptyString(receipt.policyDecision);

  const policyRejectionReasons = evaluation.reasons.filter((reason) => {
    if (reason === "Final report publication requires final report markdown.") {
      return false;
    }
    if (
      reason.startsWith("Execution plan step is not runnable:") &&
      status &&
      isHistoricalCommandReceiptForExecutionPlanStep(command.id, status, payload, issues)
    ) {
      return false;
    }
    if (isRunningOwnershipReceiptPolicyReason(reason, receipt, status)) {
      return false;
    }
    return true;
  });
  if (evaluation.decision === "reject" && policyRejectionReasons.length) {
    if (status !== "rejected" || policyDecision !== "reject") {
      issues.push(
        `Build Mode commandReceipt ${receiptId} claims command ${command.id} can continue, but command policy rejects it: ${policyRejectionReasons.join("; ")}.`,
      );
    }
    return;
  }

  if (evaluation.decision !== "approval-required") {
    return;
  }

  if (policyDecision && policyDecision !== "approval-required") {
    issues.push(
      `Build Mode commandReceipt ${receiptId} policyDecision ${policyDecision} contradicts command policy requiring approval for command ${command.id}.`,
    );
  }
  if (receipt.requiresApproval !== true) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} must declare requiresApproval true for approval-gated command ${command.id}.`,
    );
  }
  const declaredThreshold = readApprovalThreshold(
    receipt.requiredApprovalThreshold,
  );
  if (
    declaredThreshold &&
    approvalThresholdRank[declaredThreshold] <
      approvalThresholdRank[evaluation.requiredApprovalThreshold]
  ) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} requiredApprovalThreshold ${declaredThreshold} is below command policy threshold ${evaluation.requiredApprovalThreshold}.`,
    );
  }
  if (
    status !== "approval-required" &&
    status !== "rejected" &&
    !isRecord(receipt.approval)
  ) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} requires approval metadata before command ${command.id} can leave approval-required status.`,
    );
  }
};

const validateExecutionPlan = (
  value: Record<string, unknown>,
  commandCatalog: CollectedIds,
  agentRuntimes: CollectedIds,
  readinessGates: CollectedIds,
  executionPlan: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const latestReceiptStatusByCommandId =
    collectLatestCommandReceiptStatusByCommandId(value, issues);
  const readinessGateStatusById = collectReadinessGateStatusById(value, issues);
  const commandReceiptProofs = collectCommandReceiptProofs(value, issues);
  for (const step of readRecordArrayProperty(value, "executionPlan", issues)) {
    const id = readNonEmptyString(step.id) ?? "unknown";
    const runtimeId = readNonEmptyString(step.runtimeId);
    if (
      runtimeId &&
      agentRuntimes.provided &&
      !agentRuntimes.ids.has(runtimeId)
    ) {
      issues.push(
        `Build Mode executionPlan step ${id} references missing agentRuntime ${runtimeId}.`,
      );
    }
    for (const commandId of readStringArray(step.commandIds)) {
      if (commandCatalog.provided && !commandCatalog.ids.has(commandId)) {
        issues.push(
          `Build Mode executionPlan step ${id} references missing command ${commandId}.`,
        );
      }
    }
    for (const gateId of readStringArray(step.readinessGateIds)) {
      if (readinessGates.provided && !readinessGates.ids.has(gateId)) {
        issues.push(
          `Build Mode executionPlan step ${id} references missing readinessGate ${gateId}.`,
        );
      }
    }
    for (const dependencyStepId of readStringArray(step.dependencyStepIds)) {
      if (dependencyStepId === id) {
        issues.push(
          `Build Mode executionPlan step ${id} cannot depend on itself.`,
        );
      } else if (
        executionPlan.provided &&
        !executionPlan.ids.has(dependencyStepId)
      ) {
        issues.push(
          `Build Mode executionPlan step ${id} references missing dependency step ${dependencyStepId}.`,
        );
      }
    }
    validateExecutionPlanStepStatusProof(
      step,
      id,
      latestReceiptStatusByCommandId,
      readinessGateStatusById,
      commandReceipts,
      readinessGates,
      issues,
    );
    validateExecutionPlanStepNamedReceiptProof(
      step,
      id,
      commandReceiptProofs,
      commandReceipts,
      issues,
    );
  }
};

const validateExecutionPlanStepStatusProof = (
  step: Record<string, unknown>,
  id: string,
  latestReceiptStatusByCommandId: Map<string, string>,
  readinessGateStatusById: Map<string, string>,
  commandReceipts: CollectedIds,
  readinessGates: CollectedIds,
  issues: string[],
): void => {
  const status = readNonEmptyString(step.status);
  if (
    status !== "complete" &&
    status !== "failed" &&
    status !== "approval-required"
  ) {
    return;
  }

  const commandIds = readStringArray(step.commandIds);
  const commandStatuses = commandIds
    .map((commandId) => latestReceiptStatusByCommandId.get(commandId))
    .filter((item): item is string => Boolean(item));
  const gateIds = readStringArray(step.readinessGateIds);
  const gateStatuses = gateIds
    .map((gateId) => readinessGateStatusById.get(gateId))
    .filter((item): item is string => Boolean(item));

  if (
    status === "complete" &&
    commandReceipts.provided &&
    commandStatuses.length < commandIds.length
  ) {
    issues.push(
      `Build Mode executionPlan step ${id} status complete requires latest commandReceipt proof for every command.`,
    );
  }
  if (
    status === "complete" &&
    commandStatuses.some((commandStatus) => commandStatus !== "succeeded")
  ) {
    issues.push(
      `Build Mode executionPlan step ${id} status complete requires all latest commandReceipts to be succeeded.`,
    );
  }
  if (
    status === "complete" &&
    readinessGates.provided &&
    gateStatuses.length < gateIds.length
  ) {
    issues.push(
      `Build Mode executionPlan step ${id} status complete requires readiness gate proof for every gate.`,
    );
  }
  if (
    status === "complete" &&
    gateStatuses.some((gateStatus) => gateStatus !== "passed")
  ) {
    issues.push(
      `Build Mode executionPlan step ${id} status complete requires all readiness gates to be passed.`,
    );
  }

  if (
    status === "failed" &&
    !commandStatuses.some((commandStatus) =>
      ["failed", "rejected"].includes(commandStatus),
    ) &&
    !gateStatuses.some((gateStatus) => gateStatus === "failed")
  ) {
    issues.push(
      `Build Mode executionPlan step ${id} status failed requires a failed or rejected latest commandReceipt or failed readiness gate.`,
    );
  }

  if (
    status === "approval-required" &&
    !commandStatuses.some(
      (commandStatus) => commandStatus === "approval-required",
    ) &&
    !gateStatuses.some((gateStatus) => gateStatus === "blocked")
  ) {
    issues.push(
      `Build Mode executionPlan step ${id} status approval-required requires an approval-required latest commandReceipt or blocked readiness gate.`,
    );
  }
};

const validateExecutionPlanStepNamedReceiptProof = (
  step: Record<string, unknown>,
  id: string,
  commandReceipts: Map<string, CommandReceiptProof>,
  commandReceiptIds: CollectedIds,
  issues: string[],
): void => {
  if (readNonEmptyString(step.status) !== "complete") {
    return;
  }

  const commandIds = new Set(readStringArray(step.commandIds));
  for (const receiptId of readStringArray(step.receiptIds)) {
    const receipt = commandReceipts.get(receiptId);
    if (!receipt) {
      if (commandReceiptIds.provided) {
        issues.push(
          `Build Mode executionPlan step ${id} receiptId ${receiptId} references missing commandReceipt.`,
        );
      }
      continue;
    }
    if (receipt.status !== "succeeded") {
      issues.push(
        `Build Mode executionPlan step ${id} receiptId ${receiptId} must reference a succeeded commandReceipt before step can be complete.`,
      );
    }
    if (
      receipt.commandId &&
      commandIds.size > 0 &&
      !commandIds.has(receipt.commandId)
    ) {
      issues.push(
        `Build Mode executionPlan step ${id} receiptId ${receiptId} commandId ${receipt.commandId} must be listed in commandIds before step can be complete.`,
      );
    }
  }
};

const collectReadinessGateStatusById = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, string> => {
  const statuses = new Map<string, string>();
  for (const gate of readRecordArrayProperty(value, "readinessGates", issues)) {
    const id = readNonEmptyString(gate.id);
    const status = readNonEmptyString(gate.status);
    if (id && status) {
      statuses.set(id, status);
    }
  }
  return statuses;
};

const validateReadinessGates = (
  value: Record<string, unknown>,
  commandCatalog: CollectedIds,
  capabilities: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const latestReceiptStatusByCommandId =
    collectLatestCommandReceiptStatusByCommandId(value, issues);
  const commandReceiptProofs = collectCommandReceiptProofs(value, issues);
  const evidenceArtifactProofs = collectEvidenceArtifactProofs(value, issues);
  for (const gate of readRecordArrayProperty(value, "readinessGates", issues)) {
    const id = readNonEmptyString(gate.id) ?? "unknown";
    for (const commandId of readStringArray(gate.commandIds)) {
      if (commandCatalog.provided && !commandCatalog.ids.has(commandId)) {
        issues.push(
          `Build Mode readinessGate ${id} references missing command ${commandId}.`,
        );
      }
    }
    for (const capabilityId of readStringArray(gate.requiredCapabilityIds)) {
      if (capabilities.provided && !capabilities.ids.has(capabilityId)) {
        issues.push(
          `Build Mode readinessGate ${id} references missing capability ${capabilityId}.`,
        );
      }
    }
    validateReadinessGateStatusProof(
      gate,
      id,
      latestReceiptStatusByCommandId,
      commandReceipts,
      issues,
    );
    validatePassedReadinessGateNamedProof(
      gate,
      id,
      commandReceiptProofs,
      evidenceArtifactProofs,
      commandReceipts,
      issues,
    );
  }
};

const validateReadinessGateStatusProof = (
  gate: Record<string, unknown>,
  id: string,
  latestReceiptStatusByCommandId: Map<string, string>,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const status = readNonEmptyString(gate.status);
  if (status !== "passed" && status !== "failed" && status !== "blocked") {
    return;
  }

  const commandIds = readStringArray(gate.commandIds);
  const commandStatuses = commandIds
    .map((commandId) => latestReceiptStatusByCommandId.get(commandId))
    .filter((item): item is string => Boolean(item));

  if (
    status === "passed" &&
    commandReceipts.provided &&
    commandStatuses.length < commandIds.length
  ) {
    issues.push(
      `Build Mode readinessGate ${id} status passed requires latest commandReceipt proof for every command.`,
    );
  }
  if (
    status === "passed" &&
    commandStatuses.some((commandStatus) => commandStatus !== "succeeded")
  ) {
    issues.push(
      `Build Mode readinessGate ${id} status passed requires all latest commandReceipts to be succeeded.`,
    );
  }
  if (
    status === "failed" &&
    !commandStatuses.some((commandStatus) =>
      ["failed", "rejected"].includes(commandStatus),
    )
  ) {
    issues.push(
      `Build Mode readinessGate ${id} status failed requires a failed or rejected latest commandReceipt.`,
    );
  }
  if (
    status === "blocked" &&
    !commandStatuses.some(
      (commandStatus) => commandStatus === "approval-required",
    )
  ) {
    issues.push(
      `Build Mode readinessGate ${id} status blocked requires an approval-required latest commandReceipt.`,
    );
  }
};

const validatePassedReadinessGateNamedProof = (
  gate: Record<string, unknown>,
  id: string,
  commandReceipts: Map<string, CommandReceiptProof>,
  evidenceArtifacts: Map<string, EvidenceArtifactProof>,
  commandReceiptIds: CollectedIds,
  issues: string[],
): void => {
  if (readNonEmptyString(gate.status) !== "passed") {
    return;
  }

  const commandIds = new Set(readStringArray(gate.commandIds));
  const requiredReceiptIds = readStringArray(gate.requiredReceiptIds);
  const requiredReceiptIdSet = new Set(requiredReceiptIds);
  for (const receiptId of requiredReceiptIds) {
    const receipt = commandReceipts.get(receiptId);
    if (!receipt) {
      if (commandReceiptIds.provided) {
        issues.push(
          `Build Mode readinessGate ${id} requiredReceiptId ${receiptId} references missing commandReceipt.`,
        );
      }
      continue;
    }
    if (receipt.status !== "succeeded") {
      issues.push(
        `Build Mode readinessGate ${id} requiredReceiptId ${receiptId} must reference a succeeded commandReceipt before gate can pass.`,
      );
    }
    if (
      receipt.commandId &&
      commandIds.size > 0 &&
      !commandIds.has(receipt.commandId)
    ) {
      issues.push(
        `Build Mode readinessGate ${id} requiredReceiptId ${receiptId} commandId ${receipt.commandId} must be listed in commandIds before gate can pass.`,
      );
    }
  }

  for (const artifactId of readStringArray(gate.evidenceArtifactIds)) {
    const artifact = evidenceArtifacts.get(artifactId);
    if (!artifact) {
      issues.push(
        `Build Mode readinessGate ${id} evidenceArtifact ${artifactId} is missing before gate can pass.`,
      );
      continue;
    }
    if (
      artifact.receiptId &&
      requiredReceiptIdSet.size > 0 &&
      !requiredReceiptIdSet.has(artifact.receiptId)
    ) {
      issues.push(
        `Build Mode readinessGate ${id} evidenceArtifact ${artifactId} receiptId ${artifact.receiptId} must be listed in requiredReceiptIds before gate can pass.`,
      );
    }
    if (
      artifact.commandId &&
      commandIds.size > 0 &&
      !commandIds.has(artifact.commandId)
    ) {
      issues.push(
        `Build Mode readinessGate ${id} evidenceArtifact ${artifactId} commandId ${artifact.commandId} must be listed in commandIds before gate can pass.`,
      );
    }
  }
};

const validateToolAndAutonomyCapabilityRefs = (
  value: Record<string, unknown>,
  capabilities: CollectedIds,
  agentRuntimeSummary: AgentRuntimeValidationSummary,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const receiptStatusById = collectReceiptStatusById(value, issues);
  for (const permission of readRecordArrayProperty(
    value,
    "toolPermissions",
    issues,
  )) {
    const id = readNonEmptyString(permission.id) ?? "unknown";
    const capabilityId = readNonEmptyString(permission.capabilityId);
    if (capabilityId && capabilities.provided && !capabilities.ids.has(capabilityId)) {
      issues.push(
        `Build Mode toolPermission ${id} references missing capability ${capabilityId}.`,
      );
    }
    validateToolPermissionReceiptProof(
      permission,
      id,
      receipts,
      commandReceipts,
      receiptStatusById,
      issues,
    );
  }
  if (isRecord(value.autonomyPolicy)) {
    validateAutonomyPolicyReceiptProof(
      value.autonomyPolicy,
      receipts,
      commandReceipts,
      receiptStatusById,
      issues,
    );
    if (
      readNonEmptyString(value.autonomyPolicy.mode) === "autonomous-local" &&
      !agentRuntimeSummary.hasAvailableLocalAutonomousRuntime
    ) {
      issues.push(
        "Build Mode autonomyPolicy mode autonomous-local requires an available agentRuntime with handoffPolicy autonomous-local and providerRoute local-model.",
      );
    }
    for (const capabilityId of readStringArray(
      value.autonomyPolicy.allowedCapabilityIds,
    )) {
      if (!capabilities.ids.has(capabilityId)) {
        issues.push(
          `Build Mode autonomyPolicy references missing allowed capability ${capabilityId}.`,
        );
      }
    }
    for (const capabilityId of readStringArray(
      value.autonomyPolicy.approvalRequiredCapabilityIds,
    )) {
      if (!capabilities.ids.has(capabilityId)) {
        issues.push(
          `Build Mode autonomyPolicy references missing approval capability ${capabilityId}.`,
        );
      }
    }
  }
};

const validateAutonomyPolicyReceiptProof = (
  autonomyPolicy: Record<string, unknown>,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const id = readNonEmptyString(autonomyPolicy.id) ?? "unknown";
  const receiptIds = readStringArray(autonomyPolicy.receiptIds);
  validateReceiptReferenceList(
    receiptIds,
    receipts,
    commandReceipts,
    `Build Mode autonomyPolicy ${id}`,
    issues,
  );
  if (autonomyPolicy.receiptRequired !== true) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode autonomyPolicy ${id} requires receipt proof because receiptRequired is true.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode autonomyPolicy ${id} requires receipt status proof because receiptRequired is true.`,
    );
    return;
  }
  if (
    !statuses.some((receiptStatus) =>
      ["approved", "succeeded"].includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode autonomyPolicy ${id} receiptRequired proof requires an approved or succeeded receipt.`,
    );
  }
};

const validateToolPermissionReceiptProof = (
  permission: Record<string, unknown>,
  id: string,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  receiptStatusById: Map<string, string>,
  issues: string[],
): void => {
  if (!receipts.provided && !commandReceipts.provided) {
    return;
  }
  const receiptIds = readStringArray(permission.receiptIds);
  validateReceiptReferenceList(
    receiptIds,
    receipts,
    commandReceipts,
    `Build Mode toolPermission ${id}`,
    issues,
  );
  if (permission.receiptRequired !== true) {
    return;
  }
  if (!receiptIds.length) {
    issues.push(
      `Build Mode toolPermission ${id} requires receipt proof because receiptRequired is true.`,
    );
    return;
  }
  const statuses = receiptIds
    .map((receiptId) => receiptStatusById.get(receiptId))
    .filter((item): item is string => Boolean(item));
  if (!statuses.length) {
    issues.push(
      `Build Mode toolPermission ${id} requires receipt status proof because receiptRequired is true.`,
    );
    return;
  }
  const decision = readNonEmptyString(permission.decision);
  const acceptableStatuses =
    decision === "deny"
      ? ["approved", "succeeded", "failed", "rejected"]
      : ["approved", "succeeded", "approval-required", "running"];
  if (
    !statuses.some((receiptStatus) =>
      acceptableStatuses.includes(receiptStatus),
    )
  ) {
    issues.push(
      `Build Mode toolPermission ${id} receiptRequired proof has no acceptable receipt status for decision ${decision ?? "unknown"}.`,
    );
  }
};

const validateSafeEditAndCheckpointRefs = (
  value: Record<string, unknown>,
  commandCatalog: CollectedIds,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const latestReceiptProofByCommandId =
    collectLatestCommandReceiptProofByCommandId(value, issues);
  const commandReceiptProofs = collectCommandReceiptProofs(value, issues);
  const checkpoints = readRecordArrayProperty(value, "checkpoints", issues);
  for (const plan of readRecordArrayProperty(value, "safeEditPlans", issues)) {
    const id = readNonEmptyString(plan.id) ?? "unknown";
    const commandId = readNonEmptyString(plan.commandId);
    if (
      commandId &&
      commandCatalog.provided &&
      !commandCatalog.ids.has(commandId)
    ) {
      issues.push(
        `Build Mode safeEditPlan ${id} references missing command ${commandId}.`,
      );
    }
    validateSafeEditPlanStatusProof(
      plan,
      id,
      commandId,
      latestReceiptProofByCommandId,
      commandReceiptProofs,
      commandReceipts,
      checkpoints,
      issues,
    );
  }
  for (const checkpoint of checkpoints) {
    const id = readNonEmptyString(checkpoint.id) ?? "unknown";
    const commandId = readNonEmptyString(checkpoint.commandId);
    const rollbackCommandId = readNonEmptyString(checkpoint.rollbackCommandId);
    for (const [field, referencedCommandId] of [
      ["commandId", commandId],
      ["rollbackCommandId", rollbackCommandId],
    ] as const) {
      if (
        referencedCommandId &&
        commandCatalog.provided &&
        !commandCatalog.ids.has(referencedCommandId)
      ) {
        issues.push(
          `Build Mode checkpoint ${id} ${field} references missing command ${referencedCommandId}.`,
        );
      }
    }
    validateCheckpointStatusProof(
      checkpoint,
      id,
      commandId,
      rollbackCommandId,
      latestReceiptProofByCommandId,
      commandReceiptProofs,
      commandReceipts,
      issues,
    );
  }
};

const validateCheckpointStatusProof = (
  checkpoint: Record<string, unknown>,
  id: string,
  commandId: string | undefined,
  rollbackCommandId: string | undefined,
  latestReceiptProofByCommandId: Map<string, CommandReceiptExecutionProof>,
  commandReceiptProofs: Map<string, CommandReceiptProof>,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  const status = readNonEmptyString(checkpoint.status);
  if (
    status !== "created" &&
    status !== "rollback-ready" &&
    status !== "restored" &&
    status !== "failed"
  ) {
    return;
  }

  const checkpointHash = readNonEmptyString(checkpoint.hash);
  const createProof = commandId
    ? latestReceiptProofByCommandId.get(commandId)
    : undefined;
  const rollbackProof = rollbackCommandId
    ? latestReceiptProofByCommandId.get(rollbackCommandId)
    : undefined;
  const createStatus = createProof?.status;
  const rollbackStatus = rollbackProof?.status;
  const expectedReceiptProofs: CommandReceiptExecutionProof[] = [];

  if (status === "created" || status === "rollback-ready") {
    if (commandReceipts.provided && commandId && !createStatus) {
      issues.push(
        `Build Mode checkpoint ${id} status ${status} requires a matching create commandReceipt.`,
      );
    } else if (createStatus && createStatus !== "succeeded") {
      issues.push(
        `Build Mode checkpoint ${id} status ${status} requires latest create commandReceipt to be succeeded.`,
      );
    } else if (createProof) {
      expectedReceiptProofs.push(createProof);
    }
  }

  if (status === "rollback-ready" && !checkpointHash) {
    issues.push(
      `Build Mode checkpoint ${id} status rollback-ready requires a checkpoint hash.`,
    );
  }

  if (status === "restored") {
    if (commandReceipts.provided && rollbackCommandId && !rollbackStatus) {
      issues.push(
        `Build Mode checkpoint ${id} status restored requires a matching rollback commandReceipt.`,
      );
    } else if (rollbackStatus && rollbackStatus !== "succeeded") {
      issues.push(
        `Build Mode checkpoint ${id} status restored requires latest rollback commandReceipt to be succeeded.`,
      );
    } else if (rollbackProof) {
      expectedReceiptProofs.push(rollbackProof);
    }
  }

  if (
    status === "failed" &&
    createStatus !== "failed" &&
    createStatus !== "rejected" &&
    rollbackStatus !== "failed" &&
    rollbackStatus !== "rejected"
  ) {
    issues.push(
      `Build Mode checkpoint ${id} status failed requires a failed or rejected create or rollback commandReceipt.`,
    );
  }
  if (status === "failed") {
    for (const proof of [createProof, rollbackProof]) {
      if (proof && (proof.status === "failed" || proof.status === "rejected")) {
        expectedReceiptProofs.push(proof);
      }
    }
  }

  validateCheckpointNamedReceiptProof(
    checkpoint,
    id,
    status,
    [commandId, rollbackCommandId].filter((item): item is string =>
      Boolean(item),
    ),
    expectedReceiptProofs,
    commandReceiptProofs,
    commandReceipts,
    issues,
  );
};

const validateCheckpointNamedReceiptProof = (
  checkpoint: Record<string, unknown>,
  id: string,
  status: string,
  allowedCommandIds: string[],
  expectedReceiptProofs: CommandReceiptExecutionProof[],
  commandReceiptProofs: Map<string, CommandReceiptProof>,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  if (!commandReceipts.provided) {
    return;
  }
  const receiptIds = readStringArray(checkpoint.receiptIds);
  for (const proof of expectedReceiptProofs) {
    if (proof.id && !receiptIds.includes(proof.id)) {
      issues.push(
        `Build Mode checkpoint ${id} status ${status} requires receiptIds to include latest commandReceipt ${proof.id}.`,
      );
    }
  }
  const allowed = new Set(allowedCommandIds);
  for (const receiptId of receiptIds) {
    if (!commandReceipts.ids.has(receiptId)) {
      continue;
    }
    const receipt = commandReceiptProofs.get(receiptId);
    if (!receipt) {
      issues.push(
        `Build Mode checkpoint ${id} receiptId ${receiptId} references missing commandReceipt.`,
      );
      continue;
    }
    if (receipt.commandId && allowed.size > 0 && !allowed.has(receipt.commandId)) {
      issues.push(
        `Build Mode checkpoint ${id} receiptId ${receiptId} commandId ${receipt.commandId} must match checkpoint command ${allowedCommandIds.join(" or ")}.`,
      );
    }
  }
};

const validateSafeEditPlanStatusProof = (
  plan: Record<string, unknown>,
  id: string,
  commandId: string | undefined,
  latestReceiptProofByCommandId: Map<string, CommandReceiptExecutionProof>,
  commandReceiptProofs: Map<string, CommandReceiptProof>,
  commandReceipts: CollectedIds,
  checkpoints: Record<string, unknown>[],
  issues: string[],
): void => {
  const status = readNonEmptyString(plan.status);
  if (
    status !== "applied" &&
    status !== "blocked" &&
    status !== "approval-required"
  ) {
    return;
  }
  if (!commandId) {
    return;
  }

  const latestProof = latestReceiptProofByCommandId.get(commandId);
  const latestStatus = latestProof?.status;
  if (commandReceipts.provided && !latestStatus) {
    issues.push(
      `Build Mode safeEditPlan ${id} status ${status} requires a matching commandReceipt.`,
    );
    return;
  }
  const receiptIds = readStringArray(plan.receiptIds);
  if (latestProof?.id && !receiptIds.includes(latestProof.id)) {
    issues.push(
      `Build Mode safeEditPlan ${id} status ${status} requires receiptIds to include latest commandReceipt ${latestProof.id}.`,
    );
  }
  validateSafeEditPlanNamedReceiptProof(
    plan,
    id,
    commandId,
    commandReceiptProofs,
    commandReceipts,
    issues,
  );
  if (status === "applied" && latestStatus && latestStatus !== "succeeded") {
    issues.push(
      `Build Mode safeEditPlan ${id} status applied requires latest commandReceipt to be succeeded.`,
    );
  }
  if (status === "applied") {
    validateSafeEditPlanCheckpointCoverage(id, checkpoints, issues);
  }
  if (
    status === "blocked" &&
    latestStatus &&
    latestStatus !== "failed" &&
    latestStatus !== "rejected"
  ) {
    issues.push(
      `Build Mode safeEditPlan ${id} status blocked requires latest commandReceipt to be failed or rejected.`,
    );
  }
  if (
    status === "approval-required" &&
    latestStatus &&
    latestStatus !== "approval-required"
  ) {
    issues.push(
      `Build Mode safeEditPlan ${id} status approval-required requires latest commandReceipt to be approval-required.`,
    );
  }
};

const validateSafeEditPlanCheckpointCoverage = (
  safeEditPlanId: string,
  checkpoints: Record<string, unknown>[],
  issues: string[],
): void => {
  const hasRollbackReadyCheckpoint = checkpoints.some((checkpoint) => {
    if (readNonEmptyString(checkpoint.status) !== "rollback-ready") {
      return false;
    }
    return (
      Boolean(readNonEmptyString(checkpoint.hash)) &&
      readStringArray(checkpoint.receiptIds).length > 0
    );
  });
  if (!hasRollbackReadyCheckpoint) {
    issues.push(
      `Build Mode safeEditPlan ${safeEditPlanId} status applied requires a rollback-ready checkpoint with hash and receipt proof before mutable code changes.`,
    );
  }
};

const validateSafeEditPlanNamedReceiptProof = (
  plan: Record<string, unknown>,
  id: string,
  commandId: string,
  commandReceiptProofs: Map<string, CommandReceiptProof>,
  commandReceipts: CollectedIds,
  issues: string[],
): void => {
  if (!commandReceipts.provided) {
    return;
  }
  for (const receiptId of readStringArray(plan.receiptIds)) {
    const receipt = commandReceiptProofs.get(receiptId);
    if (!receipt) {
      issues.push(
        `Build Mode safeEditPlan ${id} receiptId ${receiptId} references missing commandReceipt.`,
      );
      continue;
    }
    if (receipt.commandId && receipt.commandId !== commandId) {
      issues.push(
        `Build Mode safeEditPlan ${id} receiptId ${receiptId} commandId ${receipt.commandId} must match safe edit command ${commandId}.`,
      );
    }
  }
};

const validateScheduledAutomations = (
  value: Record<string, unknown>,
  commandCatalog: CollectedIds,
  promptProfiles: CollectedIds,
  promptBundles: CollectedIds,
  promptBundleContracts: Map<string, PromptBundleContract>,
  providerRouteRefs: ProviderCredentialRouteRefs,
  issues: string[],
): void => {
  for (const automation of readRecordArrayProperty(
    value,
    "scheduledAutomations",
    issues,
  )) {
    const id = readNonEmptyString(automation.id) ?? "unknown";
    const scheduler = readNonEmptyString(automation.scheduler);
    if (scheduler && scheduler !== "valkyrai-cron") {
      issues.push(
        `Build Mode scheduledAutomation ${id} must use scheduler valkyrai-cron.`,
      );
    }
    const commandRef = readNonEmptyString(automation.commandRef);
    if (
      commandRef &&
      commandCatalog.provided &&
      !commandCatalog.ids.has(commandRef)
    ) {
      issues.push(
        `Build Mode scheduledAutomation ${id} references missing commandRef ${commandRef}.`,
      );
    }
    const providerRoute = readNonEmptyString(automation.providerRoute);
    if (providerRoute) {
      validateProviderRouteRef(
        providerRoute,
        `scheduledAutomation ${id}`,
        providerRouteRefs,
        issues,
      );
    }
    if (isRecord(automation.promptContext)) {
      validatePromptExecutionContext(
        automation.promptContext,
        `scheduledAutomation ${id}`,
        promptProfiles,
        promptBundles,
        promptBundleContracts,
        issues,
      );
    }
  }
};

const validateReceiptRefs = (
  value: Record<string, unknown>,
  commandCatalog: CollectedIds,
  capabilities: CollectedIds,
  receipts: CollectedIds,
  commandReceipts: CollectedIds,
  evidenceArtifacts: CollectedIds,
  promptProfiles: CollectedIds,
  promptBundles: CollectedIds,
  promptBundleContracts: Map<string, PromptBundleContract>,
  now: Date,
  issues: string[],
): void => {
  const commandReceiptCommandIds = collectCommandReceiptCommandIds(
    value,
    issues,
  );
  const commandContracts = collectCommandContracts(value, issues);
  const commandReceiptProofs = collectCommandReceiptProofs(value, issues);
  const latestCommandReceiptProofs =
    collectLatestCommandReceiptProofByCommandId(value, issues);
  const evidenceArtifactProofs = collectEvidenceArtifactProofs(value, issues);
  for (const receipt of readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  )) {
    const id = readNonEmptyString(receipt.id) ?? "unknown";
    const commandId = readNonEmptyString(receipt.commandId);
    if (
      commandId &&
      commandCatalog.provided &&
      !commandCatalog.ids.has(commandId)
    ) {
      issues.push(
        `Build Mode commandReceipt ${id} references missing command ${commandId}.`,
      );
    }
    const capabilityId = readNonEmptyString(receipt.capabilityId);
    if (
      capabilityId &&
      capabilities.provided &&
      !capabilities.ids.has(capabilityId)
    ) {
      issues.push(
        `Build Mode commandReceipt ${id} references missing capability ${capabilityId}.`,
      );
    }
    validateCommandReceiptCommandIdentity(
      receipt,
      id,
      commandId ? commandContracts.get(commandId) : undefined,
      issues,
    );
    if (isRecord(receipt.promptContext)) {
      validatePromptExecutionContext(
        receipt.promptContext,
        `commandReceipt ${id}`,
        promptProfiles,
        promptBundles,
        promptBundleContracts,
        issues,
      );
    }
    if (isRecord(receipt.grayMatterContextProof)) {
      validateGrayMatterContextProof(
        receipt.grayMatterContextProof,
        `commandReceipt ${id}`,
        value,
        issues,
      );
    }
    validateMajorCommandGrayMatterContextProof(
      receipt,
      id,
      commandId ? commandContracts.get(commandId) : undefined,
      value,
      issues,
    );
    if (isRecord(receipt.scope)) {
      validateCommandReceiptScopeProof(receipt.scope, id, value, issues);
    }
    validateCommandReceiptPolicyClaim(
      receipt,
      id,
      commandContracts,
      value,
      now,
      issues,
    );
    if (isRecord(receipt.creditUsageReceipt)) {
      const nestedCreditUsageId =
        readNonEmptyString(receipt.creditUsageReceipt.id) ??
        `${id}.creditUsageReceipt`;
      validateCreditUsageReceiptCommandProof(
        receipt.creditUsageReceipt,
        nestedCreditUsageId,
        latestCommandReceiptProofs,
        issues,
      );
      validateCreditUsageReceiptAmounts(
        receipt.creditUsageReceipt,
        nestedCreditUsageId,
        readNonEmptyString(receipt.creditUsageReceipt.providerRoute),
        readFiniteNumber(receipt.creditUsageReceipt.actualCredits),
        readFiniteNumber(receipt.creditUsageReceipt.providerCredits),
        readFiniteNumber(receipt.creditUsageReceipt.hostedInfrastructureCredits),
        issues,
      );
    }
    validateEvidenceArtifactIntegrityMetadata(
      readRecordArrayProperty(receipt, "artifacts", issues),
      `commandReceipt ${id} artifact`,
      issues,
    );
    validateCommandReceiptArtifactRefs(receipt, id, commandId, issues);
    validateCommandReceiptApprovalProof(receipt, id, value, now, issues);
    validateConnectorReceiptProof(receipt, id, value, issues);
    validateWorkflowExecutionReceiptProof(receipt, id, value, issues);
    validateAutomationScheduleReceiptProof(receipt, id, value, issues);
    validateCheckpointReceiptProof(receipt, id, value, issues);
    validateSwarmCommandReceiptProof(receipt, id, value, issues);
    validateMcpToolReceiptProof(receipt, id, value, issues);
    validateGrayMatterMemoryReceiptProof(receipt, id, value, issues);
    validateBrowserAutomationReceiptProof(receipt, id, value, issues);
    validateFileWriteReceiptProof(receipt, id, value, issues);
    validateFileReadReceiptProof(receipt, id, value, issues);
    validateDeployReceiptProof(
      receipt,
      id,
      commandId ? commandContracts.get(commandId) : undefined,
      value,
      issues,
    );
    validateTerminalExecutionReceiptProof(receipt, id, value, issues);
  }
  for (const artifact of readRecordArrayProperty(
    value,
    "evidenceArtifacts",
    issues,
  )) {
    const id = readNonEmptyString(artifact.id) ?? "unknown";
    validateEvidenceArtifactIntegrityMetadata(
      [artifact],
      "evidenceArtifact",
      issues,
    );
    const commandId = readNonEmptyString(artifact.commandId);
    if (
      commandId &&
      commandCatalog.provided &&
      !commandCatalog.ids.has(commandId)
    ) {
      issues.push(
        `Build Mode evidenceArtifact ${id} references missing command ${commandId}.`,
      );
    }
    const receiptId = readNonEmptyString(artifact.receiptId);
    if (
      receiptId &&
      (receipts.provided || commandReceipts.provided) &&
      !receipts.ids.has(receiptId) &&
      !commandReceipts.ids.has(receiptId)
    ) {
      issues.push(
        `Build Mode evidenceArtifact ${id} references missing receipt ${receiptId}.`,
      );
    }
    const receiptCommandId = receiptId
      ? commandReceiptCommandIds.get(receiptId)
      : undefined;
    if (commandId && receiptCommandId && commandId !== receiptCommandId) {
      issues.push(
        `Build Mode evidenceArtifact ${id} commandId ${commandId} does not match commandReceipt ${receiptId} commandId ${receiptCommandId}.`,
      );
    }
  }
  for (const creditReceipt of readRecordArrayProperty(
    value,
    "creditUsageReceipts",
    issues,
  )) {
    const id = readNonEmptyString(creditReceipt.id) ?? "unknown";
    const commandId = readNonEmptyString(creditReceipt.commandId);
    if (
      commandId &&
      commandCatalog.provided &&
      !commandCatalog.ids.has(commandId)
    ) {
      issues.push(
        `Build Mode creditUsageReceipt ${id} references missing command ${commandId}.`,
      );
    }
    const capabilityId = readNonEmptyString(creditReceipt.capabilityId);
    if (
      capabilityId &&
      capabilities.provided &&
      !capabilities.ids.has(capabilityId)
    ) {
      issues.push(
        `Build Mode creditUsageReceipt ${id} references missing capability ${capabilityId}.`,
      );
    }
    const providerRoute = readNonEmptyString(creditReceipt.providerRoute);
    if (providerRoute && !providerRoutes.has(providerRoute as ProviderRoute)) {
      issues.push(
        `Build Mode creditUsageReceipt ${id} has unsupported providerRoute.`,
      );
    }
  }
  if (isRecord(value.browserVerification)) {
    for (const artifactId of readStringArray(
      value.browserVerification.artifactIds,
    )) {
      if (
        evidenceArtifacts.provided &&
        !evidenceArtifacts.ids.has(artifactId)
      ) {
        issues.push(
          `Build Mode browserVerification references missing evidenceArtifact ${artifactId}.`,
        );
      }
    }
    validateBrowserVerificationProof(
      value.browserVerification,
      evidenceArtifactProofs,
      commandReceiptProofs,
      issues,
    );
  }
};

const validateConnectorReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "connector.read" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  validateConnectorReadReceiptCommandAction(id, commandId, payload, issues);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasReceiptProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "connector_data") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    return (
      readNonEmptyString(metadata.status) === "authorized" &&
      Boolean(readNonEmptyString(metadata.receiptRef))
    );
  });

  if (!hasReceiptProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded connector.read requires connector_data artifact metadata with status authorized and receiptRef.`,
    );
  }
};

const validateConnectorReadReceiptCommandAction = (
  receiptId: string,
  commandId: string | undefined,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (!commandId) {
    return;
  }
  const command = readRecordArrayProperty(payload, "commands", issues).find(
    (candidate) => readNonEmptyString(candidate.id) === commandId,
  );
  const commandText = readNonEmptyString(command?.command);
  if (!commandText) {
    return;
  }
  const action = commandText
    .match(/^connector:[A-Za-z0-9_-]+\.(?<action>[A-Za-z0-9_-]+)/i)
    ?.groups?.action?.toLowerCase();
  if (!action || connectorReadActions.has(action)) {
    return;
  }
  issues.push(
    `Build Mode commandReceipt ${receiptId} succeeded connector.read command ${commandId} uses mutation action ${action}; connector.read only supports get, list, read, or search.`,
  );
};

const validateWorkflowExecutionReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "workflow.execute" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const command = commandId
    ? readRecordArrayProperty(payload, "commands", issues).find(
        (candidate) => readNonEmptyString(candidate.id) === commandId,
      )
    : undefined;
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  let hasBaseWorkflowReceiptProof = false;
  const sensitiveWorkflowIssues = new Set<string>();
  const hasWorkflowReceiptProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "workflow_receipt") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const hasBaseProof =
      Boolean(readNonEmptyString(metadata.receiptRef)) &&
      Boolean(readNonEmptyString(metadata.workflowRef)) &&
      Boolean(
        readNonEmptyString(metadata.executionId) ||
          readNonEmptyString(metadata.traceId),
      );
    if (!hasBaseProof) {
      return false;
    }
    hasBaseWorkflowReceiptProof = true;
    const sensitiveProofIssues = validateSensitiveWorkflowReceiptProof(
      receipt,
      id,
      command,
      metadata,
    );
    for (const issue of sensitiveProofIssues) {
      sensitiveWorkflowIssues.add(issue);
    }
    return sensitiveProofIssues.length === 0;
  });

  if (!hasWorkflowReceiptProof) {
    if (hasBaseWorkflowReceiptProof && sensitiveWorkflowIssues.size > 0) {
      issues.push(...sensitiveWorkflowIssues);
    } else {
      issues.push(
        `Build Mode commandReceipt ${id} succeeded workflow.execute requires workflow_receipt artifact metadata with receiptRef, workflowRef, and executionId or traceId.`,
      );
    }
  }
};

const validateSensitiveWorkflowReceiptProof = (
  receipt: Record<string, unknown>,
  receiptId: string,
  command: Record<string, unknown> | undefined,
  metadata: Record<string, unknown>,
): string[] => {
  const issues: string[] = [];
  const declaredClasses = readSensitiveWorkflowActionClasses(
    metadata.sensitiveActionClasses,
  );
  for (const actionClass of declaredClasses) {
    if (!sensitiveWorkflowActionClasses.has(actionClass)) {
      issues.push(
        `Build Mode commandReceipt ${receiptId} workflow_receipt sensitiveActionClasses contains unsupported class ${actionClass}.`,
      );
    }
  }

  const inferredClasses = inferSensitiveWorkflowActionClasses(
    command,
    metadata,
  );
  const declaredClassSet = new Set(declaredClasses);
  for (const actionClass of inferredClasses) {
    if (!declaredClassSet.has(actionClass)) {
      issues.push(
        `Build Mode commandReceipt ${receiptId} sensitive workflow ${actionClass} requires workflow_receipt metadata sensitiveActionClasses to declare ${actionClass}.`,
      );
    }
  }

  const sensitiveClasses = new Set([...declaredClasses, ...inferredClasses]);
  if (sensitiveClasses.size > 0 && !receiptHasOwnerApproval(receipt)) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} sensitive workflow ${Array.from(
        sensitiveClasses,
      ).join(", ")} requires owner approval proof before succeeded status.`,
    );
  }
  return issues;
};

const readSensitiveWorkflowActionClasses = (value: unknown): string[] => {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return rawValues
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const inferSensitiveWorkflowActionClasses = (
  command: Record<string, unknown> | undefined,
  metadata: Record<string, unknown>,
): string[] => {
  const text = normalizeSensitiveWorkflowText(
    [
      readNonEmptyString(command?.command),
      readNonEmptyString(command?.label),
      readNonEmptyString(metadata.workflowRef),
      readNonEmptyString(metadata.serverName),
      readNonEmptyString(metadata.toolName),
      readNonEmptyString(metadata.summary),
    ]
      .filter((item): item is string => Boolean(item))
      .join(" "),
  );
  const classes: string[] = [];
  if (/\b(?:stripe|billing|invoice|refund|charge|payment|subscription)\b/.test(text)) {
    classes.push("billing-mutation");
  }
  if (
    /\b(?:(?:gmail|sendgrid|mailgun|smtp|email|mail)\b.*\b(?:send|deliver|compose|reply|forward)|(?:send|deliver|compose|reply|forward)\b.*\b(?:gmail|sendgrid|mailgun|smtp|email|mail))\b/.test(
      text,
    )
  ) {
    classes.push("email-send");
  }
  if (
    /\b(?:(?:mcp)\b.*\b(?:publish|register|expose|public)|(?:publish|register|expose|public)\b.*\bmcp\b)\b/.test(
      text,
    )
  ) {
    classes.push("public-mcp-publication");
  }
  if (
    /\b(?:deploy\b.*\b(?:prod|production)\b|(?:prod|production)\b.*\bdeploy)\b/.test(
      text,
    )
  ) {
    classes.push("production-deploy");
  }
  if (/\b(?:destroy|truncate|drop|purge)\b/.test(text)) {
    classes.push("destructive-operation");
  }
  return Array.from(new Set(classes));
};

const normalizeSensitiveWorkflowText = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const receiptHasOwnerApproval = (receipt: Record<string, unknown>): boolean => {
  const approval = isRecord(receipt.approval) ? receipt.approval : undefined;
  const requiredThreshold = readApprovalThreshold(
    receipt.requiredApprovalThreshold,
  );
  const approvalThreshold = readApprovalThreshold(approval?.threshold);
  return (
    receipt.approved === true &&
    approval?.approved === true &&
    requiredThreshold !== undefined &&
    approvalThreshold !== undefined &&
    approvalThresholdRank[requiredThreshold] >= approvalThresholdRank.owner &&
    approvalThresholdRank[approvalThreshold] >= approvalThresholdRank.owner &&
    approvalRolesCoverThreshold(readStringArray(approval.approverRoles), "owner")
  );
};

const validateAutomationScheduleReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "automation.schedule" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasValkyraiCronProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "workflow_receipt") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    return (
      readNonEmptyString(metadata.scheduler) === "valkyrai-cron" &&
      readNonEmptyString(metadata.schedulerSource) ===
        "valkyrai-cron-workflow-launcher" &&
      Boolean(readNonEmptyString(metadata.scheduleId)) &&
      Boolean(readNonEmptyString(metadata.workflowRef))
    );
  });

  if (!hasValkyraiCronProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded automation.schedule requires workflow_receipt artifact metadata proving valkyrai-cron scheduler, valkyrai-cron-workflow-launcher source, scheduleId, and workflowRef.`,
    );
  }
};

const validateCheckpointReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "checkpoint.manage" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasCheckpointProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "checkpoint") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const checkpointAction = readNonEmptyString(metadata.checkpointAction);
    return (
      (checkpointAction === "create" || checkpointAction === "rollback") &&
      Boolean(readNonEmptyString(metadata.checkpointRef)) &&
      Boolean(readNonEmptyString(metadata.checkpointHash))
    );
  });

  if (!hasCheckpointProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded checkpoint.manage requires checkpoint artifact metadata with checkpointAction, checkpointRef, and checkpointHash proof.`,
    );
  }
};

const validateSwarmCommandReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "swarm.command" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const assignedRuntimeId = readNonEmptyString(receipt.assignedRuntimeId);
  const assignedSwarmRole = readNonEmptyString(receipt.assignedSwarmRole);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasSwarmProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "swarm_handoff") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const runtimeId = readNonEmptyString(metadata.runtimeId);
    const swarmRole = readNonEmptyString(metadata.swarmRole);
    return (
      readNonEmptyString(metadata.status) === "accepted" &&
      Boolean(readNonEmptyString(metadata.handoffId)) &&
      Boolean(runtimeId) &&
      Boolean(swarmRole) &&
      (!assignedRuntimeId || runtimeId === assignedRuntimeId) &&
      (!assignedSwarmRole || swarmRole === assignedSwarmRole)
    );
  });

  if (!hasSwarmProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded swarm.command requires swarm_handoff artifact metadata with status accepted, handoffId, runtimeId, and swarmRole matching the assigned receipt proof.`,
    );
  }
};

const validateMcpToolReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "mcp.tool" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasMcpProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "mcp_result") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    return (
      Boolean(readNonEmptyString(metadata.serverName)) &&
      Boolean(readNonEmptyString(metadata.toolName)) &&
      (Boolean(readNonEmptyString(metadata.status)) ||
        Boolean(readNonEmptyString(metadata.executionId)) ||
        Boolean(readNonEmptyString(metadata.traceId)) ||
        (readFiniteNumber(metadata.resourceCount) ?? 0) > 0)
    );
  });

  if (!hasMcpProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded mcp.tool requires mcp_result artifact metadata with serverName, toolName, and status, executionId, traceId, or resourceCount proof.`,
    );
  }
};

const validateGrayMatterMemoryReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "graymatter.memory" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasFinalReportMemoryProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "final_report") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const memoryStatus = readNonEmptyString(metadata.memoryStatus);
    return (
      (memoryStatus === "queued" || memoryStatus === "written") &&
      hasArtifactIntegrityProof(metadata) &&
      (memoryStatus !== "written" ||
        Boolean(readNonEmptyString(metadata.memoryId)))
    );
  });
  const hasGrayMatterContextProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "graymatter_context") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    return (
      Boolean(readNonEmptyString(metadata.contextPackId)) &&
      Boolean(readNonEmptyString(metadata.retrievalStatus)) &&
      Boolean(readNonEmptyString(metadata.invariantPreflightStatus)) &&
      readFiniteNumber(metadata.retrievalReceiptCount) !== undefined &&
      hasArtifactIntegrityProof(metadata)
    );
  });

  if (!hasFinalReportMemoryProof && !hasGrayMatterContextProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded graymatter.memory requires final_report artifact metadata with memoryStatus queued or written, sha256 contentHash, positive byteSize, and memoryId when written, or graymatter_context artifact metadata with contextPackId, retrievalStatus, invariantPreflightStatus, retrievalReceiptCount, sha256 contentHash, and positive byteSize proof.`,
    );
  }
};

const validateBrowserAutomationReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "browser.automation" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const expectedPreviewUrl = getExpectedBrowserPreviewUrl(payload);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasScreenshotProof = candidateArtifacts.some((artifact) => {
    if (!hasArtifactReceiptIdentity(artifact, id, commandId)) {
      return false;
    }
    if (readNonEmptyString(artifact.kind) !== "browser_screenshot") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    return (
      metadata.screenshotCaptured === true &&
      hasArtifactIntegrityProof(metadata) &&
      hasExpectedBrowserCurrentUrl(metadata, expectedPreviewUrl)
    );
  });
  const hasConsoleProof = candidateArtifacts.some((artifact) => {
    if (!hasArtifactReceiptIdentity(artifact, id, commandId)) {
      return false;
    }
    if (readNonEmptyString(artifact.kind) !== "browser_console") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    return (
      readFiniteNumber(metadata.consoleErrorCount) === 0 &&
      hasArtifactIntegrityProof(metadata) &&
      hasExpectedBrowserCurrentUrl(metadata, expectedPreviewUrl)
    );
  });

  if (!hasScreenshotProof || !hasConsoleProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded browser.automation requires browser_screenshot metadata with screenshotCaptured true plus sha256 contentHash and positive byteSize, and browser_console metadata with consoleErrorCount 0 plus sha256 contentHash and positive byteSize proof.`,
    );
  }
};

const getExpectedBrowserPreviewUrl = (
  payload: Record<string, unknown>,
): string | undefined => {
  const browserVerification = isRecord(payload.browserVerification)
    ? payload.browserVerification
    : undefined;
  return normalizeBrowserProofUrl(
    readNonEmptyString(browserVerification?.previewUrl),
  );
};

const hasExpectedBrowserCurrentUrl = (
  metadata: Record<string, unknown>,
  expectedPreviewUrl: string | undefined,
): boolean => {
  if (!expectedPreviewUrl) {
    return true;
  }
  return normalizeBrowserProofUrl(readNonEmptyString(metadata.currentUrl)) ===
    expectedPreviewUrl;
};

const normalizeBrowserProofUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    if (parsed.pathname.length > 1) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return url.replace(/#.*$/, "").replace(/\/+$/, "");
  }
};

const hasArtifactReceiptIdentity = (
  artifact: Record<string, unknown>,
  receiptId: string,
  commandId: string | undefined,
): boolean =>
  readNonEmptyString(artifact.receiptId) === receiptId &&
  Boolean(commandId) &&
  readNonEmptyString(artifact.commandId) === commandId;

const validateFileWriteReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  const capabilityId = readNonEmptyString(receipt.capabilityId);
  if (
    (capabilityId !== "psr.edit" && capabilityId !== "filesystem.write") ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const generatedArtifactPaths = collectGeneratedArtifactPaths(payload, issues);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasFileWriteProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "file_write") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const filePath = readNonEmptyString(metadata.filePath);
    if (
      filePath &&
      isGeneratedArtifactWritePath(filePath, generatedArtifactPaths)
    ) {
      issues.push(
        `Build Mode commandReceipt ${id} succeeded ${capabilityId} cannot claim file_write proof for generated artifact ${filePath}; update OpenAPI/VAIX inputs and regenerate instead.`,
      );
      return false;
    }
    const editsApplied = readFiniteNumber(metadata.editsApplied);
    const editsRequested = readFiniteNumber(metadata.editsRequested);
    return (
      Boolean(filePath) &&
      Boolean(readNonEmptyString(metadata.postHash)) &&
      editsApplied !== undefined &&
      editsRequested !== undefined &&
      editsApplied > 0 &&
      editsRequested >= editsApplied
    );
  });

  if (!hasFileWriteProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded ${capabilityId} requires file_write artifact metadata with filePath, postHash, editsApplied, and editsRequested proof.`,
    );
  }
};

const collectGeneratedArtifactPaths = (
  payload: Record<string, unknown>,
  issues: string[],
): string[] => {
  const paths: string[] = [];
  const appBundle = isRecord(payload.appBundle) ? payload.appBundle : undefined;
  for (const artifact of readRecordArrayProperty(
    appBundle ?? {},
    "artifacts",
    issues,
  )) {
    if (readNonEmptyString(artifact.kind) === "generated") {
      const artifactPath = readNonEmptyString(artifact.path);
      if (artifactPath) {
        paths.push(artifactPath);
      }
    }
  }
  for (const bundle of readRecordArrayProperty(
    payload,
    "componentBundles",
    issues,
  )) {
    paths.push(...readStringArray(bundle.generatedPaths));
  }
  for (const binding of readRecordArrayProperty(
    payload,
    "thorApiVaixBindings",
    issues,
  )) {
    paths.push(...readStringArray(binding.generatedPaths));
  }
  return Array.from(new Set(paths.map(normalizeArtifactPath).filter(Boolean)));
};

const isGeneratedArtifactWritePath = (
  filePath: string,
  generatedArtifactPaths: string[],
): boolean => {
  const normalizedPath = normalizeArtifactPath(filePath);
  return (
    isGeneratedThorApiArtifactPath(normalizedPath) ||
    generatedArtifactPaths.some((generatedPath) =>
      pathMatchesArtifactPath(normalizedPath, generatedPath),
    )
  );
};

const normalizeArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");

const pathMatchesArtifactPath = (
  targetPath: string,
  artifactPath: string,
): boolean =>
  targetPath === artifactPath ||
  targetPath.endsWith(`/${artifactPath}`) ||
  artifactPath.endsWith(`/${targetPath}`);

const isGeneratedThorApiArtifactPath = (value: string): boolean => {
  const normalized = normalizeArtifactPath(value).toLowerCase();
  return (
    normalized.includes("/thorapi/") ||
    normalized.startsWith("thorapi/") ||
    normalized.includes("/src/thorapi/") ||
    normalized.includes("/generated/thorapi/") ||
    normalized.includes("/generated/") ||
    normalized.startsWith("generated/") ||
    normalized.includes("/__generated__/") ||
    normalized.startsWith("__generated__/") ||
    normalized.includes("/src/generated/") ||
    normalized.startsWith("src/generated/") ||
    /(?:^|\/)generated\.[cm]?[jt]sx?$/.test(normalized) ||
    normalized.includes("/src/shared/proto/") ||
    normalized.startsWith("src/shared/proto/")
  );
};

const validateFileReadReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "filesystem.read" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasFileReadProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "command_stdout") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const byteSize = readFiniteNumber(metadata.byteSize);
    return (
      Boolean(readNonEmptyString(metadata.filePath)) &&
      Boolean(readNonEmptyString(metadata.contentHash)) &&
      byteSize !== undefined &&
      byteSize >= 0
    );
  });

  if (!hasFileReadProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded filesystem.read requires command_stdout artifact metadata with filePath, contentHash, and byteSize proof.`,
    );
  }
};

const validateDeployReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  command: BuildModeCommand | undefined,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    command?.kind !== "deploy" ||
    readNonEmptyString(receipt.capabilityId) !== "terminal.execute" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasDeployProof = candidateArtifacts.some((artifact) => {
    if (!hasArtifactReceiptIdentity(artifact, id, commandId)) {
      return false;
    }
    if (readNonEmptyString(artifact.kind) !== "command_stdout") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    return (
      metadata.deployDraft === true &&
      Boolean(readNonEmptyString(metadata.deployId)) &&
      Boolean(readNonEmptyString(metadata.deployTarget)) &&
      Boolean(readNonEmptyString(metadata.deployEnvironment)) &&
      readFiniteNumber(metadata.exitCode) === 0 &&
      hasArtifactIntegrityProof(metadata)
    );
  });

  if (!hasDeployProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded deploy command ${command.id} requires command_stdout artifact metadata proving deployDraft true, deployId, deployTarget, deployEnvironment, exitCode 0, sha256 contentHash, and positive byteSize.`,
    );
  }
};

const validateTerminalExecutionReceiptProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (
    readNonEmptyString(receipt.capabilityId) !== "terminal.execute" ||
    readNonEmptyString(receipt.status) !== "succeeded"
  ) {
    return;
  }

  const commandId = readNonEmptyString(receipt.commandId);
  const expectedCommandHash = getExpectedTerminalCommandHash(payload, commandId);
  const candidateArtifacts = [
    ...readRecordArrayProperty(receipt, "artifacts", issues),
    ...readRecordArrayProperty(payload, "evidenceArtifacts", issues).filter(
      (artifact) =>
        readNonEmptyString(artifact.receiptId) === id &&
        (!commandId || readNonEmptyString(artifact.commandId) === commandId),
    ),
  ];
  const hasTerminalProof = candidateArtifacts.some((artifact) => {
    if (readNonEmptyString(artifact.kind) !== "command_stdout") {
      return false;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const commandHash = readNonEmptyString(metadata.commandHash);
    return (
      metadata.completed === true &&
      readFiniteNumber(metadata.exitCode) === 0 &&
      (!expectedCommandHash || commandHash === expectedCommandHash) &&
      hasArtifactIntegrityProof(metadata)
    );
  });

  if (!hasTerminalProof) {
    issues.push(
      `Build Mode commandReceipt ${id} succeeded terminal.execute requires command_stdout artifact metadata with completed true, exitCode 0, matching commandHash, sha256 contentHash, and positive byteSize proof.`,
    );
  }
};

const getExpectedTerminalCommandHash = (
  payload: Record<string, unknown>,
  commandId: string | undefined,
): string | undefined => {
  if (!commandId) {
    return undefined;
  }
  const command = readRecordArrayProperty(payload, "commands", []).find(
    (candidate) => readNonEmptyString(candidate.id) === commandId,
  );
  const commandText = readNonEmptyString(command?.command);
  if (!commandText) {
    return undefined;
  }
  return createBuildModeCommandHash(redactCommandSecrets(commandText));
};

const createBuildModeCommandHash = (commandText: string): string =>
  `sha256:${crypto.createHash("sha256").update(commandText).digest("hex")}`;

const collectCommandReceiptCommandIds = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, string> => {
  const commandReceiptCommandIds = new Map<string, string>();
  for (const receipt of readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  )) {
    const id = readNonEmptyString(receipt.id);
    const commandId = readNonEmptyString(receipt.commandId);
    if (id && commandId) {
      commandReceiptCommandIds.set(id, commandId);
    }
  }
  return commandReceiptCommandIds;
};

const validateCommandReceiptArtifactRefs = (
  receipt: Record<string, unknown>,
  receiptId: string,
  receiptCommandId: string | undefined,
  issues: string[],
): void => {
  for (const artifact of readRecordArrayProperty(
    receipt,
    "artifacts",
    issues,
  )) {
    const artifactId = readNonEmptyString(artifact.id) ?? "unknown";
    const artifactCommandId = readNonEmptyString(artifact.commandId);
    if (
      artifactCommandId &&
      receiptCommandId &&
      artifactCommandId !== receiptCommandId
    ) {
      issues.push(
        `Build Mode commandReceipt ${receiptId} artifact ${artifactId} commandId ${artifactCommandId} does not match receipt commandId ${receiptCommandId}.`,
      );
    }
    const artifactReceiptId = readNonEmptyString(artifact.receiptId);
    if (artifactReceiptId && artifactReceiptId !== receiptId) {
      issues.push(
        `Build Mode commandReceipt ${receiptId} artifact ${artifactId} receiptId ${artifactReceiptId} does not match containing receipt.`,
      );
    }
  }
};

type CommandReceiptProof = {
  capabilityId?: string;
  commandId?: string;
  status?: string;
};

const collectCommandReceiptProofs = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, CommandReceiptProof> => {
  const proofs = new Map<string, CommandReceiptProof>();
  for (const receipt of readRecordArrayProperty(
    value,
    "commandReceipts",
    issues,
  )) {
    const id = readNonEmptyString(receipt.id);
    if (!id) {
      continue;
    }
    proofs.set(id, {
      capabilityId: readNonEmptyString(receipt.capabilityId),
      commandId: readNonEmptyString(receipt.commandId),
      status: readNonEmptyString(receipt.status),
    });
  }
  return proofs;
};

type EvidenceArtifactProof = {
  commandId?: string;
  kind?: string;
  metadata?: Record<string, unknown>;
  receiptId?: string;
};

const collectEvidenceArtifactProofs = (
  value: Record<string, unknown>,
  issues: string[],
): Map<string, EvidenceArtifactProof> => {
  const proofs = new Map<string, EvidenceArtifactProof>();
  for (const artifact of readRecordArrayProperty(
    value,
    "evidenceArtifacts",
    issues,
  )) {
    const id = readNonEmptyString(artifact.id);
    if (!id) {
      continue;
    }
    proofs.set(id, {
      commandId: readNonEmptyString(artifact.commandId),
      kind: readNonEmptyString(artifact.kind),
      metadata: isRecord(artifact.metadata) ? artifact.metadata : undefined,
      receiptId: readNonEmptyString(artifact.receiptId),
    });
  }
  return proofs;
};

const requiredPassedBrowserArtifactKinds = [
  "browser_screenshot",
  "browser_console",
] as const;

const validateBrowserVerificationProof = (
  browserVerification: Record<string, unknown>,
  evidenceArtifacts: Map<string, EvidenceArtifactProof>,
  commandReceipts: Map<string, CommandReceiptProof>,
  issues: string[],
): void => {
  if (readNonEmptyString(browserVerification.status) !== "passed") {
    return;
  }

  const artifactIds = readStringArray(browserVerification.artifactIds);
  const artifactProofs = artifactIds
    .map((artifactId) => ({
      id: artifactId,
      proof: evidenceArtifacts.get(artifactId),
    }))
    .filter((entry): entry is { id: string; proof: EvidenceArtifactProof } =>
      Boolean(entry.proof),
    );
  const screenshotReceiptId = readNonEmptyString(
    browserVerification.screenshotReceiptId,
  );
  const expectedPreviewUrl = normalizeBrowserProofUrl(
    readNonEmptyString(browserVerification.previewUrl),
  );
  if (!screenshotReceiptId) {
    issues.push(
      "Build Mode browserVerification passed state requires a screenshotReceiptId.",
    );
  }
  if ((readFiniteNumber(browserVerification.consoleErrorCount) ?? 0) > 0) {
    issues.push(
      "Build Mode browserVerification passed state requires consoleErrorCount 0.",
    );
  }

  for (const requiredKind of requiredPassedBrowserArtifactKinds) {
    const artifact = artifactProofs.find(
      (entry) => entry.proof.kind === requiredKind,
    );
    if (!artifact) {
      issues.push(
        `Build Mode browserVerification passed state requires ${requiredKind} evidenceArtifact proof.`,
      );
      continue;
    }
    validatePassedBrowserArtifactProof(
      artifact.id,
      artifact.proof,
      commandReceipts,
      expectedPreviewUrl,
      issues,
    );
    if (
      screenshotReceiptId &&
      artifact.proof.receiptId !== screenshotReceiptId
    ) {
      issues.push(
        `Build Mode browserVerification screenshotReceiptId ${screenshotReceiptId} must match ${requiredKind} evidenceArtifact ${artifact.id} receiptId ${artifact.proof.receiptId ?? "missing"}.`,
      );
    }
  }
};

const validatePassedBrowserArtifactProof = (
  artifactId: string,
  artifact: EvidenceArtifactProof,
  commandReceipts: Map<string, CommandReceiptProof>,
  expectedPreviewUrl: string | undefined,
  issues: string[],
): void => {
  if (!artifact.receiptId) {
    issues.push(
      `Build Mode browserVerification evidenceArtifact ${artifactId} requires a receiptId from a browser.automation commandReceipt.`,
    );
    return;
  }
  const receipt = commandReceipts.get(artifact.receiptId);
  if (!receipt) {
    return;
  }
  if (receipt.capabilityId !== "browser.automation") {
    issues.push(
      `Build Mode browserVerification evidenceArtifact ${artifactId} receipt ${artifact.receiptId} must use capability browser.automation.`,
    );
  }
  if (receipt.status !== "succeeded") {
    issues.push(
      `Build Mode browserVerification evidenceArtifact ${artifactId} receipt ${artifact.receiptId} must be succeeded before browserVerification can pass.`,
    );
  }
  if (!hasArtifactIntegrityProof(artifact.metadata ?? {})) {
    issues.push(
      `Build Mode browserVerification evidenceArtifact ${artifactId} requires sha256 contentHash and positive byteSize metadata.`,
    );
  }
  if (!hasExpectedBrowserCurrentUrl(artifact.metadata ?? {}, expectedPreviewUrl)) {
    issues.push(
      `Build Mode browserVerification evidenceArtifact ${artifactId} currentUrl must match previewUrl before browserVerification can pass.`,
    );
  }
};

const isHistoricalCommandReceiptForExecutionPlanStep = (
  commandId: string,
  receiptStatus: string,
  payload: Record<string, unknown>,
  issues: string[],
): boolean => {
  const step = readRecordArrayProperty(payload, "executionPlan", issues).find(
    (candidate) => readStringArray(candidate.commandIds).includes(commandId),
  );
  const stepStatus = readNonEmptyString(step?.status);
  return (
    (receiptStatus === "succeeded" && stepStatus === "complete") ||
    ((receiptStatus === "failed" || receiptStatus === "rejected") &&
      (stepStatus === "failed" || stepStatus === "blocked")) ||
    (receiptStatus === "approval-required" &&
      stepStatus === "approval-required")
  );
};

const isRunningOwnershipReceiptPolicyReason = (
  reason: string,
  receipt: Record<string, unknown>,
  status: string | undefined,
): boolean => {
  if (status !== "running") {
    return false;
  }
  const assignedRuntimeId = readNonEmptyString(receipt.assignedRuntimeId);
  if (
    assignedRuntimeId &&
    reason ===
      `Command policy agentRuntime ${assignedRuntimeId} is not available: running.`
  ) {
    return true;
  }
  const assignedSwarmRole = readNonEmptyString(receipt.assignedSwarmRole);
  return (
    Boolean(assignedSwarmRole) &&
    reason ===
      `Command policy swarmRole ${assignedSwarmRole} is not available: running.`
  );
};

const validateCommandReceiptApprovalProof = (
  receipt: Record<string, unknown>,
  id: string,
  payload: Record<string, unknown>,
  now: Date,
  issues: string[],
): void => {
  const policyDecision = readNonEmptyString(receipt.policyDecision);
  const status = readNonEmptyString(receipt.status);
  const requiredThreshold = readApprovalThreshold(
    receipt.requiredApprovalThreshold,
  );
  const approvalRequired =
    receipt.requiresApproval === true ||
    policyDecision === "approval-required" ||
    requiredThreshold !== undefined;
  if (!approvalRequired) {
    return;
  }

  if (status !== "approval-required" && receipt.approved !== true) {
    issues.push(
      `Build Mode commandReceipt ${id} passed an approval-required policy without approved true.`,
    );
  }

  const approval = isRecord(receipt.approval) ? receipt.approval : undefined;
  if (status !== "approval-required" && !approval) {
    issues.push(
      `Build Mode commandReceipt ${id} requires approval metadata before leaving approval-required status.`,
    );
    return;
  }
  if (!approval) {
    return;
  }

  if (approval.approved !== true) {
    issues.push(
      `Build Mode commandReceipt ${id} approval metadata must have approved true.`,
    );
  }
  if (!readNonEmptyString(approval.approverPrincipalId)) {
    issues.push(
      `Build Mode commandReceipt ${id} approval requires an approverPrincipalId.`,
    );
  }
  if (!readNonEmptyString(approval.reason)) {
    issues.push(`Build Mode commandReceipt ${id} approval requires a reason.`);
  }
  const approvalCreatedAt = readNonEmptyString(approval.createdAt);
  if (!approvalCreatedAt) {
    issues.push(
      `Build Mode commandReceipt ${id} approval requires a createdAt timestamp.`,
    );
  } else {
    const approvalCreatedAtMs = Date.parse(approvalCreatedAt);
    const evaluatedAtMs = now.getTime();
    if (!Number.isFinite(approvalCreatedAtMs)) {
      issues.push(
        `Build Mode commandReceipt ${id} approval createdAt timestamp is invalid.`,
      );
    } else {
      if (approvalCreatedAtMs - evaluatedAtMs > approvalFutureSkewMs) {
        issues.push(
          `Build Mode commandReceipt ${id} approval timestamp is in the future.`,
        );
      }
      if (evaluatedAtMs - approvalCreatedAtMs > approvalMaxAgeMs) {
        issues.push(
          `Build Mode commandReceipt ${id} approval is stale and must be renewed.`,
        );
      }
    }
  }

  const scope = isRecord(payload.scope) ? payload.scope : undefined;
  const scopePrincipalId = readNonEmptyString(scope?.principalId);
  const approverPrincipalId = readNonEmptyString(approval.approverPrincipalId);
  if (
    scopePrincipalId &&
    approverPrincipalId &&
    approverPrincipalId !== scopePrincipalId
  ) {
    issues.push(
      `Build Mode commandReceipt ${id} approval principal is outside the active scope: ${approverPrincipalId}.`,
    );
  }

  const approvalThreshold = readApprovalThreshold(approval.threshold);
  if (!approvalThreshold) {
    issues.push(
      `Build Mode commandReceipt ${id} approval has unsupported threshold.`,
    );
  }
  if (
    requiredThreshold &&
    approvalThreshold &&
    approvalThresholdRank[approvalThreshold] <
      approvalThresholdRank[requiredThreshold]
  ) {
    issues.push(
      `Build Mode commandReceipt ${id} approval threshold ${approvalThreshold} is below required threshold ${requiredThreshold}.`,
    );
  }
  if (
    requiredThreshold &&
    !approvalRolesCoverThreshold(
      readStringArray(approval.approverRoles),
      requiredThreshold,
    )
  ) {
    issues.push(
      `Build Mode commandReceipt ${id} approverRoles do not satisfy required threshold ${requiredThreshold}.`,
    );
  }
};

const approvalThresholdRank: Record<BuildModeApprovalThreshold, number> = {
  none: 0,
  operator: 1,
  owner: 2,
  admin: 3,
};

const readApprovalThreshold = (
  value: unknown,
): BuildModeApprovalThreshold | undefined => {
  const threshold = readNonEmptyString(value);
  return threshold &&
    Object.prototype.hasOwnProperty.call(approvalThresholdRank, threshold)
    ? (threshold as BuildModeApprovalThreshold)
    : undefined;
};

const approvalRolesCoverThreshold = (
  roles: string[],
  required: BuildModeApprovalThreshold,
): boolean => {
  if (required === "none") {
    return true;
  }
  const normalized = new Set(roles.map((role) => role.toLowerCase()));
  if (required === "operator") {
    return (
      normalized.has("buildoperator") ||
      normalized.has("operator") ||
      normalized.has("owner") ||
      normalized.has("admin") ||
      normalized.has("administrator")
    );
  }
  if (required === "owner") {
    return (
      normalized.has("owner") ||
      normalized.has("admin") ||
      normalized.has("administrator")
    );
  }
  return normalized.has("admin") || normalized.has("administrator");
};

const validateFinalReportDurableMemoryProof = (
  value: Record<string, unknown>,
  issues: string[],
): void => {
  const finalReportReady =
    isRecord(value.finalReport) &&
    readNonEmptyString(value.finalReport.status) === "ready";
  const finalReportGatePassed = readRecordArrayProperty(
    value,
    "readinessGates",
    issues,
  ).some(
    (gate) =>
      readNonEmptyString(gate.id) === "gate-final-report-ready" &&
      readNonEmptyString(gate.status) === "passed",
  );
  if (!finalReportReady && !finalReportGatePassed) {
    return;
  }

  const blockingGateStatuses = readRecordArrayProperty(
    value,
    "readinessGates",
    issues,
  )
    .filter(
      (gate) =>
        gate.blocksRun === true && readNonEmptyString(gate.status) !== "passed",
    )
    .map(
      (gate) =>
        `${readNonEmptyString(gate.id) ?? "unknown"}:${readNonEmptyString(gate.status) ?? "unknown"}`,
    );
  if (blockingGateStatuses.length) {
    issues.push(
      `Build Mode finalReport ready state requires all blocking readiness gates to be passed; unresolved gates: ${blockingGateStatuses.join(", ")}.`,
    );
  }

  const commandReceipts = collectCommandReceiptProofs(value, issues);
  let hasWrittenMemoryMetadata = false;
  let hasSucceededGrayMatterMemoryReceiptProof = false;
  let hasMatchingFinalReportCommandProof = false;
  let hasFinalReportIntegrityProof = false;
  for (const artifact of readRecordArrayProperty(
    value,
    "evidenceArtifacts",
    issues,
  )) {
    if (readNonEmptyString(artifact.kind) !== "final_report") {
      continue;
    }
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : {};
    const receiptId = readNonEmptyString(artifact.receiptId);
    const hasMemoryProof =
      readNonEmptyString(metadata.memoryStatus) === "written" &&
      Boolean(receiptId);
    if (!hasMemoryProof) {
      continue;
    }
    hasWrittenMemoryMetadata = true;
    const receipt = receiptId ? commandReceipts.get(receiptId) : undefined;
    const hasSucceededGrayMatterMemoryReceipt =
      receipt?.capabilityId === "graymatter.memory" &&
      receipt.status === "succeeded";
    if (!hasSucceededGrayMatterMemoryReceipt) {
      continue;
    }
    hasSucceededGrayMatterMemoryReceiptProof = true;
    const artifactCommandId = readNonEmptyString(artifact.commandId);
    if (!artifactCommandId || artifactCommandId !== receipt.commandId) {
      continue;
    }
    hasMatchingFinalReportCommandProof = true;
    if (hasArtifactIntegrityProof(metadata)) {
      hasFinalReportIntegrityProof = true;
    }
  }

  if (!hasWrittenMemoryMetadata) {
    issues.push(
      "Build Mode finalReport ready state requires a final_report evidence artifact with GrayMatter memoryStatus written and a receiptId.",
    );
  } else if (!hasSucceededGrayMatterMemoryReceiptProof) {
    issues.push(
      "Build Mode finalReport ready state requires final_report evidence artifact receiptId to reference a succeeded graymatter.memory commandReceipt.",
    );
  } else if (!hasMatchingFinalReportCommandProof) {
    issues.push(
      "Build Mode finalReport ready state requires final_report evidence artifact commandId to match its graymatter.memory commandReceipt commandId.",
    );
  } else if (!hasFinalReportIntegrityProof) {
    issues.push(
      "Build Mode finalReport ready state requires a final_report evidence artifact with sha256 contentHash and positive byteSize metadata.",
    );
  }
};

const hasArtifactIntegrityProof = (
  metadata: Record<string, unknown>,
): boolean => {
  const contentHash = readNonEmptyString(metadata.contentHash);
  const byteSize = readFiniteNumber(metadata.byteSize);
  return (
    Boolean(contentHash?.match(/^sha256:[a-f0-9]{64}$/)) &&
    byteSize !== undefined &&
    byteSize > 0
  );
};

const validateEvidenceArtifactIntegrityMetadata = (
  artifacts: Record<string, unknown>[],
  owner: string,
  issues: string[],
): void => {
  for (const artifact of artifacts) {
    const metadata = isRecord(artifact.metadata) ? artifact.metadata : undefined;
    if (!metadata) {
      continue;
    }
    const contentHash = readNonEmptyString(metadata.contentHash);
    const byteSize = readFiniteNumber(metadata.byteSize);
    const claimsIntegrity =
      metadata.contentHash !== undefined || metadata.byteSize !== undefined;
    if (!claimsIntegrity) {
      continue;
    }
    const id = readNonEmptyString(artifact.id) ?? "unknown";
    const uri = readNonEmptyString(artifact.uri);
    if (uri && !isSafeBuildModeEvidenceArtifactUri(uri)) {
      issues.push(
        `Build Mode ${owner} ${id} uri must be a safe Build Mode artifact URI before it can be used as artifact proof.`,
      );
    }
    if (!contentHash || !/^sha256:[a-f0-9]{64}$/.test(contentHash)) {
      issues.push(
        `Build Mode ${owner} ${id} contentHash must be a sha256 hash before it can be used as artifact proof.`,
      );
    }
    if (byteSize === undefined || byteSize <= 0) {
      issues.push(
        `Build Mode ${owner} ${id} byteSize must be positive before it can be used as artifact proof.`,
      );
    }
  }
};

const isSafeBuildModeEvidenceArtifactUri = (uri: string): boolean => {
  if (/<redacted/i.test(uri)) {
    return false;
  }
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    return true;
  }
  if (
    parsed.protocol !== "valoride:" ||
    parsed.hostname !== "build-mode" ||
    !parsed.pathname.startsWith("/artifacts/")
  ) {
    return true;
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    return false;
  }
  try {
    return parsed.pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .every((segment) => {
        const decoded = decodeURIComponent(segment);
        return (
          decoded &&
          decoded !== "." &&
          decoded !== ".." &&
          !decoded.includes("/") &&
          !decoded.includes("\\")
        );
      });
  } catch {
    return false;
  }
};

const validatePromptExecutionContext = (
  context: Record<string, unknown>,
  owner: string,
  promptProfiles: CollectedIds,
  promptBundles: CollectedIds,
  promptBundleContracts: Map<string, PromptBundleContract>,
  issues: string[],
): void => {
  const promptProfileId = readNonEmptyString(context.promptProfileId);
  if (
    promptProfileId &&
    promptProfiles.provided &&
    !promptProfiles.ids.has(promptProfileId)
  ) {
    issues.push(
      `Build Mode ${owner} promptContext references missing promptProfile ${promptProfileId}.`,
    );
  }
  const promptBundleId = readNonEmptyString(context.promptBundleId);
  if (
    promptBundleId &&
    promptBundles.provided &&
    !promptBundles.ids.has(promptBundleId)
  ) {
    issues.push(
      `Build Mode ${owner} promptContext references missing promptBundle ${promptBundleId}.`,
    );
  }
  const contract = promptBundleId
    ? promptBundleContracts.get(promptBundleId)
    : undefined;
  if (contract) {
    const version = readNonEmptyString(context.promptBundleVersion);
    if (version && version !== contract.version) {
      issues.push(
        `Build Mode ${owner} promptContext has promptBundleVersion ${version}, expected ${contract.version}.`,
      );
    }
    const policy = readNonEmptyString(context.promptBundlePolicy);
    if (policy && policy !== contract.policy) {
      issues.push(
        `Build Mode ${owner} promptContext has promptBundlePolicy ${policy}, expected ${contract.policy}.`,
      );
    }
    const promptBundleReceiptIds = readStringArray(
      context.promptBundleReceiptIds,
    );
    if (contract.receiptIds.length && !promptBundleReceiptIds.length) {
      issues.push(
        `Build Mode ${owner} promptContext requires prompt bundle receipt proof for ${promptBundleId}.`,
      );
    }
    for (const receiptId of promptBundleReceiptIds) {
      if (!contract.receiptIds.includes(receiptId)) {
        issues.push(
          `Build Mode ${owner} promptContext references receipt ${receiptId} outside promptBundle ${promptBundleId}.`,
        );
      }
    }
  }
};

const validateGrayMatterContextProof = (
  proof: Record<string, unknown>,
  owner: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  const contextPack = isRecord(payload.grayMatterContextPack)
    ? payload.grayMatterContextPack
    : undefined;
  if (!contextPack) {
    issues.push(
      `Build Mode ${owner} grayMatterContextProof requires a GrayMatter context pack.`,
    );
    return;
  }

  const expectedContextPackId = readNonEmptyString(contextPack.id);
  const contextPackId = readNonEmptyString(proof.contextPackId);
  if (
    expectedContextPackId &&
    contextPackId &&
    contextPackId !== expectedContextPackId
  ) {
    issues.push(
      `Build Mode ${owner} grayMatterContextProof contextPackId ${contextPackId} does not match grayMatterContextPack ${expectedContextPackId}.`,
    );
  }

  for (const [field, expected] of [
    ["answerPolicy", readNonEmptyString(contextPack.answerPolicy)],
    [
      "invariantPreflightStatus",
      readNonEmptyString(contextPack.invariantPreflightStatus),
    ],
    ["retrievalStatus", readNonEmptyString(contextPack.retrievalStatus)],
  ] as const) {
    const actual = readNonEmptyString(proof[field]);
    if (actual && expected && actual !== expected) {
      issues.push(
        `Build Mode ${owner} grayMatterContextProof ${field} ${actual} does not match grayMatterContextPack ${expected}.`,
      );
    }
  }

  const expectedTraceId = readNonEmptyString(contextPack.retrievalTraceId);
  const proofTraceId = readNonEmptyString(proof.retrievalTraceId);
  if (expectedTraceId && proofTraceId && proofTraceId !== expectedTraceId) {
    issues.push(
      `Build Mode ${owner} grayMatterContextProof retrievalTraceId ${proofTraceId} does not match grayMatterContextPack ${expectedTraceId}.`,
    );
  }

  const expectedPreflightReceiptId = readNonEmptyString(
    contextPack.preflightReceiptId,
  );
  const proofPreflightReceiptId = readNonEmptyString(proof.preflightReceiptId);
  if (
    expectedPreflightReceiptId &&
    proofPreflightReceiptId &&
    proofPreflightReceiptId !== expectedPreflightReceiptId
  ) {
    issues.push(
      `Build Mode ${owner} grayMatterContextProof preflightReceiptId ${proofPreflightReceiptId} does not match grayMatterContextPack ${expectedPreflightReceiptId}.`,
    );
  }

  const expectedRetrievalReceiptIds = new Set(
    readStringArray(contextPack.retrievalReceiptIds),
  );
  for (const receiptId of readStringArray(proof.retrievalReceiptIds)) {
    if (!expectedRetrievalReceiptIds.has(receiptId)) {
      issues.push(
        `Build Mode ${owner} grayMatterContextProof references retrieval receipt ${receiptId} outside grayMatterContextPack ${expectedContextPackId ?? "unknown"}.`,
      );
    }
  }
};

const validateMajorCommandGrayMatterContextProof = (
  receipt: Record<string, unknown>,
  receiptId: string,
  command: BuildModeCommand | undefined,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  if (!command || readNonEmptyString(receipt.status) !== "succeeded") {
    return;
  }
  if (command.capabilityId === "graymatter.memory") {
    return;
  }

  const contextPack = isRecord(payload.grayMatterContextPack)
    ? payload.grayMatterContextPack
    : undefined;
  const majorTaskRefs = readStringArray(contextPack?.majorTaskRefs);
  if (!majorTaskRefs.length || !isMajorTaskCommand(command, majorTaskRefs)) {
    return;
  }

  const proof = isRecord(receipt.grayMatterContextProof)
    ? receipt.grayMatterContextProof
    : undefined;
  const expectedContextPackId = readNonEmptyString(contextPack?.id);
  const proofContextPackId = readNonEmptyString(proof?.contextPackId);
  const proofRetrievalReceiptIds = readStringArray(proof?.retrievalReceiptIds);
  if (
    !proof ||
    !proofContextPackId ||
    proofContextPackId !== expectedContextPackId ||
    !proofRetrievalReceiptIds.length
  ) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} succeeded major task ${command.id} requires grayMatterContextProof for context pack ${expectedContextPackId ?? "unknown"} before execution.`,
    );
  }
};

const isMajorTaskCommand = (
  command: BuildModeCommand,
  majorTaskRefs: string[],
): boolean => {
  const refs = new Set(majorTaskRefs);
  const commandRefs = [
    command.id,
    `cmd:${command.id}`,
    `command:${command.id}`,
    command.capabilityId,
    `capability:${command.capabilityId}`,
    command.kind,
    `kind:${command.kind}`,
    command.executionPlanStepId,
    command.executionPlanStepId
      ? `step:${command.executionPlanStepId}`
      : undefined,
    command.executionPlanStepId
      ? `executionPlan:${command.executionPlanStepId}`
      : undefined,
  ].filter((item): item is string => Boolean(item));
  return commandRefs.some((ref) => refs.has(ref));
};

const validateCommandReceiptScopeProof = (
  scope: Record<string, unknown>,
  receiptId: string,
  payload: Record<string, unknown>,
  issues: string[],
): void => {
  const launchScope = isRecord(payload.scope) ? payload.scope : undefined;
  if (!launchScope) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} scope requires launch scope proof.`,
    );
    return;
  }

  for (const field of ["tenantId", "principalId", "projectId"] as const) {
    const receiptValue = readNonEmptyString(scope[field]);
    const launchValue = readNonEmptyString(launchScope[field]);
    if (receiptValue && launchValue && receiptValue !== launchValue) {
      issues.push(
        `Build Mode commandReceipt ${receiptId} scope ${field} ${receiptValue} does not match launch scope ${launchValue}.`,
      );
    }
  }

  const receiptWorkspaceRoot = readNonEmptyString(scope.workspaceRoot);
  const launchWorkspaceRoot = readNonEmptyString(launchScope.workspaceRoot);
  if (
    receiptWorkspaceRoot &&
    launchWorkspaceRoot &&
    !isWorkspaceRootWithin(receiptWorkspaceRoot, launchWorkspaceRoot)
  ) {
    issues.push(
      `Build Mode commandReceipt ${receiptId} scope workspaceRoot ${receiptWorkspaceRoot} is outside launch scope ${launchWorkspaceRoot}.`,
    );
  }

  validateScopeSubset(
    readStringArray(scope.roles),
    readStringArray(launchScope.roles),
    `Build Mode commandReceipt ${receiptId} scope role`,
    issues,
  );
  validateScopeSubset(
    readStringArray(scope.policyRefs),
    readStringArray(launchScope.policyRefs),
    `Build Mode commandReceipt ${receiptId} scope policyRef`,
    issues,
  );
  validateScopeSubset(
    readStringArray(scope.ignoredPathPatterns),
    readStringArray(launchScope.ignoredPathPatterns),
    `Build Mode commandReceipt ${receiptId} scope ignoredPathPattern`,
    issues,
  );
};

const validateScopeSubset = (
  values: string[],
  allowedValues: string[],
  label: string,
  issues: string[],
): void => {
  if (!values.length) {
    return;
  }
  const allowed = new Set(allowedValues);
  for (const value of values) {
    if (!allowed.has(value)) {
      issues.push(`${label} ${value} is outside launch scope.`);
    }
  }
};

const normalizeScheduledAutomations = (
  value: unknown,
): ScheduledAutomationBinding[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter(isRecord).map((automation) => ({
    ...automation,
    scheduler: "valkyrai-cron",
  })) as ScheduledAutomationBinding[];
};

const coerceCreditEstimate = (
  value: unknown,
): CreditEstimate | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    ...value,
    assumptions: readStringArray(value.assumptions),
    receiptIds: readStringArray(value.receiptIds),
  } as CreditEstimate;
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
    receiptIds: readStringArray(value.receiptIds),
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
      receiptIds: readStringArray(ref.receiptIds),
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
  ignoredPathPatterns: mergeIgnoredPathPatterns(
    readStringArray(value?.ignoredPathPatterns),
    workspaceRoot,
  ),
  principalId: readNonEmptyString(value?.principalId) ?? "unknown-principal",
  projectId: readNonEmptyString(value?.projectId),
  roles: readStringArray(value?.roles),
  tenantId: readNonEmptyString(value?.tenantId) ?? "unknown-tenant",
  workspaceRoot: workspaceRoot ?? "",
  policyRefs: readStringArray(value?.policyRefs),
});

const mergeIgnoredPathPatterns = (
  launchPatterns: string[],
  workspaceRoot: string | undefined,
): string[] => {
  const workspacePatterns = workspaceRoot
    ? loadWorkspaceIgnorePatterns(workspaceRoot)
    : [];
  return Array.from(new Set([...launchPatterns, ...workspacePatterns]));
};

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

type CollectedIds = {
  ids: Set<string>;
  provided: boolean;
};

const readRecordArrayProperty = (
  value: Record<string, unknown>,
  property: string,
  issues: string[],
): Record<string, unknown>[] => {
  const nested = value[property];
  if (nested === undefined) {
    return [];
  }
  if (!Array.isArray(nested)) {
    issues.push(`Build Mode task payload ${property} must be an array.`);
    return [];
  }
  return nested.filter((item, index): item is Record<string, unknown> => {
    if (isRecord(item)) {
      return true;
    }
    issues.push(
      `Build Mode task payload ${property}[${index}] must be an object.`,
    );
    return false;
  });
};

const collectIds = (
  records: Record<string, unknown>[],
  label: string,
  issues: string[],
  provided: boolean = records.length > 0,
): CollectedIds => {
  const ids = new Set<string>();
  for (const [index, record] of records.entries()) {
    const id = readNonEmptyString(record.id);
    if (!id) {
      issues.push(`Build Mode ${label}[${index}] requires an id.`);
      continue;
    }
    addUniqueId(ids, id, label, issues);
  }
  return { ids, provided };
};

const addUniqueId = (
  ids: Set<string>,
  id: string,
  label: string,
  issues: string[],
): void => {
  if (ids.has(id)) {
    issues.push(`Build Mode ${label} contains duplicate id ${id}.`);
    return;
  }
  ids.add(id);
};

const readNonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const readFiniteNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

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
    ([key, nested]) => {
      const nestedPath = `${path}.${key}`;
      if (
        secretFieldPattern.test(key) &&
        typeof nested === "string" &&
        nested.trim() &&
        !isSecretReferenceString(nested)
      ) {
        return [nestedPath];
      }
      return findSecretMaterialPaths(nested, nestedPath, seen);
    },
  );
};

const isSecretReferenceString = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("credential-ref") ||
    normalized.startsWith("provider-credential") ||
    normalized.startsWith("secret-ref:") ||
    normalized.startsWith("vault://") ||
    normalized.startsWith("keychain://") ||
    normalized.startsWith("valkyrai://credentials/")
  );
};
