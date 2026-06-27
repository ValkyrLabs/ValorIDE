export type ProviderRoute =
  | "bring-your-own-key"
  | "valkyr-credits"
  | "local-model"
  | "enterprise-proxy";

export type CommandKind =
  | "test"
  | "build"
  | "inspect"
  | "edit"
  | "deploy"
  | "verify"
  | "automation"
  | "checkpoint"
  | "connector"
  | "mcp"
  | "report"
  | "swarm"
  | "workflow";

export type BuildModeCommandStatus =
  | "queued"
  | "approval-required"
  | "running"
  | "succeeded"
  | "failed"
  | "rejected";

export type BuildModePolicyDecision = "allow" | "approval-required" | "reject";

export type BuildModeCommandExecutionMode =
  | "agentic-command-bus"
  | "approval-gate"
  | "operator-handoff"
  | "policy-blocked";

export type BuildModeNextOperatorAction =
  | "approve"
  | "continue"
  | "inspect"
  | "monitor"
  | "none"
  | "revise";

export type BuildModeCommandPolicyEffect =
  | "allow"
  | "approval-required"
  | "deny";

export type BuildModeToolPermissionDecision =
  | "allow"
  | "approval-required"
  | "deny";

export type BuildModeApprovalThreshold =
  | "none"
  | "operator"
  | "owner"
  | "admin";

export type BuildModeCapabilityKind =
  | "automation"
  | "browser"
  | "checkpoint"
  | "connector"
  | "filesystem"
  | "graymatter"
  | "mcp"
  | "psr"
  | "swarm"
  | "terminal"
  | "thorapi"
  | "workflow";

export type BuildModeRisk = "low" | "medium" | "high";

export type BuildModeAgentRuntimeKind =
  | "Codex"
  | "OpenClaw"
  | "ValorIDE"
  | "ThorAPI"
  | "VAIX";

export type BuildModeRuntimeStatus =
  | "available"
  | "selected"
  | "running"
  | "blocked"
  | "offline";

export type BuildModeThorApiVaixSurface = "ThorAPI" | "VAIX";

export type BuildModeAutonomyMode =
  | "manual"
  | "approval-gated"
  | "autonomous-local"
  | "disabled";

export type BuildModeReadinessGateStatus =
  | "passed"
  | "pending"
  | "blocked"
  | "failed";

export type BuildModeExecutionPlanStepStatus =
  | "pending"
  | "ready"
  | "running"
  | "approval-required"
  | "blocked"
  | "complete"
  | "failed";

export type BuildModeSwarmRole =
  | "Supervisor"
  | "Spec Architect"
  | "ThorAPI Generator"
  | "Workflow Engineer"
  | "Aurora UI Engineer"
  | "Security Auditor"
  | "Test Runner"
  | "Browser Verifier"
  | "Deploy Operator";

export type ReceiptKind =
  | "checkpoint"
  | "context"
  | "generation"
  | "final_report"
  | "file_write"
  | "shell_command"
  | "connector_data"
  | "workflow"
  | "mcp_tool"
  | "scheduled_automation"
  | "browser_verification"
  | "credit_usage";

export interface AppBundleArtifact {
  path: string;
  kind: "generated" | "editable" | "asset" | "config";
  checksum?: string;
}

export interface AppBundle {
  id: string;
  name: string;
  version: string;
  productLine: string;
  intent: string;
  sourceSessionId: string;
  createdAt: string;
  artifacts: AppBundleArtifact[];
  componentBundleIds: string[];
  execModuleIds: string[];
  receiptIds?: string[];
}

export interface ComponentBundle {
  id: string;
  name: string;
  framework: string;
  generatedBy: "Aurora" | "ThorAPI" | "Manual" | "Workflow";
  status: "ready" | "needs-review" | "blocked";
  entrypoints: string[];
  editablePaths: string[];
  generatedPaths: string[];
  receiptIds?: string[];
}

export interface ExecModuleMetadata {
  id: string;
  name: string;
  version: string;
  capability: string;
  inputSchemaRef: string;
  outputSchemaRef: string;
  owner: string;
  safetyLevel: "readonly" | "approval-required" | "destructive";
  receiptIds?: string[];
}

