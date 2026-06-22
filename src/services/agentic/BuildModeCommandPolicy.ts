import type {
  BuildModeApprovalThreshold,
  BuildModeAutonomyPolicy,
  BuildModeCommand,
  BuildModeCommandApproval,
  BuildModeCommandPolicyRule,
  BuildModeExecutionPlanStep,
  BuildModePolicyDecision,
  BuildModeReadinessGate,
  BuildModeScopeContext,
  BuildModeToolPermission,
  GrayMatterContextPack,
} from "@shared/BuildMode";
import { PathAccess } from "../access/PathAccess";

export interface BuildModeCommandPolicyOptions {
  approval?: BuildModeCommandApproval;
  autonomyPolicy?: BuildModeAutonomyPolicy;
  commandPolicyRules?: BuildModeCommandPolicyRule[];
  currentConsecutiveCommands?: number;
  estimatedCredits?: number;
  executionPlan?: BuildModeExecutionPlanStep[];
  readinessGates?: BuildModeReadinessGate[];
  grayMatterContextPack?: GrayMatterContextPack;
  protectedPaths?: string[];
  requireGrayMatterContext?: boolean;
  scope?: BuildModeScopeContext;
  toolPermissions?: BuildModeToolPermission[];
  workspaceRoot?: string;
}

export interface BuildModeCommandPolicyEvaluation {
  decision: BuildModePolicyDecision;
  reasons: string[];
  redactedCommand: string;
  requiresApproval: boolean;
}

interface ApprovalRule {
  pattern: RegExp;
  reason: string;
}

const SECRET_ASSIGNMENT =
  /\b([A-Z0-9_]*(?:API_?KEY|TOKEN|SECRET|PASSWORD|PRIVATE_?KEY|ACCESS_?KEY)[A-Z0-9_]*)\s*=\s*("[^"]+"|'[^']+'|[^\s]+)/gi;

const SECRET_VALUE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
];

const APPROVAL_RULES: ApprovalRule[] = [
  {
    pattern: /\bcheckpoint:(?:rollback|restore)\b|\brollback\b/i,
    reason: "Checkpoint rollback requires approval.",
  },
  {
    pattern: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?publish\b/i,
    reason: "Public package publication requires approval.",
  },
  {
    pattern: /\bgit\s+push\b/i,
    reason: "Remote git mutation requires approval.",
  },
  {
    pattern: /\bgit\s+(?:reset\s+--hard|clean\s+-[^\s]*f)\b/i,
    reason: "Destructive git cleanup requires approval.",
  },
  {
    pattern: /\brm\s+-[^\s]*r[^\s]*f\b/i,
    reason: "Recursive forced deletion requires approval.",
  },
  {
    pattern:
      /\b(?:terraform\s+(?:apply|destroy)|pulumi\s+up|kubectl\s+delete|docker\s+system\s+prune)\b/i,
    reason: "Infrastructure mutation requires approval.",
  },
  {
    pattern: /\b(?:drop\s+(?:database|schema|table)|truncate\s+table)\b/i,
    reason: "Database destructive operation requires approval.",
  },
  {
    pattern:
      /\b(?:vercel\b.*--prod|netlify\s+deploy\b.*--prod|deploy\b.*\b(?:prod|production)\b|production\b.*\bdeploy)\b/i,
    reason: "Production deploy requires approval.",
  },
  {
    pattern: /\b(?:stripe|billing|invoice|refund|charge|payment)\b/i,
    reason: "Billing mutation requires approval.",
  },
  {
    pattern:
      /\b(?:gmail|sendgrid|mailgun|smtp)\b.*\b(?:send|deliver|compose|reply|forward)\b/i,
    reason: "Email send operation requires approval.",
  },
  {
    pattern: /\bmcp\b.*\b(?:publish|register|expose|public)\b/i,
    reason: "Public MCP publication requires approval.",
  },
];

