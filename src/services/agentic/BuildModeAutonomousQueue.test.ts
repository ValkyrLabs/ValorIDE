import type {
  BuildModeAgentRuntimeBinding,
  BuildModeAutonomyPolicy,
  BuildModeCommand,
  BuildModeCommandReceipt,
  BuildModeExecutionPlanStep,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
  BuildModeSwarmRoleAssignment,
  GrayMatterContextPack,
} from "@shared/BuildMode";
import {
  createBuildModeAutonomousQueueBlockedReceipt,
  validateBuildModeAutonomousQueueDispatch,
} from "./BuildModeAutonomousQueue";

const baseAutonomyPolicy: BuildModeAutonomyPolicy = {
  id: "autonomy-policy-test",
  label: "Test autonomy policy",
  mode: "autonomous-local",
  maxConsecutiveCommands: 4,
  maxEstimatedCredits: 50,
  allowedCapabilityIds: ["terminal.execute", "psr.edit"],
  approvalRequiredCapabilityIds: [],
  stopConditions: ["Stop on failures."],
  escalationRefs: ["owner:test"],
  receiptRequired: true,
};

const completeFinalReportMarkdown = [
  "# Digital Product Pro Build Mode Report",
  "",
  "## GrayMatter Context",
  "- Context Pack: gm-context-dpp-001",
  "",
  "## Run Audit Summary",
  "- succeeded: 5",
  "",
  "## Credit Usage",
  "- credit-usage-cmd-test: 1 actual (1 provider, 0 hosted)",
  "",
  "## Readiness Gates",
  "- Tests and build green: passed",
  "",
  "## Command Status",
  "- Unit tests: succeeded",
  "",
  "## Receipt Trail",
  "- build-command-receipt-test-001",
  "",
  "## Evidence Artifacts",
  "- command stdout receipt",
  "",
  "## Files Changed",
  "- apps/digital-product-pro/src/pages/Checkout.tsx",
  "",
  "## Tests Run",
  "- npm run test --workspace webview-ui",
  "",
  "## Gaps",
  "- None",
  "",
  "## Next Handoff",
  "- Ready for operator review",
].join("\n");

const safeEditCommand: BuildModeCommand = {
  id: "cmd-safe-edit",
  kind: "edit",
  label: "Apply safe edit",
  command: 'psr:src/App.tsx replace:"old" with:"new"',
  capabilityId: "psr.edit",
  assignedRuntimeId: "runtime-aurora-ui-engineer",
  assignedSwarmRole: "Aurora UI Engineer",
  executionPlanStepId: "plan-safe-edits",
  requiresApproval: false,
  status: "queued",
};

const testCommand: BuildModeCommand = {
  id: "cmd-test",
  kind: "test",
  label: "Run tests",
  command: "npm test",
  capabilityId: "terminal.execute",
  assignedRuntimeId: "runtime-test-runner",
  assignedSwarmRole: "Test Runner",
  executionPlanStepId: "plan-tests",
  requiresApproval: false,
  status: "queued",
};

const browserCommand: BuildModeCommand = {
  id: "cmd-browser",
  kind: "verify",
  label: "Verify preview",
  command: "open preview and verify checkout flow",
  capabilityId: "browser.automation",
  assignedRuntimeId: "runtime-browser-verifier",
  assignedSwarmRole: "Browser Verifier",
  executionPlanStepId: "plan-browser-verify",
  requiresApproval: false,
  status: "queued",
};

const finalReportCommand: BuildModeCommand = {
  id: "cmd-final-report",
  kind: "report",
  label: "Publish final report",
  command: "report:publish build-mode-final-report",
  capabilityId: "graymatter.memory",
  assignedRuntimeId: "runtime-supervisor",
  assignedSwarmRole: "Supervisor",
  executionPlanStepId: "plan-final-report",
  requiresApproval: false,
  status: "queued",
};

const checkpointRollbackCommand: BuildModeCommand = {
  id: "cmd-checkpoint-rollback",
  kind: "checkpoint",
  label: "Rollback checkpoint",
  command: "checkpoint:rollback checkpoint-good",
  capabilityId: "checkpoint.manage",
  assignedRuntimeId: "runtime-deploy-operator",
  assignedSwarmRole: "Deploy Operator",
  executionPlanStepId: "plan-checkpoint-rollback",
  requiresApproval: false,
  status: "queued",
};