export interface GrayMatterContextPack {
  id: string;
  compiledAt: string;
  source: string;
  policy:
    | "answer-confidently"
    | "requires-review"
    | "do-not-answer"
    | "ALLOW_ANSWER"
    | "ALLOW_WITH_CAVEAT"
    | "DO_NOT_ANSWER_CONFIDENTLY"
    | "REQUIRE_RETRY"
    | "REQUIRE_CLARIFICATION"
    | "DENY";
  answerPolicy:
    | "answer-confidently"
    | "requires-review"
    | "do-not-answer"
    | "retry"
    | "clarify"
    | "ALLOW_ANSWER"
    | "ALLOW_WITH_CAVEAT"
    | "DO_NOT_ANSWER_CONFIDENTLY"
    | "REQUIRE_RETRY"
    | "REQUIRE_CLARIFICATION"
    | "DENY";
  retrievalStatus:
    | "ready"
    | "partial-coverage"
    | "low-confidence"
    | "stale-context"
    | "conflicting-context"
    | "blocked"
    | "OK"
    | "NO_RESULTS"
    | "LOW_CONFIDENCE"
    | "PARTIAL_COVERAGE"
    | "STALE_CONTEXT"
    | "CONFLICTING_CONTEXT"
    | "ACCESS_DENIED"
    | "POLICY_REDACTED"
    | "EVALUATOR_REJECTED"
    | "RETRY_REQUIRED"
    | "ERROR";
  invariantPreflightStatus: "passed" | "warning" | "blocked" | "missing";
  retrievalReceiptIds: string[];
  retrievalTraceId?: string;
  preflightReceiptId?: string;
  memoryEntryIds: string[];
  sourceRefs: string[];
  majorTaskRefs: string[];
  summary: string;
}

export interface Receipt {
  id: string;
  kind: ReceiptKind;
  title: string;
  status: "pending" | "approved" | "running" | "succeeded" | "failed";
  createdAt: string;
  actor: string;
  targetRef?: string;
  summary: string;
}

export interface CreditEstimate {
  id: string;
  currency: "ValkyrCredits" | "USD";
  estimatedCredits: number;
  estimatedHostedInfrastructureCredits: number;
  providerRoute: ProviderRoute;
  assumptions: string[];
  receiptIds?: string[];
}

export interface CreditUsageReceipt {
  id: string;
  estimateId: string;
  commandId: string;
  capabilityId: string;
  providerRoute: ProviderRoute;
  commandStatus: BuildModeCommandStatus;
  actualCredits: number;
  providerCredits: number;
  hostedInfrastructureCredits: number;
  billingSummary?: string;
  createdAt: string;
}

export interface ProviderCredentialRef {
  id: string;
  route: ProviderRoute;
  displayName: string;
  tenantScoped: boolean;
  secretAvailable: boolean;
  receiptIds?: string[];
}

export interface PromptProfile {
  id: string;
  name: string;
  description: string;
  modelFamily: string;
  promptBundleRef: string;
  receiptIds?: string[];
}

export interface PromptBundleSection {
  id: string;
  title: string;
  purpose: string;
  sourceRef: string;
  checksum?: string;
}

export interface PromptBundle {
  id: string;
  name: string;
  version: string;
  source: "Valkyr" | "Workspace" | "Enterprise";
  loadedAt: string;
  policy: "locked" | "editable" | "review-required";
  sections: PromptBundleSection[];
  receiptIds: string[];
}

export interface BuildModePromptExecutionContext {
  promptProfileId: string;
  promptProfileName: string;
  promptBundleId: string;
  promptBundleVersion: string;
  promptBundlePolicy: PromptBundle["policy"];
  promptBundleReceiptIds: string[];
}

export interface WorkflowMcpBinding {
  id: string;
  execModuleId: string;
  serverName: string;
  toolName: string;
  workflowRef: string;
  inputContractRef: string;
  approvalRequired: boolean;
  receiptIds?: string[];
}

export interface BuildModeMcpServerBinding {
  id: string;
  name: string;
  transport: "stdio" | "sse" | "http" | "workflow";
  status: "connected" | "available" | "requires-approval" | "blocked";
  scope: "private" | "workspace" | "tenant" | "public";
  toolIds: string[];
  receiptIds?: string[];
}

export interface BuildModeMcpToolBinding {
  id: string;
  serverId: string;
  name: string;
  capabilityId: string;
  status: "available" | "requires-approval" | "blocked";
  execModuleId?: string;
  workflowRef?: string;
  inputSchemaRef?: string;
  outputSchemaRef?: string;
  approvalRequired: boolean;
  receiptIds?: string[];
}