export const evaluateBuildModeCommandPolicy = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions = {},
): BuildModeCommandPolicyEvaluation => {
  const rejectionReasons = findSecretPolicyReasons(command.command);
  const approvalReasons = new Set<string>();

  if (command.requiresApproval) {
    approvalReasons.add("Command declares approval required.");
  }

  if (command.kind === "deploy") {
    approvalReasons.add("Deploy commands require approval.");
  }

  if (command.kind === "edit") {
    approvalReasons.add("Safe edit commands require approval.");
  }

  for (const rule of APPROVAL_RULES) {
    if (rule.pattern.test(command.command)) {
      approvalReasons.add(rule.reason);
    }
  }

  for (const rule of evaluatePayloadPolicyRules(command, options)) {
    if (rule.decision === "reject") {
      rejectionReasons.push(rule.reason);
    } else if (rule.decision === "approval-required") {
      approvalReasons.add(rule.reason);
    }
  }

  for (const permission of evaluateToolPermissions(command, options)) {
    if (permission.decision === "reject") {
      rejectionReasons.push(permission.reason);
    } else if (permission.decision === "approval-required") {
      approvalReasons.add(permission.reason);
    }
  }

  for (const autonomy of evaluateAutonomyPolicy(command, options)) {
    if (autonomy.decision === "reject") {
      rejectionReasons.push(autonomy.reason);
    } else if (autonomy.decision === "approval-required") {
      approvalReasons.add(autonomy.reason);
    }
  }

  for (const reason of evaluateExecutionPlanPolicy(command, options)) {
    rejectionReasons.push(reason);
  }
  for (const reason of validateGrayMatterContextPack(command, options)) {
    rejectionReasons.push(reason);
  }

  for (const reason of validateApprovalGrant(command, options)) {
    rejectionReasons.push(reason);
  }

  for (const reason of validateCommandTargetPaths(command, options)) {
    rejectionReasons.push(reason);
  }
  for (const reason of validateProtectedGeneratedPaths(command, options)) {
    rejectionReasons.push(reason);
  }

  const reasons = rejectionReasons.length
    ? rejectionReasons
    : Array.from(approvalReasons);
  const decision = decidePolicy(rejectionReasons, approvalReasons);

  return {
    decision,
    reasons,
    redactedCommand: redactCommandSecrets(command.command),
    requiresApproval: decision === "approval-required",
  };
};