const safeEditReceipt: BuildModeCommandReceipt = {
  id: "receipt-safe-edit",
  commandId: "cmd-safe-edit",
  capabilityId: "psr.edit",
  status: "succeeded",
  approved: true,
  requiresApproval: false,
  summary: "Safe edit applied.",
  createdAt: "2026-06-21T21:00:00.000Z",
};

const completedSafeEditCommand: BuildModeCommand = {
  ...safeEditCommand,
  receiptId: safeEditReceipt.id,
  status: "succeeded",
};

const checkpointReceipt: BuildModeCommandReceipt = {
  id: "receipt-checkpoint-create",
  commandId: "cmd-checkpoint-create",
  capabilityId: "checkpoint.manage",
  status: "succeeded",
  approved: true,
  requiresApproval: true,
  summary: "Checkpoint created before mutable edits.",
  createdAt: "2026-06-21T20:58:00.000Z",
  artifacts: [
    {
      id: "artifact-checkpoint-create",
      kind: "checkpoint",
      title: "Checkpoint receipt",
      uri: "valoride://build-mode/artifacts/checkpoint-create",
      commandId: "cmd-checkpoint-create",
      receiptId: "receipt-checkpoint-create",
      createdAt: "2026-06-21T20:58:00.000Z",
      metadata: {
        checkpointAction: "create",
        checkpointHash: "checkpoint-hash-before-edits",
        checkpointRef: "checkpoint-before-edits",
      },
    },
  ],
};

const rollbackReadyCheckpoint = {
  id: "checkpoint-before-edits",
  label: "Before mutable edits",
  status: "rollback-ready" as const,
  createdAt: "2026-06-21T20:58:00.000Z",
  hash: "checkpoint-hash-before-edits",
  summary: "Rollback-ready checkpoint before mutable Build Mode edits.",
  commandId: "cmd-checkpoint-create",
  receiptIds: ["receipt-checkpoint-create"],
};

const executionPlan: BuildModeExecutionPlanStep[] = [
  {
    id: "plan-safe-edits",
    label: "Apply safe edits",
    summary: "Apply editable changes.",
    status: "complete",
    runtimeId: "runtime-aurora-ui-engineer",
    commandIds: ["cmd-safe-edit"],
    readinessGateIds: [],
    dependencyStepIds: [],
    receiptIds: ["receipt-safe-edit"],
    nextAction: "Run tests.",
  },
  {
    id: "plan-tests",
    label: "Run tests",
    summary: "Run tests after edits.",
    status: "ready",
    runtimeId: "runtime-test-runner",
    commandIds: ["cmd-test"],
    readinessGateIds: [],
    dependencyStepIds: ["plan-safe-edits"],
    receiptIds: [],
    nextAction: "Run tests.",
  },
];

const browserExecutionPlan: BuildModeExecutionPlanStep[] = [
  {
    id: "plan-browser-verify",
    label: "Verify preview",
    summary: "Run browser verification against the preview.",
    status: "ready",
    runtimeId: "runtime-browser-verifier",
    commandIds: ["cmd-browser"],
    readinessGateIds: [],
    dependencyStepIds: [],
    receiptIds: [],
    nextAction: "Verify preview.",
  },
];

const finalReportExecutionPlan: BuildModeExecutionPlanStep[] = [
  {
    id: "plan-final-report",
    label: "Publish final report",
    summary: "Publish the final Build Mode report.",
    status: "ready",
    runtimeId: "runtime-supervisor",
    commandIds: ["cmd-final-report"],
    readinessGateIds: [],
    dependencyStepIds: [],
    receiptIds: [],
    nextAction: "Publish the final report.",
  },
];

const checkpointRollbackExecutionPlan: BuildModeExecutionPlanStep[] = [
  {
    id: "plan-checkpoint-rollback",
    label: "Rollback checkpoint",
    summary: "Restore a known Build Mode checkpoint.",
    status: "ready",
    runtimeId: "runtime-deploy-operator",
    commandIds: ["cmd-checkpoint-rollback"],
    readinessGateIds: [],
    dependencyStepIds: [],
    receiptIds: [],
    nextAction: "Rollback the checkpoint.",
  },
];

