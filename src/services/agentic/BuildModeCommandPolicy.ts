import type {
  BuildModeApprovalThreshold,
  BuildModeAgentRuntimeBinding,
  BuildModeAutonomyPolicy,
  BuildModeCheckpoint,
  BuildModeCommand,
  BuildModeCommandApproval,
  BuildModeCommandPolicyRule,
  BuildModeCommandReceipt,
  BuildModeExecutionPlanStep,
  BuildModePolicyDecision,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
  BuildModeScopeContext,
  BuildModeSwarmRoleAssignment,
  BuildModeToolPermission,
  GrayMatterContextPack,
  ProviderCredentialRef,
  ProviderRoute,
  Receipt,
} from "@shared/BuildMode";
import { PathAccess } from "../access/PathAccess";

export interface BuildModeCommandPolicyOptions {
  approval?: BuildModeCommandApproval;
  approvalEvaluatedAt?: Date;
  agentRuntimes?: BuildModeAgentRuntimeBinding[];
  autonomyPolicy?: BuildModeAutonomyPolicy;
  browserPreviewUrl?: string;
  checkpoints?: BuildModeCheckpoint[];
  commandPolicyRules?: BuildModeCommandPolicyRule[];
  commandReceipts?: BuildModeCommandReceipt[];
  currentConsecutiveCommands?: number;
  estimatedCredits?: number;
  executionPlan?: BuildModeExecutionPlanStep[];
  finalReportMarkdown?: string;
  readinessGates?: BuildModeReadinessGate[];
  grayMatterContextPack?: GrayMatterContextPack;
  promptContext?: BuildModePromptExecutionContext;
  providerCredentials?: ProviderCredentialRef[];
  providerRoute?: ProviderRoute;
  protectedPaths?: string[];
  receipts?: Receipt[];
  requireGrayMatterContext?: boolean;
  scope?: BuildModeScopeContext;
  swarmRoles?: BuildModeSwarmRoleAssignment[];
  toolPermissions?: BuildModeToolPermission[];
  workspaceRoot?: string;
}

export interface BuildModeCommandPolicyEvaluation {
  decision: BuildModePolicyDecision;
  reasons: string[];
  redactedCommand: string;
  requiredApprovalThreshold: BuildModeApprovalThreshold;
  requiresApproval: boolean;
}

interface ApprovalRule {
  pattern: RegExp;
  reason: string;
  threshold?: BuildModeApprovalThreshold;
}

const SECRET_ASSIGNMENT =
  /\b([A-Z0-9_]*(?:API_?KEY|TOKEN|SECRET|PASSWORD|PRIVATE_?KEY|ACCESS_?KEY)[A-Z0-9_]*)\s*=\s*("[^"]+"|'[^']+'|[^\s]+)/gi;

const SECRET_VALUE_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g,
];

const SECRET_KEY_PATTERN =
  /(?:api[_-]?key|token|secret|password|private[_-]?key|access[_-]?key|access[_-]?token)/i;