export interface BuildModeConnectorBinding {
  id: string;
  connectorId: string;
  connectorName: string;
  status: "authorized" | "available" | "requires-approval" | "blocked";
  dataClasses: string[];
  allowedActions: Array<"get" | "list" | "read" | "search">;
  commandIds: string[];
  scopeRef?: string;
  receiptIds?: string[];
}

export interface ScheduledAutomationBinding {
  id: string;
  label: string;
  schedule: string;
  scheduler?: "valkyrai-cron";
  workflowRef: string;
  commandRef?: string;
  providerRoute?: ProviderRoute;
  promptContext?: BuildModePromptExecutionContext;
  approvalRequired: boolean;
  status: "draft" | "scheduled" | "paused" | "blocked";
  nextRunAt?: string;
  lastRunAt?: string;
  lastRunReceiptId?: string;
  lastRunStatus?: "failed" | "skipped" | "succeeded";
  receiptIds: string[];
  runHistory?: BuildModeAutomationRunHistoryEntry[];
  valkyraiScheduleUri?: string;
  valkyraiWorkflowId?: string;
}

export interface BuildModeAutomationRunHistoryEntry {
  completedAt: string;
  receiptId: string;
  status: "failed" | "skipped" | "succeeded";
  error?: string;
}

export interface BuildModeAutomationSnapshotRecord {
  id: string;
  label: string;
  schedule: string;
  scheduler?: "valkyrai-cron";
  status: "paused" | "scheduled";
  taskId: string;
  workflowRef: string;
  commandId?: string;
  lastRunAt?: string;
  lastRunReceiptId?: string;
  lastRunStatus?: "failed" | "skipped" | "succeeded";
  nextRunAt?: string;
  principalId?: string;
  providerRoute?: ProviderRoute;
  promptContext?: BuildModePromptExecutionContext;
  runHistory?: BuildModeAutomationRunHistoryEntry[];
  tenantId?: string;
  valkyraiScheduleUri?: string;
  valkyraiWorkflowId?: string;
  workflowCommandId?: string;
  workspaceRoot?: string;
}

export interface BuildModeAutomationSnapshot {
  records: BuildModeAutomationSnapshotRecord[];
  refreshedAt: string;
  storageUri: string;
}

export interface BuildModeScopeContext {
  tenantId: string;
  principalId: string;
  workspaceRoot: string;
  projectId?: string;
  roles: string[];
  policyRefs: string[];
  ignoredPathPatterns?: string[];
}

export interface BuildModeCommand {
  id: string;
  kind: CommandKind;
  label: string;
  command: string;
  capabilityId: string;
  assignedRuntimeId?: string;
  assignedSwarmRole?: BuildModeSwarmRole;
  executionPlanStepId?: string;
  requiresApproval: boolean;
  status: BuildModeCommandStatus;
  receiptId?: string;
  protectedPaths?: string[];
  targetPaths?: string[];
}

export interface BuildModeCommandApproval {
  approved: boolean;
  approverPrincipalId: string;
  approverRoles: string[];
  threshold: BuildModeApprovalThreshold;
  reason: string;
  createdAt: string;
}

export interface BuildModeGrayMatterContextProof {
  contextPackId: string;
  answerPolicy: GrayMatterContextPack["answerPolicy"];
  invariantPreflightStatus: GrayMatterContextPack["invariantPreflightStatus"];
  preflightReceiptId?: string;
  retrievalReceiptIds: string[];
  retrievalStatus: GrayMatterContextPack["retrievalStatus"];
  retrievalTraceId?: string;
}

export interface BuildModeCapability {
  id: string;
  label: string;
  kind: BuildModeCapabilityKind;
  enabled: boolean;
  requiresApproval: boolean;
  risk: BuildModeRisk;
  localOnly?: boolean;
  receiptIds?: string[];
}

export interface BuildModeGuardrail {
  id: string;
  label: string;
  enforcement: "hard-block" | "approval-required" | "receipt-required";
  summary: string;
  receiptIds?: string[];
}

export interface BuildModeToolPermission {
  id: string;
  capabilityId: string;
  label: string;
  decision: BuildModeToolPermissionDecision;
  approvalThreshold: BuildModeApprovalThreshold;
  reason: string;
  scopeRefs: string[];
  receiptRequired: boolean;
  receiptIds?: string[];
}

