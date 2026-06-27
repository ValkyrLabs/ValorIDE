import type {
  AppBundleDiff,
  BuildModeApprovalThreshold,
  BuildModeAutonomyDecision,
  BuildModeAutomationSnapshot,
  BrowserVerificationStatus,
  BuildModeAgentLoopPhase,
  BuildModeAgentRuntimeBinding,
  BuildModeCommand,
  BuildModeEvidenceArtifact,
  BuildModeLocalModelRuntimeBinding,
  BuildModeCommandPolicyRule,
  BuildModeCommandReceipt,
  BuildModeExecutionPlanStep,
  GrayMatterContextPack,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
  BuildModeSwarmRoleAssignment,
  ProviderCredentialRef,
  ScheduledAutomationBinding,
  ValorTaskBridgePayload,
  WorkflowMcpBinding,
} from "@shared/BuildMode";
import { digitalProductProBuildModePayload } from "./buildModeFixtures";

const providerRoutes = new Set([
  "bring-your-own-key",
  "valkyr-credits",
  "local-model",
  "enterprise-proxy",
]);
const launchSources = new Set(["SageChat", "AppGallery", "Workflow", "Mock"]);
const appArtifactKinds = ["generated", "editable", "asset", "config"] as const;
const componentGeneratedByValues = [
  "Aurora",
  "ThorAPI",
  "Manual",
  "Workflow",
] as const;
const componentStatuses = ["ready", "needs-review", "blocked"] as const;
const execModuleSafetyLevels = [
  "readonly",
  "approval-required",
  "destructive",
] as const;
const mcpServerTransports = ["stdio", "sse", "http", "workflow"] as const;
const mcpServerStatuses = [
  "connected",
  "available",
  "requires-approval",
  "blocked",
] as const;
const mcpServerScopes = ["private", "workspace", "tenant", "public"] as const;
const mcpToolStatuses = [
  "available",
  "requires-approval",
  "blocked",
] as const;
const connectorBindingStatuses = [
  "authorized",
  "available",
  "requires-approval",
  "blocked",
] as const;
const connectorReadActions = ["get", "list", "read", "search"] as const;
const grayMatterPolicies = [
  "answer-confidently",
  "requires-review",
  "do-not-answer",
] as const;
const grayMatterAnswerPolicies = [
  "answer-confidently",
  "requires-review",
  "do-not-answer",
  "retry",
  "clarify",
] as const;
const grayMatterRetrievalStatuses = [
  "ready",
  "partial-coverage",
  "low-confidence",
  "stale-context",
  "conflicting-context",
  "blocked",
] as const;
const grayMatterInvariantStatuses = [
  "passed",
  "warning",
  "blocked",
  "missing",
] as const;
const receiptKinds = [
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
] as const;
const receiptStatuses = [
  "pending",
  "approved",
  "running",
  "succeeded",
  "failed",
] as const;
const creditCurrencies = ["ValkyrCredits", "USD"] as const;
const commandStatuses = [
  "queued",
  "approval-required",
  "running",
  "succeeded",
  "failed",
  "rejected",
] as const;
const promptBundleSources = ["Valkyr", "Workspace", "Enterprise"] as const;
const promptBundlePolicies = ["locked", "editable", "review-required"] as const;
const automationStatuses = ["draft", "scheduled", "paused", "blocked"] as const;
const automationRunStatuses = ["failed", "skipped", "succeeded"] as const;
const capabilityKinds = [
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
] as const;
const riskLevels = ["low", "medium", "high"] as const;
const guardrailEnforcements = [
  "hard-block",
  "approval-required",
  "receipt-required",
] as const;
const permissionDecisions = ["allow", "approval-required", "deny"] as const;
const approvalThresholds = ["none", "operator", "owner", "admin"] as const;
const commandPolicyEffects = ["allow", "approval-required", "deny"] as const;
const checkpointStatuses = [
  "planned",
  "created",
  "rollback-ready",
  "restored",
  "failed",
] as const;
const safeEditTools = ["psr.edit", "filesystem.write"] as const;
const safeEditStatuses = [
  "draft",
  "queued",
  "approval-required",
  "applied",
  "blocked",
] as const;
const swarmRoleValues = [
  "Supervisor",
  "Spec Architect",
  "ThorAPI Generator",
  "Workflow Engineer",
  "Aurora UI Engineer",
  "Security Auditor",
  "Test Runner",
  "Browser Verifier",
  "Deploy Operator",
] as const;
const swarmStatuses = [
  "idle",
  "assigned",
  "running",
  "blocked",
  "complete",
] as const;
const agentLoopStatuses = [
  "pending",
  "ready",
  "running",
  "blocked",
  "complete",
] as const;
const runtimeKinds = [
  "Codex",
  "OpenClaw",
  "ValorIDE",
  "ThorAPI",
  "VAIX",
] as const;
const runtimeStatuses = [
  "available",
  "selected",
  "running",
  "blocked",
  "offline",
] as const;
const handoffPolicies = [
  "supervised",
  "operator-approved",
  "autonomous-local",
] as const;
const localModelExecutionModes = [
  "workspace-local",
  "developer-machine",
  "tenant-isolated",
] as const;
const thorApiVaixSurfaces = ["ThorAPI", "VAIX"] as const;
const thorApiVaixPolicies = [
  "readonly-generated",
  "approval-required",
  "blocked",
] as const;
const autonomyModes = [
  "manual",
  "approval-gated",
  "autonomous-local",
  "disabled",
] as const;
const readinessGateStatuses = [
  "passed",
  "pending",
  "blocked",
  "failed",
] as const;
const executionPlanStatuses = [
  "pending",
  "ready",
  "running",
  "approval-required",
  "blocked",
  "complete",
  "failed",
] as const;
const commandKinds = [
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
] as const;
const policyDecisions = ["allow", "approval-required", "reject"] as const;
const executionModes = [
  "agentic-command-bus",
  "approval-gate",
  "operator-handoff",
  "policy-blocked",
] as const;
const operatorActions = [
  "approve",
  "continue",
  "inspect",
  "monitor",
  "none",
  "revise",
] as const;
const evidenceKinds = [
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
] as const;
const browserStatuses = ["not-started", "running", "passed", "failed"] as const;
const finalReportStatuses = ["draft", "ready"] as const;

const coerceEnumValue = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fallback: T,
): T => (allowedValues.includes(value as T) ? (value as T) : fallback);
const coerceProviderRoute = (
  route: unknown,
  fallback: ValorTaskBridgePayload["selectedProviderRoute"] = digitalProductProBuildModePayload.selectedProviderRoute,
): ValorTaskBridgePayload["selectedProviderRoute"] =>
  providerRoutes.has(String(route))
    ? (route as ValorTaskBridgePayload["selectedProviderRoute"])
    : fallback;

const hasTaskPayloadShape = (
  value: unknown,
): value is Partial<ValorTaskBridgePayload> &
  Pick<
    ValorTaskBridgePayload,
    "appBundle" | "grayMatterContextPack" | "taskId"
  > => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.taskId === "string" &&
    !!candidate.appBundle &&
    !!candidate.grayMatterContextPack
  );
};

const sanitizeCredentialRefs = (
  refs: ProviderCredentialRef[] | undefined,
): ProviderCredentialRef[] =>
  (refs ?? digitalProductProBuildModePayload.providerCredentials).map(
    (ref) => ({
      id: redactBuildModeText(ref.id),
      route: coerceProviderRoute(ref.route),
      displayName: redactBuildModeText(ref.displayName),
      tenantScoped: Boolean(ref.tenantScoped),
      secretAvailable: Boolean(ref.secretAvailable),
      receiptIds: sanitizeStringRefs(ref.receiptIds ?? []),
    }),
  );

const secretFieldPattern =
  /(?:api[_-]?key|token|secret|password|private[_-]?key|access[_-]?key|access[_-]?token)/i;

interface BuiltInApprovalRule {
  pattern: RegExp;
  reason: string;
  reasonCode: string;
  threshold: BuildModeApprovalThreshold;
}