const QUOTED_SECRET_PROPERTY =
  /(["'])([^"']*(?:api[_-]?key|token|secret|password|private[_-]?key|access[_-]?key|access[_-]?token)[^"']*)\1(\s*:\s*)(["'])([^"']+)\4/gi;

const SECRET_URL_USERINFO =
  /\b((?:https?|wss?):\/\/)([^/?#\s@]+@)(?=[^/?#\s]+)/gi;

const APPROVAL_MAX_AGE_MS = 15 * 60 * 1000;
const APPROVAL_FUTURE_SKEW_MS = 60 * 1000;
const REQUIRED_FINAL_REPORT_SECTIONS = [
  "GrayMatter Context",
  "Run Audit Summary",
  "Credit Usage",
  "Readiness Gates",
  "Command Status",
  "Receipt Trail",
  "Evidence Artifacts",
  "Files Changed",
  "Tests Run",
  "Gaps",
  "Next Handoff",
];

const DEFAULT_APPROVAL_REQUIRED_CAPABILITY_IDS = new Set([
  "automation.schedule",
  "checkpoint.manage",
  "connector.read",
  "mcp.tool",
  "swarm.command",
  "workflow.execute",
]);

const APPROVAL_RULES: ApprovalRule[] = [
  {
    pattern: /\bcheckpoint:(?:rollback|restore)\b|\brollback\b/i,
    reason: "Checkpoint rollback requires approval.",
    threshold: "operator",
  },
  {
    pattern: /\b(?:npm|pnpm|yarn)\s+(?:run\s+)?publish\b/i,
    reason: "Public package publication requires approval.",
    threshold: "owner",
  },
  {
    pattern: /\bgit\s+push\b/i,
    reason: "Remote git mutation requires approval.",
    threshold: "operator",
  },
  {
    pattern: /\bgit\s+(?:reset\s+--hard|clean\s+-[^\s]*f)\b/i,
    reason: "Destructive git cleanup requires approval.",
    threshold: "owner",
  },
  {
    pattern: /\brm\s+-[^\s]*(?=[^\s]*r)(?=[^\s]*f)[^\s]*\b/i,
    reason: "Recursive forced deletion requires approval.",
    threshold: "owner",
  },
  {
    pattern:
      /(?:^|[;&|]\s*)(?:sudo\s+)?(?:rm|rmdir|unlink)\s+(?!-(?:h|-help)\b)/i,
    reason: "File deletion requires approval.",
    threshold: "operator",
  },
  {
    pattern:
      /\b(?:terraform\s+(?:apply|destroy)|pulumi\s+up|kubectl\s+delete|docker\s+system\s+prune)\b/i,
    reason: "Infrastructure mutation requires approval.",
    threshold: "owner",
  },
  {
    pattern: /\b(?:drop\s+(?:database|schema|table)|truncate\s+table)\b/i,
    reason: "Database destructive operation requires approval.",
    threshold: "owner",
  },
  {
    pattern:
      /\b(?:vercel\b.*--prod|netlify\s+deploy\b.*--prod|deploy\b.*\b(?:prod|production)\b|production\b.*\bdeploy)\b/i,
    reason: "Production deploy requires approval.",
    threshold: "owner",
  },
  {
    pattern: /\b(?:stripe|billing|invoice|refund|charge|payment)\b/i,
    reason: "Billing mutation requires approval.",
    threshold: "owner",
  },
  {
    pattern:
      /\b(?:(?:gmail|sendgrid|mailgun|smtp|email|mail)\b.*\b(?:send|deliver|compose|reply|forward)|(?:send|deliver|compose|reply|forward)\b.*\b(?:gmail|sendgrid|mailgun|smtp|email|mail))\b/i,
    reason: "Email send operation requires approval.",
    threshold: "owner",
  },
  {
    pattern:
      /\b(?:(?:mcp)\b.*\b(?:publish|register|expose|public)|(?:publish|register|expose|public)\b.*\bmcp\b)\b/i,
    reason: "Public MCP publication requires approval.",
    threshold: "owner",
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
  if (hasShellWriteRedirection(command.command)) {
    approvalReasons.add("Shell redirection write requires approval.");
  }
  if (hasShellFileMutationCommand(command.command)) {
    approvalReasons.add("Shell file mutation requires approval.");
  }
  if (hasInlineInterpreterFileMutation(command.command)) {
    approvalReasons.add("Interpreter inline file mutation requires approval.");
  }
  if (
    !command.requiresApproval &&
    approvalReasons.size === 0 &&
    DEFAULT_APPROVAL_REQUIRED_CAPABILITY_IDS.has(command.capabilityId)
  ) {
    approvalReasons.add(
      `Capability ${command.capabilityId} requires approval by default.`,
    );
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

  for (const browser of evaluateBrowserVerificationPolicy(command, options)) {
    if (browser.decision === "reject") {
      rejectionReasons.push(browser.reason);
    } else if (browser.decision === "approval-required") {
      approvalReasons.add(browser.reason);
    }
  }

  for (const reason of evaluateFinalReportPublicationPolicy(command, options)) {
    rejectionReasons.push(reason);
  }
  for (const reason of validateCheckpointRollbackProof(command, options)) {
    rejectionReasons.push(reason);
  }

  for (const reason of evaluateExecutionPlanPolicy(command, options)) {
    rejectionReasons.push(reason);
  }
  for (const reason of validateGrayMatterContextPack(command, options)) {
    rejectionReasons.push(reason);
  }
  for (const reason of validatePromptExecutionContext(command, options)) {
    rejectionReasons.push(reason);
  }
  for (const reason of validateProviderRouteExecutionContext(command, options)) {
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
  for (const reason of validateThorApiVaixLauncherUsage(command)) {
    rejectionReasons.push(reason);
  }

  const requiredApprovalThreshold = getRequiredApprovalThreshold(
    command,
    options,
  );
  const reasons = rejectionReasons.length
    ? rejectionReasons
    : Array.from(approvalReasons);
  const decision = decidePolicy(rejectionReasons, approvalReasons);

  return {
    decision,
    reasons,
    redactedCommand: redactCommandSecrets(command.command),
    requiredApprovalThreshold,
    requiresApproval: decision === "approval-required",
  };
};

export const redactCommandSecrets = (command: string): string => {
  let redacted = command.replace(SECRET_ASSIGNMENT, (_match, key, value) => {
    const token = String(value);
    return `${key}=${isSecretReferenceValue(token) ? token : "<redacted>"}`;
  });

  redacted = redacted.replace(
    QUOTED_SECRET_PROPERTY,
    (_match, keyQuote, key, separator, valueQuote, value) =>
      `${keyQuote}${key}${keyQuote}${separator}${valueQuote}${
        isSecretReferenceValue(value) ? value : redactSecretLiteral(value)
      }${valueQuote}`,
  );

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
    )
    .replace(
      SECRET_URL_USERINFO,
      "$1<redacted-secret>@",
    );
};

export const findSecretMaterialPaths = (
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
        isSensitiveSecretKey(key) &&
        typeof nested === "string" &&
        !isSecretReferenceValue(nested)
      ) {
        return [nestedPath];
      }
      return findSecretMaterialPaths(nested, nestedPath, seen);
    },
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
    if (!isSecretReferenceValue(value)) {
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
  if (!reasons.length && findSecretMaterialPaths(command, "command").length) {
    reasons.push("Inline secret literals are blocked.");
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

const evaluateBrowserVerificationPolicy = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): Array<{ decision: BuildModePolicyDecision; reason: string }> => {
  if (
    command.capabilityId !== "browser.automation" &&
    command.kind !== "verify"
  ) {
    return [];
  }

  const browserUrls = Array.from(
    new Set(
      [extractBrowserVerificationUrl(command.command), options.browserPreviewUrl]
        .filter((url): url is string => Boolean(url?.trim())),
    ),
  );
  if (!browserUrls.length) {
    return [];
  }

  const decisions: Array<{ decision: BuildModePolicyDecision; reason: string }> =
    [];

  for (const browserUrl of browserUrls) {
    if (findSecretMaterialPaths(browserUrl, "browserUrl").length) {
      decisions.push({
        decision: "reject",
        reason: "Browser verification URL contains inline secret material.",
      });
      continue;
    }

    let parsed: URL;
    try {
      parsed = new URL(browserUrl);
    } catch {
      decisions.push({
        decision: "reject",
        reason: "Browser verification URL is invalid.",
      });
      continue;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      decisions.push({
        decision: "reject",
        reason: `Browser verification URL protocol is not allowed: ${parsed.protocol}.`,
      });
      continue;
    }

    if (!isLoopbackBrowserHost(parsed.hostname)) {
      decisions.push({
        decision: "approval-required",
        reason: `External browser verification URL requires approval: ${parsed.hostname}.`,
      });
    }
  }

  return decisions;
};

const evaluateFinalReportPublicationPolicy = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  if (!isFinalReportPublicationCommand(command)) {
    return [];
  }

  return [
    ...validateFinalReportMarkdown(options.finalReportMarkdown),
    ...(options.readinessGates ?? [])
      .filter((gate) => gate.blocksRun && gate.status !== "passed")
      .map(
        (gate) =>
          `Final report cannot be published until readiness gate passes: ${gate.label} (${gate.status}).`,
      ),
  ];
};

const validateFinalReportMarkdown = (
  markdown: string | undefined,
): string[] => {
  const text = markdown?.trim();
  if (!text) {
    return ["Final report publication requires final report markdown."];
  }
  const reasons: string[] = [];
  if (!/^#\s+\S.+$/m.test(text)) {
    reasons.push("Final report requires an H1 title.");
  }
  const missingSections = REQUIRED_FINAL_REPORT_SECTIONS.filter(
    (section) =>
      !new RegExp(`^##\\s+${escapeRegExp(section)}\\s*$`, "im").test(text),
  );
  if (missingSections.length) {
    reasons.push(
      `Final report is missing required evidence sections: ${missingSections.join(
        ", ",
      )}.`,
    );
  }
  return reasons;
};

const validateCheckpointRollbackProof = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  const parsed = parseCheckpointCommand(command.command);
  if (!parsed || parsed.action === "create") {
    return [];
  }
  const checkpoint = findCheckpointForRollback(command, parsed.ref, options);
  if (!checkpoint) {
    return [
      `Checkpoint rollback requires a known Build Mode checkpoint record for ${parsed.ref ?? command.id}.`,
    ];
  }
  const reasons: string[] = [];
  if (!checkpoint.hash) {
    reasons.push(
      `Checkpoint rollback requires checkpoint ${checkpoint.id} to have a checkpoint hash.`,
    );
  }
  if (!checkpoint.receiptIds.length) {
    reasons.push(
      `Checkpoint rollback requires checkpoint ${checkpoint.id} to include a creation receipt.`,
    );
  }
  if (
    checkpoint.status !== "created" &&
    checkpoint.status !== "rollback-ready" &&
    checkpoint.status !== "restored"
  ) {
    reasons.push(
      `Checkpoint rollback requires checkpoint ${checkpoint.id} to be rollback-ready, created, or restored; current status is ${checkpoint.status}.`,
    );
  }
  return reasons;
};

const parseCheckpointCommand = (
  commandText: string,
): { action: "create" | "rollback"; ref?: string } | undefined => {
  const match = commandText.match(
    /^checkpoint:(?<action>create|rollback|restore)\b\s*(?<ref>.*)$/i,
  );
  if (!match?.groups) {
    return undefined;
  }
  return {
    action:
      match.groups.action.toLowerCase() === "create" ? "create" : "rollback",
    ref: match.groups.ref.trim() || undefined,
  };
};

const findCheckpointForRollback = (
  command: BuildModeCommand,
  checkpointRef: string | undefined,
  options: BuildModeCommandPolicyOptions,
): BuildModeCheckpoint | undefined =>
  options.checkpoints?.find(
    (checkpoint) =>
      checkpoint.rollbackCommandId === command.id ||
      checkpoint.id === checkpointRef ||
      checkpoint.hash === checkpointRef,
  );

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
  const approvalCreatedAtMs = Date.parse(approval.createdAt);
  const evaluatedAtMs = options.approvalEvaluatedAt?.getTime();
  if (!Number.isFinite(approvalCreatedAtMs)) {
    reasons.push("Approval timestamp is invalid.");
  } else if (evaluatedAtMs !== undefined) {
    if (approvalCreatedAtMs - evaluatedAtMs > APPROVAL_FUTURE_SKEW_MS) {
      reasons.push("Approval timestamp is in the future.");
    }
    if (evaluatedAtMs - approvalCreatedAtMs > APPROVAL_MAX_AGE_MS) {
      reasons.push("Approval is stale and must be renewed.");
    }
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
  if (command.kind === "edit") {
    thresholds.push("operator");
  }
  if (command.requiresApproval) {
    thresholds.push("operator");
  }
  if (DEFAULT_APPROVAL_REQUIRED_CAPABILITY_IDS.has(command.capabilityId)) {
    thresholds.push("operator");
  }
  for (const rule of getMatchingApprovalRules(command)) {
    thresholds.push(rule.threshold ?? "operator");
  }
  if (hasShellWriteRedirection(command.command)) {
    thresholds.push("operator");
  }
  if (hasShellFileMutationCommand(command.command)) {
    thresholds.push("operator");
  }
  if (hasInlineInterpreterFileMutation(command.command)) {
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

const getMatchingApprovalRules = (command: BuildModeCommand): ApprovalRule[] =>
  APPROVAL_RULES.filter((rule) => {
    rule.pattern.lastIndex = 0;
    return rule.pattern.test(command.command);
  });

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

  if (!["ready", "running"].includes(step.status)) {
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
  const receiptReasons = options.autonomyPolicy?.receiptRequired
    ? validateRequiredDependencyReceipts(
        step,
        plan,
        options.commandReceipts ?? [],
      )
    : [];
  const ownershipReasons = validateCommandOwnershipProof(
    command,
    step,
    options,
  );
  return [
    ...dependencyReasons,
    ...readinessReasons,
    ...receiptReasons,
    ...ownershipReasons,
  ];
};

const validateCommandOwnershipProof = (
  command: BuildModeCommand,
  step: BuildModeExecutionPlanStep,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  if (!options.agentRuntimes?.length && !options.swarmRoles?.length) {
    return [];
  }
  const reasons: string[] = [];
  if (!command.executionPlanStepId) {
    reasons.push(
      `Command policy requires executionPlanStepId for ${command.id}.`,
    );
  } else if (command.executionPlanStepId !== step.id) {
    reasons.push(
      `Command policy executionPlanStepId ${command.executionPlanStepId} does not match step ${step.id} for ${command.id}.`,
    );
  }

  if (!command.assignedRuntimeId) {
    reasons.push(
      `Command policy requires assignedRuntimeId for ${command.id}.`,
    );
  } else {
    if (command.assignedRuntimeId !== step.runtimeId) {
      reasons.push(
        `Command policy assignedRuntimeId ${command.assignedRuntimeId} does not match step runtime ${step.runtimeId} for ${command.id}.`,
      );
    }
    const runtime = options.agentRuntimes?.find(
      (item) => item.id === command.assignedRuntimeId,
    );
    if (options.agentRuntimes?.length && !runtime) {
      reasons.push(
        `Command policy references missing agentRuntime ${command.assignedRuntimeId} for ${command.id}.`,
      );
    }
    if (runtime && !isDispatchableRuntimeStatus(runtime.status)) {
      reasons.push(
        `Command policy agentRuntime ${runtime.id} is not available: ${runtime.status}.`,
      );
    }
    if (
      runtime &&
      command.assignedSwarmRole &&
      runtime.ownerRole !== command.assignedSwarmRole
    ) {
      reasons.push(
        `Command policy assignedSwarmRole ${command.assignedSwarmRole} does not match runtime ${runtime.id} ownerRole ${runtime.ownerRole}.`,
      );
    }
  }

  if (!command.assignedSwarmRole) {
    reasons.push(
      `Command policy requires assignedSwarmRole for ${command.id}.`,
    );
  } else {
    const role = options.swarmRoles?.find(
      (item) => item.role === command.assignedSwarmRole,
    );
    if (options.swarmRoles?.length && !role) {
      reasons.push(
        `Command policy references missing swarmRole ${command.assignedSwarmRole} for ${command.id}.`,
      );
    }
    if (role && !isDispatchableSwarmRoleStatus(role.status)) {
      reasons.push(
        `Command policy swarmRole ${role.role} is not available: ${role.status}.`,
      );
    }
  }
  return reasons;
};

const isDispatchableRuntimeStatus = (
  status: BuildModeAgentRuntimeBinding["status"],
): boolean => status === "available" || status === "selected";

const isDispatchableSwarmRoleStatus = (
  status: BuildModeSwarmRoleAssignment["status"],
): boolean => status === "assigned" || status === "idle";

const validateRequiredDependencyReceipts = (
  step: BuildModeExecutionPlanStep,
  executionPlan: BuildModeExecutionPlanStep[],
  commandReceipts: BuildModeCommandReceipt[],
): string[] => {
  const dependencySteps = collectDependencySteps(step, executionPlan);
  const dependencyCommandIds = new Set(
    dependencySteps.flatMap((dependency) => dependency.commandIds),
  );
  if (!dependencyCommandIds.size) {
    return [];
  }

  const latestReceiptByCommandId =
    getLatestBuildModeReceiptByCommandId(commandReceipts);
  const stepByCommandId = new Map<string, BuildModeExecutionPlanStep>();
  for (const dependency of dependencySteps) {
    for (const commandId of dependency.commandIds) {
      stepByCommandId.set(commandId, dependency);
    }
  }

  return Array.from(dependencyCommandIds).flatMap((commandId) => {
    const dependencyStep = stepByCommandId.get(commandId);
    const receipt = latestReceiptByCommandId.get(commandId);
    if (dependencyStep && !dependencyStep.receiptIds.length) {
      return [
        `Command policy receipt is required for dependency step ${dependencyStep.id}.`,
      ];
    }
    if (!receipt) {
      return [
        `Command policy dependency receipt proof is missing for ${commandId}.`,
      ];
    }
    if (receipt.status !== "succeeded") {
      return [
        `Command policy dependency receipt is not succeeded for ${commandId}: ${receipt.status}.`,
      ];
    }
    if (dependencyStep && !dependencyStep.receiptIds.includes(receipt.id)) {
      return [
        `Command policy dependency step ${dependencyStep.id} does not include latest receipt ${receipt.id} for ${commandId}.`,
      ];
    }
    return [];
  });
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

const getLatestBuildModeReceiptByCommandId = (
  receipts: BuildModeCommandReceipt[],
): Map<string, BuildModeCommandReceipt> => {
  const latestReceiptByCommandId = new Map<string, BuildModeCommandReceipt>();
  for (const receipt of receipts) {
    const current = latestReceiptByCommandId.get(receipt.commandId);
    if (!current || receipt.createdAt > current.createdAt) {
      latestReceiptByCommandId.set(receipt.commandId, receipt);
    }
  }
  return latestReceiptByCommandId;
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
    !(options.requireGrayMatterContext || options.grayMatterContextPack) ||
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

const validatePromptExecutionContext = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  if (
    !(options.requireGrayMatterContext || options.promptContext) ||
    !requiresGrayMatterContext(command)
  ) {
    return [];
  }

  const promptContext = options.promptContext;
  if (!promptContext) {
    return ["Prompt bundle proof is required before command execution."];
  }

  const reasons: string[] = [];
  if (!promptContext.promptProfileId.trim()) {
    reasons.push("Prompt profile id is required before command execution.");
  }
  if (!promptContext.promptBundleId.trim()) {
    reasons.push("Prompt bundle id is required before command execution.");
  }
  if (!promptContext.promptBundleVersion.trim()) {
    reasons.push("Prompt bundle version is required before command execution.");
  }
  if (!promptContext.promptBundleReceiptIds.length) {
    reasons.push(
      `Prompt bundle ${promptContext.promptBundleId || "unknown"} has no receipt proof.`,
    );
  }
  return reasons;
};

const validateProviderRouteExecutionContext = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  if (!options.providerRoute) {
    return [];
  }
  const reasons: string[] = [];
  const credential = (options.providerCredentials ?? []).find(
    (candidate) => candidate.route === options.providerRoute,
  );
  if (!credential) {
    reasons.push(
      `Provider route ${options.providerRoute} requires a matching ProviderCredentialRef before command execution.`,
    );
  } else {
    if (
      options.providerRoute === "bring-your-own-key" &&
      credential.secretAvailable !== true
    ) {
      reasons.push(
        `Provider route ${options.providerRoute} requires a credential ref with secretAvailable true.`,
      );
    }
    if (
      options.providerRoute === "enterprise-proxy" &&
      credential.tenantScoped !== true
    ) {
      reasons.push(
        `Provider route ${options.providerRoute} requires a tenant-scoped credential ref.`,
      );
    }
    if (!credential.receiptIds?.length) {
      reasons.push(
        `Provider route ${options.providerRoute} requires provider credential receipt proof.`,
      );
    } else {
      const receiptStatusById = collectProviderCredentialReceiptStatuses(
        options,
      );
      const statuses = credential.receiptIds
        .map((receiptId) => receiptStatusById.get(receiptId))
        .filter((status): status is string => Boolean(status));
      if (!statuses.length) {
        reasons.push(
          `Provider route ${options.providerRoute} requires provider credential receipt status proof.`,
        );
      } else if (
        !statuses.some((status) => ["approved", "succeeded"].includes(status))
      ) {
        reasons.push(
          `Provider route ${options.providerRoute} has no acceptable provider credential receipt status.`,
        );
      }
    }
  }

  if (options.providerRoute === "local-model") {
    const hasAvailableLocalRuntime = (options.agentRuntimes ?? []).some(
      (runtime) =>
        runtime.providerRoute === "local-model" &&
        runtime.handoffPolicy === "autonomous-local" &&
        (runtime.status === "available" || runtime.status === "selected"),
    );
    if (!hasAvailableLocalRuntime) {
      reasons.push(
        "Local model provider route requires an available autonomous-local runtime with providerRoute local-model.",
      );
    }
  }

  if (
    options.providerRoute === "bring-your-own-key" &&
    findSecretMaterialPaths(command.command, "command").length
  ) {
    reasons.push(
      "BYO provider route must use credential refs only; inline provider secrets are blocked.",
    );
  }
  return reasons;
};

const collectProviderCredentialReceiptStatuses = (
  options: BuildModeCommandPolicyOptions,
): Map<string, string> => {
  const statusById = new Map<string, string>();
  for (const receipt of options.receipts ?? []) {
    statusById.set(receipt.id, receipt.status);
  }
  for (const receipt of options.commandReceipts ?? []) {
    statusById.set(receipt.id, receipt.status);
  }
  return statusById;
};

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

  const access = new PathAccess({
    denyGlobs: options.scope?.ignoredPathPatterns,
    workspaceRoot: options.workspaceRoot,
  });
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
  let expectsRedirectionTarget = false;

  const addCandidate = (token: string, force: boolean = false) => {
    const normalized = normalizeCommandPathToken(token);
    if (!normalized) {
      return;
    }
    const expanded = expandCommandPathToken(normalized);
    for (const candidate of expanded) {
      if (
        !isShellRedirectionFdTarget(candidate) &&
        (force || looksLikeWorkspacePath(candidate))
      ) {
        candidates.push(candidate);
      }
    }
  };

  for (const token of tokenizeCommandText(commandText)) {
    if (expectsRedirectionTarget) {
      addCandidate(token, true);
      expectsRedirectionTarget = false;
      continue;
    }

    if (isShellRedirectionOperator(token)) {
      expectsRedirectionTarget = true;
      continue;
    }

    const redirectTarget = extractInlineShellRedirectionTarget(token);
    if (redirectTarget) {
      addCandidate(redirectTarget, true);
      continue;
    }

    addCandidate(token);
  }
  for (const targetPath of extractInlineInterpreterMutationPathCandidates(
    commandText,
  )) {
    addCandidate(targetPath, true);
  }
  return Array.from(new Set(candidates));
};

const hasShellWriteRedirection = (commandText: string): boolean => {
  let expectsRedirectionTarget = false;
  for (const token of tokenizeCommandText(commandText)) {
    if (expectsRedirectionTarget) {
      return !isShellRedirectionFdTarget(token);
    }
    if (isShellWriteRedirectionOperator(token)) {
      expectsRedirectionTarget = true;
      continue;
    }
    const redirectTarget = extractInlineShellWriteRedirectionTarget(token);
    if (redirectTarget) {
      return !isShellRedirectionFdTarget(redirectTarget);
    }
  }
  return false;
};

const hasShellFileMutationCommand = (commandText: string): boolean =>
  /(?:^|[;&|]\s*)(?:sudo\s+)?(?:mv|cp|touch|truncate)\s+(?!-(?:h|-help)\b)/i.test(
    commandText,
  ) ||
  /(?:^|[;&|]\s*)(?:sudo\s+)?(?:sed\s+-[^\s]*i|perl\s+-[^\s]*p[^\s]*i|tee(?:\s+-[A-Za-z-]+)*\s+)\b/i.test(
    commandText,
  );

const hasInlineInterpreterFileMutation = (commandText: string): boolean => {
  if (!hasInlineInterpreterEval(commandText)) {
    return false;
  }
  return INLINE_INTERPRETER_FILE_MUTATION_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(commandText);
  });
};

const hasInlineInterpreterEval = (commandText: string): boolean =>
  /\b(?:node|bun|deno|python3?|ruby|php|perl)\b[\s\S]*?(?:^|\s)(?:-[ec]\b|--eval\b|--command\b)/i.test(
    commandText,
  );

const INLINE_INTERPRETER_FILE_MUTATION_PATTERNS = [
  /\b(?:fs\.)?(?:writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream|copyFile|copyFileSync|rename|renameSync|rm|rmSync|unlink|unlinkSync|mkdir|mkdirSync)\s*\(/i,
  /\bDeno\.(?:writeTextFile|writeFile|remove|mkdir|rename)\s*\(/i,
  /\bBun\.write\s*\(/i,
  /\bopen\s*\(\s*["'][^"']+["']\s*,\s*["'][^"']*[wax][^"']*["']/i,
  /\bPath\s*\(\s*["'][^"']+["']\s*\)\s*\.\s*(?:write_text|write_bytes|unlink|mkdir|rename)\s*\(/i,
  /\b(?:os|Path)\s*\.\s*(?:remove|unlink|rmdir|mkdir|makedirs|rename)\s*\(/i,
  /\bshutil\.(?:rmtree|move|copy|copyfile|copytree)\s*\(/i,
  /\bFile\.(?:write|open|delete|rename|mkdir)\s*\(/i,
];

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
    for (const match of commandText.matchAll(pattern)) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }
  return candidates;
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

const isShellRedirectionOperator = (token: string): boolean =>
  /^(?:\d+|&)?(?:>>?|>\||<<?)$/.test(token);

const isShellWriteRedirectionOperator = (token: string): boolean =>
  /^(?:\d+|&)?(?:>>?|>\|)$/.test(token);

const extractInlineShellRedirectionTarget = (
  token: string,
): string | undefined => {
  const match = token.match(/^(?:\d+|&)?(?:>>?|>\||<<?)(.+)$/);
  return match?.[1];
};

const extractInlineShellWriteRedirectionTarget = (
  token: string,
): string | undefined => {
  const match = token.match(/^(?:\d+|&)?(?:>>?|>\|)(.+)$/);
  return match?.[1];
};

const isShellRedirectionFdTarget = (value: string): boolean =>
  /^&?(?:\d+|-)$/.test(value);

const looksLikeWorkspacePath = (value: string): boolean =>
  value.startsWith("/") ||
  value.startsWith("./") ||
  value.startsWith("../") ||
  value.includes("/");

const validateProtectedGeneratedPaths = (
  command: BuildModeCommand,
  options: BuildModeCommandPolicyOptions,
): string[] => {
  if (!looksLikeGeneratedArtifactMutationCommand(command)) {
    return [];
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
      ...(options.protectedPaths ?? []),
      ...(command.protectedPaths ?? []),
      ...inferredGeneratedPaths,
    ]),
  )
    .map(normalizePathForPolicy)
    .filter(Boolean);

  if (!protectedPaths.length) {
    return [];
  }

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

const validateThorApiVaixLauncherUsage = (
  command: BuildModeCommand,
): string[] => {
  if (!looksLikeDirectThorApiVaixShortcut(command.command)) {
    return [];
  }
  if (usesThorApiVaixLauncher(command.command)) {
    return [];
  }
  return [
    "ThorAPI/VAIX operations must use ./vaix or ./vai project launchers instead of direct generator/build shortcuts.",
  ];
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

export const isGeneratedThorApiArtifactPath = (value: string): boolean => {
  const normalized = normalizePathForPolicy(value).toLowerCase();
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

const extractBrowserVerificationUrl = (command: string): string | undefined =>
  command.match(/https?:\/\/[^\s'")]+/i)?.[0];

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isFinalReportPublicationCommand = (command: BuildModeCommand): boolean =>
  command.kind === "report" || /\breport:publish\b/i.test(command.command);

const isLoopbackBrowserHost = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized === "0.0.0.0" ||
    normalized.endsWith(".localhost") ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)
  );
};

const isSensitiveSecretKey = (key: string): boolean =>
  SECRET_KEY_PATTERN.test(key);

const redactSecretLiteral = (value: string): string =>
  SECRET_VALUE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  })
    ? "<redacted-secret>"
    : "<redacted>";

const isSecretReferenceValue = (value: string): boolean => {
  const unquoted = value.trim().replace(/^['"]|['"]$/g, "");
  const normalized = unquoted.toLowerCase();
  return (
    unquoted.startsWith("$") ||
    unquoted.startsWith("${") ||
    normalized.startsWith("process.env.") ||
    normalized.startsWith("env:") ||
    normalized.startsWith("credential-ref") ||
    normalized.startsWith("provider-credential") ||
    normalized.startsWith("secret-ref:") ||
    normalized.startsWith("vault:") ||
    normalized.startsWith("op://") ||
    normalized.startsWith("valkyrai://credentials/")
  );
};