export interface BuildModeCheckpoint {
  id: string;
  label: string;
  status: "planned" | "created" | "rollback-ready" | "restored" | "failed";
  createdAt?: string;
  hash?: string;
  summary: string;
  commandId?: string;
  rollbackCommandId?: string;
  receiptIds: string[];
}

export interface BuildModeSafeEditPlan {
  id: string;
  label: string;
  summary: string;
  tool: "psr.edit" | "filesystem.write";
  status: "draft" | "queued" | "approval-required" | "applied" | "blocked";
  commandId: string;
  targetPaths: string[];
  protectedPaths: string[];
  receiptIds: string[];
}

export interface BuildModeCommandPolicyRule {
  id: string;
  label: string;
  effect: BuildModeCommandPolicyEffect;
  pattern: string;
  reason: string;
  enabled: boolean;
  commandKinds?: CommandKind[];
  receiptIds?: string[];
}

export interface BuildModeSwarmRoleAssignment {
  role: BuildModeSwarmRole;
  status: "idle" | "assigned" | "running" | "blocked" | "complete";
  owner: string;
  currentFocus: string;
}

export interface BuildModeAgentLoopPhase {
  id: string;
  label: string;
  status: "pending" | "ready" | "running" | "blocked" | "complete";
  capabilityIds: string[];
  receiptIds: string[];
}

export interface BuildModeAgentRuntimeBinding {
  id: string;
  runtime: BuildModeAgentRuntimeKind;
  label: string;
  status: BuildModeRuntimeStatus;
  ownerRole: BuildModeSwarmRole;
  promptProfileId: string;
  providerRoute: ProviderRoute;
  loopPhaseIds: string[];
  handoffPolicy: "supervised" | "operator-approved" | "autonomous-local";
  receiptIds: string[];
}

export interface BuildModeLocalModelRuntimeBinding {
  id: string;
  label: string;
  runtimeId: string;
  providerCredentialId: string;
  modelRef: string;
  endpointRef: string;
  status: BuildModeRuntimeStatus;
  executionMode: "workspace-local" | "developer-machine" | "tenant-isolated";
  capabilityIds: string[];
  healthCheckCommandId?: string;
  receiptIds: string[];
}

export interface ThorApiVaixBinding {
  id: string;
  surface: BuildModeThorApiVaixSurface;
  serviceName: string;
  clientRef: string;
  operationRefs: string[];
  generatedPaths: string[];
  editableAdapterPaths: string[];
  policy: "readonly-generated" | "approval-required" | "blocked";
  receiptIds: string[];
}

export interface BuildModeAutonomyPolicy {
  id: string;
  label: string;
  mode: BuildModeAutonomyMode;
  maxConsecutiveCommands: number;
  maxEstimatedCredits: number;
  allowedCapabilityIds: string[];
  approvalRequiredCapabilityIds: string[];
  stopConditions: string[];
  escalationRefs: string[];
  receiptRequired: boolean;
  receiptIds?: string[];
}

export type BuildModeAutonomyDecisionStatus =
  | "continue"
  | "approval-required"
  | "blocked"
  | "complete"
  | "disabled";

export interface BuildModeAutonomyDecision {
  status: BuildModeAutonomyDecisionStatus;
  summary: string;
  nextStepId?: string;
  nextCommandId?: string;
  capabilityId?: string;
  requiredApprovalThreshold?: BuildModeApprovalThreshold;
  commandSlotsRemaining: number;
  estimatedCreditsRemaining: number;
  blockingGateIds: string[];
  blockingReceiptIds: string[];
  reasonCodes: string[];
  escalationRefs: string[];
  updatedAt: string;
}

export interface BuildModeReadinessGate {
  id: string;
  label: string;
  status: BuildModeReadinessGateStatus;
  summary: string;
  requiredCapabilityIds: string[];
  requiredReceiptIds: string[];
  evidenceArtifactIds: string[];
  commandIds: string[];
  blocksRun: boolean;
}

export interface BuildModeExecutionPlanStep {
  id: string;
  label: string;
  summary: string;
  status: BuildModeExecutionPlanStepStatus;
  runtimeId: string;
  commandIds: string[];
  readinessGateIds: string[];
  dependencyStepIds: string[];
  receiptIds: string[];
  nextAction: string;
}

export type BuildModeEvidenceArtifactKind =
  | "app_bundle_diff"
  | "browser_console"
  | "browser_screenshot"
  | "checkpoint"
  | "command_stdout"
  | "connector_data"
  | "final_report"
  | "file_write"
  | "graymatter_context"
  | "mcp_result"
  | "swarm_handoff"
  | "workflow_receipt";