const builtInApprovalRules: BuiltInApprovalRule[] = [
  {
    pattern:
      /\b(?:vercel\b.*--prod|netlify\s+deploy\b.*--prod|deploy\b.*\b(?:prod|production)\b|production\b.*\bdeploy)\b/i,
    reason: "Production deploy requires approval.",
    reasonCode: "built-in-approval:production-deploy",
    threshold: "owner",
  },
  {
    pattern: /\b(?:stripe|billing|invoice|refund|charge|payment)\b/i,
    reason: "Billing mutation requires approval.",
    reasonCode: "built-in-approval:billing-mutation",
    threshold: "owner",
  },
  {
    pattern:
      /\b(?:gmail|sendgrid|mailgun|smtp)\b.*\b(?:send|deliver|compose|reply|forward)\b/i,
    reason: "Email send operation requires approval.",
    reasonCode: "built-in-approval:email-send",
    threshold: "owner",
  },
  {
    pattern: /\bmcp\b.*\b(?:publish|register|expose|public)\b/i,
    reason: "Public MCP publication requires approval.",
    reasonCode: "built-in-approval:public-mcp",
    threshold: "owner",
  },
  {
    pattern: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?publish\b/i,
    reason: "Public package publication requires approval.",
    reasonCode: "built-in-approval:package-publication",
    threshold: "owner",
  },
  {
    pattern: /\bgit\s+push\b/i,
    reason: "Remote git mutation requires approval.",
    reasonCode: "built-in-approval:git-push",
    threshold: "operator",
  },
  {
    pattern: /\bgit\s+(?:reset\s+--hard|clean\s+-[^\s]*f)\b/i,
    reason: "Destructive git cleanup requires approval.",
    reasonCode: "built-in-approval:git-destructive-cleanup",
    threshold: "owner",
  },
  {
    pattern: /\brm\s+-[^\s]*(?=[^\s]*r)(?=[^\s]*f)[^\s]*\b/i,
    reason: "Recursive forced deletion requires approval.",
    reasonCode: "built-in-approval:recursive-forced-deletion",
    threshold: "owner",
  },
  {
    pattern:
      /\b(?:terraform\s+(?:apply|destroy)|pulumi\s+up|kubectl\s+delete|docker\s+system\s+prune)\b/i,
    reason: "Infrastructure mutation requires approval.",
    reasonCode: "built-in-approval:infrastructure-mutation",
    threshold: "owner",
  },
  {
    pattern: /\b(?:drop\s+(?:database|schema|table)|truncate\s+table)\b/i,
    reason: "Database destructive operation requires approval.",
    reasonCode: "built-in-approval:database-destructive-operation",
    threshold: "owner",
  },
  {
    pattern: /(?:^|\s)(?:\d?>>|\d?>\|?)\s*(?!&\d)\S+/i,
    reason: "Shell redirection write requires approval.",
    reasonCode: "built-in-approval:shell-redirection-write",
    threshold: "operator",
  },
  {
    pattern:
      /(?:^|[;&|]\s*)(?:sudo\s+)?(?:mv|cp|touch|truncate|rm|rmdir|unlink)\s+(?!-(?:h|-help)\b)/i,
    reason: "Shell file mutation requires approval.",
    reasonCode: "built-in-approval:shell-file-mutation",
    threshold: "operator",
  },
  {
    pattern:
      /(?:^|[;&|]\s*)(?:sudo\s+)?(?:sed\s+-[^\s]*i|perl\s+-[^\s]*p[^\s]*i|tee(?:\s+-[A-Za-z-]+)*\s+)\b/i,
    reason: "Shell file mutation requires approval.",
    reasonCode: "built-in-approval:shell-file-mutation",
    threshold: "operator",
  },
  {
    pattern:
      /\b(?:node|bun|deno|python3?|ruby|php|perl)\b[\s\S]*?(?:^|\s)(?:-[ec]\b|--eval\b|--command\b)[\s\S]*?(?:(?:fs\.)?(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|copyFile|copyFileSync|rename|renameSync|rm|rmSync|unlink|unlinkSync|mkdir|mkdirSync)\s*\(|Deno\.(?:writeTextFile|writeFile|remove|mkdir|rename)\s*\(|Bun\.write\s*\(|open\s*\(\s*["'][^"']+["']\s*,\s*["'][^"']*[wax][^"']*["']|Path\s*\(\s*["'][^"']+["']\s*\)\s*\.\s*(?:write_text|write_bytes|unlink|mkdir|rename)\s*\(|(?:os|Path)\s*\.\s*(?:remove|unlink|rmdir|mkdir|makedirs|rename)\s*\(|shutil\.(?:rmtree|move|copy|copyfile|copytree)\s*\(|File\.(?:write|open|delete|rename|mkdir)\s*\()/i,
    reason: "Interpreter inline file mutation requires approval.",
    reasonCode: "built-in-approval:interpreter-inline-file-mutation",
    threshold: "operator",
  },
];

export const coerceValorTaskBridgePayload = (
  value: unknown,
): ValorTaskBridgePayload => {
  if (!hasTaskPayloadShape(value)) {
    return digitalProductProBuildModePayload;
  }

  const route = coerceProviderRoute(value.selectedProviderRoute);
  const source = launchSources.has(String(value.source))
    ? value.source
    : digitalProductProBuildModePayload.source;

  const providerCredentialSecretPaths = findBuildModeSecretMaterialPaths(
    value.providerCredentials,
    "payload.providerCredentials",
  );
  const sanitizedProviderCredentials = sanitizeCredentialRefs(
    value.providerCredentials,
  );
  const launchSecretPaths = Array.from(
    new Set([
      ...providerCredentialSecretPaths,
      ...findBuildModeSecretMaterialPaths(
        {
          ...value,
          providerCredentials: sanitizedProviderCredentials,
        },
        "payload",
      ),
    ]),
  );
  const sanitizedAppBundle = sanitizeAppBundle(value.appBundle);
  const payload = {
    ...digitalProductProBuildModePayload,
    ...value,
    source: source as ValorTaskBridgePayload["source"],
    taskId: redactBuildModeText(value.taskId),
    primaryLine: redactBuildModeText(
      value.primaryLine ?? digitalProductProBuildModePayload.primaryLine,
    ),
    appBundle: sanitizedAppBundle,
    selectedProviderRoute:
      route as ValorTaskBridgePayload["selectedProviderRoute"],
    scope: sanitizeScopeContext(
      value.scope ?? digitalProductProBuildModePayload.scope,
    ),
    grayMatterContextPack: sanitizeGrayMatterContextPack(
      normalizeGrayMatterContextPack(value.grayMatterContextPack),
    ),
    creditEstimate: sanitizeCreditEstimate(
      value.creditEstimate ?? digitalProductProBuildModePayload.creditEstimate,
    ),
    providerCredentials: sanitizedProviderCredentials,
    componentBundles: (
      value.componentBundles ??
      digitalProductProBuildModePayload.componentBundles
    ).map(sanitizeComponentBundle),
    execModules: (
      value.execModules ?? digitalProductProBuildModePayload.execModules
    ).map(sanitizeExecModule),
    receipts: (
      value.receipts ?? digitalProductProBuildModePayload.receipts
    ).map(sanitizeReceipt),
    creditUsageReceipts: (
      value.creditUsageReceipts ??
      digitalProductProBuildModePayload.creditUsageReceipts
    ).map(sanitizeCreditUsageReceipt),
    promptProfiles: (
      value.promptProfiles ?? digitalProductProBuildModePayload.promptProfiles
    ).map(sanitizePromptProfile),
    promptBundles: (
      value.promptBundles ?? digitalProductProBuildModePayload.promptBundles
    ).map(sanitizePromptBundle),
    selectedPromptProfileId: redactBuildModeText(
      value.selectedPromptProfileId ??
        digitalProductProBuildModePayload.selectedPromptProfileId,
    ),
    selectedPromptBundleId: redactBuildModeText(
      value.selectedPromptBundleId ??
        digitalProductProBuildModePayload.selectedPromptBundleId,
    ),
    mcpServers: (
      value.mcpServers ?? digitalProductProBuildModePayload.mcpServers
    ).map(sanitizeMcpServer),
    mcpTools: (
      value.mcpTools ?? digitalProductProBuildModePayload.mcpTools
    ).map(sanitizeMcpTool),
    connectorBindings: (
      value.connectorBindings ??
      digitalProductProBuildModePayload.connectorBindings
    ).map(sanitizeConnectorBinding),
    workflowMcpBindings: (
      value.workflowMcpBindings ??
      digitalProductProBuildModePayload.workflowMcpBindings
    ).map(sanitizeWorkflowMcpBinding),
    scheduledAutomations: (
      value.scheduledAutomations ??
      digitalProductProBuildModePayload.scheduledAutomations
    ).map(sanitizeScheduledAutomationBinding),
    capabilities: (
      value.capabilities ?? digitalProductProBuildModePayload.capabilities
    ).map(sanitizeCapability),
    guardrails: (
      value.guardrails ?? digitalProductProBuildModePayload.guardrails
    ).map(sanitizeGuardrail),
    toolPermissions: (
      value.toolPermissions ?? digitalProductProBuildModePayload.toolPermissions
    ).map(sanitizeToolPermission),
    commandPolicyRules: (
      value.commandPolicyRules ??
      digitalProductProBuildModePayload.commandPolicyRules
    ).map(sanitizeCommandPolicyRule),
    checkpoints: (
      value.checkpoints ?? digitalProductProBuildModePayload.checkpoints
    ).map(sanitizeCheckpoint),
    safeEditPlans: (
      value.safeEditPlans ?? digitalProductProBuildModePayload.safeEditPlans
    ).map(sanitizeSafeEditPlan),
    swarmRoles: (
      value.swarmRoles ?? digitalProductProBuildModePayload.swarmRoles
    ).map(sanitizeSwarmRoleAssignment),
    agentLoop: (
      value.agentLoop ?? digitalProductProBuildModePayload.agentLoop
    ).map(sanitizeAgentLoopPhase),
    agentRuntimes: (
      value.agentRuntimes ?? digitalProductProBuildModePayload.agentRuntimes
    ).map(sanitizeAgentRuntimeBinding),
    localModelRuntimes: (
      value.localModelRuntimes ??
      digitalProductProBuildModePayload.localModelRuntimes
    ).map(sanitizeLocalModelRuntimeBinding),
    thorApiVaixBindings: (
      value.thorApiVaixBindings ??
      digitalProductProBuildModePayload.thorApiVaixBindings
    ).map(sanitizeThorApiVaixBinding),
    autonomyPolicy: sanitizeAutonomyPolicy(
      value.autonomyPolicy ?? digitalProductProBuildModePayload.autonomyPolicy,
    ),
    readinessGates: (
      value.readinessGates ?? digitalProductProBuildModePayload.readinessGates
    ).map(sanitizeReadinessGate),
    executionPlan: (
      value.executionPlan ?? digitalProductProBuildModePayload.executionPlan
    ).map(sanitizeExecutionPlanStep),
    commands: (
      value.commands ?? digitalProductProBuildModePayload.commands
    ).map(sanitizeBuildModeCommand),
    commandReceipts: (
      value.commandReceipts ?? digitalProductProBuildModePayload.commandReceipts
    ).map(sanitizeBuildModeCommandReceipt),
    evidenceArtifacts: (
      value.evidenceArtifacts ??
      digitalProductProBuildModePayload.evidenceArtifacts
    ).map(sanitizeEvidenceArtifact),
    browserVerification: sanitizeBrowserVerification(
      value.browserVerification ??
        digitalProductProBuildModePayload.browserVerification,
    ),
    finalReport: sanitizeFinalReport(
      value.finalReport ?? digitalProductProBuildModePayload.finalReport,
    ),
    appBundleDiffs: (
      value.appBundleDiffs ??
      deriveAppBundleDiffs({ appBundle: sanitizedAppBundle })
    ).map(sanitizeAppBundleDiff),
  } as ValorTaskBridgePayload;
  const autonomyDecision = deriveBuildModeAutonomyDecision(payload);
  return {
    ...payload,
    autonomyDecision: launchSecretPaths.length
      ? blockAutonomyForLaunchSecretMaterial(
          autonomyDecision,
          launchSecretPaths,
        )
      : autonomyDecision,
  };
};

const normalizeGrayMatterContextPack = (
  pack: ValorTaskBridgePayload["grayMatterContextPack"],
): GrayMatterContextPack => {
  const retrievalReceiptIds = pack.retrievalReceiptIds ?? [];
  return {
    ...digitalProductProBuildModePayload.grayMatterContextPack,
    ...pack,
    answerPolicy: pack.answerPolicy ?? pack.policy,
    retrievalReceiptIds,
    retrievalStatus:
      pack.retrievalStatus ??
      (retrievalReceiptIds.length ? "ready" : "blocked"),
    invariantPreflightStatus:
      pack.invariantPreflightStatus ??
      (retrievalReceiptIds.length ? "passed" : "missing"),
    memoryEntryIds: pack.memoryEntryIds ?? [],
    sourceRefs: pack.sourceRefs ?? [],
    majorTaskRefs: pack.majorTaskRefs ?? [],
  };
};

const redactOptionalBuildModeText = (
  value: string | undefined,
): string | undefined => (value ? redactBuildModeText(value) : value);

const sanitizeStringRefs = (refs: string[]): string[] =>
  refs.map(redactBuildModeText);

const sanitizeScopeContext = (
  scope: ValorTaskBridgePayload["scope"],
): ValorTaskBridgePayload["scope"] => ({
  ...scope,
  ignoredPathPatterns: scope.ignoredPathPatterns?.map(redactBuildModeText),
  policyRefs: sanitizeStringRefs(scope.policyRefs),
  principalId: redactBuildModeText(scope.principalId),
  projectId: redactOptionalBuildModeText(scope.projectId),
  roles: sanitizeStringRefs(scope.roles),
  tenantId: redactBuildModeText(scope.tenantId),
  workspaceRoot: redactBuildModeText(scope.workspaceRoot),
});

const sanitizeAppBundle = (
  bundle: ValorTaskBridgePayload["appBundle"],
): ValorTaskBridgePayload["appBundle"] => ({
  ...bundle,
  artifacts: bundle.artifacts.map((artifact) => ({
    ...artifact,
    checksum: redactOptionalBuildModeText(artifact.checksum),
    kind: coerceEnumValue(artifact.kind, appArtifactKinds, "generated"),
    path: redactBuildModeText(artifact.path),
  })),
  componentBundleIds: sanitizeStringRefs(bundle.componentBundleIds),
  createdAt: redactBuildModeText(bundle.createdAt),
  execModuleIds: sanitizeStringRefs(bundle.execModuleIds),
  id: redactBuildModeText(bundle.id),
  intent: redactBuildModeText(bundle.intent),
  name: redactBuildModeText(bundle.name),
  productLine: redactBuildModeText(bundle.productLine),
  receiptIds: sanitizeStringRefs(bundle.receiptIds ?? []),
  sourceSessionId: redactBuildModeText(bundle.sourceSessionId),
  version: redactBuildModeText(bundle.version),
});

const sanitizeComponentBundle = (
  bundle: ValorTaskBridgePayload["componentBundles"][number],
): ValorTaskBridgePayload["componentBundles"][number] => ({
  ...bundle,
  editablePaths: sanitizeStringRefs(bundle.editablePaths),
  entrypoints: sanitizeStringRefs(bundle.entrypoints),
  framework: redactBuildModeText(bundle.framework),
  generatedBy: coerceEnumValue(
    bundle.generatedBy,
    componentGeneratedByValues,
    "Manual",
  ),
  generatedPaths: sanitizeStringRefs(bundle.generatedPaths),
  id: redactBuildModeText(bundle.id),
  name: redactBuildModeText(bundle.name),
  receiptIds: sanitizeStringRefs(bundle.receiptIds ?? []),
  status: coerceEnumValue(bundle.status, componentStatuses, "blocked"),
});

const sanitizeExecModule = (
  execModule: ValorTaskBridgePayload["execModules"][number],
): ValorTaskBridgePayload["execModules"][number] => ({
  ...execModule,
  capability: redactBuildModeText(execModule.capability),
  id: redactBuildModeText(execModule.id),
  inputSchemaRef: redactBuildModeText(execModule.inputSchemaRef),
  name: redactBuildModeText(execModule.name),
  outputSchemaRef: redactBuildModeText(execModule.outputSchemaRef),
  owner: redactBuildModeText(execModule.owner),
  receiptIds: sanitizeStringRefs(execModule.receiptIds ?? []),
  safetyLevel: coerceEnumValue(
    execModule.safetyLevel,
    execModuleSafetyLevels,
    "approval-required",
  ),
  version: redactBuildModeText(execModule.version),
});

const sanitizeMcpServer = (
  server: ValorTaskBridgePayload["mcpServers"][number],
): ValorTaskBridgePayload["mcpServers"][number] => ({
  ...server,
  id: redactBuildModeText(server.id),
  name: redactBuildModeText(server.name),
  receiptIds: sanitizeStringRefs(server.receiptIds ?? []),
  scope: coerceEnumValue(server.scope, mcpServerScopes, "private"),
  status: coerceEnumValue(server.status, mcpServerStatuses, "blocked"),
  toolIds: sanitizeStringRefs(server.toolIds),
  transport: coerceEnumValue(server.transport, mcpServerTransports, "stdio"),
});

const sanitizeMcpTool = (
  tool: ValorTaskBridgePayload["mcpTools"][number],
): ValorTaskBridgePayload["mcpTools"][number] => ({
  ...tool,
  capabilityId: redactBuildModeText(tool.capabilityId),
  execModuleId: redactOptionalBuildModeText(tool.execModuleId),
  id: redactBuildModeText(tool.id),
  inputSchemaRef: redactOptionalBuildModeText(tool.inputSchemaRef),
  name: redactBuildModeText(tool.name),
  outputSchemaRef: redactOptionalBuildModeText(tool.outputSchemaRef),
  receiptIds: sanitizeStringRefs(tool.receiptIds ?? []),
  serverId: redactBuildModeText(tool.serverId),
  status: coerceEnumValue(tool.status, mcpToolStatuses, "blocked"),
  workflowRef: redactOptionalBuildModeText(tool.workflowRef),
});

const sanitizeConnectorBinding = (
  binding: ValorTaskBridgePayload["connectorBindings"][number],
): ValorTaskBridgePayload["connectorBindings"][number] => ({
  ...binding,
  allowedActions: binding.allowedActions
    .map((action) => coerceEnumValue(action, connectorReadActions, "read"))
    .filter((action, index, actions) => actions.indexOf(action) === index),
  commandIds: sanitizeStringRefs(binding.commandIds),
  connectorId: redactBuildModeText(binding.connectorId),
  connectorName: redactBuildModeText(binding.connectorName),
  dataClasses: sanitizeStringRefs(binding.dataClasses),
  id: redactBuildModeText(binding.id),
  receiptIds: sanitizeStringRefs(binding.receiptIds ?? []),
  scopeRef: redactOptionalBuildModeText(binding.scopeRef),
  status: coerceEnumValue(
    binding.status,
    connectorBindingStatuses,
    "blocked",
  ),
});

const sanitizeGrayMatterContextPack = (
  pack: GrayMatterContextPack,
): GrayMatterContextPack => ({
  ...pack,
  compiledAt: redactBuildModeText(pack.compiledAt),
  id: redactBuildModeText(pack.id),
  answerPolicy: coerceEnumValue(
    pack.answerPolicy,
    grayMatterAnswerPolicies,
    "requires-review",
  ),
  invariantPreflightStatus: coerceEnumValue(
    pack.invariantPreflightStatus,
    grayMatterInvariantStatuses,
    "missing",
  ),
  majorTaskRefs: sanitizeStringRefs(pack.majorTaskRefs),
  memoryEntryIds: sanitizeStringRefs(pack.memoryEntryIds),
  policy: coerceEnumValue(pack.policy, grayMatterPolicies, "requires-review"),
  preflightReceiptId: redactOptionalBuildModeText(pack.preflightReceiptId),
  retrievalReceiptIds: sanitizeStringRefs(pack.retrievalReceiptIds),
  retrievalTraceId: redactOptionalBuildModeText(pack.retrievalTraceId),
  retrievalStatus: coerceEnumValue(
    pack.retrievalStatus,
    grayMatterRetrievalStatuses,
    "blocked",
  ),
  source: redactBuildModeText(pack.source),
  sourceRefs: sanitizeStringRefs(pack.sourceRefs),
  summary: redactBuildModeText(pack.summary),
});

const sanitizeCreditEstimate = (
  estimate: ValorTaskBridgePayload["creditEstimate"],
): ValorTaskBridgePayload["creditEstimate"] => ({
  ...estimate,
  assumptions: sanitizeStringRefs(estimate.assumptions),
  currency: coerceEnumValue(
    estimate.currency,
    creditCurrencies,
    "ValkyrCredits",
  ),
  id: redactBuildModeText(estimate.id),
  providerRoute: coerceProviderRoute(estimate.providerRoute),
  receiptIds: sanitizeStringRefs(estimate.receiptIds ?? []),
});

const sanitizePromptProfile = (
  profile: ValorTaskBridgePayload["promptProfiles"][number],
): ValorTaskBridgePayload["promptProfiles"][number] => ({
  ...profile,
  description: redactBuildModeText(profile.description),
  id: redactBuildModeText(profile.id),
  modelFamily: redactBuildModeText(profile.modelFamily),
  name: redactBuildModeText(profile.name),
  promptBundleRef: redactBuildModeText(profile.promptBundleRef),
  receiptIds: sanitizeStringRefs(profile.receiptIds ?? []),
});

const sanitizePromptBundle = (
  bundle: ValorTaskBridgePayload["promptBundles"][number],
): ValorTaskBridgePayload["promptBundles"][number] => ({
  ...bundle,
  id: redactBuildModeText(bundle.id),
  loadedAt: redactBuildModeText(bundle.loadedAt),
  name: redactBuildModeText(bundle.name),
  policy: coerceEnumValue(
    bundle.policy,
    promptBundlePolicies,
    "review-required",
  ),
  receiptIds: sanitizeStringRefs(bundle.receiptIds),
  sections: bundle.sections.map((section) => ({
    ...section,
    checksum: redactOptionalBuildModeText(section.checksum),
    id: redactBuildModeText(section.id),
    purpose: redactBuildModeText(section.purpose),
    sourceRef: redactBuildModeText(section.sourceRef),
    title: redactBuildModeText(section.title),
  })),
  source: coerceEnumValue(bundle.source, promptBundleSources, "Workspace"),
  version: redactBuildModeText(bundle.version),
});

const sanitizePromptExecutionContext = (
  context: BuildModePromptExecutionContext | undefined,
): BuildModePromptExecutionContext | undefined =>
  context
    ? {
        ...context,
        promptBundleId: redactBuildModeText(context.promptBundleId),
        promptBundlePolicy: coerceEnumValue(
          context.promptBundlePolicy,
          promptBundlePolicies,
          "review-required",
        ),
        promptBundleReceiptIds: sanitizeStringRefs(
          context.promptBundleReceiptIds,
        ),
        promptBundleVersion: redactBuildModeText(context.promptBundleVersion),
        promptProfileId: redactBuildModeText(context.promptProfileId),
        promptProfileName: redactBuildModeText(context.promptProfileName),
      }
    : context;

const sanitizeWorkflowMcpBinding = (
  binding: WorkflowMcpBinding,
): WorkflowMcpBinding => ({
  ...binding,
  execModuleId: redactBuildModeText(binding.execModuleId),
  id: redactBuildModeText(binding.id),
  inputContractRef: redactBuildModeText(binding.inputContractRef),
  receiptIds: sanitizeStringRefs(binding.receiptIds ?? []),
  serverName: redactBuildModeText(binding.serverName),
  toolName: redactBuildModeText(binding.toolName),
  workflowRef: redactBuildModeText(binding.workflowRef),
});

const sanitizeCapability = (
  capability: ValorTaskBridgePayload["capabilities"][number],
): ValorTaskBridgePayload["capabilities"][number] => ({
  ...capability,
  id: redactBuildModeText(capability.id),
  kind: coerceEnumValue(capability.kind, capabilityKinds, "workflow"),
  label: redactBuildModeText(capability.label),
  receiptIds: sanitizeStringRefs(capability.receiptIds ?? []),
  risk: coerceEnumValue(capability.risk, riskLevels, "high"),
});

const sanitizeGuardrail = (
  guardrail: ValorTaskBridgePayload["guardrails"][number],
): ValorTaskBridgePayload["guardrails"][number] => ({
  ...guardrail,
  enforcement: coerceEnumValue(
    guardrail.enforcement,
    guardrailEnforcements,
    "hard-block",
  ),
  id: redactBuildModeText(guardrail.id),
  label: redactBuildModeText(guardrail.label),
  receiptIds: sanitizeStringRefs(guardrail.receiptIds ?? []),
  summary: redactBuildModeText(guardrail.summary),
});

const sanitizeToolPermission = (
  permission: ValorTaskBridgePayload["toolPermissions"][number],
): ValorTaskBridgePayload["toolPermissions"][number] => ({
  ...permission,
  approvalThreshold: coerceEnumValue(
    permission.approvalThreshold,
    approvalThresholds,
    "operator",
  ),
  capabilityId: redactBuildModeText(permission.capabilityId),
  decision: coerceEnumValue(permission.decision, permissionDecisions, "deny"),
  id: redactBuildModeText(permission.id),
  label: redactBuildModeText(permission.label),
  reason: redactBuildModeText(permission.reason),
  receiptIds: sanitizeStringRefs(permission.receiptIds ?? []),
  scopeRefs: sanitizeStringRefs(permission.scopeRefs),
});

const sanitizeCommandPolicyRule = (
  rule: ValorTaskBridgePayload["commandPolicyRules"][number],
): ValorTaskBridgePayload["commandPolicyRules"][number] => ({
  ...rule,
  commandKinds: rule.commandKinds?.map((kind) =>
    coerceEnumValue(kind, commandKinds, "workflow"),
  ),
  effect: coerceEnumValue(rule.effect, commandPolicyEffects, "deny"),
  id: redactBuildModeText(rule.id),
  label: redactBuildModeText(rule.label),
  pattern: redactBuildModeText(rule.pattern),
  reason: redactBuildModeText(rule.reason),
  receiptIds: sanitizeStringRefs(rule.receiptIds ?? []),
});

const sanitizeCheckpoint = (
  checkpoint: ValorTaskBridgePayload["checkpoints"][number],
): ValorTaskBridgePayload["checkpoints"][number] => ({
  ...checkpoint,
  commandId: redactOptionalBuildModeText(checkpoint.commandId),
  createdAt: redactOptionalBuildModeText(checkpoint.createdAt),
  hash: redactOptionalBuildModeText(checkpoint.hash),
  id: redactBuildModeText(checkpoint.id),
  label: redactBuildModeText(checkpoint.label),
  receiptIds: sanitizeStringRefs(checkpoint.receiptIds),
  rollbackCommandId: redactOptionalBuildModeText(checkpoint.rollbackCommandId),
  status: coerceEnumValue(checkpoint.status, checkpointStatuses, "planned"),
  summary: redactBuildModeText(checkpoint.summary),
});

const sanitizeSafeEditPlan = (
  plan: ValorTaskBridgePayload["safeEditPlans"][number],
): ValorTaskBridgePayload["safeEditPlans"][number] => ({
  ...plan,
  commandId: redactBuildModeText(plan.commandId),
  id: redactBuildModeText(plan.id),
  label: redactBuildModeText(plan.label),
  protectedPaths: sanitizeStringRefs(plan.protectedPaths),
  receiptIds: sanitizeStringRefs(plan.receiptIds),
  status: coerceEnumValue(plan.status, safeEditStatuses, "blocked"),
  summary: redactBuildModeText(plan.summary),
  targetPaths: sanitizeStringRefs(plan.targetPaths),
  tool: coerceEnumValue(plan.tool, safeEditTools, "psr.edit"),
});

const sanitizeSwarmRoleAssignment = (
  assignment: ValorTaskBridgePayload["swarmRoles"][number],
): ValorTaskBridgePayload["swarmRoles"][number] => ({
  ...assignment,
  currentFocus: redactBuildModeText(assignment.currentFocus),
  owner: redactBuildModeText(assignment.owner),
  role: coerceEnumValue(assignment.role, swarmRoleValues, "Supervisor"),
  status: coerceEnumValue(assignment.status, swarmStatuses, "blocked"),
});

const sanitizeAgentLoopPhase = (
  phase: BuildModeAgentLoopPhase,
): BuildModeAgentLoopPhase => ({
  ...phase,
  capabilityIds: sanitizeStringRefs(phase.capabilityIds),
  id: redactBuildModeText(phase.id),
  label: redactBuildModeText(phase.label),
  receiptIds: sanitizeStringRefs(phase.receiptIds),
  status: coerceEnumValue(phase.status, agentLoopStatuses, "blocked"),
});

const sanitizeAgentRuntimeBinding = (
  runtime: BuildModeAgentRuntimeBinding,
): BuildModeAgentRuntimeBinding => ({
  ...runtime,
  id: redactBuildModeText(runtime.id),
  label: redactBuildModeText(runtime.label),
  loopPhaseIds: sanitizeStringRefs(runtime.loopPhaseIds),
  handoffPolicy: coerceEnumValue(
    runtime.handoffPolicy,
    handoffPolicies,
    "operator-approved",
  ),
  ownerRole: coerceEnumValue(runtime.ownerRole, swarmRoleValues, "Supervisor"),
  promptProfileId: redactBuildModeText(runtime.promptProfileId),
  providerRoute: coerceProviderRoute(runtime.providerRoute),
  receiptIds: sanitizeStringRefs(runtime.receiptIds),
  runtime: coerceEnumValue(runtime.runtime, runtimeKinds, "ValorIDE"),
  status: coerceEnumValue(runtime.status, runtimeStatuses, "blocked"),
});

const sanitizeLocalModelRuntimeBinding = (
  runtime: BuildModeLocalModelRuntimeBinding,
): BuildModeLocalModelRuntimeBinding => ({
  ...runtime,
  capabilityIds: sanitizeStringRefs(runtime.capabilityIds),
  endpointRef: redactBuildModeText(runtime.endpointRef),
  executionMode: coerceEnumValue(
    runtime.executionMode,
    localModelExecutionModes,
    "workspace-local",
  ),
  healthCheckCommandId: redactBuildModeText(runtime.healthCheckCommandId),
  id: redactBuildModeText(runtime.id),
  label: redactBuildModeText(runtime.label),
  modelRef: redactBuildModeText(runtime.modelRef),
  providerCredentialId: redactBuildModeText(runtime.providerCredentialId),
  receiptIds: sanitizeStringRefs(runtime.receiptIds),
  runtimeId: redactBuildModeText(runtime.runtimeId),
  status: coerceEnumValue(runtime.status, runtimeStatuses, "blocked"),
});

const sanitizeThorApiVaixBinding = (
  binding: ValorTaskBridgePayload["thorApiVaixBindings"][number],
): ValorTaskBridgePayload["thorApiVaixBindings"][number] => ({
  ...binding,
  clientRef: redactBuildModeText(binding.clientRef),
  editableAdapterPaths: sanitizeStringRefs(binding.editableAdapterPaths),
  generatedPaths: sanitizeStringRefs(binding.generatedPaths),
  id: redactBuildModeText(binding.id),
  operationRefs: sanitizeStringRefs(binding.operationRefs),
  policy: coerceEnumValue(binding.policy, thorApiVaixPolicies, "blocked"),
  receiptIds: sanitizeStringRefs(binding.receiptIds),
  serviceName: redactBuildModeText(binding.serviceName),
  surface: coerceEnumValue(binding.surface, thorApiVaixSurfaces, "ThorAPI"),
});

const sanitizeAutonomyPolicy = (
  policy: ValorTaskBridgePayload["autonomyPolicy"],
): ValorTaskBridgePayload["autonomyPolicy"] => ({
  ...policy,
  allowedCapabilityIds: sanitizeStringRefs(policy.allowedCapabilityIds),
  approvalRequiredCapabilityIds: sanitizeStringRefs(
    policy.approvalRequiredCapabilityIds,
  ),
  escalationRefs: sanitizeStringRefs(policy.escalationRefs),
  id: redactBuildModeText(policy.id),
  label: redactBuildModeText(policy.label),
  mode: coerceEnumValue(policy.mode, autonomyModes, "disabled"),
  receiptIds: sanitizeStringRefs(policy.receiptIds ?? []),
  stopConditions: sanitizeStringRefs(policy.stopConditions),
});

const sanitizeReadinessGate = (
  gate: BuildModeReadinessGate,
): BuildModeReadinessGate => ({
  ...gate,
  commandIds: sanitizeStringRefs(gate.commandIds),
  evidenceArtifactIds: sanitizeStringRefs(gate.evidenceArtifactIds),
  id: redactBuildModeText(gate.id),
  label: redactBuildModeText(gate.label),
  requiredCapabilityIds: sanitizeStringRefs(gate.requiredCapabilityIds),
  requiredReceiptIds: sanitizeStringRefs(gate.requiredReceiptIds),
  status: coerceEnumValue(gate.status, readinessGateStatuses, "blocked"),
  summary: redactBuildModeText(gate.summary),
});

const sanitizeExecutionPlanStep = (
  step: BuildModeExecutionPlanStep,
): BuildModeExecutionPlanStep => ({
  ...step,
  commandIds: sanitizeStringRefs(step.commandIds),
  dependencyStepIds: sanitizeStringRefs(step.dependencyStepIds),
  id: redactBuildModeText(step.id),
  label: redactBuildModeText(step.label),
  nextAction: redactBuildModeText(step.nextAction),
  readinessGateIds: sanitizeStringRefs(step.readinessGateIds),
  receiptIds: sanitizeStringRefs(step.receiptIds),
  runtimeId: redactBuildModeText(step.runtimeId),
  status: coerceEnumValue(step.status, executionPlanStatuses, "blocked"),
  summary: redactBuildModeText(step.summary),
});

const sanitizeAppBundleDiff = (diff: AppBundleDiff): AppBundleDiff => ({
  ...diff,
  addedArtifacts: sanitizeStringRefs(diff.addedArtifacts),
  appBundleId: redactBuildModeText(diff.appBundleId),
  changedArtifacts: sanitizeStringRefs(diff.changedArtifacts),
  evidenceArtifactIds: sanitizeStringRefs(diff.evidenceArtifactIds),
  generatedAt: redactBuildModeText(diff.generatedAt),
  id: redactBuildModeText(diff.id),
  receiptIds: sanitizeStringRefs(diff.receiptIds),
  removedArtifacts: sanitizeStringRefs(diff.removedArtifacts),
  title: redactBuildModeText(diff.title),
});

const sanitizeBrowserVerification = (
  verification: BrowserVerificationStatus,
): BrowserVerificationStatus => ({
  ...verification,
  artifactIds: verification.artifactIds.map(redactBuildModeText),
  previewUrl: verification.previewUrl
    ? redactBuildModeText(verification.previewUrl)
    : verification.previewUrl,
  screenshotReceiptId: verification.screenshotReceiptId
    ? redactBuildModeText(verification.screenshotReceiptId)
    : verification.screenshotReceiptId,
  status: coerceEnumValue(verification.status, browserStatuses, "failed"),
});

export const deriveAppBundleDiffs = (value: {
  appBundle: ValorTaskBridgePayload["appBundle"];
}): AppBundleDiff[] => {
  const artifacts = value.appBundle.artifacts ?? [];
  if (!artifacts.length) {
    return [];
  }

  const addedArtifacts = artifacts
    .filter((artifact) => artifact.kind !== "editable")
    .map((artifact) => artifact.path);
  const changedArtifacts = artifacts
    .filter((artifact) => artifact.kind === "editable")
    .map((artifact) => artifact.path);

  return [
    {
      id: `app-bundle-diff-${value.appBundle.id}`,
      title: `${value.appBundle.name} generated artifact diff`,
      appBundleId: value.appBundle.id,
      generatedAt: value.appBundle.createdAt,
      addedArtifacts,
      changedArtifacts,
      removedArtifacts: [],
      receiptIds: sanitizeStringRefs(value.appBundle.receiptIds ?? []),
      evidenceArtifactIds: [],
    },
  ];
};

export const formatAppBundleDiffArtifactRef = (
  appBundle: ValorTaskBridgePayload["appBundle"],
  artifactPath: string,
): string => {
  const artifact = appBundle.artifacts?.find(
    (candidate) => candidate.path === artifactPath,
  );
  if (!artifact) {
    return artifactPath;
  }
  const proof = [
    artifact.kind,
    artifact.checksum ? `hash ${artifact.checksum}` : undefined,
  ]
    .filter(Boolean)
    .join("; ");
  return proof ? `${artifactPath} (${proof})` : artifactPath;
};

const formatAppBundleDiffArtifactList = (
  appBundle: ValorTaskBridgePayload["appBundle"],
  artifactPaths: string[],
): string =>
  artifactPaths.length
    ? artifactPaths
        .map((artifactPath) =>
          formatAppBundleDiffArtifactRef(appBundle, artifactPath),
        )
        .join(", ")
    : "none";

export const createWorkflowMcpCommand = (
  binding: WorkflowMcpBinding,
): BuildModeCommand => ({
  id: `cmd-workflow-${binding.id}`,
  kind: "workflow",
  label: `Run ${binding.toolName}`,
  command: `mcp:${binding.serverName}.${binding.toolName} execmodule:${binding.execModuleId} workflow:${binding.workflowRef} input:${binding.inputContractRef}`,
  capabilityId: "workflow.execute",
  requiresApproval: binding.approvalRequired,
  status: binding.approvalRequired ? "approval-required" : "queued",
});

export const createScheduledAutomationCommand = (
  automation: ScheduledAutomationBinding,
): BuildModeCommand => ({
  id: `cmd-automation-${automation.id}`,
  kind: "automation",
  label: `Schedule ${automation.label}`,
  command: `schedule:${automation.schedule} workflow:${automation.workflowRef}${automation.commandRef ? ` command:${automation.commandRef}` : ""}`,
  capabilityId: "automation.schedule",
  requiresApproval: automation.approvalRequired,
  status: toScheduledAutomationCommandStatus(automation),
});

const toScheduledAutomationCommandStatus = (
  automation: ScheduledAutomationBinding,
): BuildModeCommand["status"] => {
  if (automation.status === "scheduled" || automation.status === "paused") {
    return "succeeded";
  }
  if (automation.status === "blocked") {
    return "rejected";
  }
  return automation.approvalRequired ? "approval-required" : "queued";
};

export const getBuildModeCommandCatalog = (
  payload: ValorTaskBridgePayload,
): BuildModeCommand[] => {
  const latestReceiptByCommandId = getLatestReceiptByCommandId(
    payload.commandReceipts,
    { ignoreScheduledAutomationRunAttempts: true },
  );

  const commandById = new Map<string, BuildModeCommand>();
  const addCommand = (command: BuildModeCommand) => {
    if (!commandById.has(command.id)) {
      commandById.set(command.id, command);
    }
  };

  payload.commands.forEach(addCommand);
  payload.workflowMcpBindings.map(createWorkflowMcpCommand).forEach(addCommand);
  payload.scheduledAutomations
    .map(createScheduledAutomationCommand)
    .forEach(addCommand);

  return Array.from(commandById.values()).map((command) => {
    const assignedCommand = assignCommandSwarmContext(command, payload);
    const receipt = latestReceiptByCommandId.get(command.id);
    if (!receipt) {
      return assignedCommand;
    }
    return {
      ...assignedCommand,
      receiptId: receipt.id,
      status: receipt.status,
    };
  });
};

export const getBuildModeMcpToolCommands = (
  payload: ValorTaskBridgePayload,
): BuildModeCommand[] =>
  getBuildModeCommandCatalog(payload).filter(
    (command) => command.kind === "mcp" || command.capabilityId === "mcp.tool",
  );

const readMetadataString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length ? value : undefined;

export const getBuildModeMcpToolTarget = (
  command: BuildModeCommand,
  receipt?: BuildModeCommandReceipt,
): { serverName?: string; toolName?: string } => {
  const artifact = receipt?.artifacts?.find(
    (item) =>
      item.kind === "mcp_result" &&
      item.commandId === command.id &&
      (!item.receiptId || item.receiptId === receipt.id),
  );
  const serverName = readMetadataString(artifact?.metadata?.serverName);
  const toolName = readMetadataString(artifact?.metadata?.toolName);
  if (serverName || toolName) {
    return { serverName, toolName };
  }

  const target = command.command.match(/\bmcp:([^\s]+)/)?.[1];
  if (!target) {
    return {};
  }
  const separatorIndex = target.indexOf(".");
  if (separatorIndex < 1 || separatorIndex >= target.length - 1) {
    return { serverName: target };
  }
  return {
    serverName: target.slice(0, separatorIndex),
    toolName: target.slice(separatorIndex + 1),
  };
};

export const formatBuildModeMcpToolCommandLine = (
  command: BuildModeCommand,
  receipt?: BuildModeCommandReceipt,
): string => {
  const target = getBuildModeMcpToolTarget(command, receipt);
  const artifact = receipt?.artifacts?.find(
    (item) =>
      item.kind === "mcp_result" &&
      item.commandId === command.id &&
      (!item.receiptId || item.receiptId === receipt.id),
  );
  const metadata = artifact?.metadata;
  const proof = [
    target.serverName && target.toolName
      ? `${target.serverName}.${target.toolName}`
      : target.serverName,
    `status ${command.status}`,
    `capability ${command.capabilityId}`,
    command.assignedSwarmRole ? `role ${command.assignedSwarmRole}` : undefined,
    command.assignedRuntimeId ? `runtime ${command.assignedRuntimeId}` : undefined,
    receipt ? `receipt ${receipt.id}` : "receipt none",
    artifact ? `artifact ${artifact.id}` : undefined,
    readMetadataString(metadata?.status)
      ? `result ${readMetadataString(metadata?.status)}`
      : undefined,
    readMetadataString(metadata?.executionId)
      ? `execution ${readMetadataString(metadata?.executionId)}`
      : undefined,
    readMetadataString(metadata?.traceId)
      ? `trace ${readMetadataString(metadata?.traceId)}`
      : undefined,
    typeof metadata?.resourceCount === "number"
      ? `resources ${metadata.resourceCount}`
      : undefined,
  ].filter(Boolean);

  return `${command.label}: ${proof.join("; ")}`;
};

const assignCommandSwarmContext = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): BuildModeCommand => {
  if (
    command.assignedSwarmRole &&
    command.assignedRuntimeId &&
    command.executionPlanStepId
  ) {
    return command;
  }
  const assignment = getBuildModeCommandSwarmAssignment(
    command.id,
    payload.executionPlan,
    payload.agentRuntimes,
  );
  if (!assignment) {
    return command;
  }
  return {
    ...command,
    assignedRuntimeId: command.assignedRuntimeId ?? assignment.runtimeId,
    assignedSwarmRole: command.assignedSwarmRole ?? assignment.swarmRole,
    executionPlanStepId: command.executionPlanStepId ?? assignment.stepId,
  };
};

export const getBuildModeCommandSwarmAssignment = (
  commandId: string,
  executionPlan: BuildModeExecutionPlanStep[],
  agentRuntimes: BuildModeAgentRuntimeBinding[],
):
  | {
      runtimeId: string;
      stepId: string;
      swarmRole: BuildModeAgentRuntimeBinding["ownerRole"];
    }
  | undefined => {
  const step = executionPlan.find((item) =>
    item.commandIds.includes(commandId),
  );
  if (!step) {
    return undefined;
  }
  const runtime = agentRuntimes.find((item) => item.id === step.runtimeId);
  if (!runtime) {
    return undefined;
  }
  return {
    runtimeId: runtime.id,
    stepId: step.id,
    swarmRole: runtime.ownerRole,
  };
};

export const getBuildModePromptExecutionContext = (
  payload: ValorTaskBridgePayload,
  promptProfileId: string = payload.selectedPromptProfileId,
): BuildModePromptExecutionContext => {
  const promptProfile =
    payload.promptProfiles.find((profile) => profile.id === promptProfileId) ??
    payload.promptProfiles.find(
      (profile) => profile.id === payload.selectedPromptProfileId,
    ) ??
    payload.promptProfiles[0];
  const promptBundle =
    payload.promptBundles.find(
      (bundle) => bundle.id === promptProfile?.promptBundleRef,
    ) ??
    payload.promptBundles.find(
      (bundle) => bundle.id === payload.selectedPromptBundleId,
    ) ??
    payload.promptBundles[0];

  return {
    promptProfileId:
      promptProfile?.id ?? promptProfileId ?? payload.selectedPromptProfileId,
    promptProfileName: promptProfile?.name ?? "Unknown Prompt Profile",
    promptBundleId:
      promptBundle?.id ??
      promptProfile?.promptBundleRef ??
      payload.selectedPromptBundleId,
    promptBundleVersion: promptBundle?.version ?? "unknown",
    promptBundlePolicy: promptBundle?.policy ?? "review-required",
    promptBundleReceiptIds: promptBundle?.receiptIds ?? [],
  };
};

const isScheduledAutomationRunAttemptReceipt = (
  receipt: BuildModeCommandReceipt,
): boolean =>
  Boolean(
    receipt.commandId.startsWith("cmd-automation-") &&
      receipt.artifacts?.some((artifact) =>
        ["failed", "skipped", "succeeded"].includes(
          String(artifact.metadata?.automationRunStatus ?? ""),
        ),
      ),
  );

const getLatestReceiptByCommandId = (
  receipts: BuildModeCommandReceipt[],
  options: { ignoreScheduledAutomationRunAttempts?: boolean } = {},
): Map<string, BuildModeCommandReceipt> => {
  const latestReceiptByCommandId = new Map<string, BuildModeCommandReceipt>();
  for (const receipt of receipts) {
    if (
      options.ignoreScheduledAutomationRunAttempts &&
      isScheduledAutomationRunAttemptReceipt(receipt)
    ) {
      continue;
    }
    const current = latestReceiptByCommandId.get(receipt.commandId);
    if (!current || compareReceiptCreatedAt(receipt, current) >= 0) {
      latestReceiptByCommandId.set(receipt.commandId, receipt);
    }
  }
  return latestReceiptByCommandId;
};

const compareReceiptCreatedAt = (
  left: BuildModeCommandReceipt,
  right: BuildModeCommandReceipt,
): number => getReceiptCreatedAtMs(left) - getReceiptCreatedAtMs(right);

const getReceiptCreatedAtMs = (receipt: BuildModeCommandReceipt): number => {
  const parsed = Date.parse(receipt.createdAt);
  return Number.isFinite(parsed) ? parsed : 0;
};

export interface NextBuildModeExecutionAction {
  command: BuildModeCommand;
  step: BuildModeExecutionPlanStep;
}

export interface BuildModeAutonomousQueuePlan {
  status: BuildModeAutonomyDecision["status"];
  summary: string;
  nextStepId?: string;
  nextCommandId?: string;
  dispatchableCommandIds: string[];
  approvalCommandIds: string[];
  blockedCommandIds: string[];
  blockingGateIds: string[];
  blockingReceiptIds: string[];
  commandSlotsRemaining: number;
  estimatedCreditsRemaining: number;
  requiredApprovalThreshold?: BuildModeApprovalThreshold;
  reasonCodes: string[];
  receiptRequired: boolean;
  updatedAt: string;
}

const isPendingBuildModeCommand = (command: BuildModeCommand): boolean =>
  command.status === "queued" || command.status === "approval-required";

export const getNextBuildModeExecutionAction = (
  payload: ValorTaskBridgePayload,
): NextBuildModeExecutionAction | undefined => {
  const commandById = new Map(
    getBuildModeCommandCatalog(payload).map((command) => [command.id, command]),
  );
  const stepById = new Map(
    payload.executionPlan.map((step) => [step.id, step]),
  );

  for (const step of payload.executionPlan) {
    if (!isRunnableExecutionStep(step, stepById)) {
      continue;
    }

    const command = step.commandIds
      .map((commandId) => commandById.get(commandId))
      .find(
        (item): item is BuildModeCommand =>
          Boolean(item) && isPendingBuildModeCommand(item),
      );
    if (command) {
      return { command, step };
    }
  }

  return undefined;
};

const getNextPendingBuildModeExecutionAction = (
  payload: ValorTaskBridgePayload,
): NextBuildModeExecutionAction | undefined => {
  const commandById = new Map(
    getBuildModeCommandCatalog(payload).map((command) => [command.id, command]),
  );
  const stepById = new Map(
    payload.executionPlan.map((step) => [step.id, step]),
  );

  for (const step of payload.executionPlan) {
    if (
      step.status !== "pending" ||
      !step.dependencyStepIds.every(
        (dependencyId) => stepById.get(dependencyId)?.status === "complete",
      )
    ) {
      continue;
    }

    const command = step.commandIds
      .map((commandId) => commandById.get(commandId))
      .find(
        (item): item is BuildModeCommand =>
          Boolean(item) && isPendingBuildModeCommand(item),
      );
    if (command) {
      return { command, step };
    }
  }

  return undefined;
};

export const deriveBuildModeAutonomyDecision = (
  payload: ValorTaskBridgePayload,
): BuildModeAutonomyDecision => {
  const nextExecutionAction = getNextBuildModeExecutionAction(payload);
  const nextPendingExecutionAction = nextExecutionAction
    ? undefined
    : getNextPendingBuildModeExecutionAction(payload);
  const currentConsecutiveCommands = getBuildModeCurrentConsecutiveCommandCount(
    payload.commandReceipts,
  );
  const latestCommandReceipts = Array.from(
    getLatestReceiptByCommandId(payload.commandReceipts).values(),
  );
  const failedReceipt = latestCommandReceipts.find((receipt) =>
    ["failed", "rejected"].includes(receipt.status),
  );
  const commandSlotsRemaining =
    payload.autonomyPolicy.maxConsecutiveCommands - currentConsecutiveCommands;
  const estimatedCreditsRemaining =
    payload.autonomyPolicy.maxEstimatedCredits -
    payload.creditEstimate.estimatedCredits;
  const nextCommand =
    nextExecutionAction?.command ?? nextPendingExecutionAction?.command;
  const nextStep = nextExecutionAction?.step ?? nextPendingExecutionAction?.step;
  const pendingApprovalReceipt = nextCommand
    ? latestCommandReceipts.find(
        (receipt) =>
          receipt.status === "approval-required" &&
          receipt.commandId === nextCommand.id,
      )
    : undefined;
  const blockingReceiptIds = [
    ...latestCommandReceipts
      .filter((receipt) => ["failed", "rejected"].includes(receipt.status))
      .map((receipt) => receipt.id),
    ...(pendingApprovalReceipt ? [pendingApprovalReceipt.id] : []),
  ];
  const blockingGateIds = nextStep
    ? nextStep.readinessGateIds.filter((gateId) => {
        const gate = payload.readinessGates.find((item) => item.id === gateId);
        return Boolean(
          gate &&
            gate.blocksRun &&
            gate.status !== "passed" &&
            (!nextCommand || !gate.commandIds.includes(nextCommand.id)),
        );
      })
    : [];
  const nextCapabilityId = nextCommand?.capabilityId;
  const secretPreflight = nextCommand
    ? evaluateSecretPreflight(nextCommand)
    : undefined;
  const commandPolicyPreflight = nextCommand
    ? evaluateCommandPolicyPreflight(nextCommand, payload.commandPolicyRules)
    : undefined;
  const builtInApprovalPreflight = nextCommand
    ? evaluateBuiltInApprovalPreflight(nextCommand)
    : undefined;
  const connectorMutationPreflight = nextCommand
    ? evaluateConnectorMutationPreflight(nextCommand)
    : undefined;
  const thorApiVaixPreflight = nextCommand
    ? evaluateThorApiVaixLauncherPreflight(nextCommand)
    : undefined;
  const fileSafetyPreflight = nextCommand
    ? evaluateFileSafetyPreflight(nextCommand, payload)
    : undefined;
  const ownershipPreflight =
    nextCommand && nextStep
      ? evaluateRuntimeOwnershipPreflight(nextCommand, nextStep, payload)
      : undefined;
  const receiptProofPreflight =
    payload.autonomyPolicy.receiptRequired && nextStep
      ? evaluateDependencyReceiptProofPreflight(
          nextStep,
          payload.executionPlan,
          getBuildModeCommandCatalog(payload),
          payload.commandReceipts,
          payload.checkpoints,
        )
      : undefined;
  const contextPackPreflight = nextExecutionAction
    ? evaluateGrayMatterContextPackPreflight(payload.grayMatterContextPack)
    : undefined;
  const nextCapabilityAllowed = Boolean(
    !nextCapabilityId ||
      payload.autonomyPolicy.allowedCapabilityIds.length === 0 ||
      payload.autonomyPolicy.allowedCapabilityIds.includes(nextCapabilityId),
  );
  const deniedToolPermission = nextCapabilityId
    ? payload.toolPermissions.find(
        (permission) =>
          permission.capabilityId === nextCapabilityId &&
          permission.decision === "deny",
      )
    : undefined;
  const approvalRequiredToolPermission = nextCapabilityId
    ? payload.toolPermissions.find(
        (permission) =>
          permission.capabilityId === nextCapabilityId &&
          permission.decision === "approval-required",
      )
    : undefined;
  const nextCommandKindRequiresApproval = Boolean(
    nextCommand &&
      (nextCommand.kind === "edit" || nextCommand.kind === "deploy"),
  );
  const nextRequiresApproval = Boolean(
    nextCommand &&
      (nextCommand.requiresApproval ||
        nextCommand.status === "approval-required" ||
        nextCommandKindRequiresApproval ||
        builtInApprovalPreflight ||
        approvalRequiredToolPermission ||
        payload.autonomyPolicy.approvalRequiredCapabilityIds.includes(
          nextCommand.capabilityId,
        )),
  );
  const requiredApprovalThreshold = nextCommand
    ? getRequiredApprovalThreshold(payload, nextCommand)
    : undefined;

  let status: BuildModeAutonomyDecision["status"] = "continue";
  let summary = "Autonomy can continue with the next runbook command.";
  const reasonCodes = [
    `mode:${payload.autonomyPolicy.mode}`,
    `slots-remaining:${commandSlotsRemaining}`,
    `estimated-credits-remaining:${estimatedCreditsRemaining}`,
  ];

  if (payload.autonomyPolicy.mode === "disabled") {
    status = "disabled";
    summary = `Autonomy is disabled by ${payload.autonomyPolicy.label}.`;
    reasonCodes.push("autonomy-disabled");
  } else if (contextPackPreflight) {
    status = "blocked";
    summary = contextPackPreflight.reason;
    reasonCodes.push(contextPackPreflight.reasonCode);
  } else if (failedReceipt) {
    status = "blocked";
    summary = `Autonomy is blocked by ${failedReceipt.commandId} (${failedReceipt.status}).`;
    reasonCodes.push(`blocked-receipt:${failedReceipt.commandId}`);
  } else if (commandSlotsRemaining <= 0) {
    status = "blocked";
    summary = "Autonomy is blocked by the consecutive command cap.";
    reasonCodes.push("command-cap-reached");
  } else if (estimatedCreditsRemaining < 0) {
    status = "blocked";
    summary = "Autonomy is blocked by the estimated credit cap.";
    reasonCodes.push("credit-cap-exceeded");
  } else if (nextPendingExecutionAction) {
    status = "blocked";
    summary = `Autonomy is waiting for execution step ${nextPendingExecutionAction.step.label} to become ready.`;
    reasonCodes.push(`plan-step-pending:${nextPendingExecutionAction.step.id}`);
  } else if (!nextExecutionAction) {
    status = "complete";
    summary = "No runnable Build Mode execution step remains.";
    reasonCodes.push("runbook-complete");
  } else if (secretPreflight) {
    status = "blocked";
    summary = secretPreflight.reason;
    reasonCodes.push(secretPreflight.reasonCode);
  } else if (commandPolicyPreflight?.decision === "reject") {
    status = "blocked";
    summary = commandPolicyPreflight.reason;
    reasonCodes.push(commandPolicyPreflight.reasonCode);
  } else if (connectorMutationPreflight) {
    status = "blocked";
    summary = connectorMutationPreflight.reason;
    reasonCodes.push(connectorMutationPreflight.reasonCode);
  } else if (thorApiVaixPreflight) {
    status = "blocked";
    summary = thorApiVaixPreflight.reason;
    reasonCodes.push(thorApiVaixPreflight.reasonCode);
  } else if (fileSafetyPreflight) {
    status = "blocked";
    summary = fileSafetyPreflight.reason;
    reasonCodes.push(fileSafetyPreflight.reasonCode);
  } else if (ownershipPreflight) {
    status = "blocked";
    summary = ownershipPreflight.reason;
    reasonCodes.push(...ownershipPreflight.reasonCodes);
  } else if (receiptProofPreflight) {
    status = "blocked";
    summary = receiptProofPreflight.reason;
    reasonCodes.push(...receiptProofPreflight.reasonCodes);
    blockingReceiptIds.push(...receiptProofPreflight.receiptIds);
  } else if (!nextCapabilityAllowed && nextCapabilityId) {
    status = "blocked";
    summary = `Autonomy is blocked because ${nextCapabilityId} is outside the allow list.`;
    reasonCodes.push(`capability-not-allowed:${nextCapabilityId}`);
  } else if (deniedToolPermission) {
    status = "blocked";
    summary =
      deniedToolPermission.reason ||
      `Autonomy is blocked because ${deniedToolPermission.capabilityId} is denied.`;
    reasonCodes.push(`tool-denied:${deniedToolPermission.capabilityId}`);
  } else if (blockingGateIds.length) {
    status = "blocked";
    summary = `Autonomy is blocked by readiness gates: ${blockingGateIds.join(", ")}.`;
    reasonCodes.push(...blockingGateIds.map((id) => `blocking-gate:${id}`));
  } else if (
    payload.autonomyPolicy.mode === "manual" ||
    pendingApprovalReceipt ||
    commandPolicyPreflight?.decision === "approval-required" ||
    builtInApprovalPreflight ||
    nextRequiresApproval
  ) {
    status = "approval-required";
    summary = nextCommand
      ? `Operator approval is required before running ${nextCommand.label}.`
      : "Operator approval is required before autonomy can continue.";
    if (payload.autonomyPolicy.mode === "manual") {
      reasonCodes.push("manual-mode");
    }
    if (pendingApprovalReceipt) {
      reasonCodes.push(`pending-approval:${pendingApprovalReceipt.commandId}`);
    }
    if (commandPolicyPreflight?.decision === "approval-required") {
      reasonCodes.push(commandPolicyPreflight.reasonCode);
    }
    if (builtInApprovalPreflight) {
      reasonCodes.push(builtInApprovalPreflight.reasonCode);
    }
    if (approvalRequiredToolPermission) {
      reasonCodes.push(
        `tool-approval-required:${approvalRequiredToolPermission.capabilityId}`,
      );
    }
    if (nextCommandKindRequiresApproval && nextCommand) {
      reasonCodes.push(`command-kind-approval:${nextCommand.kind}`);
    }
    if (nextCommand) {
      reasonCodes.push(`next-command:${nextCommand.id}`);
    }
  } else if (nextCommand) {
    reasonCodes.push(`next-command:${nextCommand.id}`);
  }

  return {
    status,
    summary,
    nextStepId: nextStep?.id,
    nextCommandId: nextCommand?.id,
    capabilityId: nextCapabilityId,
    requiredApprovalThreshold:
      status === "approval-required" ? requiredApprovalThreshold : undefined,
    commandSlotsRemaining,
    estimatedCreditsRemaining,
    blockingGateIds,
    blockingReceiptIds,
    reasonCodes,
    escalationRefs: payload.autonomyPolicy.escalationRefs,
    updatedAt: getLatestAutonomyDecisionTimestamp(payload),
  };
};

export const deriveBuildModeAutonomousQueuePlan = (
  payload: ValorTaskBridgePayload,
): BuildModeAutonomousQueuePlan => {
  const decision = deriveBuildModeAutonomyDecision(payload);
  const nextExecutionAction = getNextBuildModeExecutionAction(payload);
  const nextCommandId =
    nextExecutionAction?.command.id ?? decision.nextCommandId;
  return {
    status: decision.status,
    summary: decision.summary,
    nextStepId: decision.nextStepId,
    nextCommandId: decision.nextCommandId,
    dispatchableCommandIds:
      decision.status === "continue" && nextCommandId ? [nextCommandId] : [],
    approvalCommandIds:
      decision.status === "approval-required" && nextCommandId
        ? [nextCommandId]
        : [],
    blockedCommandIds:
      decision.status === "blocked" && nextCommandId ? [nextCommandId] : [],
    blockingGateIds: decision.blockingGateIds,
    blockingReceiptIds: decision.blockingReceiptIds,
    commandSlotsRemaining: decision.commandSlotsRemaining,
    estimatedCreditsRemaining: decision.estimatedCreditsRemaining,
    requiredApprovalThreshold: decision.requiredApprovalThreshold,
    reasonCodes: decision.reasonCodes,
    receiptRequired: payload.autonomyPolicy.receiptRequired,
    updatedAt: decision.updatedAt,
  };
};

export const getBuildModeCurrentConsecutiveCommandCount = (
  receipts: BuildModeCommandReceipt[],
): number => {
  const sortedReceipts = [...receipts].sort((left, right) =>
    compareReceiptCreatedAt(right, left),
  );
  let count = 0;
  for (const receipt of sortedReceipts) {
    if (isScheduledAutomationRunAttemptReceipt(receipt)) {
      continue;
    }
    if (["failed", "rejected", "approval-required"].includes(receipt.status)) {
      break;
    }
    count += 1;
  }
  return count;
};

interface DependencyReceiptProofPreflightResult {
  reason: string;
  reasonCodes: string[];
  receiptIds: string[];
}

interface RuntimeOwnershipPreflightResult {
  reason: string;
  reasonCodes: string[];
}

const evaluateRuntimeOwnershipPreflight = (
  command: BuildModeCommand,
  step: BuildModeExecutionPlanStep,
  payload: ValorTaskBridgePayload,
): RuntimeOwnershipPreflightResult | undefined => {
  const reasons: string[] = [];
  const reasonCodes: string[] = [];

  if (!payload.agentRuntimes.length) {
    reasons.push("agent runtime registry is missing");
    reasonCodes.push("runtime-registry-missing");
  }
  if (!payload.swarmRoles.length) {
    reasons.push("swarm role registry is missing");
    reasonCodes.push("swarm-role-registry-missing");
  }

  if (!command.executionPlanStepId) {
    reasons.push(`${command.id} is missing executionPlanStepId`);
    reasonCodes.push(`execution-step-missing:${command.id}`);
  } else if (command.executionPlanStepId !== step.id) {
    reasons.push(
      `${command.id} executionPlanStepId ${command.executionPlanStepId} does not match ${step.id}`,
    );
    reasonCodes.push(`execution-step-mismatch:${command.id}`);
  }

  const runtime = command.assignedRuntimeId
    ? payload.agentRuntimes.find(
        (candidate) => candidate.id === command.assignedRuntimeId,
      )
    : undefined;
  if (!command.assignedRuntimeId) {
    reasons.push(`${command.id} is missing assignedRuntimeId`);
    reasonCodes.push(`runtime-missing:${command.id}`);
  } else {
    if (command.assignedRuntimeId !== step.runtimeId) {
      reasons.push(
        `${command.id} assignedRuntimeId ${command.assignedRuntimeId} does not match ${step.runtimeId}`,
      );
      reasonCodes.push(`runtime-step-mismatch:${command.id}`);
    }
    if (!runtime) {
      reasons.push(
        `${command.id} references missing agentRuntime ${command.assignedRuntimeId}`,
      );
      reasonCodes.push(`runtime-not-found:${command.assignedRuntimeId}`);
    } else if (!isDispatchableRuntimeStatus(runtime.status)) {
      reasons.push(
        `${command.id} agentRuntime ${runtime.id} is ${runtime.status}`,
      );
      reasonCodes.push(`runtime-unavailable:${runtime.id}`);
    }
  }

  const role = command.assignedSwarmRole
    ? payload.swarmRoles.find(
        (candidate) => candidate.role === command.assignedSwarmRole,
      )
    : undefined;
  if (!command.assignedSwarmRole) {
    reasons.push(`${command.id} is missing assignedSwarmRole`);
    reasonCodes.push(`swarm-role-missing:${command.id}`);
  } else {
    if (!role) {
      reasons.push(
        `${command.id} references missing swarmRole ${command.assignedSwarmRole}`,
      );
      reasonCodes.push(`swarm-role-not-found:${command.assignedSwarmRole}`);
    } else if (!isDispatchableSwarmRoleStatus(role.status)) {
      reasons.push(`${command.id} swarmRole ${role.role} is ${role.status}`);
      reasonCodes.push(`swarm-role-unavailable:${role.role}`);
    }
    if (runtime && runtime.ownerRole !== command.assignedSwarmRole) {
      reasons.push(
        `${command.id} assignedSwarmRole ${command.assignedSwarmRole} does not match runtime ${runtime.id} ownerRole ${runtime.ownerRole}`,
      );
      reasonCodes.push(`runtime-owner-role-mismatch:${runtime.id}`);
    }
  }

  if (!reasons.length) {
    return undefined;
  }

  return {
    reason: `Autonomy is blocked by runtime ownership proof: ${reasons.join("; ")}.`,
    reasonCodes,
  };
};

const isDispatchableRuntimeStatus = (
  status: BuildModeAgentRuntimeBinding["status"],
): boolean => status === "available" || status === "selected";

const isDispatchableSwarmRoleStatus = (
  status: BuildModeSwarmRoleAssignment["status"],
): boolean => status === "assigned" || status === "idle";

const evaluateDependencyReceiptProofPreflight = (
  step: BuildModeExecutionPlanStep,
  executionPlan: BuildModeExecutionPlanStep[],
  commandCatalog: BuildModeCommand[],
  commandReceipts: BuildModeCommandReceipt[],
  checkpoints: ValorTaskBridgePayload["checkpoints"],
): DependencyReceiptProofPreflightResult | undefined => {
  const dependencySteps = collectDependencySteps(step, executionPlan);
  const dependencyCommandIds = new Set(
    dependencySteps.flatMap((dependency) => dependency.commandIds),
  );
  if (!dependencyCommandIds.size) {
    return undefined;
  }

  const latestReceiptByCommandId = getLatestReceiptByCommandId(commandReceipts);
  const commandById = new Map(
    commandCatalog.map((command) => [command.id, command]),
  );
  const stepByCommandId = new Map<string, BuildModeExecutionPlanStep>();
  for (const dependency of dependencySteps) {
    for (const commandId of dependency.commandIds) {
      stepByCommandId.set(commandId, dependency);
    }
  }

  for (const commandId of Array.from(dependencyCommandIds)) {
    const dependencyStep = stepByCommandId.get(commandId);
    const receipt = latestReceiptByCommandId.get(commandId);
    if (dependencyStep && !dependencyStep.receiptIds.length) {
      return {
        reason: `Autonomy is blocked because receipt proof is missing for dependency step ${dependencyStep.id}.`,
        reasonCodes: [`dependency-step-receipt-missing:${dependencyStep.id}`],
        receiptIds: [],
      };
    }
    if (!receipt) {
      return {
        reason: `Autonomy is blocked because dependency receipt proof is missing for ${commandId}.`,
        reasonCodes: [`dependency-receipt-missing:${commandId}`],
        receiptIds: [],
      };
    }
    if (receipt.status !== "succeeded") {
      return {
        reason: `Autonomy is blocked because dependency command ${commandId} latest receipt is ${receipt.status}.`,
        reasonCodes: [`dependency-receipt-not-succeeded:${commandId}`],
        receiptIds: [receipt.id],
      };
    }
    const command = commandById.get(commandId);
    if (!command) {
      return {
        reason: `Autonomy is blocked because dependency command ${commandId} is missing from the command catalog.`,
        reasonCodes: [`dependency-command-missing:${commandId}`],
        receiptIds: [receipt.id],
      };
    }
    if (command.status !== "succeeded") {
      return {
        reason: `Autonomy is blocked because dependency command ${commandId} is ${command.status}.`,
        reasonCodes: [`dependency-command-not-succeeded:${commandId}`],
        receiptIds: [receipt.id],
      };
    }
    if (command.receiptId !== receipt.id) {
      return {
        reason: `Autonomy is blocked because dependency command ${commandId} receiptId ${command.receiptId ?? "missing"} does not match latest receipt ${receipt.id}.`,
        reasonCodes: [`dependency-command-receipt-mismatch:${commandId}`],
        receiptIds: [receipt.id],
      };
    }
    if (dependencyStep && !dependencyStep.receiptIds.includes(receipt.id)) {
      return {
        reason: `Autonomy is blocked because dependency step ${dependencyStep.id} does not include latest receipt ${receipt.id}.`,
        reasonCodes: [`dependency-step-receipt-mismatch:${dependencyStep.id}`],
        receiptIds: [receipt.id],
      };
    }
    if (isMutableBuildModeDependencyCommand(command)) {
      const checkpointPreflight = evaluateMutableDependencyCheckpointPreflight(
        command,
        checkpoints,
        commandReceipts,
      );
      if (checkpointPreflight) {
        return checkpointPreflight;
      }
    }
  }

  return undefined;
};

const isMutableBuildModeDependencyCommand = (
  command: BuildModeCommand,
): boolean =>
  command.kind === "edit" ||
  command.capabilityId === "psr.edit" ||
  command.capabilityId === "filesystem.write";

const evaluateMutableDependencyCheckpointPreflight = (
  command: BuildModeCommand,
  checkpoints: ValorTaskBridgePayload["checkpoints"],
  commandReceipts: BuildModeCommandReceipt[],
): DependencyReceiptProofPreflightResult | undefined => {
  const checkpoint = checkpoints.find(
    (candidate) =>
      candidate.status === "rollback-ready" &&
      Boolean(candidate.hash) &&
      candidate.receiptIds.length > 0,
  );
  if (!checkpoint) {
    return {
      reason: `Autonomy is blocked because mutable dependency ${command.id} requires a rollback-ready checkpoint with hash and receipt proof before advancing.`,
      reasonCodes: [`mutable-dependency-checkpoint-missing:${command.id}`],
      receiptIds: [],
    };
  }

  const checkpointReceiptIds = new Set(checkpoint.receiptIds);
  const hasCheckpointArtifactProof = commandReceipts.some(
    (receipt) =>
      checkpointReceiptIds.has(receipt.id) &&
      receipt.capabilityId === "checkpoint.manage" &&
      receipt.status === "succeeded" &&
      receipt.artifacts?.some((artifact) => {
        const metadata = artifact.metadata ?? {};
        return (
          artifact.kind === "checkpoint" &&
          metadata.checkpointAction === "create" &&
          metadata.checkpointHash === checkpoint.hash
        );
      }),
  );
  if (!hasCheckpointArtifactProof) {
    return {
      reason: `Autonomy is blocked because rollback-ready checkpoint ${checkpoint.id} requires a succeeded checkpoint.manage receipt with checkpoint artifact proof before advancing past mutable dependency ${command.id}.`,
      reasonCodes: [`mutable-dependency-checkpoint-proof-missing:${command.id}`],
      receiptIds: checkpoint.receiptIds,
    };
  }

  return undefined;
};

const collectDependencySteps = (
  step: BuildModeExecutionPlanStep,
  executionPlan: BuildModeExecutionPlanStep[],
): BuildModeExecutionPlanStep[] => {
  const stepById = new Map(executionPlan.map((item) => [item.id, item]));
  const visited = new Set<string>();
  const dependencies: BuildModeExecutionPlanStep[] = [];

  const visit = (stepId: string) => {
    if (visited.has(stepId)) {
      return;
    }
    visited.add(stepId);
    const dependency = stepById.get(stepId);
    if (!dependency) {
      return;
    }
    dependencies.push(dependency);
    for (const dependencyId of dependency.dependencyStepIds) {
      visit(dependencyId);
    }
  };

  for (const dependencyId of step.dependencyStepIds) {
    visit(dependencyId);
  }
  return dependencies;
};

interface GrayMatterContextPackPreflightResult {
  reason: string;
  reasonCode: string;
}

const evaluateGrayMatterContextPackPreflight = (
  contextPack: GrayMatterContextPack,
): GrayMatterContextPackPreflightResult | undefined => {
  if (!contextPack.retrievalReceiptIds.length) {
    return {
      reason:
        "Autonomy is blocked because GrayMatter context has no retrieval receipts.",
      reasonCode: "graymatter-context-no-retrieval-receipts",
    };
  }
  if (contextPack.invariantPreflightStatus !== "passed") {
    return {
      reason: `Autonomy is blocked because GrayMatter invariant preflight is ${contextPack.invariantPreflightStatus}.`,
      reasonCode: `graymatter-invariant-preflight:${contextPack.invariantPreflightStatus}`,
    };
  }
  if (contextPack.retrievalStatus !== "ready") {
    return {
      reason: `Autonomy is blocked because GrayMatter retrieval status is ${contextPack.retrievalStatus}.`,
      reasonCode: `graymatter-retrieval:${contextPack.retrievalStatus}`,
    };
  }
  if (
    contextPack.policy === "do-not-answer" ||
    contextPack.answerPolicy === "do-not-answer"
  ) {
    return {
      reason:
        "Autonomy is blocked because GrayMatter answer policy forbids confident execution.",
      reasonCode: "graymatter-answer-policy:do-not-answer",
    };
  }
  if (
    contextPack.policy === "requires-review" ||
    contextPack.answerPolicy === "requires-review" ||
    contextPack.answerPolicy === "retry" ||
    contextPack.answerPolicy === "clarify"
  ) {
    return {
      reason: `Autonomy is blocked because GrayMatter answer policy requires review: ${contextPack.answerPolicy}.`,
      reasonCode: `graymatter-answer-policy:${contextPack.answerPolicy}`,
    };
  }
  return undefined;
};

interface SecretPreflightResult {
  reason: string;
  reasonCode: string;
}

const SECRET_ASSIGNMENT =
  /\b([A-Z0-9_]*(?:API_?KEY|TOKEN|SECRET|PASSWORD|PRIVATE_?KEY|ACCESS_?KEY)[A-Z0-9_]*)\s*=\s*("[^"]+"|'[^']+'|[^\s]+)/gi;

const SECRET_VALUE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
];

const SECRET_REDACTION = "<redacted-secret>";

const SECRET_KEY_VALUE =
  /\b((?:api[_-]?key|token|secret|password|private[_-]?key|access[_-]?key|access[_-]?token)\s*[:=]\s*)("[^"]+"|'[^']+'|[^\s,;]+)/gi;

const SECRET_QUERY_PARAM =
  /([?&](?:api[_-]?key|token|secret|password|access[_-]?key|access[_-]?token)=)([^&#\s]+)/gi;

const SECRET_URL_USERINFO =
  /\b((?:https?|wss?):\/\/)([^/?#\s@]+@)(?=[^/?#\s]+)/gi;

const AUTHORIZATION_BEARER =
  /\b(Authorization\s*:\s*Bearer\s+)[A-Za-z0-9._~+/-]{8,}=*/gi;

const redactBuildModeText = (value: string): string =>
  SECRET_VALUE_PATTERNS.reduce((text, pattern) => {
    pattern.lastIndex = 0;
    return text.replace(pattern, SECRET_REDACTION);
  }, value)
    .replace(SECRET_ASSIGNMENT, `$1=${SECRET_REDACTION}`)
    .replace(SECRET_KEY_VALUE, `$1${SECRET_REDACTION}`)
    .replace(SECRET_QUERY_PARAM, `$1${SECRET_REDACTION}`)
    .replace(SECRET_URL_USERINFO, `$1${SECRET_REDACTION}@`)
    .replace(AUTHORIZATION_BEARER, `$1${SECRET_REDACTION}`);

const findBuildModeSecretMaterialPaths = (
  value: unknown,
  path: string = "payload",
  seen: Set<unknown> = new Set(),
): string[] => {
  if (typeof value === "string") {
    return redactBuildModeText(value) === value ? [] : [path];
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
      findBuildModeSecretMaterialPaths(item, `${path}[${index}]`, seen),
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
      return findBuildModeSecretMaterialPaths(nested, nestedPath, seen);
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

const blockAutonomyForLaunchSecretMaterial = (
  decision: BuildModeAutonomyDecision,
  secretPaths: string[],
): BuildModeAutonomyDecision => ({
  ...decision,
  status: "blocked",
  summary: `Autonomy is blocked because the Build Mode launch payload contains inline secret material at ${secretPaths.join(", ")}.`,
  blockingGateIds: decision.blockingGateIds,
  blockingReceiptIds: decision.blockingReceiptIds,
  reasonCodes: [
    ...decision.reasonCodes,
    "launch-payload-secret-material",
    ...secretPaths.map((path) => `launch-secret-path:${path}`),
  ],
});

const sanitizeReceipt = (
  receipt: ValorTaskBridgePayload["receipts"][number],
): ValorTaskBridgePayload["receipts"][number] => ({
  ...receipt,
  actor: redactBuildModeText(receipt.actor),
  createdAt: redactBuildModeText(receipt.createdAt),
  id: redactBuildModeText(receipt.id),
  kind: coerceEnumValue(receipt.kind, receiptKinds, "context"),
  status: coerceEnumValue(receipt.status, receiptStatuses, "failed"),
  summary: redactBuildModeText(receipt.summary),
  targetRef: receipt.targetRef
    ? redactBuildModeText(receipt.targetRef)
    : receipt.targetRef,
  title: redactBuildModeText(receipt.title),
});

const sanitizeCreditUsageReceipt = (
  receipt: ValorTaskBridgePayload["creditUsageReceipts"][number],
): ValorTaskBridgePayload["creditUsageReceipts"][number] => ({
  ...receipt,
  capabilityId: redactBuildModeText(receipt.capabilityId),
  commandId: redactBuildModeText(receipt.commandId),
  estimateId: redactBuildModeText(receipt.estimateId),
  id: redactBuildModeText(receipt.id),
  commandStatus: coerceEnumValue(
    receipt.commandStatus,
    commandStatuses,
    "failed",
  ),
  providerRoute: coerceProviderRoute(receipt.providerRoute),
  billingSummary: receipt.billingSummary
    ? redactBuildModeText(receipt.billingSummary)
    : receipt.billingSummary,
});

const sanitizeBuildModeCommand = (
  command: BuildModeCommand,
): BuildModeCommand => ({
  ...command,
  assignedRuntimeId: command.assignedRuntimeId
    ? redactBuildModeText(command.assignedRuntimeId)
    : command.assignedRuntimeId,
  capabilityId: redactBuildModeText(command.capabilityId),
  command: redactBuildModeText(command.command),
  executionPlanStepId: command.executionPlanStepId
    ? redactBuildModeText(command.executionPlanStepId)
    : command.executionPlanStepId,
  id: redactBuildModeText(command.id),
  kind: coerceEnumValue(command.kind, commandKinds, "workflow"),
  label: redactBuildModeText(command.label),
  protectedPaths: command.protectedPaths?.map(redactBuildModeText),
  receiptId: command.receiptId
    ? redactBuildModeText(command.receiptId)
    : command.receiptId,
  assignedSwarmRole: command.assignedSwarmRole
    ? coerceEnumValue(command.assignedSwarmRole, swarmRoleValues, "Supervisor")
    : command.assignedSwarmRole,
  status: coerceEnumValue(command.status, commandStatuses, "rejected"),
  targetPaths: command.targetPaths?.map(redactBuildModeText),
});

const sanitizeFinalReport = (
  report: ValorTaskBridgePayload["finalReport"],
): ValorTaskBridgePayload["finalReport"] => ({
  ...report,
  filesChanged: report.filesChanged.map(redactBuildModeText),
  gaps: report.gaps.map(redactBuildModeText),
  nextHandoff: report.nextHandoff.map(redactBuildModeText),
  status: coerceEnumValue(report.status, finalReportStatuses, "draft"),
  testsRun: report.testsRun.map(redactBuildModeText),
  title: redactBuildModeText(report.title),
});

const sanitizeEvidenceArtifact = (
  artifact: BuildModeEvidenceArtifact,
): BuildModeEvidenceArtifact => ({
  ...artifact,
  kind: coerceEnumValue(artifact.kind, evidenceKinds, "command_stdout"),
  title: redactBuildModeText(artifact.title),
  uri: redactBuildModeText(artifact.uri),
  summary: artifact.summary
    ? redactBuildModeText(artifact.summary)
    : artifact.summary,
  metadata: artifact.metadata
    ? redactBuildModeArtifactMetadata(artifact.metadata)
    : artifact.metadata,
});

const redactBuildModeArtifactMetadata = (
  metadata: NonNullable<BuildModeEvidenceArtifact["metadata"]>,
): NonNullable<BuildModeEvidenceArtifact["metadata"]> =>
  Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      const redacted = redactBuildModeMetadataPrimitive(value, key);
      return redacted === undefined ? [] : [[key, redacted]];
    }),
  );

const redactBuildModeMetadataPrimitive = (
  value: unknown,
  key?: string,
): string | number | boolean | undefined => {
  if (typeof value === "string") {
    if (
      key &&
      secretFieldPattern.test(key) &&
      !isSecretReferenceString(value)
    ) {
      return SECRET_REDACTION;
    }
    return redactBuildModeText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return undefined;
};

const sanitizeBuildModeCommandReceipt = (
  receipt: BuildModeCommandReceipt,
): BuildModeCommandReceipt => ({
  ...receipt,
  capabilityId: redactBuildModeText(receipt.capabilityId),
  commandId: redactBuildModeText(receipt.commandId),
  createdAt: redactBuildModeText(receipt.createdAt),
  id: redactBuildModeText(receipt.id),
  status: coerceEnumValue(receipt.status, commandStatuses, "rejected"),
  summary: redactBuildModeText(receipt.summary),
  operatorActionSummary: receipt.operatorActionSummary
    ? redactBuildModeText(receipt.operatorActionSummary)
    : receipt.operatorActionSummary,
  policyReasons: receipt.policyReasons?.map(redactBuildModeText),
  executionMode: receipt.executionMode
    ? coerceEnumValue(receipt.executionMode, executionModes, "policy-blocked")
    : receipt.executionMode,
  nextOperatorAction: receipt.nextOperatorAction
    ? coerceEnumValue(receipt.nextOperatorAction, operatorActions, "inspect")
    : receipt.nextOperatorAction,
  policyDecision: receipt.policyDecision
    ? coerceEnumValue(receipt.policyDecision, policyDecisions, "reject")
    : receipt.policyDecision,
  requiredApprovalThreshold: receipt.requiredApprovalThreshold
    ? coerceEnumValue(
        receipt.requiredApprovalThreshold,
        approvalThresholds,
        "operator",
      )
    : receipt.requiredApprovalThreshold,
  approval: receipt.approval
    ? {
        ...receipt.approval,
        approverPrincipalId: redactBuildModeText(
          receipt.approval.approverPrincipalId,
        ),
        approverRoles: sanitizeStringRefs(receipt.approval.approverRoles),
        reason: redactBuildModeText(receipt.approval.reason),
        threshold: coerceEnumValue(
          receipt.approval.threshold,
          approvalThresholds,
          "operator",
        ),
      }
    : receipt.approval,
  assignedRuntimeId: redactOptionalBuildModeText(receipt.assignedRuntimeId),
  assignedSwarmRole: receipt.assignedSwarmRole
    ? coerceEnumValue(receipt.assignedSwarmRole, swarmRoleValues, "Supervisor")
    : receipt.assignedSwarmRole,
  executionPlanStepId: redactOptionalBuildModeText(receipt.executionPlanStepId),
  grayMatterContextProof: receipt.grayMatterContextProof
    ? {
        ...receipt.grayMatterContextProof,
        answerPolicy: coerceEnumValue(
          receipt.grayMatterContextProof.answerPolicy,
          grayMatterAnswerPolicies,
          "requires-review",
        ),
        contextPackId: redactBuildModeText(
          receipt.grayMatterContextProof.contextPackId,
        ),
        invariantPreflightStatus: coerceEnumValue(
          receipt.grayMatterContextProof.invariantPreflightStatus,
          grayMatterInvariantStatuses,
          "missing",
        ),
        preflightReceiptId: redactOptionalBuildModeText(
          receipt.grayMatterContextProof.preflightReceiptId,
        ),
        retrievalReceiptIds: sanitizeStringRefs(
          receipt.grayMatterContextProof.retrievalReceiptIds,
        ),
        retrievalTraceId: redactOptionalBuildModeText(
          receipt.grayMatterContextProof.retrievalTraceId,
        ),
        retrievalStatus: coerceEnumValue(
          receipt.grayMatterContextProof.retrievalStatus,
          grayMatterRetrievalStatuses,
          "blocked",
        ),
      }
    : receipt.grayMatterContextProof,
  promptContext: sanitizePromptExecutionContext(receipt.promptContext),
  scope: receipt.scope ? sanitizeScopeContext(receipt.scope) : receipt.scope,
  artifacts: receipt.artifacts?.map(sanitizeEvidenceArtifact),
  creditUsageReceipt: receipt.creditUsageReceipt
    ? {
        ...receipt.creditUsageReceipt,
        capabilityId: redactBuildModeText(
          receipt.creditUsageReceipt.capabilityId,
        ),
        commandId: redactBuildModeText(receipt.creditUsageReceipt.commandId),
        estimateId: redactBuildModeText(receipt.creditUsageReceipt.estimateId),
        id: redactBuildModeText(receipt.creditUsageReceipt.id),
        commandStatus: coerceEnumValue(
          receipt.creditUsageReceipt.commandStatus,
          commandStatuses,
          "failed",
        ),
        providerRoute: coerceProviderRoute(
          receipt.creditUsageReceipt.providerRoute,
        ),
        billingSummary: receipt.creditUsageReceipt.billingSummary
          ? redactBuildModeText(receipt.creditUsageReceipt.billingSummary)
          : receipt.creditUsageReceipt.billingSummary,
      }
    : receipt.creditUsageReceipt,
});

const sanitizeScheduledAutomationBinding = (
  automation: ScheduledAutomationBinding,
): ScheduledAutomationBinding => ({
  ...automation,
  id: redactBuildModeText(automation.id),
  label: redactBuildModeText(automation.label),
  lastRunAt: redactOptionalBuildModeText(automation.lastRunAt),
  lastRunReceiptId: redactOptionalBuildModeText(automation.lastRunReceiptId),
  lastRunStatus: automation.lastRunStatus
    ? coerceEnumValue(automation.lastRunStatus, automationRunStatuses, "failed")
    : automation.lastRunStatus,
  nextRunAt: redactOptionalBuildModeText(automation.nextRunAt),
  providerRoute: automation.providerRoute
    ? coerceProviderRoute(automation.providerRoute)
    : automation.providerRoute,
  schedule: redactBuildModeText(automation.schedule),
  workflowRef: redactBuildModeText(automation.workflowRef),
  commandRef: automation.commandRef
    ? redactBuildModeText(automation.commandRef)
    : automation.commandRef,
  promptContext: sanitizePromptExecutionContext(automation.promptContext),
  valkyraiScheduleUri: automation.valkyraiScheduleUri
    ? redactBuildModeText(automation.valkyraiScheduleUri)
    : automation.valkyraiScheduleUri,
  valkyraiWorkflowId: automation.valkyraiWorkflowId
    ? redactBuildModeText(automation.valkyraiWorkflowId)
    : automation.valkyraiWorkflowId,
  receiptIds: sanitizeStringRefs(automation.receiptIds),
  runHistory: automation.runHistory?.map((run) => ({
    ...run,
    completedAt: redactBuildModeText(run.completedAt),
    error: run.error ? redactBuildModeText(run.error) : run.error,
    receiptId: redactBuildModeText(run.receiptId),
    status: coerceEnumValue(run.status, automationRunStatuses, "failed"),
  })),
  scheduler: "valkyrai-cron",
  status: coerceEnumValue(automation.status, automationStatuses, "blocked"),
});

const evaluateSecretPreflight = (
  command: BuildModeCommand,
): SecretPreflightResult | undefined => {
  SECRET_ASSIGNMENT.lastIndex = 0;
  let match = SECRET_ASSIGNMENT.exec(command.command);
  while (match) {
    const value = match[2] ?? "";
    if (!isSecretVariableReference(value)) {
      return {
        reason:
          "Autonomy is blocked because the next command includes inline secret material.",
        reasonCode: "secret-inline-literal",
      };
    }
    match = SECRET_ASSIGNMENT.exec(command.command);
  }

  if (
    SECRET_VALUE_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(command.command);
    })
  ) {
    return {
      reason:
        "Autonomy is blocked because the next command matches a known secret token pattern.",
      reasonCode: "secret-known-token",
    };
  }

  return undefined;
};

const isSecretVariableReference = (value: string): boolean => {
  const unquoted = value.replace(/^['"]|['"]$/g, "");
  return unquoted.startsWith("$") || unquoted.startsWith("${");
};

interface CommandPolicyPreflightResult {
  decision: "allow" | "approval-required" | "reject";
  reason: string;
  reasonCode: string;
}

const evaluateCommandPolicyPreflight = (
  command: BuildModeCommand,
  rules: BuildModeCommandPolicyRule[],
): CommandPolicyPreflightResult => {
  const activeRules = rules.filter(
    (rule) =>
      rule.enabled &&
      (!rule.commandKinds?.length || rule.commandKinds.includes(command.kind)),
  );
  const allowRules = activeRules.filter((rule) => rule.effect === "allow");
  let allowMatched = allowRules.length === 0;
  let approvalRequired: CommandPolicyPreflightResult | undefined;

  for (const rule of activeRules) {
    let pattern: RegExp;
    try {
      pattern = new RegExp(rule.pattern, "i");
    } catch {
      return {
        decision: "reject",
        reason: `Command policy rule is invalid: ${rule.label}.`,
        reasonCode: `command-policy-invalid:${rule.id}`,
      };
    }

    if (!pattern.test(command.command)) {
      continue;
    }

    if (rule.effect === "allow") {
      allowMatched = true;
      continue;
    }

    if (rule.effect === "deny") {
      return {
        decision: "reject",
        reason: rule.reason || `Command matched policy rule: ${rule.label}.`,
        reasonCode: `command-policy-deny:${rule.id}`,
      };
    }

    approvalRequired = {
      decision: "approval-required",
      reason: rule.reason || `Command matched policy rule: ${rule.label}.`,
      reasonCode: `command-policy-approval:${rule.id}`,
    };
  }

  if (!allowMatched) {
    return {
      decision: "reject",
      reason: "Command is not covered by the active allow policy.",
      reasonCode: "command-policy-not-allowed",
    };
  }

  return (
    approvalRequired ?? {
      decision: "allow",
      reason: "Command policy allows the next command.",
      reasonCode: "command-policy-allow",
    }
  );
};

const evaluateBuiltInApprovalPreflight = (
  command: BuildModeCommand,
): CommandPolicyPreflightResult | undefined => {
  const matched = builtInApprovalRules.find((rule) =>
    rule.pattern.test(command.command),
  );
  return matched
    ? {
        decision: "approval-required",
        reason: matched.reason,
        reasonCode: matched.reasonCode,
      }
    : undefined;
};

const connectorMutationActions = new Set([
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

const evaluateConnectorMutationPreflight = (
  command: BuildModeCommand,
): FileSafetyPreflightResult | undefined => {
  const target = command.command.match(
    /^connector:([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/i,
  )?.[1];
  if (!target) {
    return undefined;
  }
  const [connectorId, action] = target.split(".");
  const normalizedAction = action?.toLowerCase();
  if (
    !connectorId ||
    !normalizedAction ||
    !connectorMutationActions.has(normalizedAction)
  ) {
    return undefined;
  }
  return {
    reason: `${toConnectorDisplayName(connectorId)} ${normalizedAction} was blocked in Build Mode. Connector mutations require an external approved connector workflow and are not executed by the connector read lane.`,
    reasonCode: `connector-mutation-blocked:${connectorId.toLowerCase()}.${normalizedAction}`,
  };
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

interface FileSafetyPreflightResult {
  reason: string;
  reasonCode: string;
}

const evaluateFileSafetyPreflight = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): FileSafetyPreflightResult | undefined => {
  const protectedPath = getBlockedProtectedPath(command, payload);
  if (protectedPath) {
    return {
      reason: `Generated artifact is protected from direct edits: ${protectedPath}.`,
      reasonCode: `protected-path:${protectedPath}`,
    };
  }

  const ignoredPath = getBlockedIgnoredPath(command, payload);
  if (ignoredPath) {
    return {
      reason: `Target path is blocked by ${ignoredPath.pattern}: ${ignoredPath.path}.`,
      reasonCode: `ignored-path:${ignoredPath.path}`,
    };
  }

  return undefined;
};

const evaluateThorApiVaixLauncherPreflight = (
  command: BuildModeCommand,
): FileSafetyPreflightResult | undefined =>
  looksLikeDirectThorApiVaixShortcut(command.command) &&
  !usesThorApiVaixLauncher(command.command)
    ? {
        reason:
          "ThorAPI/VAIX operations must use ./vaix or ./vai project launchers instead of direct generator/build shortcuts.",
        reasonCode: "thorapi-vaix-launcher-required",
      }
    : undefined;

const getBlockedProtectedPath = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): string | undefined => {
  if (!looksLikeGeneratedArtifactMutationCommand(command)) {
    return undefined;
  }
  const targetPaths = (command.targetPaths ?? [])
    .map(normalizePathForPolicy)
    .filter(Boolean);
  const commandPathCandidates = extractCommandPathCandidates(command.command)
    .map(normalizePathForPolicy)
    .filter(Boolean);
  const inferredGeneratedPaths = Array.from(
    new Set([...targetPaths, ...commandPathCandidates]),
  ).filter(isGeneratedThorApiArtifactPath);
  const protectedPaths = Array.from(
    new Set([
      ...(command.protectedPaths ?? []),
      ...payload.appBundle.artifacts
        .filter((artifact) => artifact.kind === "generated")
        .map((artifact) => artifact.path),
      ...inferredGeneratedPaths,
    ]),
  )
    .map(normalizePathForPolicy)
    .filter(Boolean);
  const commandText = normalizePathForPolicy(command.command);

  return protectedPaths.find(
    (protectedPath) =>
      targetPaths.some((targetPath) =>
        pathMatchesProtectedPath(targetPath, protectedPath),
      ) || commandText.includes(protectedPath),
  );
};

const getBlockedIgnoredPath = (
  command: BuildModeCommand,
  payload: ValorTaskBridgePayload,
): { path: string; pattern: string } | undefined => {
  const patterns = payload.scope.ignoredPathPatterns ?? [];
  const targetPaths = Array.from(
    new Set([
      ...(command.targetPaths ?? []),
      ...extractCommandPathCandidates(command.command),
    ]),
  )
    .map(normalizePathForPolicy)
    .filter(Boolean);

  for (const targetPath of targetPaths) {
    const pattern = patterns.find((item) =>
      ignoredPathPatternMatches(targetPath, item),
    );
    if (pattern) {
      return {
        path: targetPath,
        pattern: formatIgnoredPathPattern(pattern),
      };
    }
  }

  return undefined;
};

const normalizePathForPolicy = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");

const tokenizeCommandText = (value: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = undefined;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char) || char === ";" || char === "|") {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (current) {
    tokens.push(current);
  }
  return tokens;
};

const normalizeCommandPathToken = (token: string): string | undefined => {
  const normalized = token
    .trim()
    .replace(/^[<>]+/, "")
    .replace(/[),]+$/g, "");
  if (
    !normalized ||
    looksLikeInlineCodePathWrapper(normalized) ||
    (normalized.startsWith("-") && !normalized.startsWith("--")) ||
    normalized.includes("://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("$")
  ) {
    return undefined;
  }
  return normalized;
};

const looksLikeInlineCodePathWrapper = (value: string): boolean =>
  /[()]/.test(value) && /["']/.test(value);

const expandCommandPathToken = (token: string): string[] => {
  const prefixedPath = token.match(/^(?:psr|input|file|path|target):(.+)$/i);
  if (prefixedPath?.[1]) {
    return [prefixedPath[1]];
  }

  const optionValue = token.match(/^[A-Za-z0-9_.-]+=([^=].+)$/);
  if (optionValue?.[1]) {
    return [optionValue[1]];
  }

  const flagValue = token.match(/^--[A-Za-z0-9_.-]+=([^=].+)$/);
  if (flagValue?.[1]) {
    return [flagValue[1]];
  }

  return [token];
};

const looksLikeWorkspacePath = (value: string): boolean =>
  value.startsWith("/") ||
  value.startsWith("./") ||
  value.startsWith("../") ||
  value.includes("/");

const extractCommandPathCandidates = (commandText: string): string[] => {
  const tokens = tokenizeCommandText(commandText);
  const candidates: string[] = [];
  let expectsRedirectionTarget = false;
  for (let index = 0; index < tokens.length; index += 1) {
    const rawToken = tokens[index];
    if (expectsRedirectionTarget) {
      const candidate = normalizeCommandPathToken(rawToken);
      if (candidate && !isShellRedirectionFdTarget(candidate)) {
        for (const expanded of expandCommandPathToken(candidate)) {
          candidates.push(expanded);
        }
      }
      expectsRedirectionTarget = false;
      continue;
    }

    if (isShellRedirectionOperator(rawToken)) {
      expectsRedirectionTarget = true;
      continue;
    }

    const redirectTarget = extractInlineShellRedirectionTarget(rawToken);
    if (redirectTarget) {
      const candidate = normalizeCommandPathToken(redirectTarget);
      if (candidate && !isShellRedirectionFdTarget(candidate)) {
        for (const expanded of expandCommandPathToken(candidate)) {
          candidates.push(expanded);
        }
      }
      continue;
    }

    const force =
      /^(?:psr|input|file|path|target):/i.test(rawToken) ||
      /^[A-Za-z0-9_.-]+=/.test(rawToken) ||
      /^--[A-Za-z0-9_.-]+=/.test(rawToken);
    for (const expanded of expandCommandPathToken(rawToken)) {
      const candidate = normalizeCommandPathToken(expanded);
      if (candidate && (force || looksLikeWorkspacePath(candidate))) {
        candidates.push(candidate);
      }
    }
  }
  for (const inlineTarget of extractInlineInterpreterMutationPathCandidates(
    commandText,
  )) {
    const candidate = normalizeCommandPathToken(inlineTarget);
    if (candidate) {
      for (const expanded of expandCommandPathToken(candidate)) {
        candidates.push(expanded);
      }
    }
  }
  return Array.from(new Set(candidates));
};

const hasInlineInterpreterFileMutation = (commandText: string): boolean =>
  /\b(?:node|bun|deno|python3?|ruby|php|perl)\b[\s\S]*?(?:^|\s)(?:-[ec]\b|--eval\b|--command\b)[\s\S]*?(?:(?:fs\.)?(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|copyFile|copyFileSync|rename|renameSync|rm|rmSync|unlink|unlinkSync|mkdir|mkdirSync)\s*\(|Deno\.(?:writeTextFile|writeFile|remove|mkdir|rename)\s*\(|Bun\.write\s*\(|open\s*\(\s*["'][^"']+["']\s*,\s*["'][^"']*[wax][^"']*["']|Path\s*\(\s*["'][^"']+["']\s*\)\s*\.\s*(?:write_text|write_bytes|unlink|mkdir|rename)\s*\(|(?:os|Path)\s*\.\s*(?:remove|unlink|rmdir|mkdir|makedirs|rename)\s*\(|shutil\.(?:rmtree|move|copy|copyfile|copytree)\s*\(|File\.(?:write|open|delete|rename|mkdir)\s*\()/i.test(
    commandText,
  );

const extractInlineInterpreterMutationPathCandidates = (
  commandText: string,
): string[] => {
  if (!hasInlineInterpreterFileMutation(commandText)) {
    return [];
  }
  const candidates: string[] = [];
  const patterns = [
    /\b(?:fs\.)?(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|rm|rmSync|unlink|unlinkSync|mkdir|mkdirSync)\s*\(\s*["']([^"']+)["']/gi,
    /\b(?:fs\.)?(?:copyFile|copyFileSync|rename|renameSync)\s*\(\s*["'][^"']+["']\s*,\s*["']([^"']+)["']/gi,
    /\bDeno\.(?:writeTextFile|writeFile|remove|mkdir|rename)\s*\(\s*["']([^"']+)["']/gi,
    /\bBun\.write\s*\(\s*["']([^"']+)["']/gi,
    /\bopen\s*\(\s*["']([^"']+)["']\s*,\s*["'][^"']*[wax][^"']*["']/gi,
    /\bPath\s*\(\s*["']([^"']+)["']\s*\)\s*\.\s*(?:write_text|write_bytes|unlink|mkdir|rename)\s*\(/gi,
    /\b(?:os|Path)\s*\.\s*(?:remove|unlink|rmdir|mkdir|makedirs|rename)\s*\(\s*["']([^"']+)["']/gi,
    /\bshutil\.(?:rmtree|copytree)\s*\(\s*["']([^"']+)["']/gi,
    /\bshutil\.(?:move|copy|copyfile)\s*\(\s*["'][^"']+["']\s*,\s*["']([^"']+)["']/gi,
    /\bFile\.(?:write|open|delete|mkdir)\s*\(\s*["']([^"']+)["']/gi,
    /\bFile\.rename\s*\(\s*["'][^"']+["']\s*,\s*["']([^"']+)["']/gi,
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(commandText)) !== null) {
      if (match[1]) {
        candidates.push(match[1]);
      }
      if (match[0] === "") {
        pattern.lastIndex++;
      }
    }
  }
  return candidates;
};

const isShellRedirectionOperator = (token: string): boolean =>
  /^(?:\d+|&)?(?:>>?|>\||<<?)$/.test(token);

const extractInlineShellRedirectionTarget = (
  token: string,
): string | undefined => {
  const match = token.match(/^(?:\d+|&)?(?:>>?|>\||<<?)(.+)$/);
  return match?.[1];
};

const isShellRedirectionFdTarget = (value: string): boolean =>
  /^&?(?:\d+|-)$/.test(value);

const looksLikeGeneratedArtifactMutationCommand = (
  command: BuildModeCommand,
): boolean => {
  if (
    ["edit", "deploy"].includes(command.kind) ||
    ["filesystem.write", "psr.edit"].includes(command.capabilityId)
  ) {
    return true;
  }
  if (hasInlineInterpreterFileMutation(command.command)) {
    return true;
  }
  return /\b(?:apply\s+patch|patch|write|replace|overwrite|delete|remove|rm|mv|cp|sed\s+-i|perl\s+-pi|truncate)\b|^(?:psr|file-write):/i.test(
    command.command,
  );
};

const isGeneratedThorApiArtifactPath = (value: string): boolean => {
  const normalized = normalizePathForPolicy(value).toLowerCase();
  return (
    normalized.includes("/thorapi/") ||
    normalized.startsWith("thorapi/") ||
    normalized.includes("/src/thorapi/") ||
    normalized.includes("/generated/thorapi/") ||
    normalized.includes("/src/shared/proto/") ||
    normalized.startsWith("src/shared/proto/")
  );
};

const usesThorApiVaixLauncher = (commandText: string): boolean =>
  /(?:^|\s)(?:\.\/)?vai(?:x)?(?:\s|$)/i.test(commandText);

const looksLikeDirectThorApiVaixShortcut = (commandText: string): boolean => {
  const normalized = commandText.toLowerCase();
  if (
    /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?(?:generate:thorapi|generate:thorapi-client|thorapi-client|openapi-generator|generate)\b/.test(
      normalized,
    ) &&
    /\b(?:thorapi|openapi|typescript-redux-query|api\.hbs|valkyrai)\b/.test(
      normalized,
    )
  ) {
    return true;
  }
  return (
    /\b(?:mvn|gradle)\b/.test(normalized) &&
    /\b(?:generate|generate-sources|openapi|thorapi|typescript-redux-query|api\.hbs|valkyrai)\b/.test(
      normalized,
    )
  );
};

const pathMatchesProtectedPath = (
  targetPath: string,
  protectedPath: string,
): boolean =>
  targetPath === protectedPath ||
  targetPath.endsWith(`/${protectedPath}`) ||
  protectedPath.endsWith(`/${targetPath}`);

const ignoredPathPatternMatches = (
  targetPath: string,
  pattern: string,
): boolean => {
  const normalizedPattern = normalizePathForPolicy(pattern).replace(
    /^\*\*\//,
    "",
  );
  if (!normalizedPattern) {
    return false;
  }
  if (normalizedPattern.endsWith("/**")) {
    const prefix = normalizedPattern.slice(0, -3);
    return targetPath === prefix || targetPath.startsWith(`${prefix}/`);
  }
  if (normalizedPattern.endsWith("/")) {
    return (
      targetPath.startsWith(normalizedPattern) ||
      targetPath.includes(`/${normalizedPattern}`)
    );
  }
  return (
    targetPath === normalizedPattern ||
    targetPath.endsWith(`/${normalizedPattern}`) ||
    targetPath.includes(normalizedPattern)
  );
};

const formatIgnoredPathPattern = (pattern: string): string => {
  const normalizedPattern = normalizePathForPolicy(pattern).replace(
    /^\*\*\//,
    "",
  );
  if (normalizedPattern.endsWith("/")) {
    return `**/${normalizedPattern}**`;
  }
  return pattern;
};

const isRunnableExecutionStep = (
  step: BuildModeExecutionPlanStep,
  stepById: Map<string, BuildModeExecutionPlanStep>,
): boolean => {
  if (!["approval-required", "ready", "running"].includes(step.status)) {
    return false;
  }
  return step.dependencyStepIds.every(
    (dependencyId) => stepById.get(dependencyId)?.status === "complete",
  );
};

export const mergeBuildModeCommandReceipt = (
  payload: ValorTaskBridgePayload,
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload => {
  const sanitizedReceipt = sanitizeBuildModeCommandReceipt(receipt);
  const commandReceipts = [
    ...payload.commandReceipts.filter(
      (item) => item.id !== sanitizedReceipt.id,
    ),
    sanitizedReceipt,
  ];
  const commands = payload.commands.map((command) =>
    command.id === sanitizedReceipt.commandId
      ? {
          ...command,
          receiptId: sanitizedReceipt.id,
          status: sanitizedReceipt.status,
        }
      : command,
  );
  const browserVerification = deriveBrowserVerification(
    payload.browserVerification,
    sanitizedReceipt,
  );
  const checkpoints = deriveCheckpoints(payload.checkpoints, sanitizedReceipt);
  const safeEditPlans = deriveSafeEditPlans(
    payload.safeEditPlans,
    sanitizedReceipt,
  );
  const evidenceArtifacts = mergeEvidenceArtifacts(
    payload.evidenceArtifacts,
    sanitizedReceipt,
  );
  const scheduledAutomations = deriveScheduledAutomations(
    payload.scheduledAutomations,
    sanitizedReceipt,
  );
  const creditUsageReceipts = mergeCreditUsageReceipt(
    payload.creditUsageReceipts,
    sanitizedReceipt,
  );
  const commandReadinessGates = deriveReadinessGates(
    payload.readinessGates,
    commandReceipts,
    sanitizedReceipt,
  );
  const readinessGates = deriveFinalReportReadinessGate(
    commandReadinessGates,
    commandReceipts,
    browserVerification,
    evidenceArtifacts,
  );
  const executionPlan = deriveExecutionPlan(
    payload.executionPlan,
    commandReceipts,
    readinessGates,
    sanitizedReceipt,
  );
  const agentRuntimes = deriveAgentRuntimes(
    payload.agentRuntimes,
    sanitizedReceipt,
  );
  const swarmRoles = deriveSwarmRoles(payload.swarmRoles, sanitizedReceipt);
  const partialPayload = {
    ...payload,
    commandReceipts,
    commands,
    checkpoints,
    safeEditPlans,
    evidenceArtifacts,
    scheduledAutomations,
    creditUsageReceipts,
    readinessGates,
    executionPlan,
    agentRuntimes,
    swarmRoles,
  };
  const autonomyDecision = deriveBuildModeAutonomyDecision(partialPayload);

  return {
    ...payload,
    commandReceipts,
    commands,
    checkpoints,
    safeEditPlans,
    evidenceArtifacts,
    creditUsageReceipts,
    readinessGates,
    executionPlan,
    agentRuntimes,
    swarmRoles,
    autonomyDecision,
    scheduledAutomations,
    agentLoop: deriveAgentLoop(payload.agentLoop, commands, sanitizedReceipt),
    browserVerification,
    finalReport: deriveFinalReport(
      payload,
      commands,
      commandReceipts,
      browserVerification,
      checkpoints,
      evidenceArtifacts,
      creditUsageReceipts,
      autonomyDecision,
      readinessGates,
      executionPlan,
      scheduledAutomations,
      sanitizedReceipt,
    ),
  };
};

const deriveAgentRuntimes = (
  runtimes: ValorTaskBridgePayload["agentRuntimes"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["agentRuntimes"] =>
  runtimes.map((runtime) => {
    if (runtime.id !== receipt.assignedRuntimeId) {
      return runtime;
    }
    const receiptIds = Array.from(new Set([...runtime.receiptIds, receipt.id]));
    return {
      ...runtime,
      receiptIds,
      status: getRuntimeStatusFromReceipt(receipt.status),
    };
  });

const getRuntimeStatusFromReceipt = (
  status: BuildModeCommandReceipt["status"],
): BuildModeAgentRuntimeBinding["status"] => {
  if (status === "running") {
    return "running";
  }
  if (status === "approval-required") {
    return "selected";
  }
  if (status === "succeeded" || status === "failed" || status === "rejected") {
    return "available";
  }
  return "selected";
};

const deriveSwarmRoles = (
  roles: ValorTaskBridgePayload["swarmRoles"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["swarmRoles"] =>
  roles.map((role) => {
    if (role.role !== receipt.assignedSwarmRole) {
      return role;
    }
    return {
      ...role,
      currentFocus: getSwarmRoleFocusFromReceipt(receipt),
      status: getSwarmRoleStatusFromReceipt(receipt.status),
    };
  });

const getSwarmRoleStatusFromReceipt = (
  status: BuildModeCommandReceipt["status"],
): BuildModeSwarmRoleAssignment["status"] => {
  if (status === "running") {
    return "running";
  }
  if (status === "approval-required") {
    return "blocked";
  }
  if (status === "failed" || status === "rejected") {
    return "blocked";
  }
  if (status === "succeeded") {
    return "assigned";
  }
  return "assigned";
};

const getSwarmRoleFocusFromReceipt = (
  receipt: BuildModeCommandReceipt,
): string => {
  if (receipt.status === "running") {
    return `Running ${receipt.commandId}: ${receipt.summary}`;
  }
  if (receipt.status === "approval-required") {
    return `Waiting for approval on ${receipt.commandId}: ${receipt.summary}`;
  }
  return `Latest ${receipt.commandId} receipt ${receipt.id}: ${receipt.status}. ${receipt.summary}`;
};

export const mergeBuildModeAutomationSnapshot = (
  payload: ValorTaskBridgePayload,
  snapshot: BuildModeAutomationSnapshot,
): ValorTaskBridgePayload => {
  const scheduledAutomations = mergeScheduledAutomationSnapshot(
    payload.scheduledAutomations,
    snapshot,
  );

  return {
    ...payload,
    scheduledAutomations,
    finalReport: deriveAutomationSnapshotFinalReport(
      payload.finalReport,
      scheduledAutomations,
      snapshot,
    ),
  };
};

const getRequiredApprovalThreshold = (
  payload: ValorTaskBridgePayload,
  command: BuildModeCommand,
): BuildModeApprovalThreshold => {
  const thresholds: BuildModeApprovalThreshold[] = [];
  const permission = payload.toolPermissions.find(
    (item) => item.capabilityId === command.capabilityId,
  );
  if (
    permission?.approvalThreshold &&
    permission.approvalThreshold !== "none"
  ) {
    thresholds.push(permission.approvalThreshold);
  }
  if (command.kind === "deploy") {
    thresholds.push("owner");
  }
  if (command.kind === "edit" || command.requiresApproval) {
    thresholds.push("operator");
  }
  for (const rule of builtInApprovalRules) {
    if (rule.pattern.test(command.command)) {
      thresholds.push(rule.threshold);
    }
  }
  if (
    payload.autonomyPolicy.approvalRequiredCapabilityIds.includes(
      command.capabilityId,
    )
  ) {
    thresholds.push("operator");
  }
  return thresholds.reduce(maxApprovalThreshold, "operator");
};

const approvalThresholdRank: Record<BuildModeApprovalThreshold, number> = {
  none: 0,
  operator: 1,
  owner: 2,
  admin: 3,
};

const maxApprovalThreshold = (
  current: BuildModeApprovalThreshold,
  candidate: BuildModeApprovalThreshold,
): BuildModeApprovalThreshold =>
  approvalThresholdRank[candidate] > approvalThresholdRank[current]
    ? candidate
    : current;

const getLatestAutonomyDecisionTimestamp = (
  payload: ValorTaskBridgePayload,
): string => {
  const commandReceiptTimes = payload.commandReceipts.map(
    (receipt) => receipt.createdAt,
  );
  const creditReceiptTimes = payload.creditUsageReceipts.map(
    (receipt) => receipt.createdAt,
  );
  const timestamps = [
    ...commandReceiptTimes,
    ...creditReceiptTimes,
    payload.appBundle.createdAt,
  ].sort();
  return timestamps[timestamps.length - 1] ?? payload.appBundle.createdAt;
};

const mergeCreditUsageReceipt = (
  creditUsageReceipts: ValorTaskBridgePayload["creditUsageReceipts"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["creditUsageReceipts"] => {
  if (!receipt.creditUsageReceipt) {
    return creditUsageReceipts;
  }
  return [
    ...creditUsageReceipts.filter(
      (item) => item.id !== receipt.creditUsageReceipt!.id,
    ),
    receipt.creditUsageReceipt,
  ];
};

const deriveExecutionPlan = (
  plan: BuildModeExecutionPlanStep[],
  commandReceipts: BuildModeCommandReceipt[],
  readinessGates: BuildModeReadinessGate[],
  receipt: BuildModeCommandReceipt,
): BuildModeExecutionPlanStep[] => {
  const latestReceiptByCommandId = getLatestReceiptByCommandId(commandReceipts);

  return plan.map((step) => {
    if (!step.commandIds.includes(receipt.commandId)) {
      return step;
    }

    const receiptIds = Array.from(new Set([...step.receiptIds, receipt.id]));
    const commandStatuses = step.commandIds
      .map((commandId) => latestReceiptByCommandId.get(commandId))
      .filter(Boolean)
      .map((item) => item!.status);
    const gateStatuses = step.readinessGateIds
      .map((gateId) => readinessGates.find((gate) => gate.id === gateId))
      .filter(Boolean)
      .map((gate) => gate!.status);

    return {
      ...step,
      receiptIds,
      status: toExecutionPlanStepStatus(
        commandStatuses,
        gateStatuses,
        step.commandIds.length,
      ),
    };
  });
};

const toExecutionPlanStepStatus = (
  commandStatuses: BuildModeCommandReceipt["status"][],
  gateStatuses: BuildModeReadinessGate["status"][],
  expectedCommandCount: number,
): BuildModeExecutionPlanStep["status"] => {
  if (
    commandStatuses.some(
      (status) => status === "failed" || status === "rejected",
    ) ||
    gateStatuses.some((status) => status === "failed")
  ) {
    return "failed";
  }
  if (
    commandStatuses.some((status) => status === "approval-required") ||
    gateStatuses.some((status) => status === "blocked")
  ) {
    return "approval-required";
  }
  if (commandStatuses.some((status) => status === "running")) {
    return "running";
  }
  if (
    expectedCommandCount > 0 &&
    commandStatuses.length < expectedCommandCount &&
    commandStatuses.some((status) => status === "succeeded")
  ) {
    return "running";
  }
  if (
    commandStatuses.length > 0 &&
    commandStatuses.every((status) => status === "succeeded") &&
    gateStatuses.every((status) => status === "passed")
  ) {
    return "complete";
  }
  if (commandStatuses.some((status) => status === "queued")) {
    return "running";
  }
  return "ready";
};

const deriveReadinessGates = (
  gates: BuildModeReadinessGate[],
  commandReceipts: BuildModeCommandReceipt[],
  receipt: BuildModeCommandReceipt,
): BuildModeReadinessGate[] => {
  const latestReceiptByCommandId = getLatestReceiptByCommandId(commandReceipts);

  return gates.map((gate) => {
    if (!gate.commandIds.includes(receipt.commandId)) {
      return gate;
    }

    const receiptIds = Array.from(
      new Set([...gate.requiredReceiptIds, receipt.id]),
    );
    const evidenceArtifactIds = Array.from(
      new Set([
        ...gate.evidenceArtifactIds,
        ...(receipt.artifacts ?? []).map((artifact) => artifact.id),
      ]),
    );
    const commandStatuses = gate.commandIds
      .map((commandId) => latestReceiptByCommandId.get(commandId))
      .filter(Boolean)
      .map((item) => item!.status);

    return {
      ...gate,
      requiredReceiptIds: receiptIds,
      evidenceArtifactIds,
      status: toReadinessGateStatus(commandStatuses, gate.commandIds.length),
    };
  });
};

const toReadinessGateStatus = (
  statuses: BuildModeCommandReceipt["status"][],
  expectedCommandCount: number,
): BuildModeReadinessGate["status"] => {
  if (!statuses.length) {
    return "pending";
  }
  if (statuses.some((status) => status === "failed" || status === "rejected")) {
    return "failed";
  }
  if (statuses.some((status) => status === "approval-required")) {
    return "blocked";
  }
  if (
    expectedCommandCount > 0 &&
    statuses.length >= expectedCommandCount &&
    statuses.every((status) => status === "succeeded")
  ) {
    return "passed";
  }
  return "pending";
};

const deriveFinalReportReadinessGate = (
  gates: BuildModeReadinessGate[],
  commandReceipts: BuildModeCommandReceipt[],
  browserVerification: BrowserVerificationStatus,
  evidenceArtifacts: BuildModeEvidenceArtifact[],
): BuildModeReadinessGate[] => {
  const latestReceipts = Array.from(
    getLatestReceiptByCommandId(commandReceipts, {
      ignoreScheduledAutomationRunAttempts: true,
    }).values(),
  );
  const hasFailedCommand = latestReceipts.some(
    (receipt) => receipt.status === "failed" || receipt.status === "rejected",
  );
  const blockingGates = gates.filter(
    (gate) => gate.blocksRun && gate.id !== "gate-final-report-ready",
  );
  const finalReportArtifacts = evidenceArtifacts.filter(
    (artifact) => artifact.kind === "final_report",
  );
  const finalReportProofArtifacts = finalReportArtifacts.filter((artifact) =>
    hasWrittenFinalReportReceiptProof(artifact, commandReceipts),
  );
  const finalReportReceiptIds = finalReportProofArtifacts
    .map((artifact) => artifact.receiptId)
    .filter((receiptId): receiptId is string => Boolean(receiptId));
  const finalReportArtifactIds = finalReportArtifacts.map(
    (artifact) => artifact.id,
  );

  return gates.map((gate) => {
    if (gate.id !== "gate-final-report-ready") {
      return gate;
    }

    const blockingFailure =
      hasFailedCommand ||
      blockingGates.some((item) => item.status === "failed");
    const blockingIncomplete = blockingGates.some(
      (item) => item.status !== "passed",
    );
    const hasFinalReportProof = finalReportProofArtifacts.length > 0;
    const browserPassed = browserVerification.status === "passed";
    const status: BuildModeReadinessGate["status"] = blockingFailure
      ? "failed"
      : blockingIncomplete || !browserPassed || !hasFinalReportProof
        ? "pending"
        : "passed";

    return {
      ...gate,
      evidenceArtifactIds: Array.from(
        new Set([...gate.evidenceArtifactIds, ...finalReportArtifactIds]),
      ),
      requiredReceiptIds: Array.from(
        new Set([...gate.requiredReceiptIds, ...finalReportReceiptIds]),
      ),
      status,
      summary:
        status === "passed"
          ? "Final report has durable GrayMatter memory and artifact integrity proof, and all blocking readiness gates passed."
          : gate.summary,
    };
  });
};

const hasWrittenFinalReportReceiptProof = (
  artifact: BuildModeEvidenceArtifact,
  commandReceipts: BuildModeCommandReceipt[],
): boolean => {
  const metadata = artifact.metadata;
  const receipt = artifact.receiptId
    ? commandReceipts.find((item) => item.id === artifact.receiptId)
    : undefined;
  return (
    receipt?.capabilityId === "graymatter.memory" &&
    receipt.status === "succeeded" &&
    Boolean(artifact.commandId) &&
    artifact.commandId === receipt.commandId &&
    metadata?.memoryStatus === "written" &&
    typeof metadata.contentHash === "string" &&
    /^sha256:[a-f0-9]{64}$/.test(metadata.contentHash) &&
    typeof metadata.byteSize === "number" &&
    metadata.byteSize > 0
  );
};

const mergeEvidenceArtifacts = (
  current: ValorTaskBridgePayload["evidenceArtifacts"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["evidenceArtifacts"] => {
  const nextArtifacts = receipt.artifacts ?? [];
  if (!nextArtifacts.length) {
    return current;
  }
  const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
  for (const artifact of nextArtifacts) {
    byId.set(artifact.id, artifact);
  }
  return Array.from(byId.values());
};

const deriveCheckpoints = (
  checkpoints: ValorTaskBridgePayload["checkpoints"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["checkpoints"] =>
  checkpoints.map((checkpoint) => {
    if (
      receipt.commandId !== checkpoint.commandId &&
      receipt.commandId !== checkpoint.rollbackCommandId
    ) {
      return checkpoint;
    }

    return {
      ...checkpoint,
      hash: getCheckpointHashFromReceipt(receipt) ?? checkpoint.hash,
      receiptIds: Array.from(new Set([...checkpoint.receiptIds, receipt.id])),
      status: toCheckpointStatus(
        receipt.status,
        receipt.commandId === checkpoint.rollbackCommandId,
      ),
    };
  });

const toCheckpointStatus = (
  status: BuildModeCommandReceipt["status"],
  isRollback: boolean,
): ValorTaskBridgePayload["checkpoints"][number]["status"] => {
  switch (status) {
    case "succeeded":
      return isRollback ? "restored" : "created";
    case "queued":
    case "running":
      return isRollback ? "rollback-ready" : "planned";
    case "approval-required":
      return isRollback ? "rollback-ready" : "planned";
    case "failed":
    case "rejected":
      return "failed";
    default:
      return "planned";
  }
};

const getCheckpointHashFromReceipt = (
  receipt: BuildModeCommandReceipt,
): string | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    if (
      artifact.kind !== "checkpoint" ||
      artifact.commandId !== receipt.commandId ||
      artifact.receiptId !== receipt.id
    ) {
      continue;
    }
    const checkpointHash = artifact.metadata?.checkpointHash;
    if (typeof checkpointHash === "string" && checkpointHash.length > 0) {
      return checkpointHash;
    }
  }
  return undefined;
};

const deriveSafeEditPlans = (
  safeEditPlans: ValorTaskBridgePayload["safeEditPlans"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["safeEditPlans"] =>
  safeEditPlans.map((plan) => {
    if (receipt.commandId !== plan.commandId) {
      return plan;
    }

    return {
      ...plan,
      receiptIds: Array.from(new Set([...plan.receiptIds, receipt.id])),
      status: toSafeEditStatus(receipt.status),
    };
  });

const toSafeEditStatus = (
  status: BuildModeCommandReceipt["status"],
): ValorTaskBridgePayload["safeEditPlans"][number]["status"] => {
  switch (status) {
    case "succeeded":
      return "applied";
    case "queued":
    case "running":
      return "queued";
    case "approval-required":
      return "approval-required";
    case "failed":
    case "rejected":
      return "blocked";
    default:
      return "draft";
  }
};

const deriveScheduledAutomations = (
  automations: ScheduledAutomationBinding[],
  receipt: BuildModeCommandReceipt,
): ScheduledAutomationBinding[] =>
  automations.map((automation) => {
    if (receipt.commandId !== `cmd-automation-${automation.id}`) {
      return automation;
    }

    const runStatus = getScheduledAutomationRunStatus(receipt);
    const runHistory = runStatus
      ? [
          {
            completedAt: receipt.createdAt,
            error: getScheduledAutomationRunError(receipt),
            receiptId: receipt.id,
            status: runStatus,
          },
          ...(automation.runHistory ?? []),
        ].slice(0, 20)
      : automation.runHistory;

    return sanitizeScheduledAutomationBinding({
      ...automation,
      lastRunAt: runStatus ? receipt.createdAt : automation.lastRunAt,
      lastRunReceiptId: runStatus ? receipt.id : automation.lastRunReceiptId,
      lastRunStatus: runStatus ?? automation.lastRunStatus,
      nextRunAt:
        getScheduledAutomationNextRunAt(receipt) ?? automation.nextRunAt,
      receiptIds: Array.from(new Set([...automation.receiptIds, receipt.id])),
      runHistory,
      scheduler:
        getScheduledAutomationScheduler(receipt) ?? automation.scheduler,
      status:
        getScheduledAutomationLifecycleStatus(receipt) ??
        (runStatus ? automation.status : undefined) ??
        toScheduledAutomationStatus(receipt.status),
    });
  });

const mergeScheduledAutomationSnapshot = (
  automations: ScheduledAutomationBinding[],
  snapshot: BuildModeAutomationSnapshot,
): ScheduledAutomationBinding[] => {
  const automationById = new Map(
    automations.map((automation) => [automation.id, automation]),
  );
  for (const record of snapshot.records) {
    const existing = automationById.get(record.id);
    automationById.set(
      record.id,
      sanitizeScheduledAutomationBinding({
        approvalRequired: existing?.approvalRequired ?? true,
        commandRef: existing?.commandRef ?? record.workflowCommandId,
        id: record.id,
        label: existing?.label ?? record.label,
        lastRunAt: record.lastRunAt ?? existing?.lastRunAt,
        lastRunReceiptId: record.lastRunReceiptId ?? existing?.lastRunReceiptId,
        lastRunStatus: record.lastRunStatus ?? existing?.lastRunStatus,
        nextRunAt: record.nextRunAt ?? existing?.nextRunAt,
        promptContext: record.promptContext ?? existing?.promptContext,
        providerRoute: record.providerRoute ?? existing?.providerRoute,
        receiptIds: Array.from(
          new Set([
            ...(existing?.receiptIds ?? []),
            ...(record.lastRunReceiptId ? [record.lastRunReceiptId] : []),
          ]),
        ),
        runHistory: record.runHistory ?? existing?.runHistory,
        schedule: record.schedule,
        scheduler: record.scheduler ?? existing?.scheduler,
        status: existing?.status === "blocked" ? "blocked" : record.status,
        valkyraiScheduleUri:
          record.valkyraiScheduleUri ?? existing?.valkyraiScheduleUri,
        valkyraiWorkflowId:
          record.valkyraiWorkflowId ?? existing?.valkyraiWorkflowId,
        workflowRef: record.workflowRef,
      }),
    );
  }
  return Array.from(automationById.values());
};

const getScheduledAutomationNextRunAt = (
  receipt: BuildModeCommandReceipt,
): string | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const nextRunAt = artifact.metadata?.nextRunAt;
    if (typeof nextRunAt === "string" && nextRunAt.length > 0) {
      return nextRunAt;
    }
  }
  return undefined;
};

const getScheduledAutomationScheduler = (
  receipt: BuildModeCommandReceipt,
): ScheduledAutomationBinding["scheduler"] | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const scheduler = artifact.metadata?.scheduler;
    if (scheduler === "valkyrai-cron") {
      return scheduler;
    }
  }
  return undefined;
};

const getScheduledAutomationLifecycleStatus = (
  receipt: BuildModeCommandReceipt,
): ScheduledAutomationBinding["status"] | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const automationStatus = artifact.metadata?.automationStatus;
    if (automationStatus === "paused" || automationStatus === "scheduled") {
      return automationStatus;
    }
  }
  return undefined;
};

const getScheduledAutomationRunStatus = (
  receipt: BuildModeCommandReceipt,
): ScheduledAutomationBinding["lastRunStatus"] | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const automationRunStatus = artifact.metadata?.automationRunStatus;
    if (
      automationRunStatus === "failed" ||
      automationRunStatus === "skipped" ||
      automationRunStatus === "succeeded"
    ) {
      return automationRunStatus;
    }
  }
  return undefined;
};

const getScheduledAutomationRunError = (
  receipt: BuildModeCommandReceipt,
): string | undefined => {
  for (const artifact of receipt.artifacts ?? []) {
    const error = artifact.metadata?.error;
    if (typeof error === "string" && error.length > 0) {
      return error;
    }
  }
  return undefined;
};

const toScheduledAutomationStatus = (
  status: BuildModeCommandReceipt["status"],
): ScheduledAutomationBinding["status"] => {
  switch (status) {
    case "queued":
    case "running":
    case "succeeded":
      return "scheduled";
    case "approval-required":
    case "failed":
    case "rejected":
      return "blocked";
    default:
      return "draft";
  }
};

const deriveAgentLoop = (
  phases: BuildModeAgentLoopPhase[],
  commands: BuildModeCommand[],
  receipt: BuildModeCommandReceipt,
): BuildModeAgentLoopPhase[] => {
  const command = commands.find((item) => item.id === receipt.commandId);
  return phases.map((phase) => {
    const matchesReceipt =
      phase.receiptIds.includes(receipt.id) ||
      phase.capabilityIds.includes(receipt.capabilityId) ||
      Boolean(command && phase.capabilityIds.includes(command.capabilityId));

    if (!matchesReceipt) {
      return phase;
    }

    return {
      ...phase,
      receiptIds: Array.from(new Set([...phase.receiptIds, receipt.id])),
      status: toAgentLoopStatus(receipt.status),
    };
  });
};

const toAgentLoopStatus = (
  status: BuildModeCommandReceipt["status"],
): BuildModeAgentLoopPhase["status"] => {
  switch (status) {
    case "queued":
    case "running":
      return "running";
    case "succeeded":
      return "complete";
    case "approval-required":
    case "failed":
    case "rejected":
      return "blocked";
    default:
      return "ready";
  }
};

const deriveBrowserVerification = (
  current: BrowserVerificationStatus,
  receipt: BuildModeCommandReceipt,
): BrowserVerificationStatus => {
  if (receipt.capabilityId !== "browser.automation") {
    return current;
  }
  const proof = getBrowserReceiptProof(receipt);
  const artifactIds = Array.from(
    new Set([...current.artifactIds, ...proof.artifactIds]),
  );
  const consoleErrorCount =
    proof.consoleErrorCount ?? current.consoleErrorCount;

  if (receipt.status === "succeeded") {
    const expectedPreviewUrl = normalizeBrowserProofUrl(current.previewUrl);
    const proofPassed =
      proof.hasScreenshotArtifact &&
      proof.screenshotCaptured &&
      proof.screenshotHasIntegrityProof &&
      browserProofUrlMatches(proof.screenshotCurrentUrl, expectedPreviewUrl) &&
      proof.hasConsoleArtifact &&
      proof.consoleHasIntegrityProof &&
      browserProofUrlMatches(proof.consoleCurrentUrl, expectedPreviewUrl) &&
      proof.consoleErrorCount === 0;
    return {
      ...current,
      artifactIds,
      consoleErrorCount,
      status: proofPassed ? "passed" : "failed",
      screenshotReceiptId: receipt.id,
    };
  }
  if (receipt.status === "failed" || receipt.status === "rejected") {
    return {
      ...current,
      artifactIds,
      consoleErrorCount,
      status: "failed",
      screenshotReceiptId: receipt.id,
    };
  }
  if (receipt.status === "queued" || receipt.status === "running") {
    return { ...current, artifactIds, status: "running" };
  }
  return { ...current, artifactIds };
};

const getBrowserReceiptProof = (
  receipt: BuildModeCommandReceipt,
): {
  artifactIds: string[];
  consoleErrorCount?: number;
  consoleCurrentUrl?: string;
  hasConsoleArtifact: boolean;
  consoleHasIntegrityProof: boolean;
  hasScreenshotArtifact: boolean;
  screenshotHasIntegrityProof: boolean;
  screenshotCaptured: boolean;
  screenshotCurrentUrl?: string;
} => {
  const artifacts = receipt.artifacts ?? [];
  const screenshotArtifact = artifacts.find(
    (artifact) =>
      artifact.kind === "browser_screenshot" &&
      artifact.receiptId === receipt.id &&
      artifact.commandId === receipt.commandId,
  );
  const consoleArtifact = artifacts.find(
    (artifact) =>
      artifact.kind === "browser_console" &&
      artifact.receiptId === receipt.id &&
      artifact.commandId === receipt.commandId,
  );
  const consoleErrorCount =
    typeof consoleArtifact?.metadata?.consoleErrorCount === "number"
      ? consoleArtifact.metadata.consoleErrorCount
      : undefined;
  return {
    artifactIds: artifacts.map((artifact) => artifact.id),
    consoleErrorCount,
    consoleCurrentUrl:
      typeof consoleArtifact?.metadata?.currentUrl === "string"
        ? consoleArtifact.metadata.currentUrl
        : undefined,
    hasConsoleArtifact: Boolean(consoleArtifact),
    consoleHasIntegrityProof: hasEvidenceArtifactIntegrityProof(consoleArtifact),
    hasScreenshotArtifact: Boolean(screenshotArtifact),
    screenshotHasIntegrityProof:
      hasEvidenceArtifactIntegrityProof(screenshotArtifact),
    screenshotCaptured: screenshotArtifact
      ? screenshotArtifact.metadata?.screenshotCaptured === true
      : false,
    screenshotCurrentUrl:
      typeof screenshotArtifact?.metadata?.currentUrl === "string"
        ? screenshotArtifact.metadata.currentUrl
        : undefined,
  };
};

const browserProofUrlMatches = (
  currentUrl: string | undefined,
  expectedPreviewUrl: string | undefined,
): boolean =>
  !expectedPreviewUrl ||
  normalizeBrowserProofUrl(currentUrl) === expectedPreviewUrl;

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

const hasEvidenceArtifactIntegrityProof = (
  artifact: BuildModeEvidenceArtifact | undefined,
): boolean => {
  const contentHash = artifact?.metadata?.contentHash;
  const byteSize = artifact?.metadata?.byteSize;
  return (
    typeof contentHash === "string" &&
    /^sha256:[a-f0-9]{64}$/.test(contentHash) &&
    typeof byteSize === "number" &&
    byteSize > 0
  );
};

const deriveFinalReport = (
  payload: ValorTaskBridgePayload,
  commands: BuildModeCommand[],
  commandReceipts: BuildModeCommandReceipt[],
  browserVerification: BrowserVerificationStatus,
  checkpoints: ValorTaskBridgePayload["checkpoints"],
  evidenceArtifacts: ValorTaskBridgePayload["evidenceArtifacts"],
  creditUsageReceipts: ValorTaskBridgePayload["creditUsageReceipts"],
  autonomyDecision: BuildModeAutonomyDecision,
  readinessGates: ValorTaskBridgePayload["readinessGates"],
  executionPlan: ValorTaskBridgePayload["executionPlan"],
  scheduledAutomations: ValorTaskBridgePayload["scheduledAutomations"],
  receipt: BuildModeCommandReceipt,
): ValorTaskBridgePayload["finalReport"] => {
  const reportPayload = {
    ...payload,
    commandReceipts,
    commands,
    scheduledAutomations,
  };
  const commandCatalog = getBuildModeCommandCatalog(reportPayload);
  const command = commandCatalog.find((item) => item.id === receipt.commandId);
  const testsRun = deriveTestsRun(
    payload.finalReport.testsRun,
    command,
    receipt,
  );
  const filesChanged = deriveFilesChanged(
    payload.finalReport.filesChanged,
    command,
    receipt,
  );
  const gaps = deriveReportGaps(
    payload.finalReport.gaps,
    commandReceipts,
    readinessGates,
    scheduledAutomations,
  );

  return {
    ...payload.finalReport,
    status: isFinalReportReady(
      commandCatalog,
      browserVerification,
      readinessGates,
    )
      ? "ready"
      : "draft",
    filesChanged,
    testsRun,
    gaps,
    nextHandoff: [
      `Latest command receipt: ${receipt.id} (${receipt.status}).`,
      ...deriveOperatorActionHandoff(receipt),
      `Autonomy decision: ${autonomyDecision.status} - ${autonomyDecision.summary}`,
      ...deriveEvidenceHandoff(evidenceArtifacts, receipt),
      ...deriveAutomationRunHandoff(scheduledAutomations, receipt),
      ...deriveCreditUsageHandoff(creditUsageReceipts, receipt),
      ...deriveCheckpointHandoff(checkpoints),
      ...deriveExecutionPlanHandoff(executionPlan),
      ...payload.finalReport.nextHandoff.filter(
        (item) =>
          !item.startsWith("Latest command receipt:") &&
          !item.startsWith("Operator action:") &&
          !item.startsWith("Autonomy decision:") &&
          !item.startsWith("Automation ") &&
          !item.startsWith("Evidence artifacts:") &&
          !item.startsWith("Credit usage:") &&
          !item.startsWith("Checkpoint ") &&
          !item.startsWith("Next execution step:"),
      ),
    ],
  };
};

const isFinalReportReady = (
  commandCatalog: BuildModeCommand[],
  browserVerification: BrowserVerificationStatus,
  readinessGates: BuildModeReadinessGate[],
): boolean => {
  const finalReportGate = readinessGates.find(
    (gate) => gate.id === "gate-final-report-ready",
  );
  return (
    commandCatalog.length > 0 &&
    commandCatalog.every((item) => item.status === "succeeded") &&
    browserVerification.status === "passed" &&
    readinessGates
      .filter((gate) => gate.blocksRun)
      .every((gate) => gate.status === "passed") &&
    (!finalReportGate || finalReportGate.status === "passed")
  );
};

const deriveOperatorActionHandoff = (
  receipt: BuildModeCommandReceipt,
): string[] =>
  receipt.operatorActionSummary
    ? [
        `Operator action: ${receipt.nextOperatorAction ?? "inspect"} (${receipt.executionMode ?? "operator-handoff"}) - ${receipt.operatorActionSummary}`,
      ]
    : [];

const deriveCreditUsageHandoff = (
  creditUsageReceipts: ValorTaskBridgePayload["creditUsageReceipts"],
  receipt: BuildModeCommandReceipt,
): string[] => {
  const usage = receipt.creditUsageReceipt
    ? creditUsageReceipts.find(
        (item) => item.id === receipt.creditUsageReceipt!.id,
      )
    : undefined;
  return usage
    ? [
        `Credit usage: ${usage.actualCredits} actual (${usage.providerCredits} provider, ${usage.hostedInfrastructureCredits} hosted) for ${usage.commandId} via ${usage.providerRoute}.`,
        usage.billingSummary
          ? `Billing note: ${usage.billingSummary}`
          : undefined,
      ].filter((item): item is string => Boolean(item))
    : [];
};

const deriveExecutionPlanHandoff = (
  plan: BuildModeExecutionPlanStep[],
): string[] => {
  const nextStep = plan.find((step) =>
    ["ready", "approval-required", "pending", "blocked"].includes(step.status),
  );
  return nextStep
    ? [`Next execution step: ${nextStep.label} (${nextStep.status}).`]
    : [];
};

const deriveEvidenceHandoff = (
  evidenceArtifacts: ValorTaskBridgePayload["evidenceArtifacts"],
  receipt: BuildModeCommandReceipt,
): string[] => {
  const count = evidenceArtifacts.filter(
    (artifact) => artifact.receiptId === receipt.id,
  ).length;
  return count
    ? [`Evidence artifacts: ${count} captured for ${receipt.id}.`]
    : [];
};

const deriveAutomationRunHandoff = (
  automations: ScheduledAutomationBinding[],
  receipt: BuildModeCommandReceipt,
): string[] => {
  const automation = automations.find(
    (item) => receipt.commandId === `cmd-automation-${item.id}`,
  );
  if (
    !automation?.lastRunReceiptId ||
    automation.lastRunReceiptId !== receipt.id
  ) {
    return [];
  }
  return [
    `Automation ${automation.label}: last run ${automation.lastRunStatus ?? "unknown"} at ${automation.lastRunAt ?? receipt.createdAt}; next ${automation.nextRunAt ?? "not scheduled"}.`,
  ];
};

const formatScheduledAutomationScheduler = (
  scheduler: ScheduledAutomationBinding["scheduler"] | undefined,
): string =>
  (scheduler ?? "valkyrai-cron") === "valkyrai-cron"
    ? "ValkyrAI cron workflow launcher"
    : "unknown scheduler";

const deriveCheckpointHandoff = (
  checkpoints: ValorTaskBridgePayload["checkpoints"],
): string[] =>
  checkpoints.map((checkpoint) => {
    const proof = checkpoint.receiptIds.join(", ") || "none";
    return `Checkpoint ${checkpoint.label}: ${checkpoint.status}; proof: ${proof}.`;
  });

const deriveAutomationSnapshotFinalReport = (
  current: ValorTaskBridgePayload["finalReport"],
  automations: ScheduledAutomationBinding[],
  snapshot: BuildModeAutomationSnapshot,
): ValorTaskBridgePayload["finalReport"] => {
  const snapshotRecordIds = new Set(
    snapshot.records.map((record) => record.id),
  );
  const snapshotAutomations = automations.filter((automation) =>
    snapshotRecordIds.has(automation.id),
  );
  const automationHandoff = [
    `Automation snapshot: ${snapshot.records.length} record${snapshot.records.length === 1 ? "" : "s"} refreshed at ${snapshot.refreshedAt} from ${snapshot.storageUri}.`,
    ...snapshotAutomations.map((automation) =>
      [
        `Automation ${automation.label}: ${automation.status}`,
        `schedule ${automation.schedule}`,
        `scheduler ${formatScheduledAutomationScheduler(automation.scheduler)}`,
        `next ${automation.nextRunAt ?? "not scheduled"}`,
        automation.lastRunAt
          ? `last ${automation.lastRunStatus ?? "unknown"} at ${automation.lastRunAt}`
          : "last never",
        automation.lastRunReceiptId
          ? `receipt ${automation.lastRunReceiptId}`
          : undefined,
      ]
        .filter(Boolean)
        .join("; "),
    ),
  ];
  const automationGaps = snapshotAutomations
    .filter(
      (automation) =>
        automation.lastRunStatus === "failed" ||
        automation.lastRunStatus === "skipped" ||
        automation.status === "blocked",
    )
    .map((automation) => {
      if (automation.status === "blocked") {
        return `Automation ${automation.label} is blocked.`;
      }
      return `Automation ${automation.label} last run ${automation.lastRunStatus}.`;
    });

  return {
    ...current,
    gaps: Array.from(new Set([...automationGaps, ...current.gaps])),
    nextHandoff: [
      ...automationHandoff,
      ...current.nextHandoff.filter(
        (item) =>
          !item.startsWith("Automation snapshot:") &&
          !item.startsWith("Automation "),
      ),
    ],
  };
};

const deriveTestsRun = (
  current: string[],
  command: BuildModeCommand | undefined,
  receipt: BuildModeCommandReceipt,
): string[] => {
  if (command?.kind !== "test" && command?.kind !== "build") {
    return current;
  }

  const nextLine = `${command.label}: ${receipt.status}`;
  return [
    nextLine,
    ...current.filter(
      (item) => item !== "pending" && !item.startsWith(`${command.label}:`),
    ),
  ];
};

const deriveFilesChanged = (
  current: string[],
  command: BuildModeCommand | undefined,
  receipt: BuildModeCommandReceipt,
): string[] => {
  if (command?.kind !== "edit" || receipt.status !== "succeeded") {
    return current;
  }
  return Array.from(new Set([...(command.targetPaths ?? []), ...current]));
};

const deriveReportGaps = (
  current: string[],
  commandReceipts: BuildModeCommandReceipt[],
  readinessGates: BuildModeReadinessGate[] = [],
  scheduledAutomations: ScheduledAutomationBinding[] = [],
): string[] => {
  const policyGaps = commandReceipts
    .filter((receipt) => receipt.status === "approval-required")
    .map((receipt) => `Approval pending for ${receipt.commandId}.`);
  const failureGaps = commandReceipts
    .filter(
      (receipt) => receipt.status === "failed" || receipt.status === "rejected",
    )
    .map((receipt) => `Command ${receipt.commandId} needs operator review.`);
  const readinessGaps = readinessGates
    .filter((gate) => gate.status !== "passed" && gate.blocksRun)
    .map((gate) => `Readiness gate ${gate.label}: ${gate.status}.`);
  const automationGaps = scheduledAutomations
    .filter(
      (automation) =>
        automation.lastRunStatus === "failed" ||
        automation.lastRunStatus === "skipped",
    )
    .map(
      (automation) =>
        `Automation ${automation.label} last run ${automation.lastRunStatus}.`,
    );

  return Array.from(
    new Set([
      ...policyGaps,
      ...failureGaps,
      ...readinessGaps,
      ...automationGaps,
      ...current,
    ]),
  );
};

export const renderBuildModeFinalReport = (
  payload: ValorTaskBridgePayload,
): string => {
  const section = (title: string, values: string[]) =>
    [`## ${title}`, ...(values.length ? values : ["None"]).map((v) => `- ${v}`)]
      .join("\n")
      .trim();

  const commandLines = getBuildModeCommandCatalog(payload).map((command) => {
    const receipt = payload.commandReceipts.find(
      (item) => item.commandId === command.id,
    );
    return [
      `${command.label}: ${command.status}`,
      `kind ${command.kind}`,
      `capability ${command.capabilityId}`,
      command.assignedSwarmRole
        ? `role ${command.assignedSwarmRole}`
        : undefined,
      command.assignedRuntimeId
        ? `runtime ${command.assignedRuntimeId}`
        : undefined,
      command.executionPlanStepId
        ? `step ${command.executionPlanStepId}`
        : undefined,
      receipt ? `receipt ${receipt.id}` : undefined,
      receipt?.policyDecision ? `policy ${receipt.policyDecision}` : undefined,
      receipt?.summary ? `summary ${receipt.summary}` : undefined,
    ]
      .filter(Boolean)
      .join("; ");
  });
  const nextExecutionAction = getNextBuildModeExecutionAction(payload);
  const autonomyDecision = deriveBuildModeAutonomyDecision(payload);
  const autonomousQueuePlan = deriveBuildModeAutonomousQueuePlan(payload);
  const receiptLines = [
    ...payload.receipts.map((receipt) => `${receipt.id}: ${receipt.status}`),
    ...payload.commandReceipts.map(
      (receipt) =>
        `${receipt.id}: ${receipt.status} [${
          receipt.executionMode ?? "legacy-receipt"
        }; next: ${receipt.nextOperatorAction ?? "inspect"}]${
          receipt.policyReasons?.length
            ? ` (${receipt.policyReasons.join("; ")})`
            : ""
        }${
          receipt.requiredApprovalThreshold
            ? ` threshold ${receipt.requiredApprovalThreshold}`
            : ""
        }${
          receipt.approval
            ? ` approved by ${receipt.approval.approverPrincipalId} (${receipt.approval.threshold})`
            : ""
        }${
          receipt.assignedSwarmRole
            ? ` role ${receipt.assignedSwarmRole}${receipt.assignedRuntimeId ? ` (${receipt.assignedRuntimeId})` : ""}`
            : ""
        }${
          receipt.executionPlanStepId
            ? ` step ${receipt.executionPlanStepId}`
            : ""
        }${
          receipt.promptContext
            ? ` prompt ${receipt.promptContext.promptProfileName} (${receipt.promptContext.promptBundleId}@${receipt.promptContext.promptBundleVersion})`
            : ""
        }${
          receipt.grayMatterContextProof
            ? ` context ${receipt.grayMatterContextProof.contextPackId} (${receipt.grayMatterContextProof.retrievalStatus}, preflight ${receipt.grayMatterContextProof.invariantPreflightStatus}, receipts ${receipt.grayMatterContextProof.retrievalReceiptIds.join(", ") || "none"})`
            : ""
        } - ${receipt.summary}`,
    ),
  ];
  const creditUsageLines = payload.creditUsageReceipts.map(
    (receipt) =>
      `${receipt.id}: ${receipt.commandId} ${receipt.commandStatus} on ${receipt.capabilityId} via ${receipt.providerRoute}; ${receipt.actualCredits} actual (${receipt.providerCredits} provider, ${receipt.hostedInfrastructureCredits} hosted) from ${receipt.estimateId}${receipt.billingSummary ? ` - ${receipt.billingSummary}` : ""}`,
  );
  const commandOutcomeLines = [
    `succeeded: ${payload.commandReceipts.filter((receipt) => receipt.status === "succeeded").length}`,
    `running: ${payload.commandReceipts.filter((receipt) => receipt.status === "running" || receipt.status === "queued").length}`,
    `approval required: ${payload.commandReceipts.filter((receipt) => receipt.status === "approval-required").length}`,
    `failed or rejected: ${payload.commandReceipts.filter((receipt) => receipt.status === "failed" || receipt.status === "rejected").length}`,
    `evidence artifacts: ${payload.evidenceArtifacts.length}`,
    `automation bindings: ${payload.scheduledAutomations.length}`,
  ];
  const contextPack = payload.grayMatterContextPack;
  const grayMatterContextLines = [
    `source: ${contextPack.source}`,
    `policy: ${contextPack.policy}`,
    `answer policy: ${contextPack.answerPolicy}`,
    `retrieval status: ${contextPack.retrievalStatus}`,
    `invariant preflight: ${contextPack.invariantPreflightStatus}`,
    `compiled at: ${contextPack.compiledAt}`,
    `retrieval receipts: ${contextPack.retrievalReceiptIds.join(", ") || "none"}`,
    `memory entries: ${contextPack.memoryEntryIds.join(", ") || "none"}`,
    `trace: ${contextPack.retrievalTraceId ?? "none"}`,
    `preflight receipt: ${contextPack.preflightReceiptId ?? "none"}`,
    `source refs: ${contextPack.sourceRefs.join(", ") || "none"}`,
    `major task refs: ${contextPack.majorTaskRefs.join(", ") || "none"}`,
    contextPack.summary,
  ];
  const browserArtifactLines = getBrowserVerificationArtifactLines(payload);
  const latestReceiptByCommandId = getLatestReceiptByCommandId(
    payload.commandReceipts,
  );
  const mcpToolLines = getBuildModeMcpToolCommands(payload).map((command) =>
    formatBuildModeMcpToolCommandLine(
      command,
      latestReceiptByCommandId.get(command.id),
    ),
  );

  return redactBuildModeText(
    [
      `# ${payload.finalReport.title}`,
      `Status: ${payload.finalReport.status}`,
      `Task: ${payload.taskId}`,
      `App Bundle: ${payload.appBundle.name} ${payload.appBundle.version}`,
      `App Bundle Proof: ${payload.appBundle.receiptIds?.join(", ") || "none"}`,
      `Tenant: ${payload.scope.tenantId}`,
      `Principal: ${payload.scope.principalId}`,
      `Workspace: ${payload.scope.workspaceRoot}`,
      `Credit Estimate Proof: ${payload.creditEstimate.receiptIds?.join(", ") || "none"}`,
      `Context Pack: ${payload.grayMatterContextPack.id}`,
      section("GrayMatter Context", grayMatterContextLines),
      section(
        "Component Bundles",
        payload.componentBundles.map(
          (bundle) =>
            `${bundle.name}: ${bundle.framework} ${bundle.generatedBy} ${bundle.status} (entrypoints: ${bundle.entrypoints.join(", ") || "none"}; proof: ${bundle.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "ExecModule Registry",
        payload.execModules.map(
          (module) =>
            `${module.name}: ${module.safetyLevel} (${module.inputSchemaRef} -> ${module.outputSchemaRef}; proof: ${module.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section("Run Audit Summary", commandOutcomeLines),
      section(
        "Agent Loop",
        payload.agentLoop.map((phase) => `${phase.label}: ${phase.status}`),
      ),
      section(
        "Agent Runtime Lanes",
        payload.agentRuntimes.map(
          (runtime) =>
            `${runtime.label}: ${runtime.runtime} ${runtime.status} (${runtime.handoffPolicy}, phases: ${runtime.loopPhaseIds.join(", ") || "none"})`,
        ),
      ),
      section(
        "Local Model Runtime Registry",
        payload.localModelRuntimes.map(
          (runtime) =>
            `${runtime.label}: ${runtime.modelRef} ${runtime.status} (${runtime.executionMode}; runtime ${runtime.runtimeId}; endpoint ${runtime.endpointRef}; capabilities: ${runtime.capabilityIds.join(", ") || "none"}; proof: ${runtime.receiptIds.join(", ") || "none"})`,
        ),
      ),
      section(
        "Swarm Roles",
        payload.swarmRoles.map(
          (assignment) =>
            `${assignment.role}: ${assignment.status} (${assignment.owner}) - ${assignment.currentFocus}`,
        ),
      ),
      section(
        "Workflow MCP Bindings",
        payload.workflowMcpBindings.map(
          (binding) =>
            `${binding.toolName}: ${binding.serverName} ${binding.workflowRef} (${binding.execModuleId}; proof: ${binding.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "MCP Server Registry",
        payload.mcpServers.map(
          (server) =>
            `${server.name}: ${server.transport} ${server.status} ${server.scope} (tools: ${server.toolIds.join(", ") || "none"}; proof: ${server.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "MCP Tool Registry",
        payload.mcpTools.map(
          (tool) =>
            `${tool.name}: ${tool.capabilityId} ${tool.status} (${tool.serverId}${tool.execModuleId ? `; execModule ${tool.execModuleId}` : ""}${tool.workflowRef ? `; workflow ${tool.workflowRef}` : ""}; proof: ${tool.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "Connector Access Registry",
        payload.connectorBindings.map(
          (binding) =>
            `${binding.connectorName}: ${binding.status} (${binding.connectorId}; data: ${binding.dataClasses.join(", ") || "none"}; actions: ${binding.allowedActions.join(", ") || "none"}; commands: ${binding.commandIds.join(", ") || "none"}; proof: ${binding.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section("MCP Tool Commands", mcpToolLines),
      section(
        "ThorAPI And VAIX",
        payload.thorApiVaixBindings.map(
          (binding) =>
            `${binding.serviceName}: ${binding.surface} ${binding.policy} (${binding.clientRef}; generated: ${binding.generatedPaths.join(", ") || "none"})`,
        ),
      ),
      section("Autonomy Policy", [
        `${payload.autonomyPolicy.label}: ${payload.autonomyPolicy.mode}`,
        `max consecutive commands: ${payload.autonomyPolicy.maxConsecutiveCommands}`,
        `current command receipts: ${payload.commandReceipts.length}`,
        `max estimated credits: ${payload.autonomyPolicy.maxEstimatedCredits}`,
        `estimated credits: ${payload.creditEstimate.estimatedCredits}`,
        `policy proof: ${payload.autonomyPolicy.receiptIds?.join(", ") || "none"}`,
        `allowed capabilities: ${payload.autonomyPolicy.allowedCapabilityIds.join(", ") || "none"}`,
        `approval required: ${payload.autonomyPolicy.approvalRequiredCapabilityIds.join(", ") || "none"}`,
      ]),
      section("Autonomy Decision", [
        `${autonomyDecision.status}: ${autonomyDecision.summary}`,
        `next step: ${autonomyDecision.nextStepId ?? "none"}`,
        `next command: ${autonomyDecision.nextCommandId ?? "none"}`,
        `capability: ${autonomyDecision.capabilityId ?? "none"}`,
        `approval threshold: ${autonomyDecision.requiredApprovalThreshold ?? "none"}`,
        `command slots remaining: ${autonomyDecision.commandSlotsRemaining}`,
        `estimated credits remaining: ${autonomyDecision.estimatedCreditsRemaining}`,
        `blocking gates: ${autonomyDecision.blockingGateIds.join(", ") || "none"}`,
        `blocking receipts: ${autonomyDecision.blockingReceiptIds.join(", ") || "none"}`,
        `reasons: ${autonomyDecision.reasonCodes.join(", ") || "none"}`,
      ]),
      section("Autonomous Queue Plan", [
        `${autonomousQueuePlan.status}: ${autonomousQueuePlan.summary}`,
        `next step: ${autonomousQueuePlan.nextStepId ?? "none"}`,
        `next command: ${autonomousQueuePlan.nextCommandId ?? "none"}`,
        `dispatchable commands: ${autonomousQueuePlan.dispatchableCommandIds.join(", ") || "none"}`,
        `approval commands: ${autonomousQueuePlan.approvalCommandIds.join(", ") || "none"}`,
        `blocked commands: ${autonomousQueuePlan.blockedCommandIds.join(", ") || "none"}`,
        `approval threshold: ${autonomousQueuePlan.requiredApprovalThreshold ?? "none"}`,
        `command slots remaining: ${autonomousQueuePlan.commandSlotsRemaining}`,
        `estimated credits remaining: ${autonomousQueuePlan.estimatedCreditsRemaining}`,
        `blocking gates: ${autonomousQueuePlan.blockingGateIds.join(", ") || "none"}`,
        `blocking receipts: ${autonomousQueuePlan.blockingReceiptIds.join(", ") || "none"}`,
        `receipt required: ${autonomousQueuePlan.receiptRequired ? "yes" : "no"}`,
        `reasons: ${autonomousQueuePlan.reasonCodes.join(", ") || "none"}`,
      ]),
      section("Credit Usage", [
        `estimate: ${payload.creditEstimate.estimatedCredits} ${payload.creditEstimate.currency}`,
        `hosted estimate: ${payload.creditEstimate.estimatedHostedInfrastructureCredits}`,
        `provider route: ${payload.selectedProviderRoute}`,
        `assumptions: ${payload.creditEstimate.assumptions.join("; ") || "none"}`,
        ...creditUsageLines,
      ]),
      section(
        "Provider Credentials",
        payload.providerCredentials.map(
          (credential) =>
            `${credential.displayName}: ${credential.route} (${credential.tenantScoped ? "tenant scoped" : "local"}, secret ${credential.secretAvailable ? "available" : "not available"}; proof: ${credential.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "Readiness Gates",
        payload.readinessGates.map(
          (gate) =>
            `${gate.label}: ${gate.status}${gate.blocksRun ? " (blocks run)" : ""}`,
        ),
      ),
      section(
        "Execution Plan",
        payload.executionPlan.map(
          (step) =>
            `${step.label}: ${step.status} (${step.runtimeId}; commands: ${step.commandIds.join(", ") || "none"}; next: ${step.nextAction})`,
        ),
      ),
      section(
        "Next Runbook Action",
        nextExecutionAction
          ? [
              `${nextExecutionAction.step.label} -> ${nextExecutionAction.command.label} (${nextExecutionAction.command.capabilityId})`,
            ]
          : [],
      ),
      section("Command Status", commandLines),
      section("Receipt Trail", receiptLines),
      section(
        "Prompt Profiles",
        payload.promptProfiles.map(
          (profile) =>
            `${profile.name}: ${profile.modelFamily} (${profile.promptBundleRef}; proof: ${profile.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "Prompt Bundles",
        payload.promptBundles.map(
          (bundle) =>
            `${bundle.name}: ${bundle.policy} (${bundle.sections.length} sections, receipts: ${bundle.receiptIds.join(", ") || "none"})`,
        ),
      ),
      section(
        "Capability Matrix",
        payload.capabilities.map(
          (capability) => {
            const approval = capability.requiresApproval
              ? " approval-required"
              : "";
            const proof = capability.receiptIds?.join(", ") || "none";
            return `${capability.label}: ${capability.enabled ? "enabled" : "disabled"} ${capability.kind} ${capability.risk}${approval} (proof: ${proof})`;
          },
        ),
      ),
      section(
        "Guardrails",
        payload.guardrails.map(
          (guardrail) => `${guardrail.label}: ${guardrail.enforcement}`,
        ),
      ),
      section(
        "Tool Permissions",
        payload.toolPermissions.map(
          (permission) =>
            `${permission.label}: ${permission.decision} (${permission.capabilityId}, threshold: ${permission.approvalThreshold}, receipt: ${permission.receiptRequired ? "required" : "optional"}, proof: ${permission.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "Command Policy",
        payload.commandPolicyRules.map(
          (rule) =>
            `${rule.label}: ${rule.effect} (${rule.pattern}; proof: ${rule.receiptIds?.join(", ") || "none"})`,
        ),
      ),
      section(
        "Checkpoints",
        payload.checkpoints.map((checkpoint) => {
          const proof = checkpoint.receiptIds.join(", ") || "none";
          return `${checkpoint.label}: ${checkpoint.status}${checkpoint.hash ? ` (${checkpoint.hash})` : ""}; proof: ${proof}`;
        }),
      ),
      section(
        "Safe Edits",
        payload.safeEditPlans.map(
          (plan) =>
            `${plan.label}: ${plan.status} (${plan.targetPaths.join(", ")}; proof: ${plan.receiptIds.join(", ") || "none"})`,
        ),
      ),
      section("Browser Verification", [
        `status: ${payload.browserVerification.status}`,
        `preview: ${payload.browserVerification.previewUrl ?? "not ready"}`,
        `screenshot receipt: ${payload.browserVerification.screenshotReceiptId ?? "none"}`,
        `console errors: ${payload.browserVerification.consoleErrorCount}`,
        `artifacts: ${payload.browserVerification.artifactIds.join(", ") || "none"}`,
        ...browserArtifactLines,
      ]),
      section(
        "App Bundle Diffs",
        payload.appBundleDiffs.map(
          (diff) =>
            `${diff.title}: ${diff.appBundleId} at ${diff.generatedAt}; added ${formatAppBundleDiffArtifactList(payload.appBundle, diff.addedArtifacts)}; changed ${formatAppBundleDiffArtifactList(payload.appBundle, diff.changedArtifacts)}; removed ${formatAppBundleDiffArtifactList(payload.appBundle, diff.removedArtifacts)}; receipts ${diff.receiptIds.join(", ") || "none"}; evidence ${diff.evidenceArtifactIds.join(", ") || "none"}`,
        ),
      ),
      section(
        "Evidence Artifacts",
        payload.evidenceArtifacts.map((artifact) => {
          const proof = formatEvidenceArtifactProof(artifact);
          return `${artifact.title}: ${artifact.kind} (${artifact.uri})${artifact.receiptId ? ` receipt ${artifact.receiptId}` : ""}${artifact.summary ? ` - ${artifact.summary}` : ""}${proof ? `; ${proof}` : ""}`;
        }),
      ),
      section(
        "Scheduled Automations",
        payload.scheduledAutomations.map((automation) =>
          [
            `${automation.label}: ${automation.status}`,
            `schedule ${automation.schedule}`,
            `scheduler ${formatScheduledAutomationScheduler(automation.scheduler)}`,
            automation.providerRoute
              ? `provider ${automation.providerRoute}`
              : undefined,
            automation.promptContext
              ? `prompt ${automation.promptContext.promptProfileName} (${automation.promptContext.promptBundleId}@${automation.promptContext.promptBundleVersion})`
              : undefined,
            `workflow ${automation.workflowRef}`,
            automation.valkyraiWorkflowId
              ? `valkyrai workflow ${automation.valkyraiWorkflowId}`
              : undefined,
            `next ${automation.nextRunAt ?? "not scheduled"}`,
            automation.lastRunAt
              ? `last ${automation.lastRunStatus ?? "unknown"} at ${automation.lastRunAt}`
              : "last never",
            automation.lastRunReceiptId
              ? `receipt ${automation.lastRunReceiptId}`
              : undefined,
            automation.runHistory?.length
              ? `history ${automation.runHistory
                  .slice(0, 3)
                  .map(
                    (run) =>
                      `${run.status}@${run.completedAt}${run.error ? `:${run.error}` : ""}`,
                  )
                  .join(", ")}`
              : undefined,
          ]
            .filter(Boolean)
            .join("; "),
        ),
      ),
      section("Scope", [
        `tenant: ${payload.scope.tenantId}`,
        `principal: ${payload.scope.principalId}`,
        `workspace: ${payload.scope.workspaceRoot}`,
        `roles: ${payload.scope.roles.join(", ") || "none"}`,
        `policies: ${payload.scope.policyRefs.join(", ") || "none"}`,
        `ignored paths: ${payload.scope.ignoredPathPatterns?.join(", ") || "none"}`,
      ]),
      section("Files Changed", payload.finalReport.filesChanged),
      section("Tests Run", payload.finalReport.testsRun),
      section("Gaps", payload.finalReport.gaps),
      section("Next Handoff", payload.finalReport.nextHandoff),
    ].join("\n\n"),
  );
};

export const formatEvidenceArtifactProof = (
  artifact: Pick<BuildModeEvidenceArtifact, "metadata">,
): string | undefined => {
  const metadata = artifact.metadata;
  if (!metadata) {
    return undefined;
  }
  const parts = [
    formatProofPart("execution", metadata.executionId),
    formatProofPart("diff", metadata.diffId),
    formatProofPart("app bundle", metadata.appBundleId),
    formatProofPart("added", metadata.addedArtifactCount),
    formatProofPart("changed", metadata.changedArtifactCount),
    formatProofPart("removed", metadata.removedArtifactCount),
    formatProofPart("state", metadata.executionState),
    formatProofPart("receipt", metadata.receiptRef),
    formatProofPart("trace", metadata.traceId),
    formatProofPart("status", metadata.status),
    formatProofPart("workflow", metadata.workflowRef),
    formatProofPart("schedule", metadata.scheduleId),
    formatProofPart("checkpoint", metadata.checkpointHash),
    formatProofPart("connector", metadata.connectorId),
    formatProofPart("data", metadata.dataClass),
    formatProofPart("query", metadata.queryRef),
    formatProofPart("records", metadata.recordCount),
    formatProofPart("resource", metadata.resourceUri),
    formatProofPart("memory", metadata.memoryId),
    formatProofPart("memory status", metadata.memoryStatus),
    formatProofPart("memory error", metadata.memoryError),
    formatProofPart("context pack", metadata.contextPackId),
    formatProofPart("retrieval status", metadata.retrievalStatus),
    formatProofPart("preflight", metadata.invariantPreflightStatus),
    formatProofPart("retrieval receipts", metadata.retrievalReceiptCount),
    formatProofPart("memory entries", metadata.memoryEntryCount),
    formatProofPart("url", metadata.currentUrl),
    formatProofPart("screenshot", metadata.screenshotCaptured),
    formatProofPart("console errors", metadata.consoleErrorCount),
    formatProofPart("hash", metadata.contentHash),
    formatProofPart("source hash", metadata.sourceContentHash),
    formatProofPart("bytes", metadata.byteSize),
    formatProofPart("exit", metadata.exitCode),
    formatProofPart("completed", metadata.completed),
    formatProofPart("background", metadata.background),
    formatProofPart("timed out", metadata.timedOut),
    formatProofPart("deploy", metadata.deployId),
    formatProofPart("draft", metadata.deployDraft),
    formatProofPart("target", metadata.deployTarget),
    formatProofPart("environment", metadata.deployEnvironment),
    formatProofPart("preview", metadata.deployPreviewUrl),
  ].filter(Boolean);
  return parts.length ? parts.join("; ") : undefined;
};

const getBrowserVerificationArtifactLines = (
  payload: ValorTaskBridgePayload,
): string[] =>
  payload.browserVerification.artifactIds.flatMap((artifactId) => {
    const artifact = payload.evidenceArtifacts.find(
      (candidate) => candidate.id === artifactId,
    );
    if (
      !artifact ||
      !["browser_console", "browser_screenshot"].includes(artifact.kind)
    ) {
      return [];
    }
    const proof = formatEvidenceArtifactProof(artifact);
    return [
      `${artifact.title}: ${artifact.kind}${artifact.receiptId ? ` receipt ${artifact.receiptId}` : ""}${proof ? `; ${proof}` : ""}`,
    ];
  });

const formatProofPart = (
  label: string,
  value: string | number | boolean | undefined,
): string | undefined => {
  if (value === undefined || value === "") {
    return undefined;
  }
  return `${label} ${String(value)}`;
};