const readinessGates: BuildModeReadinessGate[] = [
  {
    id: "gate-safe-edit-proof",
    label: "Safe edit proof",
    status: "pending",
    summary: "Safe edit proof must pass before tests.",
    requiredCapabilityIds: ["psr.edit"],
    requiredReceiptIds: [],
    evidenceArtifactIds: [],
    commandIds: ["cmd-safe-edit"],
    blocksRun: true,
  },
];

const promptContext: BuildModePromptExecutionContext = {
  promptProfileId: "prompt-profile-valhalla",
  promptProfileName: "Valhalla Build Operator",
  promptBundleId: "prompt-bundle-valhalla-001",
  promptBundleVersion: "2026.06.21",
  promptBundlePolicy: "locked",
  promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
};

const grayMatterContextPack: GrayMatterContextPack = {
  id: "gm-context-pack-dpp-001",
  compiledAt: "2026-06-21T20:16:00.000Z",
  source: "GrayMatter retrieval receipts + App Gallery intent",
  policy: "answer-confidently",
  answerPolicy: "answer-confidently",
  retrievalStatus: "ready",
  invariantPreflightStatus: "passed",
  retrievalReceiptIds: ["retrieval-receipt-dpp-001"],
  retrievalTraceId: "gm-trace-dpp-context-001",
  preflightReceiptId: "graymatter-preflight-dpp-001",
  memoryEntryIds: ["memory-entry-valhalla-prd"],
  sourceRefs: ["graymatter://MemoryEntry/memory-entry-valhalla-prd"],
  majorTaskRefs: ["plan-tests"],
  summary: "Validated context for Build Mode autonomous queue dispatch.",
};

const swarmRoles: BuildModeSwarmRoleAssignment[] = [
  "Supervisor",
  "Spec Architect",
  "ThorAPI Generator",
  "Workflow Engineer",
  "Aurora UI Engineer",
  "Security Auditor",
  "Test Runner",
  "Browser Verifier",
  "Deploy Operator",
].map((role) => ({
  currentFocus: `${role} Build Mode work`,
  owner: "ValorIDE",
  role: role as BuildModeSwarmRoleAssignment["role"],
  status: "assigned",
}));

const agentRuntimes: BuildModeAgentRuntimeBinding[] = [
  {
    id: "runtime-aurora-ui-engineer",
    runtime: "ValorIDE",
    label: "Aurora UI runtime",
    status: "available",
    ownerRole: "Aurora UI Engineer",
    promptProfileId: "prompt-profile-valhalla",
    providerRoute: "enterprise-proxy",
    loopPhaseIds: [],
    handoffPolicy: "supervised",
    receiptIds: [],
  },
  {
    id: "runtime-test-runner",
    runtime: "Codex",
    label: "Test runner runtime",
    status: "available",
    ownerRole: "Test Runner",
    promptProfileId: "prompt-profile-valhalla",
    providerRoute: "enterprise-proxy",
    loopPhaseIds: [],
    handoffPolicy: "supervised",
    receiptIds: [],
  },
  {
    id: "runtime-browser-verifier",
    runtime: "OpenClaw",
    label: "Browser verifier runtime",
    status: "available",
    ownerRole: "Browser Verifier",
    promptProfileId: "prompt-profile-valhalla",
    providerRoute: "enterprise-proxy",
    loopPhaseIds: [],
    handoffPolicy: "supervised",
    receiptIds: [],
  },
  {
    id: "runtime-supervisor",
    runtime: "ValorIDE",
    label: "Supervisor runtime",
    status: "available",
    ownerRole: "Supervisor",
    promptProfileId: "prompt-profile-valhalla",
    providerRoute: "enterprise-proxy",
    loopPhaseIds: [],
    handoffPolicy: "supervised",
    receiptIds: [],
  },
  {
    id: "runtime-deploy-operator",
    runtime: "ValorIDE",
    label: "Deploy operator runtime",
    status: "available",
    ownerRole: "Deploy Operator",
    promptProfileId: "prompt-profile-valhalla",
    providerRoute: "enterprise-proxy",
    loopPhaseIds: [],
    handoffPolicy: "operator-approved",
    receiptIds: [],
  },
];