export interface BuildModeEvidenceArtifact {
  id: string;
  kind: BuildModeEvidenceArtifactKind;
  title: string;
  uri: string;
  commandId?: string;
  receiptId?: string;
  summary?: string;
  metadata?: Record<string, string | number | boolean | undefined>;
  createdAt: string;
}

export interface BuildModeCommandReceipt {
  id: string;
  commandId: string;
  capabilityId: string;
  status: BuildModeCommandStatus;
  approved: boolean;
  requiresApproval: boolean;
  summary: string;
  createdAt: string;
  executionMode?: BuildModeCommandExecutionMode;
  nextOperatorAction?: BuildModeNextOperatorAction;
  operatorActionSummary?: string;
  assignedRuntimeId?: string;
  assignedSwarmRole?: BuildModeSwarmRole;
  executionPlanStepId?: string;
  policyDecision?: BuildModePolicyDecision;
  policyReasons?: string[];
  requiredApprovalThreshold?: BuildModeApprovalThreshold;
  approval?: BuildModeCommandApproval;
  scope?: BuildModeScopeContext;
  promptContext?: BuildModePromptExecutionContext;
  grayMatterContextProof?: BuildModeGrayMatterContextProof;
  artifacts?: BuildModeEvidenceArtifact[];
  creditUsageReceipt?: CreditUsageReceipt;
}

export interface BrowserVerificationStatus {
  status: "not-started" | "running" | "passed" | "failed";
  previewUrl?: string;
  screenshotReceiptId?: string;
  artifactIds: string[];
  consoleErrorCount: number;
}

export interface FinalReport {
  title: string;
  status: "draft" | "ready";
  filesChanged: string[];
  testsRun: string[];
  gaps: string[];
  nextHandoff: string[];
}

export interface AppBundleDiff {
  id: string;
  title: string;
  appBundleId: string;
  generatedAt: string;
  addedArtifacts: string[];
  changedArtifacts: string[];
  removedArtifacts: string[];
  receiptIds: string[];
  evidenceArtifactIds: string[];
}

export interface ValorTaskBridgePayload {
  taskId: string;
  source: "SageChat" | "AppGallery" | "Workflow" | "Mock";
  primaryLine: string;
  appBundle: AppBundle;
  scope: BuildModeScopeContext;
  componentBundles: ComponentBundle[];
  execModules: ExecModuleMetadata[];
  grayMatterContextPack: GrayMatterContextPack;
  receipts: Receipt[];
  creditEstimate: CreditEstimate;
  creditUsageReceipts: CreditUsageReceipt[];
  providerCredentials: ProviderCredentialRef[];
  selectedProviderRoute: ProviderRoute;
  promptProfiles: PromptProfile[];
  selectedPromptProfileId: string;
  promptBundles: PromptBundle[];
  selectedPromptBundleId: string;
  mcpServers: BuildModeMcpServerBinding[];
  mcpTools: BuildModeMcpToolBinding[];
  connectorBindings: BuildModeConnectorBinding[];
  workflowMcpBindings: WorkflowMcpBinding[];
  scheduledAutomations: ScheduledAutomationBinding[];
  capabilities: BuildModeCapability[];
  guardrails: BuildModeGuardrail[];
  toolPermissions: BuildModeToolPermission[];
  commandPolicyRules: BuildModeCommandPolicyRule[];
  checkpoints: BuildModeCheckpoint[];
  safeEditPlans: BuildModeSafeEditPlan[];
  swarmRoles: BuildModeSwarmRoleAssignment[];
  agentLoop: BuildModeAgentLoopPhase[];
  agentRuntimes: BuildModeAgentRuntimeBinding[];
  localModelRuntimes: BuildModeLocalModelRuntimeBinding[];
  thorApiVaixBindings: ThorApiVaixBinding[];
  autonomyPolicy: BuildModeAutonomyPolicy;
  autonomyDecision: BuildModeAutonomyDecision;
  readinessGates: BuildModeReadinessGate[];
  executionPlan: BuildModeExecutionPlanStep[];
  commands: BuildModeCommand[];
  commandReceipts: BuildModeCommandReceipt[];
  evidenceArtifacts: BuildModeEvidenceArtifact[];
  browserVerification: BrowserVerificationStatus;
  finalReport: FinalReport;
  appBundleDiffs: AppBundleDiff[];
}
