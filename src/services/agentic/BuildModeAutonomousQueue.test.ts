import type {
  BuildModeAutonomyPolicy,
  BuildModeCommand,
  BuildModeCommandReceipt,
  BuildModeExecutionPlanStep,
  BuildModePromptExecutionContext,
  BuildModeReadinessGate,
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

const safeEditCommand: BuildModeCommand = {
  id: "cmd-safe-edit",
  kind: "edit",
  label: "Apply safe edit",
  command: 'psr:src/App.tsx replace:"old" with:"new"',
  capabilityId: "psr.edit",
  requiresApproval: false,
  status: "queued",
};

const testCommand: BuildModeCommand = {
  id: "cmd-test",
  kind: "test",
  label: "Run tests",
  command: "npm test",
  capabilityId: "terminal.execute",
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

const executionPlan: BuildModeExecutionPlanStep[] = [
  {
    id: "plan-safe-edits",
    label: "Apply safe edits",
    summary: "Apply editable changes.",
    status: "complete",
    runtimeId: "runtime-codex",
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
    runtimeId: "runtime-codex",
    commandIds: ["cmd-test"],
    readinessGateIds: [],
    dependencyStepIds: ["plan-safe-edits"],
    receiptIds: [],
    nextAction: "Run tests.",
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

describe("BuildModeAutonomousQueue", () => {
  it("allows the next queued command when command policy allows it", () => {
    expect(
      validateBuildModeAutonomousQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [safeEditCommand, testCommand],
        commandReceipts: [safeEditReceipt],
        executionPlan,
      }),
    ).toEqual({
      dispatchable: true,
      nextCommandId: "cmd-test",
      nextStepId: "plan-tests",
      reasons: [],
    });
  });

  it("rejects receipt-required dependency steps without receipt proof", () => {
    expect(
      validateBuildModeAutonomousQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [safeEditCommand, testCommand],
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

  it("rejects queue dispatches when dependency readiness gates are incomplete", () => {
    expect(
      validateBuildModeAutonomousQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: testCommand,
        commandCatalog: [safeEditCommand, testCommand],
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

  it("rejects commands that are not next in the execution plan", () => {
    expect(
      validateBuildModeAutonomousQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: safeEditCommand,
        commandCatalog: [safeEditCommand, testCommand],
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

  it("rejects approval-required policy outcomes before dispatch", () => {
    const editPlan = [
      { ...executionPlan[0], status: "ready" as const },
      { ...executionPlan[1], status: "pending" as const },
    ];

    expect(
      validateBuildModeAutonomousQueueDispatch({
        autonomyPolicy: baseAutonomyPolicy,
        command: safeEditCommand,
        commandCatalog: [safeEditCommand, testCommand],
        executionPlan: editPlan,
      }),
    ).toMatchObject({
      dispatchable: false,
      nextCommandId: "cmd-safe-edit",
      nextStepId: "plan-safe-edits",
      reasons: expect.arrayContaining([
        "Autonomous queue policy is approval-required: Safe edit commands require approval..",
      ]),
    });
  });

  it("creates auditable rejected receipts for blocked queue dispatches", () => {
    const validation = validateBuildModeAutonomousQueueDispatch({
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