const validateQueueDispatch = (
  request: Parameters<typeof validateBuildModeAutonomousQueueDispatch>[0],
) =>
  validateBuildModeAutonomousQueueDispatch({
    agentRuntimes,
    swarmRoles,
    ...request,
    checkpoints: request.checkpoints ?? [rollbackReadyCheckpoint],
    commandReceipts: [checkpointReceipt, ...(request.commandReceipts ?? [])],
  });

describe("BuildModeAutonomousQueue", () => {
  it("allows the next queued command when command policy allows it", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
      }),
    ).toEqual({
      dispatchable: true,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      policyDecision: "allow",
      reasons: [],
    });
  });

  it("rejects autonomous dispatch without runtime, swarm, and plan-step ownership", () => {
    const unownedCommand: BuildModeCommand = {
      id: "cmd-test",
      kind: "test",
      label: "Run tests",
      command: "npm test",
      capabilityId: "terminal.execute",
      requiresApproval: false,
      status: "queued",
    };

    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: unownedCommand,
        commandCatalog: [completedSafeEditCommand, unownedCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      policyDecision: "reject",
      reasons: expect.arrayContaining([
        "Autonomous queue command cmd-test requires an executionPlanStepId before dispatch.",
        "Autonomous queue command cmd-test requires an assignedRuntimeId before dispatch.",
        "Autonomous queue command cmd-test requires an assignedSwarmRole before dispatch.",
      ]),
    });
  });

  it("rejects autonomous dispatch without runtime and swarm registries", () => {
    expect(
      validateBuildModeAutonomousQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      policyDecision: "reject",
      reasons: expect.arrayContaining([
        "Autonomous queue dispatch requires an agent runtime registry.",
        "Autonomous queue dispatch requires swarm role assignments.",
      ]),
    });
  });

  it("rejects unavailable or mismatched runtime and swarm ownership", () => {
    expect(
      validateQueueDispatch({
        agentRuntimes: agentRuntimes.map((runtime) =>
          runtime.id === "runtime-test-runner"
            ? {
                ...runtime,
                ownerRole: "Security Auditor",
                status: "blocked",
              }
            : runtime,
        ),
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
        swarmRoles: swarmRoles.map((role) =>
          role.role === "Test Runner" ? { ...role, status: "blocked" } : role,
        ),
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      policyDecision: "reject",
      reasons: expect.arrayContaining([
        "Autonomous queue agentRuntime runtime-test-runner is not available for dispatch: blocked.",
        "Autonomous queue command cmd-test assignedSwarmRole Test Runner does not match runtime runtime-test-runner ownerRole Security Auditor.",
        "Autonomous queue swarmRole Test Runner is not available for dispatch: blocked.",
      ]),
    });
  });

  it("rejects autonomous dispatch to busy runtime and swarm ownership", () => {
    expect(
      validateQueueDispatch({
        agentRuntimes: agentRuntimes.map((runtime) =>
          runtime.id === "runtime-test-runner"
            ? { ...runtime, status: "running" }
            : runtime,
        ),
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
        swarmRoles: swarmRoles.map((role) =>
          role.role === "Test Runner" ? { ...role, status: "running" } : role,
        ),
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      policyDecision: "reject",
      reasons: expect.arrayContaining([
        "Autonomous queue agentRuntime runtime-test-runner is not available for dispatch: running.",
        "Autonomous queue swarmRole Test Runner is not available for dispatch: running.",
      ]),
    });
  });

  it("allows local browser preview verification in autonomous queue dispatch", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: {
          ...baseAutonomyPolicy,
          allowedCapabilityIds: ["browser.automation"],
        },
        browserPreviewUrl: "http://localhost:5173/apps/digital-product-pro",
        command: browserCommand,
        commandCatalog: [browserCommand],
        executionPlan: browserExecutionPlan,
      }),
    ).toEqual({
      dispatchable: true,
      nextCommandId: "cmd-browser",
      nextStepId: "plan-browser-verify",
      policyDecision: "allow",
      reasons: [],
    });
  });

  it("allows final report publication when markdown proof is present", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: {
          ...baseAutonomyPolicy,
          allowedCapabilityIds: ["graymatter.memory"],
          receiptRequired: false,
        },
        command: finalReportCommand,
        commandCatalog: [finalReportCommand],
        executionPlan: finalReportExecutionPlan,
        finalReportMarkdown: completeFinalReportMarkdown,
      }),
    ).toEqual({
      dispatchable: true,
      nextCommandId: "cmd-final-report",
      nextStepId: "plan-final-report",
      policyDecision: "allow",
      reasons: [],
    });
  });

  it("rejects final report publication when autonomous queue omits report markdown proof", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: {
          ...baseAutonomyPolicy,
          allowedCapabilityIds: ["graymatter.memory"],
          receiptRequired: false,
        },
        command: finalReportCommand,
        commandCatalog: [finalReportCommand],
        executionPlan: finalReportExecutionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-final-report",
      nextStepId: "plan-final-report",
      policyDecision: "reject",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is reject: Final report publication requires final report markdown..",
      ]),
    });
  });

  it("uses checkpoint records when validating autonomous rollback proof", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: {
          ...baseAutonomyPolicy,
          allowedCapabilityIds: ["checkpoint.manage"],
          receiptRequired: false,
        },
        checkpoints: [
          {
            id: "checkpoint-good",
            label: "Known checkpoint",
            status: "rollback-ready",
            hash: "checkpoint-hash-good",
            summary: "Known rollback point.",
            rollbackCommandId: "cmd-checkpoint-rollback",
            receiptIds: ["receipt-checkpoint-create"],
          },
        ],
        command: checkpointRollbackCommand,
        commandCatalog: [checkpointRollbackCommand],
        executionPlan: checkpointRollbackExecutionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-checkpoint-rollback",
      nextStepId: "plan-checkpoint-rollback",
      policyDecision: "approval-required",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is approval-required: Checkpoint rollback requires approval..",
      ]),
    });
  });

  it("requires approval for autonomous browser verification against external URLs", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: {
          ...baseAutonomyPolicy,
          allowedCapabilityIds: ["browser.automation"],
        },
        browserPreviewUrl:
          "https://customer.example.com/apps/digital-product-pro",
        command: browserCommand,
        commandCatalog: [browserCommand],
        executionPlan: browserExecutionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-browser",
      nextStepId: "plan-browser-verify",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is approval-required: External browser verification URL requires approval: customer.example.com..",
      ]),
    });
  });

  it("rejects autonomous browser verification URLs containing inline secret material", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: {
          ...baseAutonomyPolicy,
          allowedCapabilityIds: ["browser.automation"],
        },
        browserPreviewUrl:
          "http://localhost:5173/apps/digital-product-pro?token=browser-secret-token",
        command: browserCommand,
        commandCatalog: [browserCommand],
        executionPlan: browserExecutionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-browser",
      nextStepId: "plan-browser-verify",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is reject: Browser verification URL contains inline secret material..",
      ]),
    });
  });

  it("rejects receipt-required dependency steps without receipt proof", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [],
        executionPlan: executionPlan.map((step) =>
          step.id === "plan-safe-edits" ? { ...step, receiptIds: [] } : step,
        ),
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue receipt is required for dependency step plan-safe-edits.",
      ]),
    });
  });

  it("rejects receipt-required dependencies when receipt ids exist but receipt objects are missing", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue dependency receipt proof is missing for cmd-safe-edit.",
      ]),
    });
  });

  it("rejects dependency receipts when the dependency command is not marked succeeded", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [safeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue dependency command cmd-safe-edit is not succeeded: queued.",
      ]),
    });
  });

  it("rejects dependency receipts when the dependency command receiptId disagrees", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [
          {
            ...completedSafeEditCommand,
            receiptId: "receipt-stale-safe-edit",
          },
          testCommand,
        ],
        commandReceipts: [safeEditReceipt],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue dependency command cmd-safe-edit receiptId receipt-stale-safe-edit does not match latest receipt receipt-safe-edit.",
      ]),
    });
  });

  it("rejects advancing past mutable dependency without rollback-ready checkpoint proof", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        checkpoints: [],
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue mutable dependency cmd-safe-edit requires a rollback-ready checkpoint with hash and receipt proof before advancing.",
      ]),
    });
  });

  it("rejects advancing past mutable dependency when checkpoint artifact proof is missing", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        checkpoints: [
          {
            ...rollbackReadyCheckpoint,
            receiptIds: ["receipt-checkpoint-missing-artifact-proof"],
          },
        ],
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [
          safeEditReceipt,
          {
            ...checkpointReceipt,
            id: "receipt-checkpoint-missing-artifact-proof",
            artifacts: [],
          },
        ],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue rollback-ready checkpoint checkpoint-before-edits requires a succeeded checkpoint.manage receipt with checkpoint artifact proof before advancing past mutable dependency cmd-safe-edit.",
      ]),
    });
  });

  it("rejects receipt-required dependencies when only unrelated receipt objects are present", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [
          {
            ...safeEditReceipt,
            commandId: "cmd-other",
            id: "receipt-other",
          },
        ],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue dependency receipt proof is missing for cmd-safe-edit.",
      ]),
    });
  });

  it("rejects queue dispatches when dependency readiness gates are incomplete", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan: executionPlan.map((step) =>
          step.id === "plan-safe-edits"
            ? { ...step, readinessGateIds: ["gate-safe-edit-proof"] }
            : step,
        ),
        readinessGates,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is reject: Readiness gate is not passed for Run tests: Safe edit proof (pending)..",
      ]),
    });
  });

  it("rejects attached GrayMatter context packs that fail preflight even when legacy callers omit the require flag", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
        grayMatterContextPack: {
          ...grayMatterContextPack,
          invariantPreflightStatus: "blocked",
          retrievalReceiptIds: [],
          retrievalStatus: "blocked",
        },
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is reject: GrayMatter context pack gm-context-pack-dpp-001 has no retrieval receipts.; GrayMatter invariant preflight is blocked for gm-context-pack-dpp-001.; GrayMatter retrieval status is blocked for gm-context-pack-dpp-001..",
      ]),
    });
  });

  it("rejects dispatch when required prompt bundle proof is missing", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
        grayMatterContextPack,
        requireGrayMatterContext: true,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is reject: Prompt bundle proof is required before command execution..",
      ]),
    });
  });

  it("rejects commands that are not next in the execution plan", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: safeEditCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        executionPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: expect.arrayContaining([
        "Autonomous queue command is not next in the execution plan: expected cmd-test, got cmd-safe-edit.",
      ]),
    });
  });

  it("does not dispatch dependency-ready commands from pending execution steps", () => {
    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [completedSafeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan: executionPlan.map((step) =>
          step.id === "plan-tests"
            ? { ...step, status: "pending" as const }
            : step,
        ),
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: undefined,
      nextStepId: undefined,
      policyDecision: "reject",
      reasons: expect.arrayContaining([
        "Autonomous queue has no runnable execution plan command.",
      ]),
    });
  });

  it("skips non-queued commands when choosing the next autonomous dispatch", () => {
    const blockedCommands: BuildModeCommand[] = [
      { ...testCommand, id: "cmd-test-failed", status: "failed" },
      { ...testCommand, id: "cmd-test-rejected", status: "rejected" },
      {
        ...testCommand,
        id: "cmd-test-approval-required",
        status: "approval-required",
      },
    ];
    const nextQueuedCommand: BuildModeCommand = {
      ...testCommand,
      id: "cmd-test-next",
    };
    const plan: BuildModeExecutionPlanStep[] = [
      {
        ...executionPlan[1],
        commandIds: [
          "cmd-test-failed",
          "cmd-test-rejected",
          "cmd-test-approval-required",
          "cmd-test-next",
        ],
        dependencyStepIds: [],
      },
    ];

    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: nextQueuedCommand,
        commandCatalog: [...blockedCommands, nextQueuedCommand],
        executionPlan: plan,
      }),
    ).toEqual({
      dispatchable: true,
      nextCommandId: "cmd-test-next",
      nextStepId: "plan-tests",
      policyDecision: "allow",
      reasons: [],
    });
  });

  it("rejects approval-required policy outcomes before dispatch", () => {
    const editPlan = [
      { ...executionPlan[0], status: "ready" as const },
      { ...executionPlan[1], status: "pending" as const },
    ];

    expect(
      validateQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: safeEditCommand,
        commandCatalog: [safeEditCommand, testCommand],
        executionPlan: editPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-safe-edit",
      nextStepId: "plan-safe-edits",
      policyDecision: "approval-required",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is approval-required: Safe edit commands require approval..",
      ]),
    });
  });

  it("creates approval-gate receipts for queue dispatches that only need approval", () => {
    const editPlan = [
      { ...executionPlan[0], status: "ready" as const },
      { ...executionPlan[1], status: "pending" as const },
    ];
    const validation = validateQueueDispatch({
      autonomyPolicy: baseAutonomyPolicy,
      command: safeEditCommand,
      commandCatalog: [safeEditCommand, testCommand],
      executionPlan: editPlan,
    });

    expect(
      createBuildModeAutonomousQueueBlockedReceipt(
        {
          autonomyPolicy: baseAutonomyPolicy,
          command: safeEditCommand,
          commandCatalog: [safeEditCommand, testCommand],
          executionPlan: editPlan,
          validation,
        },
        () => new Date("2026-06-21T22:00:00.000Z"),
      ),
    ).toMatchObject({
      approved: false,
      commandId: "cmd-safe-edit",
      executionMode: "approval-gate",
      nextOperatorAction: "approve",
      operatorActionSummary:
        "Approve the command before retrying autonomous queue dispatch.",
      policyDecision: "approval-required",
      policyReasons: expect.arrayContaining([
        "Autonomous queue policy is approval-required: Safe edit commands require approval..",
      ]),
      requiresApproval: true,
      requiredApprovalThreshold: "operator",
      status: "approval-required",
    });
  });

  it("creates auditable rejected receipts for blocked queue dispatches", () => {
    const validation = validateQueueDispatch({
      autonomyPolicy: baseAutonomyPolicy,
      command: safeEditCommand,
      commandCatalog: [safeEditCommand, testCommand],
      executionPlan,
    });

    expect(
      createBuildModeAutonomousQueueBlockedReceipt(
        {
          autonomyPolicy: baseAutonomyPolicy,
          command: {
            ...safeEditCommand,
            assignedRuntimeId: "runtime-codex",
            assignedSwarmRole: "Supervisor",
            executionPlanStepId: "plan-safe-edits",
          },
          commandCatalog: [safeEditCommand, testCommand],
          executionPlan,
          grayMatterContextPack,
          promptContext,
          scope: {
            tenantId: "tenant-valkyr-demo",
            principalId: "principal-valhalla-operator",
            roles: ["Owner"],
            workspaceRoot: "/workspace/valor",
            policyRefs: ["policy:valhalla-build-mode"],
          },
          taskId: "task-1",
          validation,
        },
        () => new Date("2026-06-21T22:00:00.000Z"),
      ),
    ).toMatchObject({
      approved: false,
      assignedRuntimeId: "runtime-codex",
      assignedSwarmRole: "Supervisor",
      capabilityId: "psr.edit",
      commandId: "cmd-safe-edit",
      createdAt: "2026-06-21T22:00:00.000Z",
      executionMode: "policy-blocked",
      executionPlanStepId: "plan-safe-edits",
      grayMatterContextProof: {
        contextPackId: "gm-context-pack-dpp-001",
        invariantPreflightStatus: "passed",
        retrievalReceiptIds: ["retrieval-receipt-dpp-001"],
        retrievalStatus: "ready",
      },
      id: expect.stringMatching(
        /^build-command-receipt-cmd-safe-edit-autonomous-queue-blocked-/,
      ),
      nextOperatorAction: "revise",
      policyDecision: "reject",
      policyReasons: expect.arrayContaining([
        "Autonomous queue command is not next in the execution plan: expected cmd-test, got cmd-safe-edit.",
      ]),
      promptContext,
      requiresApproval: false,
      status: "rejected",
      summary: expect.stringContaining(
        "Build Mode autonomous queue blocked Apply safe edit:",
      ),
    });
  });
});