export const redactCommandSecrets = (command: string): string => {
  let redacted = command.replace(SECRET_ASSIGNMENT, (_match, key, value) => {
    const token = String(value);
    return `${key}=${isSecretVariableReference(token) ? token : "<redacted>"}`;
  });

  for (const pattern of SECRET_VALUE_PATTERNS) {
    redacted = redacted.replace(pattern, "<redacted-secret>");
  }

  return redacted
    .replace(
      /\b(Authorization\s*:\s*Bearer\s+)[^\s'"`]+/gi,
      "$1<redacted-secret>",
    )
    .replace(
      /\b(token|secret|password|api[_-]?key|private[_-]?key|access[_-]?key|access[_-]?token)(\s*[:=]\s*)([^&\s,;]+)/gi,
      "$1$2<redacted>",
    )
    .replace(
      /([?&](?:token|secret|password|api[_-]?key|private[_-]?key|access[_-]?key|access[_-]?token)=)([^&#\s]+)/gi,
      "$1<redacted>",
    );
};

const decidePolicy = (
  rejectionReasons: string[],
  approvalReasons: Set<string>,
): BuildModePolicyDecision => {
  if (rejectionReasons.length) {
    return "reject";
  }
  if (approvalReasons.size) {
    return "approval-required";
  }
  return "allow";
};

const findSecretPolicyReasons = (command: string): string[] => {
  const reasons: string[] = [];
  for (const match of command.matchAll(SECRET_ASSIGNMENT)) {
    const value = match[2] ?? "";
    if (!isSecretVariableReference(value)) {
      reasons.push("Inline secret literals are blocked.");
      break;
    }
  }

  if (
    SECRET_VALUE_PATTERNS.some((pattern) => {
      pattern.lastIndex = 0;
      return pattern.test(command);
    })
  ) {
    reasons.push("Known secret token patterns are blocked.");
  }

  return reasons;
};

const evaluatePayloadPolicyRules = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): Array<{ decision: BuildModePolicyDecision; reason: string }> => {
  const activeRules = (options.commandPolicyRules ?? []).filter(
    (rule) => rule.enabled && ruleMatchesCommandKind(rule, command),
  );
  const allowRules = activeRules.filter((rule) => rule.effect === "allow");
  let allowMatched = allowRules.length === 0;
  const outcomes: Array<{ decision: BuildModePolicyDecision; reason: string }> =
    [];

  for (const rule of activeRules) {
    const pattern = compilePolicyRule(rule, outcomes);
    if (!pattern) {
      continue;
    }
    pattern.lastIndex = 0;
    if (!pattern.test(command.command)) {
      continue;
    }

    if (rule.effect === "allow") {
      allowMatched = true;
      continue;
    }
    outcomes.push({
      decision: rule.effect === "deny" ? "reject" : "approval-required",
      reason: rule.reason || `Command matched policy rule: ${rule.label}.`,
    });
  }

  if (!allowMatched) {
    outcomes.push({
      decision: "reject",
      reason: "Command is not covered by the active allow policy.",
    });
  }

  return outcomes;
};

const ruleMatchesCommandKind = (
  rule: BuildModeCommandPolicyRule,
  command: BuildModeCommand,
): boolean =>
  !rule.commandKinds?.length || rule.commandKinds.includes(command.kind);

const evaluateToolPermissions = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): Array<{ decision: BuildModePolicyDecision; reason: string }> => {
  const permission = (options.toolPermissions ?? []).find(
    (item) => item.capabilityId === command.capabilityId,
  );
  if (!permission) {
    return [];
  }

  if (permission.decision === "deny") {
    return [
      {
        decision: "reject",
        reason:
          permission.reason ||
          `Tool permission denies ${permission.capabilityId}.`,
      },
    ];
  }

  if (permission.decision === "approval-required") {
    const threshold =
      permission.approvalThreshold === "none"
        ? "operator"
        : permission.approvalThreshold;
    return [
      {
        decision: "approval-required",
        reason:
          permission.reason ||
          `Tool permission requires ${threshold} approval for ${permission.capabilityId}.`,
      },
    ];
  }

  return [];
};

const evaluateAutonomyPolicy = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): Array<{ decision: BuildModePolicyDecision; reason: string }> => {
  const policy = options.autonomyPolicy;
  if (!policy) {
    return [];
  }

  if (policy.mode === "disabled") {
    return [
      {
        decision: "reject",
        reason: `Autonomy policy is disabled: ${policy.label}.`,
      },
    ];
  }

  if (policy.mode === "manual") {
    return [
      {
        decision: "approval-required",
        reason: `Autonomy policy requires manual approval: ${policy.label}.`,
      },
    ];
  }

  if (
    policy.maxConsecutiveCommands > 0 &&
    (options.currentConsecutiveCommands ?? 0) >= policy.maxConsecutiveCommands
  ) {
    return [
      {
        decision: "reject",
        reason: `Autonomy command cap reached (${options.currentConsecutiveCommands ?? 0}/${policy.maxConsecutiveCommands}) for ${policy.label}.`,
      },
    ];
  }

  if (
    policy.maxEstimatedCredits > 0 &&
    (options.estimatedCredits ?? 0) > policy.maxEstimatedCredits
  ) {
    return [
      {
        decision: "reject",
        reason: `Estimated credits exceed autonomy cap (${options.estimatedCredits ?? 0}/${policy.maxEstimatedCredits}) for ${policy.label}.`,
      },
    ];
  }

  if (
    policy.allowedCapabilityIds.length > 0 &&
    !policy.allowedCapabilityIds.includes(command.capabilityId)
  ) {
    return [
      {
        decision: "reject",
        reason: `Capability is outside the autonomy allow list: ${command.capabilityId}.`,
      },
    ];
  }

  if (policy.approvalRequiredCapabilityIds.includes(command.capabilityId)) {
    return [
      {
        decision: "approval-required",
        reason: `Autonomy policy requires approval for ${command.capabilityId}.`,
      },
    ];
  }

  return [];
};

const validateApprovalGrant = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  const approval = options.approval;
  if (!approval) {
    return [];
  }

  const reasons: string[] = [];
  if (!approval.approved) {
    reasons.push("Build Mode approval was not granted.");
  }
  if (
    options.scope?.principalId &&
    approval.approverPrincipalId !== options.scope.principalId
  ) {
    reasons.push(
      `Approval principal is outside the active scope: ${approval.approverPrincipalId}.`,
    );
  }

  const requiredThreshold = getRequiredApprovalThreshold(command, options);
  if (!thresholdCovers(approval.threshold, requiredThreshold)) {
    reasons.push(
      `Approval threshold ${approval.threshold} is below required threshold ${requiredThreshold}.`,
    );
  }
  if (!rolesCoverThreshold(approval.approverRoles, requiredThreshold)) {
    reasons.push(
      `Approver roles do not satisfy required threshold ${requiredThreshold}.`,
    );
  }

  return reasons;
};

const getRequiredApprovalThreshold = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): BuildModeApprovalThreshold => {
  const thresholds: BuildModeApprovalThreshold[] = [];
  const permission = (options.toolPermissions ?? []).find(
    (item) =>
      item.capabilityId === command.capabilityId &&
      item.decision === "approval-required",
  );
  if (permission) {
    thresholds.push(normalizeApprovalThreshold(permission.approvalThreshold));
  }
  if (command.kind === "deploy") {
    thresholds.push("owner");
  }
  if (command.requiresApproval) {
    thresholds.push("operator");
  }
  if (
    options.autonomyPolicy?.approvalRequiredCapabilityIds.includes(
      command.capabilityId,
    )
  ) {
    thresholds.push("operator");
  }

  return thresholds.reduce(maxThreshold, "none");
};

const normalizeApprovalThreshold = (
  threshold: BuildModeApprovalThreshold,
): BuildModeApprovalThreshold =>
  threshold === "none" ? "operator" : threshold;

const thresholdRank: Record<BuildModeApprovalThreshold, number> = {
  none: 0,
  operator: 1,
  owner: 2,
  admin: 3,
};

const maxThreshold = (
  current: BuildModeApprovalThreshold,
  candidate: BuildModeApprovalThreshold,
): BuildModeApprovalThreshold =>
  thresholdRank[candidate] > thresholdRank[current] ? candidate : current;

const thresholdCovers = (
  actual: BuildModeApprovalThreshold,
  required: BuildModeApprovalThreshold,
): boolean => thresholdRank[actual] >= thresholdRank[required];

const rolesCoverThreshold = (
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

const evaluateExecutionPlanPolicy = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  const plan = options.executionPlan ?? [];
  if (!plan.length) {
    return [];
  }

  const step = plan.find((item) => item.commandIds.includes(command.id));
  if (!step) {
    return [];
  }

  if (["blocked", "failed", "complete"].includes(step.status)) {
    return [
      `Execution plan step is not runnable: ${step.label} (${step.status}).`,
    ];
  }

  const stepById = new Map(plan.map((item) => [item.id, item]));
  const dependencyReasons = step.dependencyStepIds.flatMap((dependencyId) => {
    const dependency = stepById.get(dependencyId);
    if (dependency?.status === "complete") {
      return [];
    }
    return [
      `Execution plan dependency is not complete for ${step.label}: ${dependency?.label ?? dependencyId}.`,
    ];
  });
  const readinessReasons = evaluateReadinessGatePolicy(
    command,
    step,
    plan,
    options.readinessGates ?? [],
  );
  return [...dependencyReasons, ...readinessReasons];
};

const evaluateReadinessGatePolicy = (
  command: BuildModeCommand,
  step: BuildModeExecutionPlanStep,
  plan: BuildModeExecutionPlanStep[],
  readinessGates: BuildModeReadinessGate[],
): string[] => {
  if (!readinessGates.length) {
    return [];
  }
  const stepById = new Map(plan.map((item) => [item.id, item]));
  const relevantStepIds = new Set<string>([step.id]);
  const visitDependency = (stepId: string) => {
    if (relevantStepIds.has(stepId)) {
      return;
    }
    relevantStepIds.add(stepId);
    const dependency = stepById.get(stepId);
    for (const nestedDependencyId of dependency?.dependencyStepIds ?? []) {
      visitDependency(nestedDependencyId);
    }
  };
  for (const dependencyId of step.dependencyStepIds) {
    visitDependency(dependencyId);
  }

  const relevantGateIds = new Set(
    Array.from(relevantStepIds).flatMap(
      (stepId) => stepById.get(stepId)?.readinessGateIds ?? [],
    ),
  );

  return readinessGates
    .filter((gate) => relevantGateIds.has(gate.id))
    .filter(
      (gate) =>
        gate.blocksRun &&
        gate.status !== "passed" &&
        !gate.commandIds.includes(command.id),
    )
    .map(
      (gate) =>
        `Readiness gate is not passed for ${step.label}: ${gate.label} (${gate.status}).`,
    );
};

const validateGrayMatterContextPack = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  if (
    !options.requireGrayMatterContext ||
    !requiresGrayMatterContext(command)
  ) {
    return [];
  }

  const contextPack = options.grayMatterContextPack;
  if (!contextPack) {
    return [
      "GrayMatter context pack proof is required before command execution.",
    ];
  }

  const reasons: string[] = [];
  if (!contextPack.retrievalReceiptIds.length) {
    reasons.push(
      `GrayMatter context pack ${contextPack.id} has no retrieval receipts.`,
    );
  }
  if (contextPack.invariantPreflightStatus !== "passed") {
    reasons.push(
      `GrayMatter invariant preflight is ${contextPack.invariantPreflightStatus} for ${contextPack.id}.`,
    );
  }
  if (contextPack.retrievalStatus !== "ready") {
    reasons.push(
      `GrayMatter retrieval status is ${contextPack.retrievalStatus} for ${contextPack.id}.`,
    );
  }
  if (
    contextPack.policy === "do-not-answer" ||
    contextPack.answerPolicy === "do-not-answer"
  ) {
    reasons.push(
      `GrayMatter answer policy blocks confident execution for ${contextPack.id}.`,
    );
  }
  if (
    contextPack.policy === "requires-review" ||
    contextPack.answerPolicy === "requires-review" ||
    contextPack.answerPolicy === "retry" ||
    contextPack.answerPolicy === "clarify"
  ) {
    reasons.push(
      `GrayMatter context pack ${contextPack.id} requires review before command execution.`,
    );
  }

  return reasons;
};

const requiresGrayMatterContext = (command: BuildModeCommand): boolean =>
  command.capabilityId !== "graymatter.memory";

const compilePolicyRule = (
  rule: BuildModeCommandPolicyRule,
  outcomes: Array<{ decision: BuildModePolicyDecision; reason: string }>,
): RegExp | undefined => {
  try {
    return new RegExp(rule.pattern, "i");
  } catch {
    outcomes.push({
      decision: "reject",
      reason: `Command policy rule is invalid: ${rule.label}.`,
    });
    return undefined;
  }
};

const validateCommandTargetPaths = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  if (!options.workspaceRoot) {
    return [];
  }

  const access = new PathAccess({ workspaceRoot: options.workspaceRoot });
  const paths = [
    ...(command.targetPaths ?? []).map((targetPath) => ({
      path: targetPath,
      source: "Target path",
    })),
    ...extractCommandPathCandidates(command.command).map((targetPath) => ({
      path: targetPath,
      source: "Command path",
    })),
  ].filter(
    (entry, index, entries) =>
      entry.path &&
      entries.findIndex(
        (candidate) =>
          candidate.path === entry.path && candidate.source === entry.source,
      ) === index,
  );

  return paths.flatMap((entry) => {
    if (access.validateAccess(entry.path)) {
      return [];
    }
    const rejection = access.getLastRejection();
    if (!rejection) {
      return [`${entry.source} is blocked by workspace policy: ${entry.path}.`];
    }
    if (rejection.reason === "outside-workspace") {
      return [`${entry.source} is outside the workspace: ${entry.path}.`];
    }
    return [
      `${entry.source} is blocked by ${rejection.pattern}: ${rejection.relativePath}.`,
    ];
  });
};

const extractCommandPathCandidates = (commandText: string): string[] => {
  const candidates: string[] = [];
  for (const token of tokenizeCommandText(commandText)) {
    const normalized = normalizeCommandPathToken(token);
    if (!normalized) {
      continue;
    }
    const expanded = expandCommandPathToken(normalized);
    for (const candidate of expanded) {
      if (looksLikeWorkspacePath(candidate)) {
        candidates.push(candidate);
      }
    }
  }
  return Array.from(new Set(candidates));
};

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
    (normalized.startsWith("-") && !normalized.startsWith("--")) ||
    normalized.includes("://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("$")
  ) {
    return undefined;
  }
  return normalized;
};

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

const validateProtectedGeneratedPaths = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  const protectedPaths = Array.from(
    new Set([
      ...(options.protectedPaths ?? []),
      ...(command.protectedPaths ?? []),
    ]),
  )
    .map(normalizePathForPolicy)
    .filter(Boolean);

  if (!protectedPaths.length) {
    return [];
  }

  const targetPaths = (command.targetPaths ?? [])
    .map(normalizePathForPolicy)
    .filter(Boolean);
  const commandText = normalizePathForPolicy(command.command);
  const blocked = protectedPaths.filter(
    (protectedPath) =>
      targetPaths.some((targetPath) =>
        pathMatchesProtectedPath(targetPath, protectedPath),
      ) || commandText.includes(protectedPath),
  );

  return blocked.map(
    (protectedPath) =>
      `Generated artifact is protected from direct edits: ${protectedPath}.`,
  );
};

const normalizePathForPolicy = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+/g, "/");

const pathMatchesProtectedPath = (
  targetPath: string,
  protectedPath: string,
): boolean =>
  targetPath === protectedPath ||
  targetPath.endsWith(`/${protectedPath}`) ||
  protectedPath.endsWith(`/${targetPath}`);

const isSecretVariableReference = (value: string): boolean => {
  const unquoted = value.replace(/^['"]|['"]$/g, "");
  return unquoted.startsWith("$") || unquoted.startsWith("${");
};
