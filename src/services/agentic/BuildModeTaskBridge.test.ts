import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { coerceBuildModeTaskLaunchPayload } from "./BuildModeTaskBridge";

const fixedNow = () => new Date("2026-06-22T12:00:00.000Z");

const basePayload = {
  taskId: "valor-task-sagechat-001",
  appBundle: {
    id: "app-bundle-sagechat-001",
    name: "SageChat Generated App",
  },
  grayMatterContextPack: {
    id: "gm-context-sagechat-001",
    invariantPreflightStatus: "passed",
    retrievalReceiptIds: ["retrieval-receipt-sagechat-001"],
    retrievalStatus: "ready",
  },
  providerCredentials: [
    {
      displayName: "Use my API key",
      id: "credential-ref-user-key",
      route: "bring-your-own-key",
      secretAvailable: true,
      tenantScoped: true,
    },
  ],
  scope: {
    principalId: "principal-valhalla-operator",
    roles: ["Owner"],
    tenantId: "tenant-valkyr-demo",
    workspaceRoot: "/workspace/valor/apps/generated",
  },
};

const requiredSwarmRoleAssignments = [
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
  currentFocus: `${role} focus`,
  owner: "ValorIDE",
  role,
  status: "assigned",
}));

const terminalStdoutEvidence = (
  id: string,
  commandId: string,
  receiptId: string,
  commandText = "npm test",
) => ({
  commandId,
  createdAt: "2026-06-22T12:05:00.000Z",
  id,
  kind: "command_stdout",
  metadata: {
    byteSize: 1024,
    completed: true,
    commandHash: createTestSha256(commandText),
    contentHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    exitCode: 0,
  },
  receiptId,
  title: "Terminal stdout proof",
  uri: `valoride://build-mode/artifacts/${id}`,
});

const createTestSha256 = (value: string): string =>
  `sha256:${crypto.createHash("sha256").update(value).digest("hex")}`;

const rollbackReadyCheckpointCapability = {
  enabled: true,
  id: "checkpoint.manage",
  kind: "checkpoint",
  label: "Checkpoint",
  requiresApproval: false,
  risk: "medium",
};

const rollbackReadyCheckpointCommand = {
  capabilityId: "checkpoint.manage",
  command: "checkpoint:create pre-edit",
  id: "cmd-checkpoint-create",
  kind: "checkpoint",
  label: "Create checkpoint",
  requiresApproval: true,
  status: "succeeded",
};

const rollbackReadyCheckpointReceipt = {
  approval: {
    approved: true,
    approverPrincipalId: "principal-valhalla-operator",
    approverRoles: ["Owner"],
    createdAt: "2026-06-22T11:59:00.000Z",
    reason: "Approved pre-edit checkpoint.",
    threshold: "operator",
  },
  approved: true,
  capabilityId: "checkpoint.manage",
  commandId: "cmd-checkpoint-create",
  createdAt: "2026-06-22T12:00:00.000Z",
  id: "command-receipt-checkpoint-create",
  policyDecision: "approval-required",
  requiredApprovalThreshold: "operator",
  requiresApproval: true,
  status: "succeeded",
  summary: "Checkpoint created before safe edit.",
};

const rollbackReadyCheckpointArtifact = {
  commandId: "cmd-checkpoint-create",
  createdAt: "2026-06-22T12:00:00.000Z",
  id: "artifact-checkpoint-create",
  kind: "checkpoint",
  metadata: {
    checkpointAction: "create",
    checkpointHash: "shadowgit:test-pre-edit",
    checkpointRef: "checkpoint-pre-edit",
  },
  receiptId: "command-receipt-checkpoint-create",
  title: "Checkpoint proof",
  uri: "valoride://build-mode/artifacts/checkpoint-create",
};

const rollbackReadyCheckpoint = {
  commandId: "cmd-checkpoint-create",
  hash: "shadowgit:test-pre-edit",
  id: "checkpoint-pre-edit",
  label: "Pre-edit checkpoint",
  receiptIds: ["command-receipt-checkpoint-create"],
  status: "rollback-ready",
  summary: "Pre-edit rollback checkpoint is ready.",
};

describe("BuildModeTaskBridge", () => {
  it("normalizes SageChat/App Gallery launch payloads for Build Mode", () => {
    const result = coerceBuildModeTaskLaunchPayload(basePayload, {
      now: fixedNow,
      workspaceRoot: "/workspace/valor",
    });

    expect(result.issues).toEqual([]);
    expect(result.payload).toMatchObject({
      appBundle: {
        createdAt: "2026-06-22T12:00:00.000Z",
        id: "app-bundle-sagechat-001",
        name: "SageChat Generated App",
        productLine: "ValkyrAI",
        sourceSessionId: "valor-task-sagechat-001",
        version: "0.0.0",
      },
      grayMatterContextPack: {
        answerPolicy: "answer-confidently",
        id: "gm-context-sagechat-001",
        invariantPreflightStatus: "passed",
        retrievalReceiptIds: ["retrieval-receipt-sagechat-001"],
        retrievalStatus: "ready",
      },
      source: "SageChat",
      taskId: "valor-task-sagechat-001",
    });
  });

  it("loads workspace .valorideignore patterns into the launch scope", async () => {
    const workspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "valoride-bridge-ignore-"),
    );
    try {
      await fs.writeFile(
        path.join(workspaceRoot, ".valorideignore"),
        "secrets/\nlogs/*.secret\n",
      );

      const result = coerceBuildModeTaskLaunchPayload(
        {
          ...basePayload,
          scope: {
            ...basePayload.scope,
            ignoredPathPatterns: ["tmp/private/"],
            workspaceRoot,
          },
        },
        {
          now: fixedNow,
          workspaceRoot,
        },
      );

      expect(result.issues).toEqual([]);
      expect(result.payload?.scope?.ignoredPathPatterns).toEqual(
        expect.arrayContaining([
          "tmp/private/",
          "**/secrets",
          "**/secrets/**",
          "logs/*.secret",
        ]),
      );
    } finally {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("preserves provider credential refs without secret material", () => {
    const result = coerceBuildModeTaskLaunchPayload(basePayload, {
      now: fixedNow,
      workspaceRoot: "/workspace/valor",
    });

    expect(result.payload?.providerCredentials).toEqual([
      {
        displayName: "Use my API key",
        id: "credential-ref-user-key",
        receiptIds: [],
        route: "bring-your-own-key",
        secretAvailable: true,
        tenantScoped: true,
      },
    ]);
    expect(JSON.stringify(result.payload)).not.toContain("apiKey");
    expect(JSON.stringify(result.payload)).not.toContain("token");
  });

  it("rejects selected provider routes without declared credential refs", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        selectedProviderRoute: "local-model",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toContain(
      "Build Mode selectedProviderRoute references providerRoute local-model without a ProviderCredentialRef.",
    );
  });

  it("accepts selected provider routes with credential receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        providerCredentials: [
          {
            displayName: "Use Valkyr credits",
            id: "credential-ref-valkyr",
            receiptIds: ["receipt-provider-selected"],
            route: "valkyr-credits",
            secretAvailable: false,
            tenantScoped: true,
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-provider-selected",
            kind: "context",
            status: "approved",
            summary: "Selected provider route is authorized.",
            title: "Provider credential proof",
          },
        ],
        selectedProviderRoute: "valkyr-credits",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.providerCredentials?.[0]).toMatchObject({
      receiptIds: ["receipt-provider-selected"],
      route: "valkyr-credits",
    });
  });

  it("rejects selected provider routes without credential receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        providerCredentials: [
          {
            displayName: "Use Valkyr credits",
            id: "credential-ref-valkyr",
            route: "valkyr-credits",
            secretAvailable: false,
            tenantScoped: true,
          },
          {
            displayName: "Use enterprise proxy",
            id: "credential-ref-enterprise",
            receiptIds: ["receipt-provider-failed"],
            route: "enterprise-proxy",
            secretAvailable: true,
            tenantScoped: true,
          },
          {
            displayName: "Use local model",
            id: "credential-ref-local",
            receiptIds: ["receipt-provider-missing"],
            route: "local-model",
            secretAvailable: false,
            tenantScoped: false,
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-provider-failed",
            kind: "context",
            status: "failed",
            summary: "Provider route authorization failed.",
            title: "Failed provider credential proof",
          },
        ],
        selectedProviderRoute: "valkyr-credits",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode selectedProviderRoute valkyr-credits requires provider credential receipt proof.",
      ]),
    );

    const failedResult = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        providerCredentials: [
          {
            displayName: "Use enterprise proxy",
            id: "credential-ref-enterprise",
            receiptIds: ["receipt-provider-failed"],
            route: "enterprise-proxy",
            secretAvailable: true,
            tenantScoped: true,
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-provider-failed",
            kind: "context",
            status: "failed",
            summary: "Provider route authorization failed.",
            title: "Failed provider credential proof",
          },
        ],
        selectedProviderRoute: "enterprise-proxy",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(failedResult.payload).toBeUndefined();
    expect(failedResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode selectedProviderRoute enterprise-proxy has no acceptable provider credential receipt status.",
      ]),
    );

    const missingResult = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        providerCredentials: [
          {
            displayName: "Use local model",
            id: "credential-ref-local",
            receiptIds: ["receipt-provider-missing"],
            route: "local-model",
            secretAvailable: false,
            tenantScoped: false,
          },
        ],
        receipts: [],
        selectedProviderRoute: "local-model",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(missingResult.payload).toBeUndefined();
    expect(missingResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode selectedProviderRoute local-model references missing receipt receipt-provider-missing.",
        "Build Mode selectedProviderRoute local-model requires provider credential receipt status proof.",
      ]),
    );
  });

  it("rejects unavailable BYO and unscoped enterprise provider credential refs", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        providerCredentials: [
          {
            displayName: "Use my API key",
            id: "credential-ref-user-key",
            route: "bring-your-own-key",
            secretAvailable: false,
            tenantScoped: true,
          },
          {
            displayName: "Enterprise proxy",
            id: "credential-ref-enterprise-proxy",
            route: "enterprise-proxy",
            secretAvailable: true,
            tenantScoped: false,
          },
        ],
        selectedProviderRoute: "enterprise-proxy",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode providerCredential credential-ref-user-key for bring-your-own-key must have secretAvailable true.",
        "Build Mode providerCredential credential-ref-enterprise-proxy for enterprise-proxy must be tenant scoped.",
      ]),
    );
  });

  it("accepts BYO credit estimates and usage only when hosted infrastructure credits are preserved", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        creditEstimate: {
          assumptions: [
            "BYO model spend is external; hosted infrastructure still applies.",
          ],
          currency: "ValkyrCredits",
          estimatedCredits: 4,
          estimatedHostedInfrastructureCredits: 1,
          id: "credit-estimate-byo",
          providerRoute: "bring-your-own-key",
        },
        creditUsageReceipts: [
          {
            actualCredits: 1,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow",
            commandStatus: "succeeded",
            createdAt: "2026-06-22T12:01:00.000Z",
            estimateId: "credit-estimate-byo",
            hostedInfrastructureCredits: 1,
            id: "credit-usage-byo-workflow",
            providerCredits: 0,
            providerRoute: "bring-your-own-key",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.creditUsageReceipts?.[0]).toMatchObject({
      actualCredits: 1,
      hostedInfrastructureCredits: 1,
      providerCredits: 0,
      providerRoute: "bring-your-own-key",
    });
  });

  it("accepts credit estimates with explicit credit usage receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        creditEstimate: {
          assumptions: [
            "Hosted infrastructure credits are estimated before autonomous execution.",
          ],
          currency: "ValkyrCredits",
          estimatedCredits: 4,
          estimatedHostedInfrastructureCredits: 1,
          id: "credit-estimate-proofed",
          providerRoute: "bring-your-own-key",
          receiptIds: ["receipt-credit-estimate-proof"],
        },
        receipts: [
          {
            actor: "Credit Router",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-credit-estimate-proof",
            kind: "credit_usage",
            status: "succeeded",
            summary: "Credit estimate is backed by the credit router.",
            targetRef: "credit-estimate-proofed",
            title: "Credit estimate proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.creditEstimate).toMatchObject({
      id: "credit-estimate-proofed",
      receiptIds: ["receipt-credit-estimate-proof"],
    });
  });

  it("rejects credit estimates without acceptable credit usage receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        creditEstimate: {
          assumptions: [],
          currency: "ValkyrCredits",
          estimatedCredits: 4,
          estimatedHostedInfrastructureCredits: 1,
          id: "credit-estimate-unproofed",
          providerRoute: "bring-your-own-key",
          receiptIds: ["receipt-credit-estimate-failed"],
        },
        receipts: [
          {
            actor: "Credit Router",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-credit-estimate-failed",
            kind: "credit_usage",
            status: "failed",
            summary: "Credit estimate failed.",
            targetRef: "credit-estimate-unproofed",
            title: "Failed credit estimate proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode creditEstimate credit-estimate-unproofed has no acceptable credit usage receipt status.",
      ]),
    );
  });

  it("rejects credit ledgers that bypass hosted-credit or provider-route invariants", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        creditEstimate: {
          assumptions: [],
          currency: "ValkyrCredits",
          estimatedCredits: 4,
          estimatedHostedInfrastructureCredits: 0,
          id: "credit-estimate-byo",
          providerRoute: "bring-your-own-key",
        },
        creditUsageReceipts: [
          {
            actualCredits: 2,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow",
            commandStatus: "succeeded",
            createdAt: "2026-06-22T12:01:00.000Z",
            estimateId: "credit-estimate-other",
            hostedInfrastructureCredits: 0,
            id: "credit-usage-byo-workflow",
            providerCredits: 1,
            providerRoute: "bring-your-own-key",
          },
          {
            actualCredits: 3,
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            commandStatus: "succeeded",
            createdAt: "2026-06-22T12:02:00.000Z",
            estimateId: "credit-estimate-byo",
            hostedInfrastructureCredits: 1,
            id: "credit-usage-unbalanced",
            providerCredits: 1,
            providerRoute: "valkyr-credits",
          },
          {
            actualCredits: 1,
            capabilityId: "workflow.execute",
            commandId: "cmd-local-model",
            commandStatus: "succeeded",
            createdAt: "2026-06-22T12:03:00.000Z",
            estimateId: "credit-estimate-byo",
            hostedInfrastructureCredits: 0,
            id: "credit-usage-local-model",
            providerCredits: 0,
            providerRoute: "local-model",
          },
        ],
        providerCredentials: [
          ...basePayload.providerCredentials,
          {
            displayName: "Use local model",
            id: "credential-ref-local",
            route: "local-model",
            secretAvailable: false,
            tenantScoped: true,
          },
          {
            displayName: "Use Valkyr credits",
            id: "credential-ref-valkyr",
            route: "valkyr-credits",
            secretAvailable: false,
            tenantScoped: true,
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode creditEstimate credit-estimate-byo must include hosted infrastructure credits for bring-your-own-key.",
        "Build Mode creditUsageReceipt credit-usage-byo-workflow references estimate credit-estimate-other, expected credit-estimate-byo.",
        "Build Mode creditUsageReceipt credit-usage-byo-workflow actualCredits must equal providerCredits plus hostedInfrastructureCredits.",
        "Build Mode creditUsageReceipt credit-usage-byo-workflow must not charge provider credits for bring-your-own-key.",
        "Build Mode creditUsageReceipt credit-usage-byo-workflow must include hosted infrastructure credits for bring-your-own-key.",
        "Build Mode creditUsageReceipt credit-usage-unbalanced actualCredits must equal providerCredits plus hostedInfrastructureCredits.",
        "Build Mode creditUsageReceipt credit-usage-local-model actualCredits must equal providerCredits plus hostedInfrastructureCredits.",
        "Build Mode creditUsageReceipt credit-usage-local-model must include hosted infrastructure credits for local-model.",
      ]),
    );
  });

  it("rejects credit usage receipts that disagree with latest command receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          answerPolicy: "answer-confidently",
          preflightReceiptId: "gm-preflight-001",
          retrievalTraceId: "gm-trace-001",
        },
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Workflow",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-credit-mismatch",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "failed",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-credit-mismatch",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-credit-mismatch",
            policyDecision: "allow",
            requiresApproval: false,
            status: "failed",
            summary: "Tests failed.",
          },
        ],
        creditEstimate: {
          assumptions: [
            "BYO model spend is external; hosted infrastructure still applies.",
          ],
          currency: "ValkyrCredits",
          estimatedCredits: 4,
          estimatedHostedInfrastructureCredits: 1,
          id: "credit-estimate-byo",
          providerRoute: "bring-your-own-key",
        },
        creditUsageReceipts: [
          {
            actualCredits: 1,
            capabilityId: "workflow.execute",
            commandId: "cmd-credit-mismatch",
            commandStatus: "succeeded",
            createdAt: "2026-06-22T12:06:00.000Z",
            estimateId: "credit-estimate-byo",
            hostedInfrastructureCredits: 1,
            id: "credit-usage-mismatched-command",
            providerCredits: 0,
            providerRoute: "bring-your-own-key",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode creditUsageReceipt credit-usage-mismatched-command commandStatus succeeded does not match latest commandReceipt status failed for command cmd-credit-mismatch.",
        "Build Mode creditUsageReceipt credit-usage-mismatched-command capabilityId workflow.execute does not match latest commandReceipt capability terminal.execute for command cmd-credit-mismatch.",
      ]),
    );
  });

  it("rejects nested command receipt credit usage that disagrees with its execution proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          answerPolicy: "answer-confidently",
          majorTaskRefs: ["cmd-graymatter-proof"],
          preflightReceiptId: "gm-preflight-001",
          retrievalTraceId: "gm-trace-001",
        },
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-nested-credit-mismatch",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "failed",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-nested-credit-mismatch",
            createdAt: "2026-06-22T12:05:00.000Z",
            creditUsageReceipt: {
              actualCredits: 1,
              capabilityId: "terminal.execute",
              commandId: "cmd-nested-credit-mismatch",
              commandStatus: "succeeded",
              createdAt: "2026-06-22T12:06:00.000Z",
              estimateId: "credit-estimate-task",
              hostedInfrastructureCredits: 1,
              id: "credit-usage-nested-mismatch",
              providerCredits: 0,
              providerRoute: "bring-your-own-key",
            },
            id: "command-receipt-nested-credit-mismatch",
            policyDecision: "allow",
            requiresApproval: false,
            status: "failed",
            summary: "Tests failed.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode creditUsageReceipt credit-usage-nested-mismatch commandStatus succeeded does not match latest commandReceipt status failed for command cmd-nested-credit-mismatch.",
      ]),
    );
  });

  it("rejects non-succeeded credit usage receipts with nonzero charges", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-credit-failed-charge",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "failed",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-credit-failed-charge",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-credit-failed-charge",
            policyDecision: "allow",
            requiresApproval: false,
            status: "failed",
            summary: "Tests failed.",
          },
        ],
        creditEstimate: {
          assumptions: [
            "BYO model spend is external; hosted infrastructure still applies.",
          ],
          currency: "ValkyrCredits",
          estimatedCredits: 4,
          estimatedHostedInfrastructureCredits: 1,
          id: "credit-estimate-byo",
          providerRoute: "bring-your-own-key",
        },
        creditUsageReceipts: [
          {
            actualCredits: 1,
            capabilityId: "terminal.execute",
            commandId: "cmd-credit-failed-charge",
            commandStatus: "failed",
            createdAt: "2026-06-22T12:06:00.000Z",
            estimateId: "credit-estimate-byo",
            hostedInfrastructureCredits: 1,
            id: "credit-usage-failed-charge",
            providerCredits: 0,
            providerRoute: "bring-your-own-key",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode creditUsageReceipt credit-usage-failed-charge with commandStatus failed must have zero actualCredits, providerCredits, and hostedInfrastructureCredits.",
      ]),
    );
  });

  it("rejects nested non-succeeded credit usage receipts with nonzero charges", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-nested-credit-failed-charge",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "failed",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-nested-credit-failed-charge",
            createdAt: "2026-06-22T12:05:00.000Z",
            creditUsageReceipt: {
              actualCredits: 1,
              capabilityId: "terminal.execute",
              commandId: "cmd-nested-credit-failed-charge",
              commandStatus: "failed",
              createdAt: "2026-06-22T12:06:00.000Z",
              estimateId: "credit-estimate-task",
              hostedInfrastructureCredits: 1,
              id: "credit-usage-nested-failed-charge",
              providerCredits: 0,
              providerRoute: "bring-your-own-key",
            },
            id: "command-receipt-nested-credit-failed-charge",
            policyDecision: "allow",
            requiresApproval: false,
            status: "failed",
            summary: "Tests failed.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode creditUsageReceipt credit-usage-nested-failed-charge with commandStatus failed must have zero actualCredits, providerCredits, and hostedInfrastructureCredits.",
      ]),
    );
  });

  it("accepts launches with the complete required swarm role set wired to runtimes and commands", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentLoop: [
          {
            capabilityIds: ["terminal.execute"],
            id: "loop-tests",
            label: "Run tests",
            receiptIds: [],
            status: "ready",
          },
        ],
        agentRuntimes: [
          {
            handoffPolicy: "operator-approved",
            id: "runtime-test-runner",
            label: "Test runner",
            loopPhaseIds: ["loop-tests"],
            ownerRole: "Test Runner",
            promptProfileId: "prompt-profile-valhalla",
            providerRoute: "bring-your-own-key",
            receiptIds: [],
            runtime: "Codex",
            status: "available",
          },
        ],
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "queued",
          },
        ],
        executionPlan: [
          {
            commandIds: ["cmd-test"],
            dependencyStepIds: [],
            id: "plan-tests",
            label: "Tests",
            nextAction: "Run tests.",
            readinessGateIds: [],
            receiptIds: [],
            runtimeId: "runtime-test-runner",
            status: "ready",
            summary: "Run tests.",
          },
        ],
        promptBundles: [
          {
            id: "prompt-bundle-valhalla",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Valhalla",
            policy: "locked",
            receiptIds: [],
            sections: [],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Build operator",
            id: "prompt-profile-valhalla",
            modelFamily: "gpt",
            name: "Valhalla",
            promptBundleRef: "prompt-bundle-valhalla",
            receiptIds: ["receipt-prompt-bundle-valhalla"],
          },
        ],
        swarmRoles: requiredSwarmRoleAssignments,
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.swarmRoles?.map((role) => role.role)).toEqual(
      expect.arrayContaining(["Supervisor", "Test Runner", "Deploy Operator"]),
    );
  });

  it("accepts imported running runtime and swarm state with matching command receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentRuntimes: [
          {
            handoffPolicy: "supervised",
            id: "runtime-test-runner",
            label: "Test runner",
            loopPhaseIds: [],
            ownerRole: "Test Runner",
            receiptIds: ["command-receipt-test-running"],
            runtime: "Codex",
            status: "running",
          },
        ],
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "running",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            executionPlanStepId: "plan-tests",
            id: "command-receipt-test-running",
            policyDecision: "allow",
            requiresApproval: false,
            status: "running",
            summary: "Tests are running.",
          },
        ],
        executionPlan: [
          {
            commandIds: ["cmd-test"],
            dependencyStepIds: [],
            id: "plan-tests",
            label: "Tests",
            nextAction: "Monitor tests.",
            readinessGateIds: [],
            receiptIds: ["command-receipt-test-running"],
            runtimeId: "runtime-test-runner",
            status: "running",
            summary: "Tests are running.",
          },
        ],
        swarmRoles: requiredSwarmRoleAssignments.map((role) =>
          role.role === "Test Runner"
            ? {
                ...role,
                currentFocus: "Running cmd-test.",
                status: "running",
              }
            : role,
        ),
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.agentRuntimes?.[0]).toMatchObject({
      id: "runtime-test-runner",
      receiptIds: ["command-receipt-test-running"],
      status: "running",
    });
  });

  it("rejects imported running runtime and swarm state without command receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentRuntimes: [
          {
            handoffPolicy: "supervised",
            id: "runtime-test-runner",
            label: "Test runner",
            loopPhaseIds: [],
            ownerRole: "Test Runner",
            receiptIds: [],
            runtime: "Codex",
            status: "running",
          },
        ],
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "running",
          },
        ],
        executionPlan: [
          {
            commandIds: ["cmd-test"],
            dependencyStepIds: [],
            id: "plan-tests",
            label: "Tests",
            nextAction: "Monitor tests.",
            readinessGateIds: [],
            receiptIds: [],
            runtimeId: "runtime-test-runner",
            status: "running",
            summary: "Tests are running.",
          },
        ],
        swarmRoles: requiredSwarmRoleAssignments.map((role) =>
          role.role === "Test Runner"
            ? {
                ...role,
                currentFocus: "Running cmd-test without receipt proof.",
                status: "running",
              }
            : role,
        ),
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode agentRuntime runtime-test-runner status running requires a running commandReceipt in receiptIds with assignedRuntimeId runtime-test-runner.",
        "Build Mode swarmRole Test Runner status running requires a running commandReceipt with assignedSwarmRole Test Runner.",
      ]),
    );
  });

  it("requires autonomous-local policy to use an available local-model runtime", () => {
    const localProviderCredential = {
      displayName: "Use local model",
      id: "credential-ref-local-model",
      route: "local-model",
      secretAvailable: false,
      tenantScoped: true,
    };
    const localRuntime = {
      handoffPolicy: "autonomous-local",
      id: "runtime-local-verifier",
      label: "Local verifier",
      loopPhaseIds: ["loop-verify"],
      ownerRole: "Browser Verifier",
      promptProfileId: "prompt-profile-valhalla",
      providerRoute: "local-model",
      receiptIds: [],
      runtime: "ValorIDE",
      status: "available",
    };
    const payload = {
      ...basePayload,
      agentLoop: [
        {
          capabilityIds: ["browser.automation"],
          id: "loop-verify",
          label: "Verify locally",
          receiptIds: [],
          status: "ready",
        },
      ],
      agentRuntimes: [localRuntime],
      autonomyPolicy: {
        allowedCapabilityIds: ["browser.automation"],
        approvalRequiredCapabilityIds: [],
        escalationRefs: [],
        id: "autonomy-policy-local",
        label: "Local autonomy",
        maxConsecutiveCommands: 2,
        maxEstimatedCredits: 4,
        mode: "autonomous-local",
        receiptRequired: true,
        stopConditions: [],
      },
      capabilities: [
        {
          enabled: true,
          id: "browser.automation",
          kind: "browser",
          label: "Browser",
          receiptIds: ["receipt-local-model"],
          requiresApproval: false,
          risk: "medium",
        },
      ],
      providerCredentials: [
        ...basePayload.providerCredentials,
        localProviderCredential,
      ],
      swarmRoles: requiredSwarmRoleAssignments,
    };

    expect(
      coerceBuildModeTaskLaunchPayload(payload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    expect(
      coerceBuildModeTaskLaunchPayload(
        {
          ...payload,
          agentRuntimes: [
            {
              ...localRuntime,
              providerRoute: "bring-your-own-key",
            },
          ],
        },
        {
          now: fixedNow,
          workspaceRoot: "/workspace/valor",
        },
      ).issues,
    ).toEqual(
      expect.arrayContaining([
        "Build Mode agentRuntime runtime-local-verifier with autonomous-local handoffPolicy must use providerRoute local-model.",
        "Build Mode autonomyPolicy mode autonomous-local requires an available agentRuntime with handoffPolicy autonomous-local and providerRoute local-model.",
      ]),
    );
  });

  it("validates local model runtime bindings against credentials, runtime lanes, commands, capabilities, and receipts", () => {
    const localProviderCredential = {
      displayName: "Use local model",
      id: "credential-ref-local-model",
      receiptIds: ["receipt-local-model"],
      route: "local-model",
      secretAvailable: false,
      tenantScoped: false,
    };
    const localRuntime = {
      handoffPolicy: "autonomous-local",
      id: "runtime-local-verifier",
      label: "Local verifier",
      loopPhaseIds: ["loop-verify"],
      ownerRole: "Browser Verifier",
      promptProfileId: "prompt-profile-valhalla",
      providerRoute: "local-model",
      receiptIds: ["receipt-local-model"],
      runtime: "ValorIDE",
      status: "available",
    };
    const payload = {
      ...basePayload,
      agentLoop: [
        {
          capabilityIds: ["browser.automation"],
          id: "loop-verify",
          label: "Verify locally",
          receiptIds: [],
          status: "ready",
        },
      ],
      agentRuntimes: [localRuntime],
      capabilities: [
        {
          enabled: true,
          id: "browser.automation",
          kind: "browser",
          label: "Browser",
          receiptIds: ["receipt-local-model"],
          requiresApproval: false,
          risk: "medium",
        },
      ],
      commands: [
        {
          capabilityId: "browser.automation",
          command: "npm run verify:browser",
          id: "cmd-browser-verify",
          kind: "verify",
          label: "Browser verify",
          requiresApproval: false,
          risk: "medium",
        },
      ],
      localModelRuntimes: [
        {
          capabilityIds: ["browser.automation"],
          endpointRef: "workspace-local:valoride-verifier",
          executionMode: "workspace-local",
          healthCheckCommandId: "cmd-browser-verify",
          id: "local-model-runtime-verifier",
          label: "Local verifier model",
          modelRef: "local://valoride-verifier/default",
          providerCredentialId: "credential-ref-local-model",
          receiptIds: ["receipt-local-model"],
          runtimeId: "runtime-local-verifier",
          status: "available",
        },
      ],
      providerCredentials: [
        ...basePayload.providerCredentials,
        localProviderCredential,
      ],
      receipts: [
        {
          actor: "GrayMatter",
          createdAt: "2026-06-22T12:00:00.000Z",
          id: "receipt-local-model",
          kind: "context",
          status: "succeeded",
          summary: "Local model runtime verified for Build Mode.",
          title: "Local model runtime preflight",
        },
      ],
      swarmRoles: requiredSwarmRoleAssignments,
    };

    expect(
      coerceBuildModeTaskLaunchPayload(payload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    expect(
      coerceBuildModeTaskLaunchPayload(
        {
          ...payload,
          agentRuntimes: [
            {
              ...localRuntime,
              providerRoute: "valkyr-credits",
            },
          ],
          localModelRuntimes: [
            {
              ...payload.localModelRuntimes[0],
              capabilityIds: ["browser.automation", "missing.capability"],
              healthCheckCommandId: "cmd-missing",
              providerCredentialId: "credential-ref-user-key",
              receiptIds: [],
            },
          ],
        },
        {
          now: fixedNow,
          workspaceRoot: "/workspace/valor",
        },
      ).issues,
    ).toEqual(
      expect.arrayContaining([
        "Build Mode localModelRuntime local-model-runtime-verifier runtime runtime-local-verifier must use providerRoute local-model.",
        "Build Mode localModelRuntime local-model-runtime-verifier providerCredential credential-ref-user-key must use route local-model.",
        "Build Mode localModelRuntime local-model-runtime-verifier references missing capability missing.capability.",
        "Build Mode localModelRuntime local-model-runtime-verifier references missing healthCheckCommand cmd-missing.",
        "Build Mode localModelRuntime local-model-runtime-verifier requires receipt proof.",
      ]),
    );
  });

  it("rejects launches with missing or unsupported swarm role wiring", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentLoop: [
          {
            capabilityIds: ["terminal.execute"],
            id: "loop-tests",
            label: "Run tests",
            receiptIds: [],
            status: "ready",
          },
        ],
        agentRuntimes: [
          {
            handoffPolicy: "operator-approved",
            id: "runtime-test-runner",
            label: "Test runner",
            loopPhaseIds: ["loop-tests"],
            ownerRole: "Test Runner",
            promptProfileId: "prompt-profile-valhalla",
            providerRoute: "bring-your-own-key",
            receiptIds: [],
            runtime: "Codex",
            status: "available",
          },
          {
            handoffPolicy: "operator-approved",
            id: "runtime-unsupported",
            label: "Unsupported runtime",
            loopPhaseIds: ["loop-tests"],
            ownerRole: "Unsupported Operator",
            promptProfileId: "prompt-profile-valhalla",
            providerRoute: "bring-your-own-key",
            receiptIds: [],
            runtime: "Codex",
            status: "available",
          },
        ],
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Deploy Operator",
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "queued",
          },
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Mystery Role",
            capabilityId: "terminal.execute",
            command: "npm run lint",
            executionPlanStepId: "plan-tests",
            id: "cmd-lint",
            kind: "test",
            label: "Run lint",
            requiresApproval: false,
            status: "queued",
          },
        ],
        executionPlan: [
          {
            commandIds: ["cmd-test", "cmd-lint"],
            dependencyStepIds: [],
            id: "plan-tests",
            label: "Tests",
            nextAction: "Run tests.",
            readinessGateIds: [],
            receiptIds: [],
            runtimeId: "runtime-test-runner",
            status: "ready",
            summary: "Run tests.",
          },
        ],
        promptBundles: [
          {
            id: "prompt-bundle-valhalla",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Valhalla",
            policy: "locked",
            receiptIds: [],
            sections: [],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Build operator",
            id: "prompt-profile-valhalla",
            modelFamily: "gpt",
            name: "Valhalla",
            promptBundleRef: "prompt-bundle-valhalla",
            receiptIds: ["receipt-prompt-bundle-valhalla"],
          },
        ],
        swarmRoles: requiredSwarmRoleAssignments.filter(
          (assignment) =>
            assignment.role !== "Deploy Operator" &&
            assignment.role !== "Test Runner",
        ),
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode swarmRoles missing required role Test Runner.",
        "Build Mode swarmRoles missing required role Deploy Operator.",
        "Build Mode agentRuntime runtime-test-runner references missing swarmRole Test Runner.",
        "Build Mode agentRuntime runtime-unsupported has unsupported ownerRole.",
        "Build Mode command cmd-test references missing swarmRole Deploy Operator.",
        "Build Mode command cmd-lint has unsupported assignedSwarmRole.",
      ]),
    );
  });

  it("normalizes scheduled automation bindings onto the ValkyrAI cron scheduler", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        scheduledAutomations: [
          {
            approvalRequired: true,
            id: "automation-nightly-check",
            label: "Nightly smoke check",
            receiptIds: [],
            schedule: "0 7 * * *",
            status: "draft",
            workflowRef: "workflow:nightly-smoke",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.scheduledAutomations).toEqual([
      expect.objectContaining({
        id: "automation-nightly-check",
        scheduler: "valkyrai-cron",
      }),
    ]);
  });

  it("accepts prompt bundle receipt proof across scheduled automations and command receipts", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:30.000Z",
              reason: "Approved ValkyrAI cron workflow schedule.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "automation.schedule",
            commandId: "cmd-automation-nightly-check",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "command-receipt-automation-nightly-check",
            policyDecision: "approval-required",
            promptContext: {
              promptBundleId: "prompt-bundle-valhalla",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: ["receipt-prompt-bundle-valhalla"],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla",
            },
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Registered the cron workflow.",
          },
        ],
        commands: [
          {
            assignedSwarmRole: "Workflow Engineer",
            capabilityId: "automation.schedule",
            command:
              "schedule:0 7 * * * workflow:workflow:nightly-smoke command:cmd-smoke",
            id: "cmd-automation-nightly-check",
            kind: "automation",
            label: "Nightly smoke check",
            requiresApproval: true,
            status: "queued",
          },
        ],
        capabilities: [
          {
            enabled: true,
            id: "automation.schedule",
            kind: "automation",
            label: "Automation schedule",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-automation-nightly-check",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "artifact-automation-nightly-check",
            kind: "workflow_receipt",
            metadata: {
              schedule: "0 7 * * *",
              scheduleId: "automation-nightly-check",
              scheduler: "valkyrai-cron",
              schedulerSource: "valkyrai-cron-workflow-launcher",
              workflowRef: "workflow:nightly-smoke",
            },
            receiptId: "command-receipt-automation-nightly-check",
            title: "Automation schedule proof",
            uri: "valkyrai://vaiworkflow/nightly-smoke/schedule",
          },
        ],
        promptBundles: [
          {
            id: "prompt-bundle-valhalla",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Valhalla",
            policy: "locked",
            receiptIds: ["receipt-prompt-bundle-valhalla"],
            sections: [
              {
                id: "section-system",
                purpose: "Build Mode operating rules.",
                sourceRef: "graymatter://prompt-bundles/valhalla/system",
                title: "System",
              },
            ],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Build operator",
            id: "prompt-profile-valhalla",
            modelFamily: "gpt",
            name: "Valhalla",
            promptBundleRef: "prompt-bundle-valhalla",
            receiptIds: ["receipt-prompt-bundle-valhalla"],
          },
        ],
        receipts: [
          {
            actor: "GrayMatter",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-prompt-bundle-valhalla",
            kind: "context",
            status: "succeeded",
            summary: "Loaded the Valhalla prompt bundle.",
            title: "Prompt bundle receipt",
          },
        ],
        scheduledAutomations: [
          {
            approvalRequired: true,
            commandRef: "cmd-automation-nightly-check",
            id: "automation-nightly-check",
            label: "Nightly smoke check",
            promptContext: {
              promptBundleId: "prompt-bundle-valhalla",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: ["receipt-prompt-bundle-valhalla"],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla",
            },
            receiptIds: ["command-receipt-automation-nightly-check"],
            schedule: "0 7 * * *",
            scheduler: "valkyrai-cron",
            status: "scheduled",
            workflowRef: "workflow:nightly-smoke",
          },
        ],
        selectedPromptBundleId: "prompt-bundle-valhalla",
        selectedPromptProfileId: "prompt-profile-valhalla",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
	  expect(result.payload?.scheduledAutomations?.[0]).toMatchObject({
	    id: "automation-nightly-check",
	    scheduler: "valkyrai-cron",
	    promptContext: {
	      promptBundleReceiptIds: ["receipt-prompt-bundle-valhalla"],
	    },
	  });
	});

  it("accepts selected prompt profiles with matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        promptBundles: [
          {
            id: "prompt-bundle-valhalla",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Valhalla",
            policy: "locked",
            receiptIds: ["receipt-prompt-profile"],
            sections: [
              {
                id: "section-system",
                purpose: "Build Mode operating rules.",
                sourceRef: "graymatter://prompt-bundles/valhalla/system",
                title: "System",
              },
            ],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Build operator",
            id: "prompt-profile-valhalla",
            modelFamily: "gpt",
            name: "Valhalla",
            promptBundleRef: "prompt-bundle-valhalla",
            receiptIds: ["receipt-prompt-profile"],
          },
        ],
        receipts: [
          {
            actor: "GrayMatter",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-prompt-profile",
            kind: "context",
            status: "approved",
            summary: "Selected prompt profile is loaded from a locked bundle.",
            title: "Prompt profile proof",
          },
        ],
        selectedPromptBundleId: "prompt-bundle-valhalla",
        selectedPromptProfileId: "prompt-profile-valhalla",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.promptProfiles?.[0]).toMatchObject({
      id: "prompt-profile-valhalla",
      receiptIds: ["receipt-prompt-profile"],
    });
  });

  it("rejects selected prompt profiles without matching receipt proof", () => {
    const profilePayload = {
      ...basePayload,
      promptBundles: [
        {
          id: "prompt-bundle-valhalla",
          loadedAt: "2026-06-22T12:00:00.000Z",
          name: "Valhalla",
          policy: "locked",
          receiptIds: ["receipt-prompt-bundle"],
          sections: [
            {
              id: "section-system",
              purpose: "Build Mode operating rules.",
              sourceRef: "graymatter://prompt-bundles/valhalla/system",
              title: "System",
            },
          ],
          source: "Valkyr",
          version: "1.0.0",
        },
      ],
      promptProfiles: [
        {
          description: "Build operator",
          id: "prompt-profile-valhalla",
          modelFamily: "gpt",
          name: "Valhalla",
          promptBundleRef: "prompt-bundle-valhalla",
          receiptIds: [],
        },
      ],
      receipts: [
        {
          actor: "GrayMatter",
          createdAt: "2026-06-22T12:00:00.000Z",
          id: "receipt-prompt-bundle",
          kind: "context",
          status: "approved",
          summary: "Prompt bundle loaded.",
          title: "Prompt bundle proof",
        },
      ],
      selectedPromptBundleId: "prompt-bundle-valhalla",
      selectedPromptProfileId: "prompt-profile-valhalla",
    };

    const result = coerceBuildModeTaskLaunchPayload(profilePayload, {
      now: fixedNow,
      workspaceRoot: "/workspace/valor",
    });

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode selectedPromptProfileId prompt-profile-valhalla requires prompt profile receipt proof.",
      ]),
    );

    const failedResult = coerceBuildModeTaskLaunchPayload(
      {
        ...profilePayload,
        promptProfiles: [
          {
            ...profilePayload.promptProfiles[0],
            receiptIds: ["receipt-prompt-failed"],
          },
        ],
        receipts: [
          ...profilePayload.receipts,
          {
            actor: "GrayMatter",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-prompt-failed",
            kind: "context",
            status: "failed",
            summary: "Prompt profile failed policy review.",
            title: "Failed prompt profile proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(failedResult.payload).toBeUndefined();
    expect(failedResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode selectedPromptProfileId prompt-profile-valhalla has no acceptable prompt profile receipt status.",
      ]),
    );

    const missingResult = coerceBuildModeTaskLaunchPayload(
      {
        ...profilePayload,
        promptProfiles: [
          {
            ...profilePayload.promptProfiles[0],
            receiptIds: ["receipt-prompt-missing"],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(missingResult.payload).toBeUndefined();
    expect(missingResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode selectedPromptProfileId prompt-profile-valhalla references missing receipt receipt-prompt-missing.",
        "Build Mode selectedPromptProfileId prompt-profile-valhalla requires prompt profile receipt status proof.",
      ]),
    );
  });

  it("rejects prompt contexts that omit required prompt bundle receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandReceipts: [
          {
            capabilityId: "automation.schedule",
            commandId: "cmd-automation-nightly-check",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "command-receipt-automation-nightly-check",
            promptContext: {
              promptBundleId: "prompt-bundle-valhalla",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: [],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla",
            },
            status: "queued",
            summary: "Registered the cron workflow.",
          },
        ],
        commands: [
          {
            assignedSwarmRole: "Workflow Engineer",
            capabilityId: "automation.schedule",
            command:
              "schedule:0 7 * * * workflow:workflow:nightly-smoke command:cmd-smoke",
            id: "cmd-automation-nightly-check",
            kind: "automation",
            label: "Nightly smoke check",
            requiresApproval: true,
            status: "queued",
          },
        ],
        promptBundles: [
          {
            id: "prompt-bundle-valhalla",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Valhalla",
            policy: "locked",
            receiptIds: ["receipt-prompt-bundle-valhalla"],
            sections: [],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Build operator",
            id: "prompt-profile-valhalla",
            modelFamily: "gpt",
            name: "Valhalla",
            promptBundleRef: "prompt-bundle-valhalla",
          },
        ],
        scheduledAutomations: [
          {
            approvalRequired: true,
            commandRef: "cmd-automation-nightly-check",
            id: "automation-nightly-check",
            label: "Nightly smoke check",
            promptContext: {
              promptBundleId: "prompt-bundle-valhalla",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: [],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla",
            },
            receiptIds: ["command-receipt-automation-nightly-check"],
            schedule: "0 7 * * *",
            scheduler: "valkyrai-cron",
            status: "draft",
            workflowRef: "workflow:nightly-smoke",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode scheduledAutomation automation-nightly-check promptContext requires prompt bundle receipt proof for prompt-bundle-valhalla.",
        "Build Mode commandReceipt command-receipt-automation-nightly-check promptContext requires prompt bundle receipt proof for prompt-bundle-valhalla.",
      ]),
    );
  });

  it("requires approval metadata on imported approval-required command receipts", () => {
    const approvalPayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "terminal.execute",
          kind: "terminal",
          label: "Terminal",
          requiresApproval: true,
          risk: "high",
        },
      ],
      commands: [
        {
          capabilityId: "terminal.execute",
          command: "valkyr deploy production",
          id: "cmd-deploy",
          kind: "deploy",
          label: "Deploy",
          requiresApproval: true,
          status: "queued",
        },
      ],
      commandReceipts: [
        {
          approval: {
            approved: true,
            approverPrincipalId: "principal-valhalla-operator",
            approverRoles: ["Owner"],
            createdAt: "2026-06-22T12:00:00.000Z",
            reason: "Approved production deploy.",
            threshold: "owner",
          },
          approved: true,
          capabilityId: "terminal.execute",
          commandId: "cmd-deploy",
          createdAt: "2026-06-22T12:01:00.000Z",
          id: "command-receipt-deploy-approved",
          policyDecision: "approval-required",
          requiredApprovalThreshold: "owner",
          requiresApproval: true,
          status: "queued",
          summary: "Deploy queued after owner approval.",
        },
      ],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(approvalPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...approvalPayload,
        commandReceipts: [
          {
            ...approvalPayload.commandReceipts[0],
            approval: undefined,
            id: "command-receipt-deploy-missing-approval",
          },
          {
            ...approvalPayload.commandReceipts[0],
            approval: {
              ...approvalPayload.commandReceipts[0].approval,
              threshold: "operator",
            },
            id: "command-receipt-deploy-weak-approval",
          },
          {
            ...approvalPayload.commandReceipts[0],
            approval: {
              ...approvalPayload.commandReceipts[0].approval,
              approved: false,
            },
            id: "command-receipt-deploy-false-approval",
          },
          {
            ...approvalPayload.commandReceipts[0],
            approval: {
              ...approvalPayload.commandReceipts[0].approval,
              approverRoles: ["BuildOperator"],
            },
            id: "command-receipt-deploy-weak-role",
          },
          {
            ...approvalPayload.commandReceipts[0],
            approval: {
              ...approvalPayload.commandReceipts[0].approval,
              createdAt: "2026-06-22T11:40:00.000Z",
            },
            id: "command-receipt-deploy-stale-approval",
          },
          {
            ...approvalPayload.commandReceipts[0],
            approval: {
              ...approvalPayload.commandReceipts[0].approval,
              createdAt: "2026-06-22T12:02:00.000Z",
            },
            id: "command-receipt-deploy-future-approval",
          },
          {
            ...approvalPayload.commandReceipts[0],
            approval: {
              ...approvalPayload.commandReceipts[0].approval,
              approverPrincipalId: "principal-other-operator",
            },
            id: "command-receipt-deploy-wrong-principal",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-deploy-missing-approval requires approval metadata before leaving approval-required status.",
        "Build Mode commandReceipt command-receipt-deploy-weak-approval approval threshold operator is below required threshold owner.",
        "Build Mode commandReceipt command-receipt-deploy-false-approval approval metadata must have approved true.",
        "Build Mode commandReceipt command-receipt-deploy-weak-role approverRoles do not satisfy required threshold owner.",
        "Build Mode commandReceipt command-receipt-deploy-stale-approval approval is stale and must be renewed.",
        "Build Mode commandReceipt command-receipt-deploy-future-approval approval timestamp is in the future.",
        "Build Mode commandReceipt command-receipt-deploy-wrong-principal approval principal is outside the active scope: principal-other-operator.",
      ]),
    );
  });

  it("rejects imported command receipts that claim allow for approval-gated commands", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "valkyr deploy --environment production",
            id: "cmd-prod-deploy",
            kind: "deploy",
            label: "Production deploy",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-prod-deploy",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-prod-deploy-forged",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Production deploy completed.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-prod-deploy",
            "cmd-prod-deploy",
            "command-receipt-prod-deploy-forged",
            "valkyr deploy --environment production",
          ),
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-prod-deploy-forged policyDecision allow contradicts command policy requiring approval for command cmd-prod-deploy.",
        "Build Mode commandReceipt command-receipt-prod-deploy-forged must declare requiresApproval true for approval-gated command cmd-prod-deploy.",
        "Build Mode commandReceipt command-receipt-prod-deploy-forged requires approval metadata before command cmd-prod-deploy can leave approval-required status.",
      ]),
    );
  });

  it("requires succeeded deploy receipts to prove a draft Valkyr deploy artifact", () => {
    const deployCommandText =
      "valkyr deploy --app digital-product-pro --draft";
    const deployReceipt = {
      approval: {
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        approverRoles: ["Owner"],
        createdAt: "2026-06-22T11:59:00.000Z",
        reason: "Approved draft deploy.",
        threshold: "owner",
      },
      approved: true,
      capabilityId: "terminal.execute",
      commandId: "cmd-draft-deploy",
      createdAt: "2026-06-22T12:00:00.000Z",
      id: "command-receipt-draft-deploy-succeeded",
      policyDecision: "approval-required",
      requiredApprovalThreshold: "owner",
      requiresApproval: true,
      status: "succeeded",
      summary: "Draft deploy completed.",
    };
    const deployArtifact = {
      commandId: "cmd-draft-deploy",
      createdAt: "2026-06-22T12:00:00.000Z",
      id: "artifact-draft-deploy",
      kind: "command_stdout",
      metadata: {
        byteSize: 2048,
        commandHash: createTestSha256(deployCommandText),
        completed: true,
        contentHash:
          "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        deployDraft: true,
        deployEnvironment: "preview",
        deployId: "deploy-draft-dpp-001",
        deployPreviewUrl: "https://preview.valkyr.test/digital-product-pro",
        deployTarget: "digital-product-pro",
        exitCode: 0,
      },
      receiptId: "command-receipt-draft-deploy-succeeded",
      title: "Draft deploy receipt",
      uri: "valoride://build-mode/deployments/draft/digital-product-pro",
    };
    const deployPayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "terminal.execute",
          kind: "terminal",
          label: "Terminal",
          requiresApproval: true,
          risk: "high",
        },
      ],
      commands: [
        {
          capabilityId: "terminal.execute",
          command: deployCommandText,
          id: "cmd-draft-deploy",
          kind: "deploy",
          label: "Draft deploy",
          requiresApproval: true,
          status: "succeeded",
        },
      ],
      commandReceipts: [deployReceipt],
      evidenceArtifacts: [deployArtifact],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(deployPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...deployPayload,
        evidenceArtifacts: [
          {
            ...deployArtifact,
            id: "artifact-production-deploy",
            metadata: {
              ...deployArtifact.metadata,
              deployDraft: false,
            },
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-draft-deploy-succeeded succeeded deploy command cmd-draft-deploy requires command_stdout artifact metadata proving deployDraft true, deployId, deployTarget, deployEnvironment, exitCode 0, sha256 contentHash, and positive byteSize.",
      ]),
    );
  });

  it("rejects imported command receipts that claim success for denied capabilities", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-denied-terminal",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-denied-terminal",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-denied-terminal",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests passed.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-denied-terminal",
            "cmd-denied-terminal",
            "command-receipt-denied-terminal",
          ),
        ],
        toolPermissions: [
          {
            approvalThreshold: "none",
            capabilityId: "terminal.execute",
            decision: "deny",
            id: "permission-deny-terminal",
            label: "Terminal blocked",
            reason: "Terminal execution is disabled for this tenant.",
            receiptRequired: true,
            scopeRefs: ["policy:tenant-deny-terminal"],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-denied-terminal claims command cmd-denied-terminal can continue, but command policy rejects it: Terminal execution is disabled for this tenant..",
      ]),
    );
  });

  it("rejects imported command receipts that claim success before the execution step is runnable", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            executionPlanStepId: "plan-tests",
            id: "command-receipt-test-forged-pending",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests completed before the step was ready.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-test-forged-pending",
            "cmd-test",
            "command-receipt-test-forged-pending",
          ),
        ],
        executionPlan: [
          {
            commandIds: ["cmd-test"],
            dependencyStepIds: [],
            id: "plan-tests",
            label: "Run tests",
            nextAction: "Run tests.",
            readinessGateIds: [],
            receiptIds: [],
            runtimeId: "runtime-test-runner",
            status: "pending",
            summary: "Run tests.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-test-forged-pending claims command cmd-test can continue, but command policy rejects it: Execution plan step is not runnable: Run tests (pending)..",
      ]),
    );
  });

  it("rejects imported command receipts whose identity fields do not match the command", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Workflow",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-identity-proof",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "failed",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            assignedRuntimeId: "runtime-security-auditor",
            assignedSwarmRole: "Security Auditor",
            capabilityId: "workflow.execute",
            commandId: "cmd-identity-proof",
            createdAt: "2026-06-22T12:05:00.000Z",
            executionPlanStepId: "plan-build",
            id: "command-receipt-identity-mismatch",
            policyDecision: "allow",
            requiresApproval: false,
            status: "failed",
            summary: "Tests failed.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-identity-mismatch capabilityId workflow.execute does not match command cmd-identity-proof capabilityId terminal.execute.",
        "Build Mode commandReceipt command-receipt-identity-mismatch assignedRuntimeId runtime-security-auditor does not match command cmd-identity-proof assignedRuntimeId runtime-test-runner.",
        "Build Mode commandReceipt command-receipt-identity-mismatch assignedSwarmRole Security Auditor does not match command cmd-identity-proof assignedSwarmRole Test Runner.",
        "Build Mode commandReceipt command-receipt-identity-mismatch executionPlanStepId plan-build does not match command cmd-identity-proof executionPlanStepId plan-tests.",
      ]),
    );
  });

  it("accepts command receipt scopes that match the launch scope", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-scope-proof",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-scope-proof",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-scope-proof",
            policyDecision: "allow",
            requiresApproval: false,
            scope: {
              principalId: "principal-valhalla-operator",
              roles: ["Owner"],
              tenantId: "tenant-valkyr-demo",
              workspaceRoot: "/workspace/valor/apps/generated",
              policyRefs: [],
            },
            status: "succeeded",
            summary: "Tests passed in launch scope.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-scope-proof",
            "cmd-scope-proof",
            "command-receipt-scope-proof",
          ),
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0].scope).toMatchObject({
      principalId: "principal-valhalla-operator",
      tenantId: "tenant-valkyr-demo",
    });
  });

  it("rejects command receipt scopes outside the launch scope", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-scope-proof",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-scope-proof",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-scope-proof",
            policyDecision: "allow",
            requiresApproval: false,
            scope: {
              principalId: "principal-other",
              roles: ["Owner", "Admin"],
              tenantId: "tenant-other",
              workspaceRoot: "/workspace/valor",
              policyRefs: ["policy:external"],
            },
            status: "succeeded",
            summary: "Tests passed in a different scope.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-scope-proof",
            "cmd-scope-proof",
            "command-receipt-scope-proof",
          ),
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-scope-proof scope tenantId tenant-other does not match launch scope tenant-valkyr-demo.",
        "Build Mode commandReceipt command-receipt-scope-proof scope principalId principal-other does not match launch scope principal-valhalla-operator.",
        "Build Mode commandReceipt command-receipt-scope-proof scope workspaceRoot /workspace/valor is outside launch scope /workspace/valor/apps/generated.",
        "Build Mode commandReceipt command-receipt-scope-proof scope role Admin is outside launch scope.",
        "Build Mode commandReceipt command-receipt-scope-proof scope policyRef policy:external is outside launch scope.",
      ]),
    );
  });

  it("requires imported terminal command status to match the latest command receipt", () => {
    const statusPayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "terminal.execute",
          kind: "terminal",
          label: "Terminal",
          requiresApproval: false,
          risk: "medium",
        },
      ],
      commands: [
        {
          capabilityId: "terminal.execute",
          command: "npm test",
          id: "cmd-test",
          kind: "test",
          label: "Run tests",
          requiresApproval: false,
          status: "succeeded",
        },
      ],
      commandReceipts: [
        {
          approved: true,
          capabilityId: "terminal.execute",
          commandId: "cmd-test",
          createdAt: "2026-06-22T12:00:00.000Z",
          id: "command-receipt-test-failed",
          requiresApproval: false,
          status: "failed",
          summary: "First test run failed.",
        },
        {
          approved: true,
          capabilityId: "terminal.execute",
          commandId: "cmd-test",
          createdAt: "2026-06-22T12:05:00.000Z",
          id: "command-receipt-test-succeeded",
          requiresApproval: false,
          status: "succeeded",
          summary: "Retried test run passed.",
        },
      ],
      evidenceArtifacts: [
        terminalStdoutEvidence(
          "artifact-terminal-test-succeeded",
          "cmd-test",
          "command-receipt-test-succeeded",
        ),
      ],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(statusPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...statusPayload,
        commands: [
          ...statusPayload.commands,
          {
            capabilityId: "terminal.execute",
            command: "npm run build",
            id: "cmd-build",
            kind: "build",
            label: "Run build",
            requiresApproval: false,
            status: "rejected",
          },
        ],
        commandReceipts: [
          {
            ...statusPayload.commandReceipts[0],
            createdAt: "2026-06-22T12:10:00.000Z",
            id: "command-receipt-test-latest-failed",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode command cmd-test status succeeded does not match latest commandReceipt status failed.",
        "Build Mode command cmd-build status rejected requires a matching commandReceipt.",
      ]),
    );
  });

  it("rejects succeeded terminal commands without command stdout proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-test-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Test command claimed success without stdout proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-terminal-test-succeeded",
            kind: "command_stdout",
            metadata: {
              completed: true,
              exitCode: 1,
            },
            receiptId: "command-receipt-test-succeeded",
            title: "Terminal stdout proof",
            uri: "valoride://build-mode/artifacts/terminal-test",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-test-succeeded succeeded terminal.execute requires command_stdout artifact metadata with completed true, exitCode 0, matching commandHash, sha256 contentHash, and positive byteSize proof.",
      ]),
    );
  });

  it("rejects replayed terminal stdout proof with a mismatched command hash", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-test-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Test command claimed success with replayed stdout proof.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-terminal-test-succeeded",
            "cmd-test",
            "command-receipt-test-succeeded",
            "npm run build",
          ),
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-test-succeeded succeeded terminal.execute requires command_stdout artifact metadata with completed true, exitCode 0, matching commandHash, sha256 contentHash, and positive byteSize proof.",
      ]),
    );
  });

  it("requires imported execution-plan terminal states to match receipt and gate proof", () => {
    const planPayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "terminal.execute",
          kind: "terminal",
          label: "Terminal",
          requiresApproval: false,
          risk: "medium",
        },
      ],
      commands: [
        {
          capabilityId: "terminal.execute",
          command: "npm test",
          executionPlanStepId: "plan-tests",
          id: "cmd-test",
          kind: "test",
          label: "Run tests",
          requiresApproval: false,
          status: "succeeded",
        },
      ],
      commandReceipts: [
        {
          approved: true,
          capabilityId: "terminal.execute",
          commandId: "cmd-test",
          createdAt: "2026-06-22T12:05:00.000Z",
          id: "command-receipt-test-succeeded",
          requiresApproval: false,
          status: "succeeded",
          summary: "Tests passed.",
        },
      ],
      evidenceArtifacts: [
        terminalStdoutEvidence(
          "artifact-terminal-test-succeeded",
          "cmd-test",
          "command-receipt-test-succeeded",
        ),
      ],
      readinessGates: [
        {
          blocksRun: true,
          commandIds: ["cmd-test"],
          evidenceArtifactIds: [],
          id: "gate-tests",
          label: "Tests",
          requiredCapabilityIds: ["terminal.execute"],
          requiredReceiptIds: ["command-receipt-test-succeeded"],
          status: "passed",
          summary: "Tests passed.",
        },
      ],
      executionPlan: [
        {
          commandIds: ["cmd-test"],
          dependencyStepIds: [],
          id: "plan-tests",
          label: "Tests",
          nextAction: "Continue.",
          readinessGateIds: ["gate-tests"],
          receiptIds: ["command-receipt-test-succeeded"],
          runtimeId: undefined,
          status: "complete",
          summary: "Tests are complete.",
        },
      ],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(planPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...planPayload,
        commands: [
          {
            ...planPayload.commands[0],
            status: "failed",
          },
          {
            capabilityId: "terminal.execute",
            command: "npm run build",
            executionPlanStepId: "plan-build",
            id: "cmd-build",
            kind: "build",
            label: "Run build",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            ...planPayload.commandReceipts[0],
            id: "command-receipt-test-failed",
            status: "failed",
            summary: "Tests failed.",
          },
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-build",
            createdAt: "2026-06-22T12:06:00.000Z",
            id: "command-receipt-build-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Build passed.",
          },
        ],
        readinessGates: [
          {
            ...planPayload.readinessGates[0],
            requiredReceiptIds: ["command-receipt-test-failed"],
          },
          {
            blocksRun: true,
            commandIds: ["cmd-build"],
            evidenceArtifactIds: [],
            id: "gate-build",
            label: "Build",
            requiredCapabilityIds: ["terminal.execute"],
            requiredReceiptIds: ["command-receipt-build-succeeded"],
            status: "passed",
            summary: "Build passed.",
          },
        ],
        executionPlan: [
          {
            ...planPayload.executionPlan[0],
            status: "complete",
          },
          {
            commandIds: ["cmd-build"],
            dependencyStepIds: [],
            id: "plan-build",
            label: "Build",
            nextAction: "Inspect failure.",
            readinessGateIds: ["gate-build"],
            receiptIds: ["command-receipt-build-succeeded"],
            status: "failed",
            summary: "Build failed.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode executionPlan step plan-tests status complete requires all latest commandReceipts to be succeeded.",
        "Build Mode executionPlan step plan-build status failed requires a failed or rejected latest commandReceipt or failed readiness gate.",
      ]),
    );
  });

  it("rejects complete execution-plan steps with failed or mismatched receiptIds", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
          {
            capabilityId: "terminal.execute",
            command: "npm run build",
            executionPlanStepId: "plan-build",
            id: "cmd-build",
            kind: "build",
            label: "Run build",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:04:00.000Z",
            id: "command-receipt-test-failed",
            requiresApproval: false,
            status: "failed",
            summary: "Tests failed.",
          },
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-test-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests passed.",
          },
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-build",
            createdAt: "2026-06-22T12:06:00.000Z",
            id: "command-receipt-build-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Build passed.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-test-output",
            "cmd-test",
            "command-receipt-test-succeeded",
          ),
          terminalStdoutEvidence(
            "artifact-build-output",
            "cmd-build",
            "command-receipt-build-succeeded",
            "npm run build",
          ),
        ],
        executionPlan: [
          {
            commandIds: ["cmd-test"],
            dependencyStepIds: [],
            id: "plan-tests",
            label: "Tests",
            nextAction: "Continue.",
            readinessGateIds: [],
            receiptIds: [
              "command-receipt-test-failed",
              "command-receipt-build-succeeded",
            ],
            runtimeId: undefined,
            status: "complete",
            summary: "Tests are complete.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode executionPlan step plan-tests receiptId command-receipt-test-failed must reference a succeeded commandReceipt before step can be complete.",
        "Build Mode executionPlan step plan-tests receiptId command-receipt-build-succeeded commandId cmd-build must be listed in commandIds before step can be complete.",
      ]),
    );
  });

  it("requires imported readiness gate terminal states to match latest command receipts", () => {
    const gatePayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "terminal.execute",
          kind: "terminal",
          label: "Terminal",
          requiresApproval: false,
          risk: "medium",
        },
      ],
      commands: [
        {
          capabilityId: "terminal.execute",
          command: "npm test",
          id: "cmd-test",
          kind: "test",
          label: "Run tests",
          requiresApproval: false,
          status: "succeeded",
        },
      ],
      commandReceipts: [
        {
          approved: true,
          capabilityId: "terminal.execute",
          commandId: "cmd-test",
          createdAt: "2026-06-22T12:05:00.000Z",
          id: "command-receipt-test-succeeded",
          requiresApproval: false,
          status: "succeeded",
          summary: "Tests passed.",
        },
      ],
      evidenceArtifacts: [
        terminalStdoutEvidence(
          "artifact-terminal-test-succeeded",
          "cmd-test",
          "command-receipt-test-succeeded",
        ),
      ],
      readinessGates: [
        {
          blocksRun: true,
          commandIds: ["cmd-test"],
          evidenceArtifactIds: [],
          id: "gate-tests",
          label: "Tests",
          requiredCapabilityIds: ["terminal.execute"],
          requiredReceiptIds: ["command-receipt-test-succeeded"],
          status: "passed",
          summary: "Tests passed.",
        },
      ],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(gatePayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...gatePayload,
        commands: [
          {
            ...gatePayload.commands[0],
            status: "failed",
          },
          {
            capabilityId: "terminal.execute",
            command: "npm run build",
            id: "cmd-build",
            kind: "build",
            label: "Run build",
            requiresApproval: false,
            status: "succeeded",
          },
          {
            capabilityId: "terminal.execute",
            command: "npm run deploy",
            id: "cmd-deploy",
            kind: "deploy",
            label: "Deploy",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            ...gatePayload.commandReceipts[0],
            id: "command-receipt-test-failed",
            status: "failed",
            summary: "Tests failed.",
          },
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-build",
            createdAt: "2026-06-22T12:06:00.000Z",
            id: "command-receipt-build-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Build passed.",
          },
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-deploy",
            createdAt: "2026-06-22T12:07:00.000Z",
            id: "command-receipt-deploy-succeeded",
            requiresApproval: true,
            status: "succeeded",
            summary: "Deploy passed.",
          },
        ],
        readinessGates: [
          {
            ...gatePayload.readinessGates[0],
            id: "gate-tests-claimed-passed",
            requiredReceiptIds: ["command-receipt-test-failed"],
            status: "passed",
          },
          {
            blocksRun: true,
            commandIds: ["cmd-build"],
            evidenceArtifactIds: [],
            id: "gate-build-claimed-failed",
            label: "Build",
            requiredCapabilityIds: ["terminal.execute"],
            requiredReceiptIds: ["command-receipt-build-succeeded"],
            status: "failed",
            summary: "Build failed.",
          },
          {
            blocksRun: true,
            commandIds: ["cmd-deploy"],
            evidenceArtifactIds: [],
            id: "gate-deploy-claimed-blocked",
            label: "Deploy",
            requiredCapabilityIds: ["terminal.execute"],
            requiredReceiptIds: ["command-receipt-deploy-succeeded"],
            status: "blocked",
            summary: "Deploy blocked.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode readinessGate gate-tests-claimed-passed status passed requires all latest commandReceipts to be succeeded.",
        "Build Mode readinessGate gate-build-claimed-failed status failed requires a failed or rejected latest commandReceipt.",
        "Build Mode readinessGate gate-deploy-claimed-blocked status blocked requires an approval-required latest commandReceipt.",
      ]),
    );
  });

  it("rejects passed readiness gates with failed receipts or mismatched evidence", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
          {
            capabilityId: "terminal.execute",
            command: "npm run build",
            id: "cmd-build",
            kind: "build",
            label: "Run build",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:04:00.000Z",
            id: "command-receipt-test-failed",
            requiresApproval: false,
            status: "failed",
            summary: "Tests failed.",
          },
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-test-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests passed.",
          },
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-build",
            createdAt: "2026-06-22T12:06:00.000Z",
            id: "command-receipt-build-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Build passed.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-test-output",
            "cmd-test",
            "command-receipt-test-succeeded",
          ),
          terminalStdoutEvidence(
            "artifact-build-output",
            "cmd-build",
            "command-receipt-build-succeeded",
            "npm run build",
          ),
        ],
        readinessGates: [
          {
            blocksRun: true,
            commandIds: ["cmd-test"],
            evidenceArtifactIds: ["artifact-build-output"],
            id: "gate-tests",
            label: "Tests",
            requiredCapabilityIds: ["terminal.execute"],
            requiredReceiptIds: ["command-receipt-test-failed"],
            status: "passed",
            summary: "Tests passed.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode readinessGate gate-tests requiredReceiptId command-receipt-test-failed must reference a succeeded commandReceipt before gate can pass.",
        "Build Mode readinessGate gate-tests evidenceArtifact artifact-build-output receiptId command-receipt-build-succeeded must be listed in requiredReceiptIds before gate can pass.",
        "Build Mode readinessGate gate-tests evidenceArtifact artifact-build-output commandId cmd-build must be listed in commandIds before gate can pass.",
      ]),
    );
  });

  it("requires imported safe edit plan states to match latest command receipts", () => {
    const safeEditPayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "psr.edit",
          kind: "psr",
          label: "Precision edit",
          requiresApproval: true,
          risk: "medium",
        },
        rollbackReadyCheckpointCapability,
      ],
      commands: [
        rollbackReadyCheckpointCommand,
        {
          capabilityId: "psr.edit",
          command: 'psr:src/App.tsx replace:"old" with:"new"',
          id: "cmd-safe-edit",
          kind: "edit",
          label: "Apply safe edit",
          requiresApproval: true,
          status: "succeeded",
        },
      ],
      commandReceipts: [
        {
          approval: {
            approved: true,
            approverPrincipalId: "principal-valhalla-operator",
            approverRoles: ["Owner"],
            createdAt: "2026-06-22T11:59:00.000Z",
            reason: "Approved safe edit.",
            threshold: "operator",
          },
          approved: true,
          capabilityId: "psr.edit",
          commandId: "cmd-safe-edit",
          createdAt: "2026-06-22T12:05:00.000Z",
          id: "command-receipt-safe-edit-succeeded",
          policyDecision: "approval-required",
          requiredApprovalThreshold: "operator",
          requiresApproval: true,
          status: "succeeded",
          summary: "Safe edit applied.",
        },
        rollbackReadyCheckpointReceipt,
      ],
      evidenceArtifacts: [
        rollbackReadyCheckpointArtifact,
        {
          commandId: "cmd-safe-edit",
          createdAt: "2026-06-22T12:05:00.000Z",
          id: "artifact-safe-edit-file-write",
          kind: "file_write",
          metadata: {
            editsApplied: 1,
            editsRequested: 1,
            filePath: "src/App.tsx",
            postHash: "post-hash-safe-edit",
          },
          receiptId: "command-receipt-safe-edit-succeeded",
          title: "Safe edit file write proof",
          uri: "valoride://build-mode/artifacts/safe-edit-file-write",
        },
      ],
      safeEditPlans: [
        {
          commandId: "cmd-safe-edit",
          id: "safe-edit-plan-app",
          label: "Apply safe edit",
          protectedPaths: [],
          receiptIds: ["command-receipt-safe-edit-succeeded"],
          status: "applied",
          summary: "Safe edit applied.",
          targetPaths: ["src/App.tsx"],
          tool: "psr.edit",
        },
      ],
      checkpoints: [rollbackReadyCheckpoint],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(safeEditPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const missingCheckpointResult = coerceBuildModeTaskLaunchPayload(
      {
        ...safeEditPayload,
        checkpoints: [],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(missingCheckpointResult.payload).toBeUndefined();
    expect(missingCheckpointResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode safeEditPlan safe-edit-plan-app status applied requires a rollback-ready checkpoint with hash and receipt proof before mutable code changes.",
      ]),
    );

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...safeEditPayload,
        commands: [
          {
            ...safeEditPayload.commands[0],
            status: "failed",
          },
          {
            capabilityId: "psr.edit",
            command: 'psr:src/Header.tsx replace:"old" with:"new"',
            id: "cmd-safe-edit-blocked",
            kind: "edit",
            label: "Apply blocked edit",
            requiresApproval: true,
            status: "succeeded",
          },
          {
            capabilityId: "psr.edit",
            command: 'psr:src/Footer.tsx replace:"old" with:"new"',
            id: "cmd-safe-edit-approval",
            kind: "edit",
            label: "Apply approval edit",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            ...safeEditPayload.commandReceipts[0],
            id: "command-receipt-safe-edit-failed",
            status: "failed",
            summary: "Safe edit failed.",
          },
          {
            approved: true,
            capabilityId: "psr.edit",
            commandId: "cmd-safe-edit-blocked",
            createdAt: "2026-06-22T12:06:00.000Z",
            id: "command-receipt-safe-edit-blocked-succeeded",
            requiresApproval: true,
            status: "succeeded",
            summary: "Blocked edit actually succeeded.",
          },
          {
            approved: true,
            capabilityId: "psr.edit",
            commandId: "cmd-safe-edit-approval",
            createdAt: "2026-06-22T12:07:00.000Z",
            id: "command-receipt-safe-edit-approval-succeeded",
            requiresApproval: true,
            status: "succeeded",
            summary: "Approval edit actually succeeded.",
          },
        ],
        safeEditPlans: [
          safeEditPayload.safeEditPlans[0],
          {
            commandId: "cmd-safe-edit-blocked",
            id: "safe-edit-plan-blocked",
            label: "Apply blocked edit",
            protectedPaths: [],
            receiptIds: ["command-receipt-safe-edit-blocked-succeeded"],
            status: "blocked",
            summary: "Blocked edit.",
            targetPaths: ["src/Header.tsx"],
            tool: "psr.edit",
          },
          {
            commandId: "cmd-safe-edit-approval",
            id: "safe-edit-plan-approval",
            label: "Apply approval edit",
            protectedPaths: [],
            receiptIds: ["command-receipt-safe-edit-approval-succeeded"],
            status: "approval-required",
            summary: "Approval needed.",
            targetPaths: ["src/Footer.tsx"],
            tool: "psr.edit",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode safeEditPlan safe-edit-plan-app status applied requires latest commandReceipt to be succeeded.",
        "Build Mode safeEditPlan safe-edit-plan-blocked status blocked requires latest commandReceipt to be failed or rejected.",
        "Build Mode safeEditPlan safe-edit-plan-approval status approval-required requires latest commandReceipt to be approval-required.",
      ]),
    );
  });

  it("rejects safe edit terminal states without named latest receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "psr.edit",
            kind: "psr",
            label: "Precision edit",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "psr.edit",
            command: 'psr:src/App.tsx replace:"old" with:"new"',
            id: "cmd-safe-edit",
            kind: "edit",
            label: "Apply safe edit",
            requiresApproval: true,
            status: "succeeded",
          },
          {
            capabilityId: "psr.edit",
            command: 'psr:src/Header.tsx replace:"old" with:"new"',
            id: "cmd-other-edit",
            kind: "edit",
            label: "Apply other edit",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "psr.edit",
            commandId: "cmd-safe-edit",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-safe-edit-succeeded",
            requiresApproval: true,
            status: "succeeded",
            summary: "Safe edit applied.",
          },
          {
            approved: true,
            capabilityId: "psr.edit",
            commandId: "cmd-other-edit",
            createdAt: "2026-06-22T12:04:00.000Z",
            id: "command-receipt-other-edit-succeeded",
            requiresApproval: true,
            status: "succeeded",
            summary: "Other edit applied.",
          },
        ],
        safeEditPlans: [
          {
            commandId: "cmd-safe-edit",
            id: "safe-edit-plan-no-receipt",
            label: "Apply safe edit without named proof",
            protectedPaths: [],
            receiptIds: [],
            status: "applied",
            summary: "Missing receipt link.",
            targetPaths: ["src/App.tsx"],
            tool: "psr.edit",
          },
          {
            commandId: "cmd-safe-edit",
            id: "safe-edit-plan-wrong-receipt",
            label: "Apply safe edit with wrong proof",
            protectedPaths: [],
            receiptIds: ["command-receipt-other-edit-succeeded"],
            status: "applied",
            summary: "Wrong receipt link.",
            targetPaths: ["src/App.tsx"],
            tool: "psr.edit",
          },
          {
            commandId: "cmd-safe-edit",
            id: "safe-edit-plan-missing-receipt",
            label: "Apply safe edit with missing proof",
            protectedPaths: [],
            receiptIds: ["command-receipt-missing"],
            status: "applied",
            summary: "Missing receipt object.",
            targetPaths: ["src/App.tsx"],
            tool: "psr.edit",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode safeEditPlan safe-edit-plan-no-receipt status applied requires receiptIds to include latest commandReceipt command-receipt-safe-edit-succeeded.",
        "Build Mode safeEditPlan safe-edit-plan-wrong-receipt status applied requires receiptIds to include latest commandReceipt command-receipt-safe-edit-succeeded.",
        "Build Mode safeEditPlan safe-edit-plan-wrong-receipt receiptId command-receipt-other-edit-succeeded commandId cmd-other-edit must match safe edit command cmd-safe-edit.",
        "Build Mode safeEditPlan safe-edit-plan-missing-receipt status applied requires receiptIds to include latest commandReceipt command-receipt-safe-edit-succeeded.",
        "Build Mode safeEditPlan safe-edit-plan-missing-receipt receiptId command-receipt-missing references missing commandReceipt.",
      ]),
    );
  });

  it("rejects succeeded safe edits without file write proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "psr.edit",
            kind: "psr",
            label: "Precision edit",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "psr.edit",
            command: 'psr:src/App.tsx replace:"old" with:"new"',
            id: "cmd-safe-edit",
            kind: "edit",
            label: "Apply safe edit",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:04:00.000Z",
              reason: "Approved safe edit.",
              threshold: "operator",
            },
            approved: true,
            capabilityId: "psr.edit",
            commandId: "cmd-safe-edit",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-safe-edit-succeeded",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "operator",
            requiresApproval: true,
            status: "succeeded",
            summary: "Safe edit claimed success without write proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-safe-edit",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-safe-edit-file-write",
            kind: "file_write",
            metadata: {
              editsApplied: 1,
              editsRequested: 1,
              filePath: "src/App.tsx",
            },
            receiptId: "command-receipt-safe-edit-succeeded",
            title: "Safe edit file write proof",
            uri: "valoride://build-mode/artifacts/safe-edit-file-write",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-safe-edit-succeeded succeeded psr.edit requires file_write artifact metadata with filePath, postHash, editsApplied, and editsRequested proof.",
      ]),
    );
  });

  it("rejects imported file write proof for generated ThorAPI artifacts", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          artifacts: [
            {
              kind: "editable",
              path: "src/App.tsx",
            },
            {
              kind: "generated",
              path: "apps/shop/thorapi/redux/ProductService.tsx",
            },
          ],
        },
        capabilities: [
          {
            enabled: true,
            id: "psr.edit",
            kind: "psr",
            label: "Precision edit",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "psr.edit",
            command: 'psr:src/App.tsx replace:"old" with:"new"',
            id: "cmd-safe-edit",
            kind: "edit",
            label: "Apply safe edit",
            requiresApproval: true,
            status: "succeeded",
            targetPaths: ["src/App.tsx"],
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:04:00.000Z",
              reason: "Approved safe edit.",
              threshold: "operator",
            },
            approved: true,
            capabilityId: "psr.edit",
            commandId: "cmd-safe-edit",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-safe-edit-generated-write",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "operator",
            requiresApproval: true,
            status: "succeeded",
            summary: "Safe edit claimed generated output write success.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-safe-edit",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-generated-file-write",
            kind: "file_write",
            metadata: {
              editsApplied: 1,
              editsRequested: 1,
              filePath: "apps/shop/thorapi/redux/ProductService.tsx",
              postHash: "post-hash-generated-edit",
            },
            receiptId: "command-receipt-safe-edit-generated-write",
            title: "Generated file write proof",
            uri: "valoride://build-mode/artifacts/generated-file-write",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-safe-edit-generated-write succeeded psr.edit cannot claim file_write proof for generated artifact apps/shop/thorapi/redux/ProductService.tsx; update OpenAPI/VAIX inputs and regenerate instead.",
        "Build Mode commandReceipt command-receipt-safe-edit-generated-write succeeded psr.edit requires file_write artifact metadata with filePath, postHash, editsApplied, and editsRequested proof.",
      ]),
    );
  });

  it("accepts succeeded file inspections with command stdout proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "filesystem.read",
            kind: "filesystem",
            label: "Read project files",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "filesystem.read",
            command: "file-read:apps/shop/app-bundle.json",
            id: "cmd-file-read",
            kind: "inspect",
            label: "Inspect app bundle",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "filesystem.read",
            commandId: "cmd-file-read",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-file-read",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "App bundle inspected.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-file-read",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-file-read",
            kind: "command_stdout",
            metadata: {
              byteSize: 512,
              contentHash:
                "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              filePath: "apps/shop/app-bundle.json",
              lineCount: 24,
              truncated: false,
            },
            receiptId: "command-receipt-file-read",
            title: "File read proof",
            uri: "valoride://build-mode/artifacts/file-read",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]).toMatchObject({
      capabilityId: "filesystem.read",
      status: "succeeded",
    });
  });

  it("rejects succeeded file inspections without command stdout proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "filesystem.read",
            kind: "filesystem",
            label: "Read project files",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "filesystem.read",
            command: "file-read:apps/shop/app-bundle.json",
            id: "cmd-file-read",
            kind: "inspect",
            label: "Inspect app bundle",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "filesystem.read",
            commandId: "cmd-file-read",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-file-read",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "App bundle inspected without proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-file-read",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-file-read",
            kind: "command_stdout",
            metadata: {
              byteSize: 512,
              filePath: "apps/shop/app-bundle.json",
            },
            receiptId: "command-receipt-file-read",
            title: "File read proof",
            uri: "valoride://build-mode/artifacts/file-read",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-file-read succeeded filesystem.read requires command_stdout artifact metadata with filePath, contentHash, and byteSize proof.",
      ]),
    );
  });

  it("requires imported checkpoint terminal states to match command receipts", () => {
    const checkpointPayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "checkpoint.manage",
          kind: "checkpoint",
          label: "Checkpoint manager",
          requiresApproval: false,
          risk: "medium",
        },
      ],
      commands: [
        {
          capabilityId: "checkpoint.manage",
          command: "checkpoint:create checkpoint-pre-edit",
          id: "cmd-checkpoint-create",
          kind: "checkpoint",
          label: "Create checkpoint",
          requiresApproval: false,
          status: "succeeded",
        },
      ],
      commandReceipts: [
        {
          approval: {
            approved: true,
            approverPrincipalId: "principal-valhalla-operator",
            approverRoles: ["Owner", "BuildOperator"],
            createdAt: "2026-06-22T11:59:00.000Z",
            reason: "Approved checkpoint creation.",
            threshold: "operator",
          },
          approved: true,
          capabilityId: "checkpoint.manage",
          commandId: "cmd-checkpoint-create",
          createdAt: "2026-06-22T12:05:00.000Z",
          id: "command-receipt-checkpoint-created",
          policyDecision: "approval-required",
          requiresApproval: true,
          status: "succeeded",
          summary: "Checkpoint created.",
        },
      ],
      evidenceArtifacts: [
        {
          commandId: "cmd-checkpoint-create",
          createdAt: "2026-06-22T12:05:00.000Z",
          id: "artifact-checkpoint-created",
          kind: "checkpoint",
          metadata: {
            checkpointAction: "create",
            checkpointHash: "checkpoint-hash-pre-edit",
            checkpointRef: "checkpoint-pre-edit",
            workspaceRoot: "/workspace/valor",
          },
          receiptId: "command-receipt-checkpoint-created",
          title: "Checkpoint receipt",
          uri: "valoride://build-mode/artifacts/checkpoint-created",
        },
      ],
      checkpoints: [
        {
          commandId: "cmd-checkpoint-create",
          id: "checkpoint-pre-edit",
          label: "Pre-edit checkpoint",
          receiptIds: ["command-receipt-checkpoint-created"],
          status: "created",
          summary: "Checkpoint created.",
        },
        {
          commandId: "cmd-checkpoint-create",
          hash: "checkpoint-hash-pre-edit",
          id: "checkpoint-pre-edit-rollback-ready",
          label: "Pre-edit checkpoint rollback-ready",
          receiptIds: ["command-receipt-checkpoint-created"],
          status: "rollback-ready",
          summary: "Checkpoint has rollback proof.",
        },
      ],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(checkpointPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...checkpointPayload,
        commands: [
          {
            ...checkpointPayload.commands[0],
            id: "cmd-checkpoint-create-failed",
            status: "failed",
          },
          {
            capabilityId: "checkpoint.manage",
            command: "checkpoint:rollback checkpoint-restored",
            id: "cmd-checkpoint-rollback-failed",
            kind: "checkpoint",
            label: "Rollback checkpoint",
            requiresApproval: false,
            status: "failed",
          },
          {
            capabilityId: "checkpoint.manage",
            command: "checkpoint:create checkpoint-failed",
            id: "cmd-checkpoint-create-succeeded",
            kind: "checkpoint",
            label: "Create checkpoint",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            ...checkpointPayload.commandReceipts[0],
            commandId: "cmd-checkpoint-create-failed",
            id: "command-receipt-checkpoint-create-failed",
            status: "failed",
            summary: "Checkpoint create failed.",
          },
          {
            approved: true,
            capabilityId: "checkpoint.manage",
            commandId: "cmd-checkpoint-rollback-failed",
            createdAt: "2026-06-22T12:06:00.000Z",
            id: "command-receipt-checkpoint-rollback-failed",
            requiresApproval: false,
            status: "failed",
            summary: "Checkpoint rollback failed.",
          },
          {
            approved: true,
            capabilityId: "checkpoint.manage",
            commandId: "cmd-checkpoint-create-succeeded",
            createdAt: "2026-06-22T12:07:00.000Z",
            id: "command-receipt-checkpoint-create-succeeded",
            requiresApproval: false,
            status: "succeeded",
            summary: "Checkpoint create succeeded.",
          },
        ],
        checkpoints: [
          {
            commandId: "cmd-checkpoint-create-failed",
            id: "checkpoint-claimed-created",
            label: "Claimed created checkpoint",
            receiptIds: ["command-receipt-checkpoint-create-failed"],
            status: "created",
            summary: "Claimed created.",
          },
          {
            id: "checkpoint-claimed-restored",
            label: "Claimed restored checkpoint",
            receiptIds: ["command-receipt-checkpoint-rollback-failed"],
            rollbackCommandId: "cmd-checkpoint-rollback-failed",
            status: "restored",
            summary: "Claimed restored.",
          },
          {
            commandId: "cmd-checkpoint-create-succeeded",
            id: "checkpoint-claimed-failed",
            label: "Claimed failed checkpoint",
            receiptIds: ["command-receipt-checkpoint-create-succeeded"],
            status: "failed",
            summary: "Claimed failed.",
          },
          {
            commandId: "cmd-checkpoint-create-succeeded",
            id: "checkpoint-claimed-rollback-ready",
            label: "Claimed rollback-ready checkpoint",
            receiptIds: ["command-receipt-checkpoint-create-succeeded"],
            status: "rollback-ready",
            summary: "Claimed rollback-ready without hash.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode checkpoint checkpoint-claimed-created status created requires latest create commandReceipt to be succeeded.",
        "Build Mode checkpoint checkpoint-claimed-restored status restored requires latest rollback commandReceipt to be succeeded.",
        "Build Mode checkpoint checkpoint-claimed-failed status failed requires a failed or rejected create or rollback commandReceipt.",
        "Build Mode checkpoint checkpoint-claimed-rollback-ready status rollback-ready requires a checkpoint hash.",
      ]),
    );
  });

  it("rejects checkpoint terminal states without named latest receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "checkpoint.manage",
            kind: "checkpoint",
            label: "Checkpoint manager",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "checkpoint.manage",
            command: "checkpoint:create checkpoint-pre-edit",
            id: "cmd-checkpoint-create",
            kind: "checkpoint",
            label: "Create checkpoint",
            requiresApproval: false,
            status: "succeeded",
          },
          {
            capabilityId: "checkpoint.manage",
            command: "checkpoint:create checkpoint-other",
            id: "cmd-checkpoint-other",
            kind: "checkpoint",
            label: "Create other checkpoint",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "checkpoint.manage",
            commandId: "cmd-checkpoint-create",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-checkpoint-created",
            requiresApproval: false,
            status: "succeeded",
            summary: "Checkpoint created.",
          },
          {
            approved: true,
            capabilityId: "checkpoint.manage",
            commandId: "cmd-checkpoint-other",
            createdAt: "2026-06-22T12:04:00.000Z",
            id: "command-receipt-checkpoint-other",
            requiresApproval: false,
            status: "succeeded",
            summary: "Other checkpoint created.",
          },
        ],
        checkpoints: [
          {
            commandId: "cmd-checkpoint-create",
            hash: "checkpoint-hash-pre-edit",
            id: "checkpoint-no-receipt",
            label: "Checkpoint without named proof",
            receiptIds: [],
            status: "rollback-ready",
            summary: "Missing receipt link.",
          },
          {
            commandId: "cmd-checkpoint-create",
            hash: "checkpoint-hash-pre-edit",
            id: "checkpoint-wrong-receipt",
            label: "Checkpoint with wrong proof",
            receiptIds: ["command-receipt-checkpoint-other"],
            status: "rollback-ready",
            summary: "Wrong receipt link.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode checkpoint checkpoint-no-receipt status rollback-ready requires receiptIds to include latest commandReceipt command-receipt-checkpoint-created.",
        "Build Mode checkpoint checkpoint-wrong-receipt status rollback-ready requires receiptIds to include latest commandReceipt command-receipt-checkpoint-created.",
        "Build Mode checkpoint checkpoint-wrong-receipt receiptId command-receipt-checkpoint-other commandId cmd-checkpoint-other must match checkpoint command cmd-checkpoint-create.",
      ]),
    );
  });

  it("rejects succeeded checkpoint receipts without checkpoint artifact proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "checkpoint.manage",
            kind: "checkpoint",
            label: "Checkpoint manager",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "checkpoint.manage",
            command: "checkpoint:create checkpoint-pre-edit",
            id: "cmd-checkpoint-create",
            kind: "checkpoint",
            label: "Create checkpoint",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "checkpoint.manage",
            commandId: "cmd-checkpoint-create",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-checkpoint-created",
            requiresApproval: false,
            status: "succeeded",
            summary: "Checkpoint created without artifact proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-checkpoint-create",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-checkpoint-created",
            kind: "checkpoint",
            metadata: {
              checkpointAction: "create",
              checkpointRef: "checkpoint-pre-edit",
            },
            receiptId: "command-receipt-checkpoint-created",
            title: "Checkpoint receipt",
            uri: "valoride://build-mode/artifacts/checkpoint-created",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-checkpoint-created succeeded checkpoint.manage requires checkpoint artifact metadata with checkpointAction, checkpointRef, and checkpointHash proof.",
      ]),
    );
  });

  it("rejects prompt bundle proof gaps in scheduled automations and receipts", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandReceipts: [
          {
            capabilityId: "automation.schedule",
            commandId: "cmd-automation-nightly-check",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "command-receipt-automation-nightly-check",
            promptContext: {
              promptBundleId: "prompt-bundle-valhalla",
              promptBundlePolicy: "editable",
              promptBundleReceiptIds: ["receipt-prompt-outside"],
              promptBundleVersion: "9.9.9",
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla",
            },
            status: "succeeded",
            summary: "Registered the cron workflow.",
          },
        ],
        commands: [
          {
            assignedSwarmRole: "Workflow Engineer",
            capabilityId: "automation.schedule",
            command:
              "schedule:0 7 * * * workflow:workflow:nightly-smoke command:cmd-smoke",
            id: "cmd-automation-nightly-check",
            kind: "automation",
            label: "Nightly smoke check",
            requiresApproval: true,
            status: "queued",
          },
        ],
        capabilities: [
          {
            enabled: true,
            id: "automation.schedule",
            kind: "automation",
            label: "Automation schedule",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        promptBundles: [
          {
            id: "prompt-bundle-valhalla",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Valhalla",
            policy: "locked",
            receiptIds: [],
            sections: [
              {
                id: "section-system",
                title: "System",
              },
            ],
            source: "Valkyr",
            version: "1.0.0",
          },
          {
            id: "prompt-bundle-other",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Other",
            policy: "review-required",
            receiptIds: ["receipt-prompt-other"],
            sections: [],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Build operator",
            id: "prompt-profile-valhalla",
            modelFamily: "gpt",
            name: "Valhalla",
            promptBundleRef: "prompt-bundle-other",
          },
        ],
        receipts: [],
        scheduledAutomations: [
          {
            approvalRequired: true,
            commandRef: "cmd-automation-nightly-check",
            id: "automation-nightly-check",
            label: "Nightly smoke check",
            promptContext: {
              promptBundleId: "prompt-bundle-valhalla",
              promptBundlePolicy: "editable",
              promptBundleReceiptIds: ["receipt-prompt-outside"],
              promptBundleVersion: "9.9.9",
              promptProfileId: "prompt-profile-valhalla",
              promptProfileName: "Valhalla",
            },
            receiptIds: ["command-receipt-automation-nightly-check"],
            schedule: "0 7 * * *",
            scheduler: "valkyrai-cron",
            status: "scheduled",
            workflowRef: "workflow:nightly-smoke",
          },
        ],
        selectedPromptBundleId: "prompt-bundle-valhalla",
        selectedPromptProfileId: "prompt-profile-valhalla",
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode selectedPromptProfileId prompt-profile-valhalla points to promptBundle prompt-bundle-other, but selectedPromptBundleId is prompt-bundle-valhalla.",
        "Build Mode selectedPromptBundleId prompt-bundle-valhalla requires prompt bundle receipt proof.",
        "Build Mode promptBundle prompt-bundle-valhalla section section-system requires a sourceRef.",
        "Build Mode promptBundle prompt-bundle-valhalla section section-system requires a purpose.",
        "Build Mode scheduledAutomation automation-nightly-check promptContext has promptBundleVersion 9.9.9, expected 1.0.0.",
        "Build Mode scheduledAutomation automation-nightly-check promptContext has promptBundlePolicy editable, expected locked.",
        "Build Mode scheduledAutomation automation-nightly-check promptContext references receipt receipt-prompt-outside outside promptBundle prompt-bundle-valhalla.",
        "Build Mode commandReceipt command-receipt-automation-nightly-check promptContext has promptBundleVersion 9.9.9, expected 1.0.0.",
        "Build Mode commandReceipt command-receipt-automation-nightly-check promptContext has promptBundlePolicy editable, expected locked.",
        "Build Mode commandReceipt command-receipt-automation-nightly-check promptContext references receipt receipt-prompt-outside outside promptBundle prompt-bundle-valhalla.",
      ]),
    );
  });

  it("accepts command receipt GrayMatter proof matching the launch context pack", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-graymatter-proof",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-graymatter-proof",
            createdAt: "2026-06-22T12:05:00.000Z",
            grayMatterContextProof: {
              answerPolicy: "answer-confidently",
              contextPackId: "gm-context-sagechat-001",
              invariantPreflightStatus: "passed",
              preflightReceiptId: "gm-preflight-001",
              retrievalReceiptIds: ["retrieval-receipt-sagechat-001"],
              retrievalStatus: "ready",
              retrievalTraceId: "gm-trace-001",
            },
            id: "command-receipt-graymatter-proof",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests passed with GrayMatter context proof.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-graymatter-proof",
            "cmd-graymatter-proof",
            "command-receipt-graymatter-proof",
          ),
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0].grayMatterContextProof).toMatchObject(
      {
        contextPackId: "gm-context-sagechat-001",
        retrievalReceiptIds: ["retrieval-receipt-sagechat-001"],
      },
    );
  });

  it("rejects succeeded major task receipts without GrayMatter context proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          answerPolicy: "answer-confidently",
          majorTaskRefs: ["cmd-major-test"],
          preflightReceiptId: "gm-preflight-001",
          retrievalTraceId: "gm-trace-001",
        },
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-major-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-major-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-major-test",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests passed without compiled context proof.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-major-test",
            "cmd-major-test",
            "command-receipt-major-test",
          ),
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-major-test succeeded major task cmd-major-test requires grayMatterContextProof for context pack gm-context-sagechat-001 before execution.",
      ]),
    );
  });

  it("rejects command receipt GrayMatter proof outside the launch context pack", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          answerPolicy: "answer-confidently",
          preflightReceiptId: "gm-preflight-001",
          retrievalTraceId: "gm-trace-001",
        },
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-graymatter-proof",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-graymatter-proof",
            createdAt: "2026-06-22T12:05:00.000Z",
            grayMatterContextProof: {
              answerPolicy: "requires-review",
              contextPackId: "gm-context-pack-other",
              invariantPreflightStatus: "warning",
              preflightReceiptId: "gm-preflight-other",
              retrievalReceiptIds: ["gm-retrieval-other"],
              retrievalStatus: "partial-coverage",
              retrievalTraceId: "gm-trace-other",
            },
            id: "command-receipt-graymatter-proof",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests passed with stale GrayMatter proof.",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-graymatter-proof",
            "cmd-graymatter-proof",
            "command-receipt-graymatter-proof",
          ),
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-graymatter-proof grayMatterContextProof contextPackId gm-context-pack-other does not match grayMatterContextPack gm-context-sagechat-001.",
        "Build Mode commandReceipt command-receipt-graymatter-proof grayMatterContextProof answerPolicy requires-review does not match grayMatterContextPack answer-confidently.",
        "Build Mode commandReceipt command-receipt-graymatter-proof grayMatterContextProof invariantPreflightStatus warning does not match grayMatterContextPack passed.",
        "Build Mode commandReceipt command-receipt-graymatter-proof grayMatterContextProof retrievalStatus partial-coverage does not match grayMatterContextPack ready.",
        "Build Mode commandReceipt command-receipt-graymatter-proof grayMatterContextProof retrievalTraceId gm-trace-other does not match grayMatterContextPack gm-trace-001.",
        "Build Mode commandReceipt command-receipt-graymatter-proof grayMatterContextProof preflightReceiptId gm-preflight-other does not match grayMatterContextPack gm-preflight-001.",
        "Build Mode commandReceipt command-receipt-graymatter-proof grayMatterContextProof references retrieval receipt gm-retrieval-other outside grayMatterContextPack gm-context-sagechat-001.",
      ]),
    );
  });

  it("validates Workflow MCP bindings against ExecModule contracts", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          execModuleIds: ["execmodule-digital-product-fulfillment"],
        },
        execModules: [
          {
            capability:
              "Issue a private download entitlement after a paid purchase.",
            id: "execmodule-digital-product-fulfillment",
            inputSchemaRef: "schemas/digitalProduct.fulfillPurchase.input.json",
            name: "digitalProduct.fulfillPurchase",
            outputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.output.json",
            owner: "Workflow Engineer",
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
        ],
        workflowMcpBindings: [
          {
            approvalRequired: true,
            execModuleId: "execmodule-digital-product-fulfillment",
            id: "workflow-mcp-dpp-fulfillment",
            inputContractRef:
              "schemas/digitalProduct.fulfillPurchase.input.json",
            serverName: "private-valkyr-workflows",
            toolName: "digitalProduct.fulfillPurchase",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
	    expect(result.payload?.workflowMcpBindings?.[0]).toMatchObject({
	      execModuleId: "execmodule-digital-product-fulfillment",
	      inputContractRef: "schemas/digitalProduct.fulfillPurchase.input.json",
	      toolName: "digitalProduct.fulfillPurchase",
	    });
	  });

  it("accepts Workflow MCP bindings with matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          execModuleIds: ["execmodule-digital-product-fulfillment"],
        },
        execModules: [
          {
            capability:
              "Issue a private download entitlement after a paid purchase.",
            id: "execmodule-digital-product-fulfillment",
            inputSchemaRef: "schemas/digitalProduct.fulfillPurchase.input.json",
            name: "digitalProduct.fulfillPurchase",
            outputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.output.json",
            owner: "Workflow Engineer",
            receiptIds: ["receipt-workflow-mcp-approved"],
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
        ],
        receipts: [
          {
            actor: "Workflow Engineer",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-workflow-mcp-approved",
            kind: "workflow",
            status: "approved",
            summary: "Workflow MCP binding approved.",
            title: "Workflow MCP proof",
          },
        ],
        workflowMcpBindings: [
          {
            approvalRequired: true,
            execModuleId: "execmodule-digital-product-fulfillment",
            id: "workflow-mcp-dpp-fulfillment",
            inputContractRef:
              "schemas/digitalProduct.fulfillPurchase.input.json",
            receiptIds: ["receipt-workflow-mcp-approved"],
            serverName: "private-valkyr-workflows",
            toolName: "digitalProduct.fulfillPurchase",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.workflowMcpBindings?.[0]).toMatchObject({
      id: "workflow-mcp-dpp-fulfillment",
      receiptIds: ["receipt-workflow-mcp-approved"],
    });
  });

  it("accepts MCP server and tool registry entries with matching workflow proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          execModuleIds: ["execmodule-digital-product-fulfillment"],
        },
        execModules: [
          {
            capability:
              "Issue a private download entitlement after a paid purchase.",
            id: "execmodule-digital-product-fulfillment",
            inputSchemaRef: "schemas/digitalProduct.fulfillPurchase.input.json",
            name: "digitalProduct.fulfillPurchase",
            outputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.output.json",
            owner: "Workflow Engineer",
            receiptIds: ["receipt-workflow-mcp-approved"],
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
        ],
        mcpServers: [
          {
            id: "mcp-server-private-valkyr-workflows",
            name: "private-valkyr-workflows",
            receiptIds: ["receipt-workflow-mcp-approved"],
            scope: "tenant",
            status: "connected",
            toolIds: ["mcp-tool-digital-product-fulfill-purchase"],
            transport: "workflow",
          },
        ],
        mcpTools: [
          {
            approvalRequired: true,
            capabilityId: "workflow.execute",
            execModuleId: "execmodule-digital-product-fulfillment",
            id: "mcp-tool-digital-product-fulfill-purchase",
            inputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.input.json",
            name: "digitalProduct.fulfillPurchase",
            outputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.output.json",
            receiptIds: ["receipt-workflow-mcp-approved"],
            serverId: "mcp-server-private-valkyr-workflows",
            status: "requires-approval",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
        receipts: [
          {
            actor: "Workflow Engineer",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-workflow-mcp-approved",
            kind: "workflow",
            status: "approved",
            summary: "Workflow MCP binding approved.",
            title: "Workflow MCP proof",
          },
        ],
        workflowMcpBindings: [
          {
            approvalRequired: true,
            execModuleId: "execmodule-digital-product-fulfillment",
            id: "workflow-mcp-dpp-fulfillment",
            inputContractRef:
              "schemas/digitalProduct.fulfillPurchase.input.json",
            receiptIds: ["receipt-workflow-mcp-approved"],
            serverName: "private-valkyr-workflows",
            toolName: "digitalProduct.fulfillPurchase",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.mcpServers?.[0]).toMatchObject({
      id: "mcp-server-private-valkyr-workflows",
      status: "connected",
      toolIds: ["mcp-tool-digital-product-fulfill-purchase"],
    });
    expect(result.payload?.mcpTools?.[0]).toMatchObject({
      execModuleId: "execmodule-digital-product-fulfillment",
      name: "digitalProduct.fulfillPurchase",
      status: "requires-approval",
    });
  });

  it("requires owner approval proof for connected public MCP servers", () => {
    const publicMcpPayload = {
      ...basePayload,
      commandReceipts: [
        {
          artifacts: [
            {
              commandId: "cmd-public-mcp-publish",
              createdAt: "2026-06-22T12:00:00.000Z",
              id: "artifact-public-mcp-publish",
              kind: "mcp_result",
              metadata: {
                serverName: "public-valkyr-workflows",
                status: "published",
                toolName: "digitalProduct.fulfillPurchase",
                traceId: "mcp-publication-trace-001",
              },
              receiptId: "command-receipt-public-mcp-publish",
              title: "Public MCP publication proof",
              uri: "valoride://build-mode/mcp/public-valkyr-workflows/publication",
            },
          ],
          approval: {
            approved: true,
            approverPrincipalId: "principal-valhalla-operator",
            approverRoles: ["Owner"],
            createdAt: "2026-06-22T11:59:00.000Z",
            reason: "Approved public MCP publication.",
            threshold: "owner",
          },
          approved: true,
          capabilityId: "mcp.tool",
          commandId: "cmd-public-mcp-publish",
          createdAt: "2026-06-22T12:00:00.000Z",
          id: "command-receipt-public-mcp-publish",
          policyDecision: "approval-required",
          requiredApprovalThreshold: "owner",
          requiresApproval: true,
          status: "succeeded",
          summary: "Public MCP publication approved and completed.",
        },
      ],
      mcpServers: [
        {
          id: "mcp-server-public-valkyr-workflows",
          name: "public-valkyr-workflows",
          receiptIds: ["command-receipt-public-mcp-publish"],
          scope: "public",
          status: "connected",
          toolIds: [],
          transport: "http",
        },
      ],
      receipts: [],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(publicMcpPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const invalidResult = coerceBuildModeTaskLaunchPayload(
      {
        ...publicMcpPayload,
        commandReceipts: [],
        mcpServers: [
          {
            ...publicMcpPayload.mcpServers[0],
            receiptIds: ["receipt-public-mcp-generic-approval"],
          },
        ],
        receipts: [
          {
            actor: "Workflow Engineer",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-public-mcp-generic-approval",
            kind: "mcp_tool",
            status: "approved",
            summary: "Generic MCP registry approval.",
            title: "MCP approval",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(invalidResult.payload).toBeUndefined();
    expect(invalidResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode mcpServer mcp-server-public-valkyr-workflows public scope with status connected requires a succeeded owner-approved commandReceipt for public MCP publication.",
      ]),
    );
  });

  it("rejects MCP registry entries without server, receipt, or ExecModule proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          execModuleIds: ["execmodule-digital-product-fulfillment"],
        },
        execModules: [
          {
            capability:
              "Issue a private download entitlement after a paid purchase.",
            id: "execmodule-digital-product-fulfillment",
            inputSchemaRef: "schemas/digitalProduct.fulfillPurchase.input.json",
            name: "digitalProduct.fulfillPurchase",
            outputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.output.json",
            owner: "Workflow Engineer",
            receiptIds: ["receipt-workflow-mcp-approved"],
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
        ],
        mcpServers: [
          {
            id: "mcp-server-private-valkyr-workflows",
            name: "private-valkyr-workflows",
            receiptIds: [],
            scope: "tenant",
            status: "connected",
            toolIds: ["mcp-tool-missing"],
            transport: "workflow",
          },
        ],
        mcpTools: [
          {
            approvalRequired: true,
            capabilityId: "workflow.execute",
            execModuleId: "execmodule-digital-product-fulfillment",
            id: "mcp-tool-digital-product-fulfill-purchase",
            inputSchemaRef: "schemas/wrong.input.json",
            name: "digitalProduct.fulfillPurchase",
            outputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.output.json",
            receiptIds: ["receipt-workflow-mcp-failed"],
            serverId: "mcp-server-missing",
            status: "requires-approval",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
        receipts: [
          {
            actor: "Workflow Engineer",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-workflow-mcp-approved",
            kind: "workflow",
            status: "approved",
            summary: "Workflow MCP binding approved.",
            title: "Workflow MCP proof",
          },
          {
            actor: "Workflow Engineer",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-workflow-mcp-failed",
            kind: "workflow",
            status: "failed",
            summary: "Workflow MCP binding failed review.",
            title: "Failed workflow MCP proof",
          },
        ],
        workflowMcpBindings: [
          {
            approvalRequired: true,
            execModuleId: "execmodule-digital-product-fulfillment",
            id: "workflow-mcp-dpp-fulfillment",
            inputContractRef:
              "schemas/digitalProduct.fulfillPurchase.input.json",
            receiptIds: ["receipt-workflow-mcp-approved"],
            serverName: "private-valkyr-workflows",
            toolName: "digitalProduct.fulfillPurchase",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode mcpServer mcp-server-private-valkyr-workflows references missing mcpTool mcp-tool-missing.",
        "Build Mode mcpServer mcp-server-private-valkyr-workflows status connected requires receipt proof.",
        "Build Mode mcpTool mcp-tool-digital-product-fulfill-purchase references missing mcpServer mcp-server-missing.",
        "Build Mode mcpTool mcp-tool-digital-product-fulfill-purchase inputSchemaRef schemas/wrong.input.json does not match execModule execmodule-digital-product-fulfillment inputSchemaRef schemas/digitalProduct.fulfillPurchase.input.json.",
        "Build Mode mcpTool mcp-tool-digital-product-fulfill-purchase status requires-approval has no acceptable receipt status.",
        "Build Mode workflowMcpBinding workflow-mcp-dpp-fulfillment has no matching mcpTool registry entry for private-valkyr-workflows.digitalProduct.fulfillPurchase.",
      ]),
    );
  });

  it("rejects Workflow MCP bindings without matching receipt proof", () => {
    const workflowPayload = {
      ...basePayload,
      appBundle: {
        ...basePayload.appBundle,
        execModuleIds: ["execmodule-digital-product-fulfillment"],
      },
      execModules: [
        {
          capability:
            "Issue a private download entitlement after a paid purchase.",
          id: "execmodule-digital-product-fulfillment",
          inputSchemaRef: "schemas/digitalProduct.fulfillPurchase.input.json",
          name: "digitalProduct.fulfillPurchase",
          outputSchemaRef:
            "schemas/digitalProduct.fulfillPurchase.output.json",
          owner: "Workflow Engineer",
          receiptIds: ["receipt-workflow-mcp-approved"],
          safetyLevel: "approval-required",
          version: "1.0.0",
        },
      ],
      receipts: [
        {
          actor: "Workflow Engineer",
          createdAt: "2026-06-22T12:00:00.000Z",
          id: "receipt-workflow-mcp-approved",
          kind: "workflow",
          status: "approved",
          summary: "Workflow MCP binding approved.",
          title: "Workflow MCP proof",
        },
      ],
      workflowMcpBindings: [
        {
          approvalRequired: true,
          execModuleId: "execmodule-digital-product-fulfillment",
          id: "workflow-mcp-no-proof",
          inputContractRef:
            "schemas/digitalProduct.fulfillPurchase.input.json",
          receiptIds: [],
          serverName: "private-valkyr-workflows",
          toolName: "digitalProduct.fulfillPurchase",
          workflowRef: "workflow:digital-product-fulfillment",
        },
      ],
    };

    const result = coerceBuildModeTaskLaunchPayload(workflowPayload, {
      now: fixedNow,
      workspaceRoot: "/workspace/valor",
    });

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode workflowMcpBinding workflow-mcp-no-proof requires receipt proof.",
      ]),
    );

    const failedResult = coerceBuildModeTaskLaunchPayload(
      {
        ...workflowPayload,
        receipts: [
          ...workflowPayload.receipts,
          {
            actor: "Workflow Engineer",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-workflow-mcp-failed",
            kind: "workflow",
            status: "failed",
            summary: "Workflow MCP binding failed review.",
            title: "Failed workflow MCP proof",
          },
        ],
        workflowMcpBindings: [
          {
            ...workflowPayload.workflowMcpBindings[0],
            id: "workflow-mcp-failed-proof",
            receiptIds: ["receipt-workflow-mcp-failed"],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(failedResult.payload).toBeUndefined();
    expect(failedResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode workflowMcpBinding workflow-mcp-failed-proof has no acceptable receipt status.",
      ]),
    );

    const missingResult = coerceBuildModeTaskLaunchPayload(
      {
        ...workflowPayload,
        workflowMcpBindings: [
          {
            ...workflowPayload.workflowMcpBindings[0],
            id: "workflow-mcp-missing-proof",
            receiptIds: ["receipt-workflow-mcp-missing"],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(missingResult.payload).toBeUndefined();
    expect(missingResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode workflowMcpBinding workflow-mcp-missing-proof references missing receipt receipt-workflow-mcp-missing.",
        "Build Mode workflowMcpBinding workflow-mcp-missing-proof requires receipt status proof.",
      ]),
    );
  });

  it("rejects Workflow MCP bindings without matching ExecModule contracts", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        execModules: [
          {
            capability:
              "Issue a private download entitlement after a paid purchase.",
            id: "execmodule-digital-product-fulfillment",
            inputSchemaRef: "schemas/digitalProduct.fulfillPurchase.input.json",
            name: "digitalProduct.fulfillPurchase",
            outputSchemaRef:
              "schemas/digitalProduct.fulfillPurchase.output.json",
            owner: "Workflow Engineer",
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
        ],
        workflowMcpBindings: [
          {
            approvalRequired: true,
            id: "workflow-mcp-missing-module-id",
            inputContractRef:
              "schemas/digitalProduct.fulfillPurchase.input.json",
            serverName: "private-valkyr-workflows",
            toolName: "digitalProduct.fulfillPurchase",
            workflowRef: "workflow:digital-product-fulfillment",
          },
          {
            approvalRequired: true,
            execModuleId: "execmodule-missing",
            id: "workflow-mcp-missing-module",
            inputContractRef:
              "schemas/digitalProduct.fulfillPurchase.input.json",
            serverName: "private-valkyr-workflows",
            toolName: "digitalProduct.fulfillPurchase",
            workflowRef: "workflow:digital-product-fulfillment",
          },
          {
            approvalRequired: true,
            execModuleId: "execmodule-digital-product-fulfillment",
            id: "workflow-mcp-contract-mismatch",
            inputContractRef: "schemas/wrong.input.json",
            serverName: "private-valkyr-workflows",
            toolName: "digitalProduct.refundPurchase",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode workflowMcpBinding workflow-mcp-missing-module-id requires an execModuleId.",
        "Build Mode workflowMcpBinding workflow-mcp-missing-module references missing execModule execmodule-missing.",
        "Build Mode workflowMcpBinding workflow-mcp-contract-mismatch toolName digitalProduct.refundPurchase does not match execModule execmodule-digital-product-fulfillment name digitalProduct.fulfillPurchase.",
        "Build Mode workflowMcpBinding workflow-mcp-contract-mismatch inputContractRef schemas/wrong.input.json does not match execModule execmodule-digital-product-fulfillment inputSchemaRef schemas/digitalProduct.fulfillPurchase.input.json.",
      ]),
    );
  });

  it("accepts agent loop, runtime, and ThorAPI receipt refs backed by receipts or command receipts", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentLoop: [
          {
            capabilityIds: ["terminal.execute"],
            id: "loop-tests",
            label: "Run tests",
            receiptIds: ["receipt-context", "command-receipt-test-succeeded"],
            status: "complete",
          },
        ],
        agentRuntimes: [
          {
            handoffPolicy: "supervised",
            id: "runtime-test-runner",
            label: "Test runner",
            loopPhaseIds: ["loop-tests"],
            ownerRole: "Test Runner",
            receiptIds: ["receipt-context", "command-receipt-test-succeeded"],
            runtime: "Codex",
            status: "available",
          },
        ],
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:05:00.000Z",
            executionPlanStepId: "plan-tests",
            id: "command-receipt-test-succeeded",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Tests passed.",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-test-runner",
            assignedSwarmRole: "Test Runner",
            capabilityId: "terminal.execute",
            command: "npm test",
            executionPlanStepId: "plan-tests",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        evidenceArtifacts: [
          terminalStdoutEvidence(
            "artifact-test-succeeded",
            "cmd-test",
            "command-receipt-test-succeeded",
          ),
        ],
        executionPlan: [
          {
            commandIds: ["cmd-test"],
            dependencyStepIds: [],
            id: "plan-tests",
            label: "Tests",
            nextAction: "Continue.",
            readinessGateIds: [],
            receiptIds: ["command-receipt-test-succeeded"],
            runtimeId: "runtime-test-runner",
            status: "complete",
            summary: "Tests are complete.",
          },
        ],
        receipts: [
          {
            actor: "GrayMatter",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-context",
            kind: "context",
            status: "succeeded",
            summary: "Context compiled.",
            title: "Context receipt",
          },
        ],
        swarmRoles: requiredSwarmRoleAssignments,
        thorApiVaixBindings: [
          {
            clientRef: "thorapi/redux/ProductService.tsx",
            editableAdapterPaths: ["src/pages/Checkout.tsx"],
            generatedPaths: ["thorapi/redux/ProductService.tsx"],
            id: "thorapi-product-service",
            operationRefs: ["getProduct"],
            policy: "readonly-generated",
            receiptIds: ["receipt-context", "command-receipt-test-succeeded"],
            serviceName: "ProductService",
            surface: "ThorAPI",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.agentLoop?.[0].receiptIds).toEqual([
      "receipt-context",
      "command-receipt-test-succeeded",
    ]);
  });

  it("rejects agent loop, runtime, and ThorAPI receipt refs without proof records", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentLoop: [
          {
            capabilityIds: [],
            id: "loop-tests",
            label: "Run tests",
            receiptIds: ["receipt-loop-missing"],
            status: "complete",
          },
        ],
        agentRuntimes: [
          {
            handoffPolicy: "supervised",
            id: "runtime-test-runner",
            label: "Test runner",
            loopPhaseIds: ["loop-tests"],
            ownerRole: "Test Runner",
            receiptIds: ["receipt-runtime-missing"],
            runtime: "Codex",
            status: "available",
          },
        ],
        receipts: [],
        swarmRoles: requiredSwarmRoleAssignments,
        thorApiVaixBindings: [
          {
            clientRef: "thorapi/redux/ProductService.tsx",
            editableAdapterPaths: ["src/pages/Checkout.tsx"],
            generatedPaths: ["thorapi/redux/ProductService.tsx"],
            id: "thorapi-product-service",
            operationRefs: ["getProduct"],
            policy: "readonly-generated",
            receiptIds: ["receipt-thorapi-missing"],
            serviceName: "ProductService",
            surface: "ThorAPI",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode agentLoop phase loop-tests references missing receipt receipt-loop-missing.",
        "Build Mode agentRuntime runtime-test-runner references missing receipt receipt-runtime-missing.",
        "Build Mode thorApiVaixBinding thorapi-product-service references missing receipt receipt-thorapi-missing.",
      ]),
    );
  });

  it("rejects agent loop lifecycle states without matching receipt status proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentLoop: [
          {
            capabilityIds: [],
            id: "loop-complete",
            label: "Complete phase",
            receiptIds: ["receipt-failed"],
            status: "complete",
          },
          {
            capabilityIds: [],
            id: "loop-running",
            label: "Running phase",
            receiptIds: ["receipt-succeeded"],
            status: "running",
          },
          {
            capabilityIds: [],
            id: "loop-blocked",
            label: "Blocked phase",
            receiptIds: ["receipt-succeeded"],
            status: "blocked",
          },
          {
            capabilityIds: [],
            id: "loop-complete-without-receipt",
            label: "Complete without receipt",
            receiptIds: [],
            status: "complete",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-failed",
            kind: "context",
            status: "failed",
            summary: "Failed.",
            title: "Failed receipt",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-succeeded",
            kind: "context",
            status: "succeeded",
            summary: "Succeeded.",
            title: "Succeeded receipt",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode agentLoop phase loop-complete status complete requires an approved or succeeded receipt.",
        "Build Mode agentLoop phase loop-running status running requires a running receipt.",
        "Build Mode agentLoop phase loop-blocked status blocked requires an approval-required, failed, or rejected receipt.",
        "Build Mode agentLoop phase loop-complete-without-receipt status complete requires receipt proof.",
      ]),
    );
  });

  it("accepts ThorAPI and VAIX policies with matching receipt status proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        receipts: [
          {
            actor: "ThorAPI",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-generated-succeeded",
            kind: "workflow",
            status: "succeeded",
            summary: "Generated ThorAPI client is current.",
            title: "ThorAPI generation receipt",
          },
          {
            actor: "VAIX",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-approval-approved",
            kind: "workflow",
            status: "approved",
            summary: "VAIX workflow requires approval before launch.",
            title: "VAIX approval receipt",
          },
          {
            actor: "VAIX",
            createdAt: "2026-06-22T12:02:00.000Z",
            id: "receipt-blocked-failed",
            kind: "workflow",
            status: "failed",
            summary: "VAIX workflow launch is blocked by a failed preflight.",
            title: "VAIX blocked receipt",
          },
        ],
        thorApiVaixBindings: [
          {
            clientRef: "thorapi/redux/ProductService.tsx",
            editableAdapterPaths: ["src/pages/Checkout.tsx"],
            generatedPaths: ["thorapi/redux/ProductService.tsx"],
            id: "thorapi-product-service",
            operationRefs: ["getProduct"],
            policy: "readonly-generated",
            receiptIds: ["receipt-generated-succeeded"],
            serviceName: "ProductService",
            surface: "ThorAPI",
          },
          {
            clientRef: "workflow:digital-product-fulfillment",
            editableAdapterPaths: ["src/pages/AdminFulfillment.tsx"],
            generatedPaths: ["thorapi/model/DigitalProduct.ts"],
            id: "vaix-fulfillment-approval",
            operationRefs: ["fulfillPurchase"],
            policy: "approval-required",
            receiptIds: ["receipt-approval-approved"],
            serviceName: "digitalProduct.fulfillPurchase",
            surface: "VAIX",
          },
          {
            clientRef: "workflow:digital-product-preflight",
            editableAdapterPaths: ["src/pages/AdminFulfillment.tsx"],
            generatedPaths: ["thorapi/model/DigitalProduct.ts"],
            id: "vaix-fulfillment-blocked",
            operationRefs: ["validatePaidPurchase"],
            policy: "blocked",
            receiptIds: ["receipt-blocked-failed"],
            serviceName: "digitalProduct.validatePaidPurchase",
            surface: "VAIX",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.thorApiVaixBindings).toHaveLength(3);
  });

  it("rejects ThorAPI and VAIX policies without matching receipt status proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        receipts: [
          {
            actor: "ThorAPI",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-generated-failed",
            kind: "workflow",
            status: "failed",
            summary: "Generation failed.",
            title: "Failed generation receipt",
          },
          {
            actor: "VAIX",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-approval-failed",
            kind: "workflow",
            status: "failed",
            summary: "Approval gate failed.",
            title: "Failed approval receipt",
          },
          {
            actor: "VAIX",
            createdAt: "2026-06-22T12:02:00.000Z",
            id: "receipt-blocked-succeeded",
            kind: "workflow",
            status: "succeeded",
            summary: "Preflight succeeded.",
            title: "Succeeded preflight receipt",
          },
        ],
        thorApiVaixBindings: [
          {
            clientRef: "thorapi/redux/ProductService.tsx",
            editableAdapterPaths: ["src/pages/Checkout.tsx"],
            generatedPaths: ["thorapi/redux/ProductService.tsx"],
            id: "thorapi-product-service",
            operationRefs: ["getProduct"],
            policy: "readonly-generated",
            receiptIds: ["receipt-generated-failed"],
            serviceName: "ProductService",
            surface: "ThorAPI",
          },
          {
            clientRef: "workflow:digital-product-fulfillment",
            editableAdapterPaths: ["src/pages/AdminFulfillment.tsx"],
            generatedPaths: ["thorapi/model/DigitalProduct.ts"],
            id: "vaix-fulfillment-approval",
            operationRefs: ["fulfillPurchase"],
            policy: "approval-required",
            receiptIds: ["receipt-approval-failed"],
            serviceName: "digitalProduct.fulfillPurchase",
            surface: "VAIX",
          },
          {
            clientRef: "workflow:digital-product-preflight",
            editableAdapterPaths: ["src/pages/AdminFulfillment.tsx"],
            generatedPaths: ["thorapi/model/DigitalProduct.ts"],
            id: "vaix-fulfillment-blocked",
            operationRefs: ["validatePaidPurchase"],
            policy: "blocked",
            receiptIds: ["receipt-blocked-succeeded"],
            serviceName: "digitalProduct.validatePaidPurchase",
            surface: "VAIX",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode thorApiVaixBinding thorapi-product-service policy readonly-generated requires an approved or succeeded receipt.",
        "Build Mode thorApiVaixBinding vaix-fulfillment-approval policy approval-required requires an approved, succeeded, approval-required, or running receipt.",
        "Build Mode thorApiVaixBinding vaix-fulfillment-blocked policy blocked requires an approval-required, failed, or rejected receipt.",
      ]),
    );
  });

  it("accepts guardrails with matching receipt status proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandReceipts: [
          {
            approved: false,
            capabilityId: "terminal.execute",
            commandId: "cmd-deploy",
            createdAt: "2026-06-22T12:03:00.000Z",
            id: "command-receipt-approval-required",
            policyDecision: "approval-required",
            requiresApproval: true,
            status: "approval-required",
            summary: "Deployment requires operator approval.",
          },
        ],
        guardrails: [
          {
            enforcement: "hard-block",
            id: "guardrail-generated-code",
            label: "Generated code",
            receiptIds: ["receipt-generated-code-proof"],
            summary: "Generated code is inspected, not hand-edited.",
          },
          {
            enforcement: "approval-required",
            id: "guardrail-production-deploy",
            label: "Production deploys",
            receiptIds: ["command-receipt-approval-required"],
            summary: "Production deploys require operator approval.",
          },
          {
            enforcement: "receipt-required",
            id: "guardrail-audit-receipts",
            label: "Audit receipts",
            receiptIds: ["receipt-audit-proof"],
            summary: "Build Mode writes durable receipts.",
          },
        ],
        receipts: [
          {
            actor: "GrayMatter",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-generated-code-proof",
            kind: "context",
            status: "succeeded",
            summary: "Generated-code invariant passed.",
            title: "Generated-code guardrail proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-audit-proof",
            kind: "context",
            status: "approved",
            summary: "Receipt doctrine loaded.",
            title: "Receipt guardrail proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.guardrails?.map((guardrail) => guardrail.id)).toEqual(
      [
        "guardrail-generated-code",
        "guardrail-production-deploy",
        "guardrail-audit-receipts",
      ],
    );
  });

  it("rejects guardrails without matching receipt status proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        guardrails: [
          {
            enforcement: "hard-block",
            id: "guardrail-no-proof",
            label: "No proof",
            receiptIds: [],
            summary: "This guardrail has no proof.",
          },
          {
            enforcement: "hard-block",
            id: "guardrail-failed-hard-block",
            label: "Failed hard block",
            receiptIds: ["receipt-failed"],
            summary: "This hard block has failed proof.",
          },
          {
            enforcement: "approval-required",
            id: "guardrail-failed-approval",
            label: "Failed approval",
            receiptIds: ["receipt-failed"],
            summary: "This approval rule has failed proof.",
          },
          {
            enforcement: "receipt-required",
            id: "guardrail-rejected-receipt",
            label: "Rejected receipt",
            receiptIds: ["command-receipt-rejected"],
            summary: "This receipt rule has rejected proof.",
          },
          {
            enforcement: "receipt-required",
            id: "guardrail-missing-receipt",
            label: "Missing receipt",
            receiptIds: ["receipt-missing-guardrail"],
            summary: "This guardrail references a missing receipt.",
          },
        ],
        commandReceipts: [
          {
            approved: false,
            capabilityId: "terminal.execute",
            commandId: "cmd-rejected",
            createdAt: "2026-06-22T12:02:00.000Z",
            id: "command-receipt-rejected",
            policyDecision: "reject",
            requiresApproval: true,
            status: "rejected",
            summary: "Rejected.",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-failed",
            kind: "context",
            status: "failed",
            summary: "Failed.",
            title: "Failed guardrail proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode guardrail guardrail-no-proof enforcement hard-block requires receipt proof.",
        "Build Mode guardrail guardrail-failed-hard-block enforcement hard-block requires an approved or succeeded receipt.",
        "Build Mode guardrail guardrail-failed-approval enforcement approval-required requires an approved, succeeded, approval-required, or running receipt.",
        "Build Mode guardrail guardrail-rejected-receipt enforcement receipt-required requires an approved or succeeded receipt.",
        "Build Mode guardrail guardrail-missing-receipt references missing receipt receipt-missing-guardrail.",
        "Build Mode guardrail guardrail-missing-receipt enforcement receipt-required requires receipt status proof.",
      ]),
    );
  });

  it("accepts receipt-required tool permissions with matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "filesystem.read",
            kind: "filesystem",
            label: "Filesystem read",
            requiresApproval: false,
            risk: "low",
          },
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: true,
            risk: "high",
          },
          {
            enabled: false,
            id: "mcp.tool",
            kind: "mcp",
            label: "MCP",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commandReceipts: [
          {
            approved: false,
            capabilityId: "terminal.execute",
            commandId: "cmd-terminal",
            createdAt: "2026-06-22T12:03:00.000Z",
            id: "command-receipt-terminal-approval",
            policyDecision: "approval-required",
            requiresApproval: true,
            status: "approval-required",
            summary: "Terminal command requires approval.",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-read-policy",
            kind: "context",
            status: "succeeded",
            summary: "Read permission policy loaded.",
            title: "Read policy proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:04:00.000Z",
            id: "receipt-mcp-denied",
            kind: "workflow",
            status: "failed",
            summary: "MCP mutation denied by policy.",
            title: "MCP deny policy proof",
          },
        ],
        toolPermissions: [
          {
            approvalThreshold: "none",
            capabilityId: "filesystem.read",
            decision: "allow",
            id: "tool-permission-read",
            label: "Read",
            reason: "Read is allowed with policy proof.",
            receiptIds: ["receipt-read-policy"],
            receiptRequired: true,
            scopeRefs: ["policy:build-mode"],
          },
          {
            approvalThreshold: "operator",
            capabilityId: "terminal.execute",
            decision: "approval-required",
            id: "tool-permission-terminal",
            label: "Terminal",
            reason: "Terminal needs approval.",
            receiptIds: ["command-receipt-terminal-approval"],
            receiptRequired: true,
            scopeRefs: ["policy:build-mode"],
          },
          {
            approvalThreshold: "owner",
            capabilityId: "mcp.tool",
            decision: "deny",
            id: "tool-permission-mcp",
            label: "MCP",
            reason: "MCP mutation is denied.",
            receiptIds: ["receipt-mcp-denied"],
            receiptRequired: true,
            scopeRefs: ["policy:build-mode"],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.toolPermissions?.map((item) => item.id)).toEqual([
      "tool-permission-read",
      "tool-permission-terminal",
      "tool-permission-mcp",
    ]);
  });

  it("rejects receipt-required tool permissions without matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandReceipts: [
          {
            approved: false,
            capabilityId: "terminal.execute",
            commandId: "cmd-terminal",
            createdAt: "2026-06-22T12:03:00.000Z",
            id: "command-receipt-terminal-rejected",
            policyDecision: "reject",
            requiresApproval: true,
            status: "rejected",
            summary: "Terminal command rejected.",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-failed-policy",
            kind: "context",
            status: "failed",
            summary: "Policy failed.",
            title: "Failed policy proof",
          },
        ],
        toolPermissions: [
          {
            approvalThreshold: "none",
            capabilityId: "filesystem.read",
            decision: "allow",
            id: "tool-permission-no-proof",
            label: "No proof",
            reason: "Missing proof.",
            receiptIds: [],
            receiptRequired: true,
            scopeRefs: ["policy:build-mode"],
          },
          {
            approvalThreshold: "operator",
            capabilityId: "terminal.execute",
            decision: "approval-required",
            id: "tool-permission-rejected-approval",
            label: "Rejected approval",
            reason: "Approval proof is rejected.",
            receiptIds: ["command-receipt-terminal-rejected"],
            receiptRequired: true,
            scopeRefs: ["policy:build-mode"],
          },
          {
            approvalThreshold: "none",
            capabilityId: "graymatter.memory",
            decision: "allow",
            id: "tool-permission-failed-allow",
            label: "Failed allow",
            reason: "Allow proof failed.",
            receiptIds: ["receipt-failed-policy"],
            receiptRequired: true,
            scopeRefs: ["policy:build-mode"],
          },
          {
            approvalThreshold: "none",
            capabilityId: "connector.read",
            decision: "allow",
            id: "tool-permission-missing-receipt",
            label: "Missing receipt",
            reason: "Receipt does not exist.",
            receiptIds: ["receipt-tool-missing"],
            receiptRequired: true,
            scopeRefs: ["policy:build-mode"],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode toolPermission tool-permission-no-proof requires receipt proof because receiptRequired is true.",
        "Build Mode toolPermission tool-permission-rejected-approval receiptRequired proof has no acceptable receipt status for decision approval-required.",
        "Build Mode toolPermission tool-permission-failed-allow receiptRequired proof has no acceptable receipt status for decision allow.",
        "Build Mode toolPermission tool-permission-missing-receipt references missing receipt receipt-tool-missing.",
        "Build Mode toolPermission tool-permission-missing-receipt requires receipt status proof because receiptRequired is true.",
      ]),
    );
  });

  it("accepts enabled command policy rules with matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandPolicyRules: [
          {
            commandKinds: ["test"],
            effect: "allow",
            enabled: true,
            id: "command-policy-allow-tests",
            label: "Allow tests",
            pattern: "^npm test$",
            reason: "Tests are allowed after policy compile.",
            receiptIds: ["receipt-policy-succeeded"],
          },
          {
            commandKinds: ["deploy"],
            effect: "approval-required",
            enabled: true,
            id: "command-policy-deploy-approval",
            label: "Deploy approval",
            pattern: "\\bdeploy\\b",
            reason: "Deploy requires approval.",
            receiptIds: ["receipt-policy-approved"],
          },
          {
            effect: "deny",
            enabled: true,
            id: "command-policy-deny-remote-shell",
            label: "Deny remote shell",
            pattern: "\\b(curl|wget)\\b.*\\|\\s*(bash|sh)",
            reason: "Remote shell bootstrap is denied.",
            receiptIds: ["receipt-policy-failed"],
          },
          {
            effect: "allow",
            enabled: false,
            id: "command-policy-disabled",
            label: "Disabled",
            pattern: ".*",
            reason: "Disabled rules do not participate in policy.",
            receiptIds: [],
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-policy-succeeded",
            kind: "context",
            status: "succeeded",
            summary: "Allow-list policy compiled.",
            title: "Allow policy proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-policy-approved",
            kind: "context",
            status: "approved",
            summary: "Deploy approval policy approved.",
            title: "Approval policy proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:02:00.000Z",
            id: "receipt-policy-failed",
            kind: "context",
            status: "failed",
            summary: "Remote shell policy blocks unsafe pattern.",
            title: "Deny policy proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandPolicyRules?.map((rule) => rule.id)).toEqual([
      "command-policy-allow-tests",
      "command-policy-deploy-approval",
      "command-policy-deny-remote-shell",
      "command-policy-disabled",
    ]);
  });

  it("rejects enabled command policy rules without matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandPolicyRules: [
          {
            effect: "allow",
            enabled: true,
            id: "command-policy-no-proof",
            label: "No proof",
            pattern: "^npm test$",
            reason: "Missing proof.",
            receiptIds: [],
          },
          {
            effect: "allow",
            enabled: true,
            id: "command-policy-failed-allow",
            label: "Failed allow",
            pattern: "^npm test$",
            reason: "Allow proof failed.",
            receiptIds: ["receipt-policy-failed"],
          },
          {
            effect: "approval-required",
            enabled: true,
            id: "command-policy-rejected-approval",
            label: "Rejected approval",
            pattern: "\\bdeploy\\b",
            reason: "Approval proof is rejected.",
            receiptIds: ["receipt-policy-rejected"],
          },
          {
            effect: "deny",
            enabled: true,
            id: "command-policy-running-deny",
            label: "Running deny",
            pattern: "rm -rf",
            reason: "Deny proof cannot still be running.",
            receiptIds: ["receipt-policy-running"],
          },
          {
            effect: "deny",
            enabled: true,
            id: "command-policy-missing-receipt",
            label: "Missing receipt",
            pattern: "curl",
            reason: "Receipt is missing.",
            receiptIds: ["receipt-policy-missing"],
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-policy-failed",
            kind: "context",
            status: "failed",
            summary: "Failed.",
            title: "Failed policy proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-policy-running",
            kind: "context",
            status: "running",
            summary: "Running.",
            title: "Running policy proof",
          },
        ],
        commandReceipts: [
          {
            approved: false,
            capabilityId: "terminal.execute",
            commandId: "cmd-deploy",
            createdAt: "2026-06-22T12:02:00.000Z",
            id: "receipt-policy-rejected",
            policyDecision: "reject",
            requiresApproval: true,
            status: "rejected",
            summary: "Rejected.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandPolicyRule command-policy-no-proof effect allow requires receipt proof.",
        "Build Mode commandPolicyRule command-policy-failed-allow effect allow has no acceptable receipt status.",
        "Build Mode commandPolicyRule command-policy-rejected-approval effect approval-required has no acceptable receipt status.",
        "Build Mode commandPolicyRule command-policy-running-deny effect deny has no acceptable receipt status.",
        "Build Mode commandPolicyRule command-policy-missing-receipt references missing receipt receipt-policy-missing.",
        "Build Mode commandPolicyRule command-policy-missing-receipt effect deny requires receipt status proof.",
      ]),
    );
  });

  it("accepts receipt-required autonomy policies with matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        autonomyPolicy: {
          allowedCapabilityIds: [],
          approvalRequiredCapabilityIds: [],
          escalationRefs: ["owner:principal-valhalla-operator"],
          id: "autonomy-policy-proofed",
          label: "Proofed autonomy",
          maxConsecutiveCommands: 2,
          maxEstimatedCredits: 10,
          mode: "approval-gated",
          receiptIds: ["receipt-autonomy-policy"],
          receiptRequired: true,
          stopConditions: ["Stop on failed command."],
        },
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-autonomy-policy",
            kind: "context",
            status: "succeeded",
            summary: "Autonomy policy loaded.",
            title: "Autonomy policy proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.autonomyPolicy?.receiptIds).toEqual([
      "receipt-autonomy-policy",
    ]);
  });

  it("rejects receipt-required autonomy policies without matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        autonomyPolicy: {
          allowedCapabilityIds: [],
          approvalRequiredCapabilityIds: [],
          escalationRefs: [],
          id: "autonomy-policy-unproofed",
          label: "Unproofed autonomy",
          maxConsecutiveCommands: 2,
          maxEstimatedCredits: 10,
          mode: "approval-gated",
          receiptIds: [],
          receiptRequired: true,
          stopConditions: [],
        },
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-autonomy-failed",
            kind: "context",
            status: "failed",
            summary: "Autonomy policy failed.",
            title: "Failed autonomy policy proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );
    const failedProof = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        autonomyPolicy: {
          allowedCapabilityIds: [],
          approvalRequiredCapabilityIds: [],
          escalationRefs: [],
          id: "autonomy-policy-failed-proof",
          label: "Failed proof autonomy",
          maxConsecutiveCommands: 2,
          maxEstimatedCredits: 10,
          mode: "approval-gated",
          receiptIds: ["receipt-autonomy-failed"],
          receiptRequired: true,
          stopConditions: [],
        },
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-autonomy-failed",
            kind: "context",
            status: "failed",
            summary: "Autonomy policy failed.",
            title: "Failed autonomy policy proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );
    const missingProof = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        autonomyPolicy: {
          allowedCapabilityIds: [],
          approvalRequiredCapabilityIds: [],
          escalationRefs: [],
          id: "autonomy-policy-missing-proof",
          label: "Missing proof autonomy",
          maxConsecutiveCommands: 2,
          maxEstimatedCredits: 10,
          mode: "approval-gated",
          receiptIds: ["receipt-autonomy-missing"],
          receiptRequired: true,
          stopConditions: [],
        },
        receipts: [],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode autonomyPolicy autonomy-policy-unproofed requires receipt proof because receiptRequired is true.",
      ]),
    );
    expect(failedProof.payload).toBeUndefined();
    expect(failedProof.issues).toEqual(
      expect.arrayContaining([
        "Build Mode autonomyPolicy autonomy-policy-failed-proof receiptRequired proof requires an approved or succeeded receipt.",
      ]),
    );
    expect(missingProof.payload).toBeUndefined();
    expect(missingProof.issues).toEqual(
      expect.arrayContaining([
        "Build Mode autonomyPolicy autonomy-policy-missing-proof references missing receipt receipt-autonomy-missing.",
        "Build Mode autonomyPolicy autonomy-policy-missing-proof requires receipt status proof because receiptRequired is true.",
      ]),
    );
  });

  it("accepts ExecModule registry entries with matching safety receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        execModules: [
          {
            capability: "Read scoped context.",
            id: "execmodule-context-read",
            inputSchemaRef: "schemas/context.read.input.json",
            name: "context.read",
            outputSchemaRef: "schemas/context.read.output.json",
            owner: "Supervisor",
            receiptIds: ["receipt-exec-readonly"],
            safetyLevel: "readonly",
            version: "1.0.0",
          },
          {
            capability: "Run an approval-gated workflow.",
            id: "execmodule-workflow-approval",
            inputSchemaRef: "schemas/workflow.input.json",
            name: "workflow.run",
            outputSchemaRef: "schemas/workflow.output.json",
            owner: "Workflow Engineer",
            receiptIds: ["receipt-exec-approved"],
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
          {
            capability: "Perform destructive production operation.",
            id: "execmodule-destructive",
            inputSchemaRef: "schemas/destructive.input.json",
            name: "production.destroy",
            outputSchemaRef: "schemas/destructive.output.json",
            owner: "Deploy Operator",
            receiptIds: ["receipt-exec-succeeded"],
            safetyLevel: "destructive",
            version: "1.0.0",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-exec-readonly",
            kind: "context",
            status: "succeeded",
            summary: "Readonly ExecModule contract loaded.",
            title: "Readonly ExecModule proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-exec-approved",
            kind: "workflow",
            status: "approved",
            summary: "Approval-gated ExecModule contract approved.",
            title: "Approval ExecModule proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:02:00.000Z",
            id: "receipt-exec-succeeded",
            kind: "workflow",
            status: "succeeded",
            summary: "Destructive ExecModule contract passed review.",
            title: "Destructive ExecModule proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.execModules?.map((module) => module.id)).toEqual([
      "execmodule-context-read",
      "execmodule-workflow-approval",
      "execmodule-destructive",
    ]);
  });

  it("rejects ExecModule registry entries without matching safety receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        execModules: [
          {
            capability: "Read scoped context.",
            id: "execmodule-no-proof",
            inputSchemaRef: "schemas/context.read.input.json",
            name: "context.read",
            outputSchemaRef: "schemas/context.read.output.json",
            owner: "Supervisor",
            receiptIds: [],
            safetyLevel: "readonly",
            version: "1.0.0",
          },
          {
            capability: "Read scoped context.",
            id: "execmodule-failed-readonly",
            inputSchemaRef: "schemas/context.read.input.json",
            name: "context.failedRead",
            outputSchemaRef: "schemas/context.read.output.json",
            owner: "Supervisor",
            receiptIds: ["receipt-exec-failed"],
            safetyLevel: "readonly",
            version: "1.0.0",
          },
          {
            capability: "Run an approval-gated workflow.",
            id: "execmodule-failed-approval",
            inputSchemaRef: "schemas/workflow.input.json",
            name: "workflow.failedApproval",
            outputSchemaRef: "schemas/workflow.output.json",
            owner: "Workflow Engineer",
            receiptIds: ["receipt-exec-failed"],
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
          {
            capability: "Perform destructive production operation.",
            id: "execmodule-pending-destructive",
            inputSchemaRef: "schemas/destructive.input.json",
            name: "production.pendingDestroy",
            outputSchemaRef: "schemas/destructive.output.json",
            owner: "Deploy Operator",
            receiptIds: ["receipt-exec-pending"],
            safetyLevel: "destructive",
            version: "1.0.0",
          },
          {
            capability: "Run missing-proof workflow.",
            id: "execmodule-missing-receipt",
            inputSchemaRef: "schemas/workflow.input.json",
            name: "workflow.missingProof",
            outputSchemaRef: "schemas/workflow.output.json",
            owner: "Workflow Engineer",
            receiptIds: ["receipt-exec-missing"],
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-exec-failed",
            kind: "workflow",
            status: "failed",
            summary: "ExecModule contract failed validation.",
            title: "Failed ExecModule proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-exec-pending",
            kind: "workflow",
            status: "pending",
            summary: "ExecModule contract is still pending.",
            title: "Pending ExecModule proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode execModule execmodule-no-proof safetyLevel readonly requires receipt proof.",
        "Build Mode execModule execmodule-failed-readonly safetyLevel readonly has no acceptable receipt status.",
        "Build Mode execModule execmodule-failed-approval safetyLevel approval-required has no acceptable receipt status.",
        "Build Mode execModule execmodule-pending-destructive safetyLevel destructive has no acceptable receipt status.",
        "Build Mode execModule execmodule-missing-receipt references missing receipt receipt-exec-missing.",
        "Build Mode execModule execmodule-missing-receipt safetyLevel approval-required requires receipt status proof.",
      ]),
    );
  });

  it("accepts enabled capabilities with matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "filesystem.read",
            kind: "filesystem",
            label: "Workspace read",
            receiptIds: ["receipt-capability-approved"],
            requiresApproval: false,
            risk: "low",
          },
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            receiptIds: ["receipt-capability-terminal-approved"],
            requiresApproval: true,
            risk: "high",
          },
          {
            enabled: false,
            id: "workflow.execute",
            kind: "workflow",
            label: "Workflow",
            receiptIds: [],
            requiresApproval: true,
            risk: "high",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-capability-approved",
            kind: "context",
            status: "approved",
            summary: "Filesystem read capability is registered.",
            title: "Capability registration proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-capability-terminal-approved",
            kind: "context",
            status: "approved",
            summary: "Terminal capability is registered with approval required.",
            title: "Terminal capability registration proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.capabilities?.map((capability) => capability.id)).toEqual(
      ["filesystem.read", "terminal.execute", "workflow.execute"],
    );
  });

  it("rejects enabled capabilities without matching receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "filesystem.read",
            kind: "filesystem",
            label: "Workspace read",
            receiptIds: [],
            requiresApproval: false,
            risk: "low",
          },
          {
            enabled: true,
            id: "graymatter.memory",
            kind: "graymatter",
            label: "GrayMatter",
            receiptIds: ["receipt-capability-failed"],
            requiresApproval: false,
            risk: "medium",
          },
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Workflow",
            receiptIds: ["receipt-capability-missing"],
            requiresApproval: true,
            risk: "high",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-capability-failed",
            kind: "context",
            status: "failed",
            summary: "Capability registration failed.",
            title: "Failed capability proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode capability filesystem.read enabled state requires receipt proof.",
        "Build Mode capability graymatter.memory enabled state has no acceptable receipt status.",
        "Build Mode capability workflow.execute references missing receipt receipt-capability-missing.",
        "Build Mode capability workflow.execute enabled state requires receipt status proof.",
      ]),
    );
  });

  it("accepts component bundles with matching status receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        componentBundles: [
          {
            editablePaths: ["src/pages/Checkout.tsx"],
            entrypoints: ["src/pages/Checkout.tsx"],
            framework: "React",
            generatedBy: "Aurora",
            generatedPaths: ["thorapi/redux/ProductService.tsx"],
            id: "component-ready",
            name: "Ready component",
            receiptIds: ["receipt-component-succeeded"],
            status: "ready",
          },
          {
            editablePaths: ["src/pages/Admin.tsx"],
            entrypoints: ["src/pages/Admin.tsx"],
            framework: "React",
            generatedBy: "ThorAPI",
            generatedPaths: ["thorapi/model/DigitalProduct.ts"],
            id: "component-needs-review",
            name: "Review component",
            receiptIds: ["receipt-component-approved"],
            status: "needs-review",
          },
          {
            editablePaths: [],
            entrypoints: ["src/pages/Blocked.tsx"],
            framework: "React",
            generatedBy: "Workflow",
            generatedPaths: ["thorapi/model/Blocked.ts"],
            id: "component-blocked",
            name: "Blocked component",
            receiptIds: ["receipt-component-failed"],
            status: "blocked",
          },
        ],
        receipts: [
          {
            actor: "Aurora",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-component-succeeded",
            kind: "generation",
            status: "succeeded",
            summary: "Component bundle generated.",
            title: "Ready component proof",
          },
          {
            actor: "ThorAPI",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-component-approved",
            kind: "generation",
            status: "approved",
            summary: "Component bundle generated and queued for review.",
            title: "Review component proof",
          },
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:02:00.000Z",
            id: "receipt-component-failed",
            kind: "generation",
            status: "failed",
            summary: "Component bundle generation blocked.",
            title: "Blocked component proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.componentBundles?.map((bundle) => bundle.id)).toEqual(
      ["component-ready", "component-needs-review", "component-blocked"],
    );
  });

  it("rejects component bundles without matching status receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        componentBundles: [
          {
            editablePaths: ["src/pages/Checkout.tsx"],
            entrypoints: ["src/pages/Checkout.tsx"],
            framework: "React",
            generatedBy: "Aurora",
            generatedPaths: ["thorapi/redux/ProductService.tsx"],
            id: "component-no-proof",
            name: "No proof component",
            receiptIds: [],
            status: "ready",
          },
          {
            editablePaths: ["src/pages/Checkout.tsx"],
            entrypoints: ["src/pages/Checkout.tsx"],
            framework: "React",
            generatedBy: "Aurora",
            generatedPaths: ["thorapi/redux/ProductService.tsx"],
            id: "component-failed-ready",
            name: "Failed ready component",
            receiptIds: ["receipt-component-failed"],
            status: "ready",
          },
          {
            editablePaths: ["src/pages/Admin.tsx"],
            entrypoints: ["src/pages/Admin.tsx"],
            framework: "React",
            generatedBy: "ThorAPI",
            generatedPaths: ["thorapi/model/DigitalProduct.ts"],
            id: "component-failed-review",
            name: "Failed review component",
            receiptIds: ["receipt-component-failed"],
            status: "needs-review",
          },
          {
            editablePaths: [],
            entrypoints: ["src/pages/Blocked.tsx"],
            framework: "React",
            generatedBy: "Workflow",
            generatedPaths: ["thorapi/model/Blocked.ts"],
            id: "component-succeeded-blocked",
            name: "Succeeded blocked component",
            receiptIds: ["receipt-component-succeeded"],
            status: "blocked",
          },
          {
            editablePaths: [],
            entrypoints: ["src/pages/Missing.tsx"],
            framework: "React",
            generatedBy: "Manual",
            generatedPaths: [],
            id: "component-missing-receipt",
            name: "Missing receipt component",
            receiptIds: ["receipt-component-missing"],
            status: "needs-review",
          },
        ],
        receipts: [
          {
            actor: "Build Mode",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-component-failed",
            kind: "generation",
            status: "failed",
            summary: "Component bundle failed.",
            title: "Failed component proof",
          },
          {
            actor: "Aurora",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "receipt-component-succeeded",
            kind: "generation",
            status: "succeeded",
            summary: "Component bundle generated.",
            title: "Succeeded component proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode componentBundle component-no-proof status ready requires receipt proof.",
        "Build Mode componentBundle component-failed-ready status ready has no acceptable receipt status.",
        "Build Mode componentBundle component-failed-review status needs-review has no acceptable receipt status.",
        "Build Mode componentBundle component-succeeded-blocked status blocked has no acceptable receipt status.",
        "Build Mode componentBundle component-missing-receipt references missing receipt receipt-component-missing.",
        "Build Mode componentBundle component-missing-receipt status needs-review requires receipt status proof.",
      ]),
    );
  });

	  it("validates app bundle diffs against bundle artifacts and proof refs", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          artifacts: [
            {
              kind: "config",
              path: "apps/shop/app-bundle.json",
            },
            {
              kind: "editable",
              path: "apps/shop/src/Checkout.tsx",
            },
          ],
        },
        appBundleDiffs: [
          {
            addedArtifacts: ["apps/shop/app-bundle.json"],
            appBundleId: "app-bundle-sagechat-001",
            changedArtifacts: ["apps/shop/src/Checkout.tsx"],
            evidenceArtifactIds: ["artifact-app-diff"],
            generatedAt: "2026-06-22T12:00:00.000Z",
            id: "app-bundle-diff-sagechat-001",
            receiptIds: ["receipt-generation"],
            removedArtifacts: [],
            title: "Generated app bundle diff",
          },
        ],
        evidenceArtifacts: [
          {
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-app-diff",
            kind: "file_write",
            title: "App bundle diff evidence",
            uri: "valoride://build-mode/artifacts/app-diff",
          },
        ],
        receipts: [
          {
            actor: "App Gallery",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-generation",
            kind: "generation",
            status: "succeeded",
            summary: "Generated app bundle.",
            title: "Generation receipt",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.appBundleDiffs?.[0]).toMatchObject({
      appBundleId: "app-bundle-sagechat-001",
      evidenceArtifactIds: ["artifact-app-diff"],
      receiptIds: ["receipt-generation"],
	    });
	  });

  it("accepts app bundles with explicit or diff-derived receipt proof", () => {
    const explicitResult = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          receiptIds: ["receipt-app-bundle-approved"],
        },
        receipts: [
          {
            actor: "App Gallery",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-app-bundle-approved",
            kind: "generation",
            status: "approved",
            summary: "App bundle manifest approved.",
            title: "App bundle proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(explicitResult.issues).toEqual([]);
    expect(explicitResult.payload?.appBundle).toMatchObject({
      id: "app-bundle-sagechat-001",
      receiptIds: ["receipt-app-bundle-approved"],
    });

    const derivedResult = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          artifacts: [
            {
              kind: "config",
              path: "apps/shop/app-bundle.json",
            },
          ],
        },
        appBundleDiffs: [
          {
            addedArtifacts: ["apps/shop/app-bundle.json"],
            appBundleId: "app-bundle-sagechat-001",
            changedArtifacts: [],
            evidenceArtifactIds: [],
            generatedAt: "2026-06-22T12:00:00.000Z",
            id: "app-bundle-diff-sagechat-001",
            receiptIds: ["receipt-app-bundle-succeeded"],
            removedArtifacts: [],
            title: "Generated app bundle diff",
          },
        ],
        receipts: [
          {
            actor: "App Gallery",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-app-bundle-succeeded",
            kind: "generation",
            status: "succeeded",
            summary: "App bundle diff generated.",
            title: "App bundle diff proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(derivedResult.issues).toEqual([]);
  });

  it("rejects app bundles without acceptable receipt proof when diffs are present", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          artifacts: [
            {
              kind: "config",
              path: "apps/shop/app-bundle.json",
            },
          ],
        },
        appBundleDiffs: [
          {
            addedArtifacts: ["apps/shop/app-bundle.json"],
            appBundleId: "app-bundle-sagechat-001",
            changedArtifacts: [],
            evidenceArtifactIds: [],
            generatedAt: "2026-06-22T12:00:00.000Z",
            id: "app-bundle-diff-no-proof",
            receiptIds: [],
            removedArtifacts: [],
            title: "Generated app bundle diff",
          },
        ],
        receipts: [],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode appBundle app-bundle-sagechat-001 requires receipt proof.",
      ]),
    );

    const failedResult = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          receiptIds: ["receipt-app-bundle-failed"],
        },
        receipts: [
          {
            actor: "App Gallery",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-app-bundle-failed",
            kind: "generation",
            status: "failed",
            summary: "App bundle generation failed.",
            title: "Failed app bundle proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(failedResult.payload).toBeUndefined();
    expect(failedResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode appBundle app-bundle-sagechat-001 has no acceptable receipt status.",
      ]),
    );

    const missingResult = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          receiptIds: ["receipt-app-bundle-missing"],
        },
        receipts: [],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(missingResult.payload).toBeUndefined();
    expect(missingResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode appBundle app-bundle-sagechat-001 references missing receipt receipt-app-bundle-missing.",
        "Build Mode appBundle app-bundle-sagechat-001 requires receipt status proof.",
      ]),
    );
  });

  it("rejects app bundle diffs with broken artifact or proof refs", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          artifacts: [
            {
              kind: "editable",
              path: "apps/shop/src/Checkout.tsx",
            },
          ],
        },
        appBundleDiffs: [
          {
            addedArtifacts: ["apps/shop/missing.tsx"],
            appBundleId: "app-bundle-other",
            changedArtifacts: ["apps/shop/src/Checkout.tsx"],
            evidenceArtifactIds: ["artifact-missing"],
            id: "app-bundle-diff-broken",
            receiptIds: ["receipt-missing"],
            removedArtifacts: [],
            title: "Broken app bundle diff",
          },
        ],
        evidenceArtifacts: [],
        receipts: [],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode appBundleDiff app-bundle-diff-broken references appBundle app-bundle-other, expected app-bundle-sagechat-001.",
        "Build Mode appBundleDiff app-bundle-diff-broken requires a generatedAt timestamp.",
        "Build Mode appBundleDiff app-bundle-diff-broken addedArtifacts references unknown app artifact apps/shop/missing.tsx.",
        "Build Mode appBundleDiff app-bundle-diff-broken references missing receipt receipt-missing.",
        "Build Mode appBundleDiff app-bundle-diff-broken references missing evidenceArtifact artifact-missing.",
      ]),
    );
  });

  it("accepts evidence artifacts that match their command receipt command", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "tool.test",
            kind: "terminal",
            label: "Test runner",
            requiresApproval: false,
            receiptIds: ["command-receipt-test"],
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "tool.test",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "running",
          },
        ],
        commandReceipts: [
          {
            actor: "Test Runner",
            capabilityId: "tool.test",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-test",
            kind: "command",
            policyDecision: "allow",
            status: "succeeded",
            summary: "Tests passed.",
            title: "Test receipt",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-test-output",
            kind: "command_stdout",
            receiptId: "command-receipt-test",
            title: "Test output",
            uri: "valoride://build-mode/artifacts/test-output",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.evidenceArtifacts?.[0]).toMatchObject({
      commandId: "cmd-test",
      receiptId: "command-receipt-test",
    });
  });

  it("accepts queued evidence artifacts that do not claim integrity proof yet", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "tool.test",
            kind: "terminal",
            label: "Test runner",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "tool.test",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "queued",
          },
        ],
        commandReceipts: [
          {
            actor: "Test Runner",
            capabilityId: "tool.test",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-test",
            kind: "command",
            policyDecision: "allow",
            status: "running",
            summary: "Tests running.",
            title: "Running test receipt",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-test-output-pending",
            kind: "command_stdout",
            metadata: {
              completed: false,
            },
            receiptId: "command-receipt-test",
            title: "Pending test output",
            uri: "valoride://build-mode/artifacts/test-output-pending",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.evidenceArtifacts?.[0]).toMatchObject({
      id: "artifact-test-output-pending",
      metadata: {
        completed: false,
      },
    });
  });

  it("rejects malformed artifact integrity proof claims", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "tool.test",
            kind: "terminal",
            label: "Test runner",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "tool.test",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "queued",
          },
        ],
        commandReceipts: [
          {
            actor: "Test Runner",
            artifacts: [
              {
                commandId: "cmd-test",
                createdAt: "2026-06-22T12:00:00.000Z",
                id: "artifact-nested-bad-hash",
                kind: "command_stdout",
                metadata: {
                  byteSize: 0,
                  contentHash: "sha256:not-real",
                },
                receiptId: "command-receipt-test",
                title: "Bad nested output",
                uri: "valoride://build-mode/artifacts/bad-nested-output",
              },
            ],
            capabilityId: "tool.test",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-test",
            kind: "command",
            policyDecision: "allow",
            status: "succeeded",
            summary: "Tests passed.",
            title: "Test receipt",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-top-level-bad-hash",
            kind: "command_stdout",
            metadata: {
              byteSize: 512,
              contentHash: "sha256:fixture-command-stdout",
            },
            receiptId: "command-receipt-test",
            title: "Bad top-level output",
            uri: "valoride://build-mode/artifacts/bad-top-level-output",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-test artifact artifact-nested-bad-hash contentHash must be a sha256 hash before it can be used as artifact proof.",
        "Build Mode commandReceipt command-receipt-test artifact artifact-nested-bad-hash byteSize must be positive before it can be used as artifact proof.",
        "Build Mode evidenceArtifact artifact-top-level-bad-hash contentHash must be a sha256 hash before it can be used as artifact proof.",
      ]),
    );
  });

  it("rejects unsafe artifact uris that claim integrity proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "tool.test",
            kind: "terminal",
            label: "Test runner",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "tool.test",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "queued",
          },
        ],
        commandReceipts: [
          {
            actor: "Test Runner",
            artifacts: [
              {
                commandId: "cmd-test",
                createdAt: "2026-06-22T12:00:00.000Z",
                id: "artifact-nested-traversal-uri",
                kind: "command_stdout",
                metadata: {
                  byteSize: 512,
                  contentHash:
                    "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                },
                receiptId: "command-receipt-test",
                title: "Nested traversal output",
                uri: "valoride://build-mode/artifacts/task-alpha/cmd-test/%2E%2E%2Fsecret.txt",
              },
            ],
            capabilityId: "tool.test",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-test",
            kind: "command",
            policyDecision: "allow",
            status: "succeeded",
            summary: "Tests passed.",
            title: "Test receipt",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-top-level-redacted-query-uri",
            kind: "command_stdout",
            metadata: {
              byteSize: 512,
              contentHash:
                "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            },
            receiptId: "command-receipt-test",
            title: "Top-level redacted query output",
            uri: "valoride://build-mode/artifacts/task-alpha/cmd-test/output-command_stdout.txt?token=<redacted-secret>",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-test artifact artifact-nested-traversal-uri uri must be a safe Build Mode artifact URI before it can be used as artifact proof.",
        "Build Mode evidenceArtifact artifact-top-level-redacted-query-uri uri must be a safe Build Mode artifact URI before it can be used as artifact proof.",
      ]),
    );
  });

  it("rejects evidence artifacts that cite a command receipt for a different command", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "tool.test",
            kind: "terminal",
            label: "Test runner",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "tool.test",
            command: "npm test",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "queued",
          },
          {
            capabilityId: "tool.test",
            command: "npm run build",
            id: "cmd-build",
            kind: "build",
            label: "Build app",
            requiresApproval: false,
            status: "queued",
          },
        ],
        commandReceipts: [
          {
            actor: "Test Runner",
            capabilityId: "tool.test",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-test",
            kind: "command",
            policyDecision: "allow",
            status: "succeeded",
            summary: "Tests passed.",
            title: "Test receipt",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-build",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-mismatched-command",
            kind: "command_stdout",
            receiptId: "command-receipt-test",
            title: "Mismatched output",
            uri: "valoride://build-mode/artifacts/mismatched-output",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode evidenceArtifact artifact-mismatched-command commandId cmd-build does not match commandReceipt command-receipt-test commandId cmd-test.",
      ]),
    );
  });

  it("accepts nested command receipt artifacts that match their containing receipt", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-nested-artifact",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            actor: "Test Runner",
            artifacts: [
              terminalStdoutEvidence(
                "artifact-nested-terminal",
                "cmd-nested-artifact",
                "command-receipt-nested-artifact",
              ),
            ],
            capabilityId: "terminal.execute",
            commandId: "cmd-nested-artifact",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-nested-artifact",
            kind: "command",
            policyDecision: "allow",
            status: "succeeded",
            summary: "Tests passed.",
            title: "Nested artifact receipt",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]?.artifacts?.[0]).toMatchObject({
      commandId: "cmd-nested-artifact",
      receiptId: "command-receipt-nested-artifact",
    });
  });

  it("rejects nested command receipt artifacts that cite a different receipt or command", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-nested-artifact",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            actor: "Test Runner",
            artifacts: [
              terminalStdoutEvidence(
                "artifact-nested-terminal",
                "cmd-other",
                "command-receipt-other",
              ),
            ],
            capabilityId: "terminal.execute",
            commandId: "cmd-nested-artifact",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-nested-artifact",
            kind: "command",
            policyDecision: "allow",
            status: "succeeded",
            summary: "Tests passed.",
            title: "Nested artifact receipt",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-nested-artifact artifact artifact-nested-terminal commandId cmd-other does not match receipt commandId cmd-nested-artifact.",
        "Build Mode commandReceipt command-receipt-nested-artifact artifact artifact-nested-terminal receiptId command-receipt-other does not match containing receipt.",
      ]),
    );
  });

  it("accepts succeeded swarm handoffs with accepted handoff artifact proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "swarm.command",
            kind: "swarm",
            label: "Swarm handoff",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-security-auditor",
            assignedSwarmRole: "Security Auditor",
            capabilityId: "swarm.command",
            command:
              "swarm:handoff role:Security_Auditor runtime:runtime-security-auditor",
            id: "cmd-swarm-security",
            kind: "swarm",
            label: "Handoff to Security Auditor",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner", "BuildOperator"],
              createdAt: "2026-06-22T11:59:00.000Z",
              reason: "Approved swarm handoff.",
              threshold: "operator",
            },
            approved: true,
            assignedRuntimeId: "runtime-security-auditor",
            assignedSwarmRole: "Security Auditor",
            capabilityId: "swarm.command",
            commandId: "cmd-swarm-security",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-swarm-security",
            policyDecision: "approval-required",
            requiresApproval: true,
            status: "succeeded",
            summary: "Security Auditor accepted the handoff.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-swarm-security",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-swarm-security",
            kind: "swarm_handoff",
            metadata: {
              handoffId: "handoff-security-auditor-001",
              runtimeId: "runtime-security-auditor",
              status: "accepted",
              swarmRole: "Security Auditor",
              traceId: "swarm-trace-001",
            },
            receiptId: "command-receipt-swarm-security",
            title: "Swarm handoff receipt",
            uri: "valoride://build-mode/artifacts/swarm-security",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]).toMatchObject({
      capabilityId: "swarm.command",
      status: "succeeded",
    });
  });

  it("rejects succeeded swarm handoffs without accepted handoff artifact proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "swarm.command",
            kind: "swarm",
            label: "Swarm handoff",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedSwarmRole: "Security Auditor",
            capabilityId: "swarm.command",
            command: "swarm:handoff role:Security_Auditor",
            id: "cmd-swarm-security",
            kind: "swarm",
            label: "Handoff to Security Auditor",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            assignedSwarmRole: "Security Auditor",
            capabilityId: "swarm.command",
            commandId: "cmd-swarm-security",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-swarm-security",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Security Auditor accepted the handoff without proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-swarm-security",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-swarm-security",
            kind: "swarm_handoff",
            metadata: {
              status: "queued",
              swarmRole: "Security Auditor",
            },
            receiptId: "command-receipt-swarm-security",
            title: "Swarm handoff receipt",
            uri: "valoride://build-mode/artifacts/swarm-security",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-swarm-security succeeded swarm.command requires swarm_handoff artifact metadata with status accepted, handoffId, runtimeId, and swarmRole matching the assigned receipt proof.",
      ]),
    );
  });

  it("rejects accepted swarm handoff artifacts for the wrong runtime or role", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "swarm.command",
            kind: "swarm",
            label: "Swarm handoff",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-security-auditor",
            assignedSwarmRole: "Security Auditor",
            capabilityId: "swarm.command",
            command:
              "swarm:handoff role:Security_Auditor runtime:runtime-security-auditor",
            id: "cmd-swarm-security",
            kind: "swarm",
            label: "Handoff to Security Auditor",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            assignedRuntimeId: "runtime-security-auditor",
            assignedSwarmRole: "Security Auditor",
            capabilityId: "swarm.command",
            commandId: "cmd-swarm-security",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-swarm-security",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Security Auditor accepted the handoff.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-swarm-security",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-swarm-security",
            kind: "swarm_handoff",
            metadata: {
              handoffId: "handoff-security-auditor-001",
              runtimeId: "runtime-workflow-engineer",
              status: "accepted",
              swarmRole: "Workflow Engineer",
              traceId: "swarm-trace-001",
            },
            receiptId: "command-receipt-swarm-security",
            title: "Swarm handoff receipt",
            uri: "valoride://build-mode/artifacts/swarm-security",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-swarm-security succeeded swarm.command requires swarm_handoff artifact metadata with status accepted, handoffId, runtimeId, and swarmRole matching the assigned receipt proof.",
      ]),
    );
  });

  it("accepts succeeded MCP tools with MCP result artifact proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "mcp.tool",
            kind: "mcp",
            label: "MCP tool",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "mcp.tool",
            command: "mcp:graymatter.lookup args:{\"query\":\"app\"}",
            id: "cmd-mcp-lookup",
            kind: "mcp",
            label: "Lookup context",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner", "BuildOperator"],
              createdAt: "2026-06-22T11:59:00.000Z",
              reason: "Approved MCP lookup.",
              threshold: "operator",
            },
            approved: true,
            capabilityId: "mcp.tool",
            commandId: "cmd-mcp-lookup",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-mcp-lookup",
            policyDecision: "approval-required",
            requiresApproval: true,
            status: "succeeded",
            summary: "MCP lookup completed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-mcp-lookup",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-mcp-lookup",
            kind: "mcp_result",
            metadata: {
              resourceCount: 1,
              serverName: "graymatter",
              status: "completed",
              toolName: "lookup",
              traceId: "mcp-trace-001",
            },
            receiptId: "command-receipt-mcp-lookup",
            title: "MCP result",
            uri: "valoride://build-mode/artifacts/mcp-lookup",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]).toMatchObject({
      capabilityId: "mcp.tool",
      status: "succeeded",
    });
  });

  it("rejects succeeded MCP tools without MCP result artifact proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "mcp.tool",
            kind: "mcp",
            label: "MCP tool",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "mcp.tool",
            command: "mcp:graymatter.lookup args:{\"query\":\"app\"}",
            id: "cmd-mcp-lookup",
            kind: "mcp",
            label: "Lookup context",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "mcp.tool",
            commandId: "cmd-mcp-lookup",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-mcp-lookup",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "MCP lookup completed without proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-mcp-lookup",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-mcp-lookup",
            kind: "mcp_result",
            metadata: {
              serverName: "graymatter",
            },
            receiptId: "command-receipt-mcp-lookup",
            title: "MCP result",
            uri: "valoride://build-mode/artifacts/mcp-lookup",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-mcp-lookup succeeded mcp.tool requires mcp_result artifact metadata with serverName, toolName, and status, executionId, traceId, or resourceCount proof.",
      ]),
    );
  });

  it("rejects succeeded MCP tools when resourceCount proof is zero", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "mcp.tool",
            kind: "mcp",
            label: "MCP tool",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "mcp.tool",
            command: "mcp:graymatter.lookup args:{\"query\":\"app\"}",
            id: "cmd-mcp-lookup",
            kind: "mcp",
            label: "Lookup context",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "mcp.tool",
            commandId: "cmd-mcp-lookup",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "command-receipt-mcp-lookup",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "MCP lookup completed with empty resource proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-mcp-lookup",
            createdAt: "2026-06-22T12:05:00.000Z",
            id: "artifact-mcp-lookup",
            kind: "mcp_result",
            metadata: {
              resourceCount: 0,
              serverName: "graymatter",
              toolName: "lookup",
            },
            receiptId: "command-receipt-mcp-lookup",
            title: "MCP result",
            uri: "valoride://build-mode/artifacts/mcp-lookup",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-mcp-lookup succeeded mcp.tool requires mcp_result artifact metadata with serverName, toolName, and status, executionId, traceId, or resourceCount proof.",
      ]),
    );
  });

  it("accepts succeeded connector reads with external connector receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "connector.read",
            kind: "connector",
            label: "Connector reader",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "connector.read",
            command:
              "connector:gmail.read data:email.thread query:gmail:thread:digital-product-order",
            id: "cmd-connector-gmail-thread",
            kind: "connector",
            label: "Read Gmail order thread",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved connector read.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "connector.read",
            commandId: "cmd-connector-gmail-thread",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-connector-gmail",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Connector read completed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-connector-gmail-thread",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-connector-gmail-thread",
            kind: "connector_data",
            metadata: {
              connectorId: "gmail",
              dataClass: "email.thread",
              queryRef: "gmail:thread:digital-product-order",
              receiptRef: "connector_receipt:gmail-thread-dpp-001",
              status: "authorized",
            },
            receiptId: "command-receipt-connector-gmail",
            title: "Connector read proof",
            uri: "valoride://build-mode/artifacts/connector-gmail-thread",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]).toMatchObject({
      capabilityId: "connector.read",
      status: "succeeded",
    });
  });

  it("rejects imported connector.read receipts that claim mutation actions succeeded", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "connector.read",
            kind: "connector",
            label: "Connector reader",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "connector.read",
            command:
              "connector:gmail.send data:email.message query:gmail:compose:customer",
            id: "cmd-connector-gmail-send",
            kind: "connector",
            label: "Send Gmail launch email",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved email send review.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "connector.read",
            commandId: "cmd-connector-gmail-send",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-connector-gmail-send",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Connector mutation claimed as completed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-connector-gmail-send",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-connector-gmail-send",
            kind: "connector_data",
            metadata: {
              connectorId: "gmail",
              dataClass: "email.message",
              queryRef: "gmail:compose:customer",
              receiptRef: "connector_receipt:gmail-send-001",
              status: "authorized",
            },
            receiptId: "command-receipt-connector-gmail-send",
            title: "Connector mutation proof",
            uri: "valoride://build-mode/artifacts/connector-gmail-send",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-connector-gmail-send succeeded connector.read command cmd-connector-gmail-send uses mutation action send; connector.read only supports get, list, read, or search.",
      ]),
    );
  });

  it("accepts connector access bindings with matching command and receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commands: [
          {
            capabilityId: "connector.read",
            command:
              "connector:gmail.read data:email.thread query:gmail:thread:digital-product-order",
            id: "cmd-connector-gmail-thread",
            kind: "connector",
            label: "Read Gmail order thread",
            requiresApproval: true,
            status: "queued",
          },
        ],
        connectorBindings: [
          {
            allowedActions: ["read", "search"],
            commandIds: ["cmd-connector-gmail-thread"],
            connectorId: "gmail",
            connectorName: "Gmail",
            dataClasses: ["email.thread"],
            id: "connector-binding-gmail-order-thread",
            receiptIds: ["receipt-connector-gmail-thread"],
            scopeRef: "tenant-valkyr-demo/principal-valhalla-operator",
            status: "authorized",
          },
        ],
        receipts: [
          {
            actor: "Connector Broker",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-connector-gmail-thread",
            kind: "connector_data",
            status: "succeeded",
            summary: "Authorized Gmail connector read.",
            title: "Gmail connector proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.connectorBindings?.[0]).toMatchObject({
      commandIds: ["cmd-connector-gmail-thread"],
      connectorId: "gmail",
      status: "authorized",
    });
  });

  it("rejects connector access bindings without command and receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commands: [
          {
            capabilityId: "connector.read",
            command:
              "connector:google-calendar.search data:calendar.events query:google-calendar:events:launch",
            id: "cmd-connector-calendar",
            kind: "connector",
            label: "Read launch calendar",
            requiresApproval: true,
            status: "queued",
          },
        ],
        connectorBindings: [
          {
            allowedActions: ["read"],
            commandIds: ["cmd-connector-calendar", "cmd-connector-missing"],
            connectorId: "gmail",
            connectorName: "Gmail",
            dataClasses: ["email.thread"],
            id: "connector-binding-gmail-order-thread",
            receiptIds: ["receipt-connector-failed"],
            status: "authorized",
          },
        ],
        receipts: [
          {
            actor: "Connector Broker",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-connector-failed",
            kind: "connector_data",
            status: "failed",
            summary: "Connector authorization failed.",
            title: "Failed connector proof",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode connectorBinding connector-binding-gmail-order-thread command cmd-connector-calendar targets connector google-calendar instead of gmail.",
        "Build Mode connectorBinding connector-binding-gmail-order-thread command cmd-connector-calendar action search is not allowed by the binding.",
        "Build Mode connectorBinding connector-binding-gmail-order-thread references missing command cmd-connector-missing.",
        "Build Mode connectorBinding connector-binding-gmail-order-thread status authorized has no acceptable receipt status.",
      ]),
    );
  });

  it("rejects succeeded connector reads without external connector receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "connector.read",
            kind: "connector",
            label: "Connector reader",
            requiresApproval: true,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "connector.read",
            command:
              "connector:gmail.read data:email.thread query:gmail:thread:digital-product-order",
            id: "cmd-connector-gmail-thread",
            kind: "connector",
            label: "Read Gmail order thread",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved connector read.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "connector.read",
            commandId: "cmd-connector-gmail-thread",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-connector-gmail",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Connector read completed without proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-connector-gmail-thread",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-connector-gmail-thread",
            kind: "connector_data",
            metadata: {
              connectorId: "gmail",
              dataClass: "email.thread",
              queryRef: "gmail:thread:digital-product-order",
              status: "authorized",
            },
            receiptId: "command-receipt-connector-gmail",
            title: "Connector read proof",
            uri: "valoride://build-mode/artifacts/connector-gmail-thread",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-connector-gmail succeeded connector.read requires connector_data artifact metadata with status authorized and receiptRef.",
      ]),
    );
  });

  it("accepts succeeded workflow executions with workflow receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Run ValkyrAI workflows",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "workflow.execute",
            command:
              "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase workflow:workflow:digital-product-fulfillment",
            id: "cmd-workflow-fulfillment",
            kind: "workflow",
            label: "Run fulfillment workflow",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved workflow execution.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow-fulfillment",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-workflow-fulfillment",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Workflow execution completed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-workflow-fulfillment",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-workflow-fulfillment",
            kind: "workflow_receipt",
            metadata: {
              executionId: "wf-run-001",
              executionState: "SUCCESS",
              receiptRef: "workflow_execution:wf-run-001",
              workflowRef: "workflow:digital-product-fulfillment",
            },
            receiptId: "command-receipt-workflow-fulfillment",
            title: "Workflow receipt proof",
            uri: "valoride://build-mode/artifacts/workflow-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]).toMatchObject({
      capabilityId: "workflow.execute",
      status: "succeeded",
    });
  });

  it("rejects succeeded workflow executions without workflow receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Run ValkyrAI workflows",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "workflow.execute",
            command:
              "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase workflow:workflow:digital-product-fulfillment",
            id: "cmd-workflow-fulfillment",
            kind: "workflow",
            label: "Run fulfillment workflow",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved workflow execution.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow-fulfillment",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-workflow-fulfillment",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Workflow execution completed without proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-workflow-fulfillment",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-workflow-fulfillment",
            kind: "workflow_receipt",
            metadata: {
              executionId: "wf-run-001",
              executionState: "SUCCESS",
              workflowRef: "workflow:digital-product-fulfillment",
            },
            receiptId: "command-receipt-workflow-fulfillment",
            title: "Workflow receipt proof",
            uri: "valoride://build-mode/artifacts/workflow-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-workflow-fulfillment succeeded workflow.execute requires workflow_receipt artifact metadata with receiptRef, workflowRef, and executionId or traceId.",
      ]),
    );
  });

  it("rejects succeeded workflow executions without workflow execution identity proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Run ValkyrAI workflows",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "workflow.execute",
            command:
              "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase workflow:workflow:digital-product-fulfillment",
            id: "cmd-workflow-fulfillment",
            kind: "workflow",
            label: "Run fulfillment workflow",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved workflow execution.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow-fulfillment",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-workflow-fulfillment",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Workflow execution completed without identity proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-workflow-fulfillment",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-workflow-fulfillment",
            kind: "workflow_receipt",
            metadata: {
              receiptRef: "workflow_execution:wf-run-001",
              workflowRef: "workflow:digital-product-fulfillment",
            },
            receiptId: "command-receipt-workflow-fulfillment",
            title: "Workflow receipt proof",
            uri: "valoride://build-mode/artifacts/workflow-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-workflow-fulfillment succeeded workflow.execute requires workflow_receipt artifact metadata with receiptRef, workflowRef, and executionId or traceId.",
      ]),
    );
  });

  it("rejects sensitive billing workflow receipts without declared action class proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Run ValkyrAI workflows",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "workflow.execute",
            command:
              "mcp:private-valkyr-workflows.billing.refundPayment workflow:workflow:billing-refund",
            id: "cmd-workflow-billing-refund",
            kind: "workflow",
            label: "Run billing refund workflow",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved billing workflow execution.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow-billing-refund",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-workflow-billing-refund",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Billing workflow execution completed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-workflow-billing-refund",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-workflow-billing-refund",
            kind: "workflow_receipt",
            metadata: {
              executionId: "wf-run-billing-001",
              executionState: "SUCCESS",
              receiptRef: "workflow_execution:wf-run-billing-001",
              workflowRef: "workflow:billing-refund",
            },
            receiptId: "command-receipt-workflow-billing-refund",
            title: "Billing workflow receipt proof",
            uri: "valoride://build-mode/artifacts/workflow-billing-refund",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-workflow-billing-refund sensitive workflow billing-mutation requires workflow_receipt metadata sensitiveActionClasses to declare billing-mutation.",
      ]),
    );
  });

  it("rejects declared sensitive workflow receipts without owner approval proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Run ValkyrAI workflows",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "workflow.execute",
            command:
              "mcp:private-valkyr-workflows.customer.notify workflow:workflow:customer-notification",
            id: "cmd-workflow-customer-notification",
            kind: "workflow",
            label: "Run customer notification workflow",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["BuildOperator"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved workflow execution.",
              threshold: "operator",
            },
            approved: true,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow-customer-notification",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-workflow-customer-notification",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "operator",
            requiresApproval: true,
            status: "succeeded",
            summary: "Customer notification workflow execution completed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-workflow-customer-notification",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-workflow-customer-notification",
            kind: "workflow_receipt",
            metadata: {
              executionId: "wf-run-notify-001",
              executionState: "SUCCESS",
              receiptRef: "workflow_execution:wf-run-notify-001",
              sensitiveActionClasses: "email-send",
              workflowRef: "workflow:customer-notification",
            },
            receiptId: "command-receipt-workflow-customer-notification",
            title: "Customer notification workflow receipt proof",
            uri: "valoride://build-mode/artifacts/workflow-customer-notification",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-workflow-customer-notification sensitive workflow email-send requires owner approval proof before succeeded status.",
      ]),
    );
  });

  it("rejects workflow receipts with unsupported sensitive action classes", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "workflow.execute",
            kind: "workflow",
            label: "Run ValkyrAI workflows",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "workflow.execute",
            command:
              "mcp:private-valkyr-workflows.credential.export workflow:workflow:credential-export",
            id: "cmd-workflow-credential-export",
            kind: "workflow",
            label: "Run credential export workflow",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner", "BuildOperator"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved workflow execution.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "workflow.execute",
            commandId: "cmd-workflow-credential-export",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-workflow-credential-export",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Credential export workflow execution completed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-workflow-credential-export",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-workflow-credential-export",
            kind: "workflow_receipt",
            metadata: {
              executionId: "wf-run-credential-export-001",
              executionState: "SUCCESS",
              receiptRef: "workflow_execution:wf-run-credential-export-001",
              sensitiveActionClasses: "credential-export",
              workflowRef: "workflow:credential-export",
            },
            receiptId: "command-receipt-workflow-credential-export",
            title: "Credential export workflow receipt proof",
            uri: "valoride://build-mode/artifacts/workflow-credential-export",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-workflow-credential-export workflow_receipt sensitiveActionClasses contains unsupported class credential-export.",
      ]),
    );
  });

  it("accepts succeeded scheduled automations with ValkyrAI cron workflow proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "automation.schedule",
            kind: "automation",
            label: "Schedule automation",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "automation.schedule",
            command:
              "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment",
            id: "cmd-automation-nightly",
            kind: "automation",
            label: "Schedule nightly smoke check",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved scheduled automation.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "automation.schedule",
            commandId: "cmd-automation-nightly",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-automation-nightly",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Automation scheduled through ValkyrAI cron.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-automation-nightly",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-automation-nightly",
            kind: "workflow_receipt",
            metadata: {
              schedule: "0 7 * * *",
              scheduleId: "automation-nightly-check",
              scheduler: "valkyrai-cron",
              schedulerSource: "valkyrai-cron-workflow-launcher",
              workflowRef: "workflow:digital-product-fulfillment",
            },
            receiptId: "command-receipt-automation-nightly",
            title: "Automation schedule proof",
            uri: "valkyrai://vaiworkflow/digital-product-fulfillment/schedule",
          },
        ],
        scheduledAutomations: [
          {
            approvalRequired: true,
            commandRef: "cmd-automation-nightly",
            id: "automation-nightly-check",
            label: "Nightly fulfillment smoke check",
            receiptIds: ["command-receipt-automation-nightly"],
            schedule: "0 7 * * *",
            scheduler: "valkyrai-cron",
            status: "scheduled",
            taskId: "valor-task-sagechat-001",
            valkyraiScheduleUri:
              "valkyrai://vaiworkflow/digital-product-fulfillment/schedule",
            workflowRef: "workflow:digital-product-fulfillment",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]).toMatchObject({
      capabilityId: "automation.schedule",
      status: "succeeded",
    });
  });

  it("rejects succeeded scheduled automations without ValkyrAI cron workflow proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "automation.schedule",
            kind: "automation",
            label: "Schedule automation",
            requiresApproval: true,
            risk: "high",
          },
        ],
        commands: [
          {
            capabilityId: "automation.schedule",
            command:
              "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment",
            id: "cmd-automation-nightly",
            kind: "automation",
            label: "Schedule nightly smoke check",
            requiresApproval: true,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:00:00.000Z",
              reason: "Approved scheduled automation.",
              threshold: "owner",
            },
            approved: true,
            capabilityId: "automation.schedule",
            commandId: "cmd-automation-nightly",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-automation-nightly",
            policyDecision: "approval-required",
            requiredApprovalThreshold: "owner",
            requiresApproval: true,
            status: "succeeded",
            summary: "Automation scheduled without cron proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-automation-nightly",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-automation-nightly",
            kind: "workflow_receipt",
            metadata: {
              schedule: "0 7 * * *",
              scheduleId: "automation-nightly-check",
              scheduler: "local",
              workflowRef: "workflow:digital-product-fulfillment",
            },
            receiptId: "command-receipt-automation-nightly",
            title: "Automation schedule proof",
            uri: "valoride://build-mode/automations/automation-nightly-check",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-automation-nightly succeeded automation.schedule requires workflow_receipt artifact metadata proving valkyrai-cron scheduler, valkyrai-cron-workflow-launcher source, scheduleId, and workflowRef.",
      ]),
    );
  });

  it("accepts succeeded GrayMatter memory receipts with final report artifact proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "graymatter.memory",
            kind: "graymatter",
            label: "GrayMatter memory",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "graymatter.memory",
            command: "report:publish build-mode-final-report",
            id: "cmd-final-report",
            kind: "report",
            label: "Publish final report",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "graymatter.memory",
            commandId: "cmd-final-report",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-final-report",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Final report queued for GrayMatter memory.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-final-report",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-final-report",
            kind: "final_report",
            metadata: {
              byteSize: 2048,
              contentHash:
                "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
              memoryStatus: "queued",
              reportTitle: "Final report",
            },
            receiptId: "receipt-final-report",
            title: "Final report",
            uri: "valoride://build-mode/reports/final",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.commandReceipts?.[0]).toMatchObject({
      capabilityId: "graymatter.memory",
      status: "succeeded",
    });
  });

  it("accepts succeeded GrayMatter context compile receipts with context artifact proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "graymatter.memory",
            kind: "graymatter",
            label: "GrayMatter memory",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "graymatter.memory",
            command: "graymatter:compile-context pack:gm-context-shop",
            id: "cmd-compile-context",
            kind: "inspect",
            label: "Compile GrayMatter context",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "graymatter.memory",
            commandId: "cmd-compile-context",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-compile-context",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "GrayMatter context compiled.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-compile-context",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-graymatter-context",
            kind: "graymatter_context",
            metadata: {
              byteSize: 1024,
              contentHash:
                "sha256:abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd",
              contextPackId: "gm-context-shop",
              invariantPreflightStatus: "passed",
              retrievalReceiptCount: 2,
              retrievalStatus: "ready",
              retrievalTraceId: "gm-trace-shop",
            },
            receiptId: "receipt-compile-context",
            title: "GrayMatter context compile receipt",
            uri: "valoride://build-mode/context/gm-context-shop",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.evidenceArtifacts?.[0]).toMatchObject({
      kind: "graymatter_context",
      metadata: {
        contextPackId: "gm-context-shop",
        retrievalStatus: "ready",
      },
    });
  });

  it("rejects succeeded GrayMatter memory receipts without final report artifact integrity proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "graymatter.memory",
            kind: "graymatter",
            label: "GrayMatter memory",
            requiresApproval: false,
            risk: "low",
          },
        ],
        commands: [
          {
            capabilityId: "graymatter.memory",
            command: "report:publish build-mode-final-report",
            id: "cmd-final-report",
            kind: "report",
            label: "Publish final report",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "graymatter.memory",
            commandId: "cmd-final-report",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-final-report",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Final report claimed written without proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-final-report",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-final-report",
            kind: "final_report",
            metadata: {
              memoryStatus: "written",
            },
            receiptId: "receipt-final-report",
            title: "Final report",
            uri: "valoride://build-mode/reports/final",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt receipt-final-report succeeded graymatter.memory requires final_report artifact metadata with memoryStatus queued or written, sha256 contentHash, positive byteSize, and memoryId when written, or graymatter_context artifact metadata with contextPackId, retrievalStatus, invariantPreflightStatus, retrievalReceiptCount, sha256 contentHash, and positive byteSize proof.",
      ]),
    );
  });

  it("accepts passed browser verification with screenshot and console receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        browserVerification: {
          artifactIds: [
            "artifact-browser-screenshot",
            "artifact-browser-console",
          ],
          consoleErrorCount: 0,
          previewUrl: "http://localhost:5173/apps/shop",
          screenshotReceiptId: "command-receipt-browser",
          status: "passed",
        },
        capabilities: [
          {
            enabled: true,
            id: "browser.automation",
            kind: "browser",
            label: "Browser verifier",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "browser.automation",
            command: "verify:http://localhost:5173/apps/shop",
            id: "cmd-browser-verify",
            kind: "verify",
            label: "Verify app in browser",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "browser.automation",
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-browser",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Browser verification passed.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-browser-screenshot",
            kind: "browser_screenshot",
            metadata: {
              byteSize: 2048,
              contentHash:
                "sha256:1111111111111111111111111111111111111111111111111111111111111111",
              currentUrl: "http://localhost:5173/apps/shop/",
              screenshotCaptured: true,
            },
            receiptId: "command-receipt-browser",
            title: "Browser screenshot",
            uri: "valoride://build-mode/artifacts/browser-screenshot",
          },
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-browser-console",
            kind: "browser_console",
            metadata: {
              byteSize: 128,
              consoleErrorCount: 0,
              contentHash:
                "sha256:2222222222222222222222222222222222222222222222222222222222222222",
              currentUrl: "http://localhost:5173/apps/shop#checkout",
            },
            receiptId: "command-receipt-browser",
            title: "Browser console",
            uri: "valoride://build-mode/artifacts/browser-console",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.issues).toEqual([]);
    expect(result.payload?.browserVerification).toMatchObject({
      artifactIds: ["artifact-browser-screenshot", "artifact-browser-console"],
      screenshotReceiptId: "command-receipt-browser",
      status: "passed",
    });
  });

  it("rejects passed browser verification when artifact URLs do not match the preview", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        browserVerification: {
          artifactIds: [
            "artifact-browser-screenshot",
            "artifact-browser-console",
          ],
          consoleErrorCount: 0,
          previewUrl: "http://localhost:5173/apps/shop",
          screenshotReceiptId: "command-receipt-browser",
          status: "passed",
        },
        commandReceipts: [
          {
            approved: true,
            capabilityId: "browser.automation",
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-browser",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Browser verification passed on the wrong URL.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-browser-screenshot",
            kind: "browser_screenshot",
            metadata: {
              byteSize: 2048,
              contentHash:
                "sha256:3333333333333333333333333333333333333333333333333333333333333333",
              currentUrl: "http://localhost:5173/apps/admin",
              screenshotCaptured: true,
            },
            receiptId: "command-receipt-browser",
            title: "Browser screenshot",
            uri: "valoride://build-mode/artifacts/browser-screenshot",
          },
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-browser-console",
            kind: "browser_console",
            metadata: {
              byteSize: 128,
              consoleErrorCount: 0,
              contentHash:
                "sha256:4444444444444444444444444444444444444444444444444444444444444444",
              currentUrl: "http://localhost:5173/apps/admin",
            },
            receiptId: "command-receipt-browser",
            title: "Browser console",
            uri: "valoride://build-mode/artifacts/browser-console",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-browser succeeded browser.automation requires browser_screenshot metadata with screenshotCaptured true plus sha256 contentHash and positive byteSize, and browser_console metadata with consoleErrorCount 0 plus sha256 contentHash and positive byteSize proof.",
        "Build Mode browserVerification evidenceArtifact artifact-browser-screenshot currentUrl must match previewUrl before browserVerification can pass.",
        "Build Mode browserVerification evidenceArtifact artifact-browser-console currentUrl must match previewUrl before browserVerification can pass.",
      ]),
    );
  });

  it("rejects succeeded browser automation receipts without screenshot and console proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "browser.automation",
            kind: "browser",
            label: "Browser verifier",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "browser.automation",
            command: "verify:http://localhost:5173/apps/shop",
            id: "cmd-browser-verify",
            kind: "verify",
            label: "Verify app in browser",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "browser.automation",
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-browser",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Browser verification claimed success without proof.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-browser-screenshot",
            kind: "browser_screenshot",
            metadata: {
              screenshotCaptured: false,
            },
            receiptId: "command-receipt-browser",
            title: "Browser screenshot",
            uri: "valoride://build-mode/artifacts/browser-screenshot",
          },
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-browser-console",
            kind: "browser_console",
            metadata: {
              consoleErrorCount: 2,
            },
            receiptId: "command-receipt-browser",
            title: "Browser console",
            uri: "valoride://build-mode/artifacts/browser-console",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-browser succeeded browser.automation requires browser_screenshot metadata with screenshotCaptured true plus sha256 contentHash and positive byteSize, and browser_console metadata with consoleErrorCount 0 plus sha256 contentHash and positive byteSize proof.",
      ]),
    );

    const mismatchedIdentityResult = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        capabilities: [
          {
            enabled: true,
            id: "browser.automation",
            kind: "browser",
            label: "Browser verifier",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "browser.automation",
            command: "verify:http://localhost:5173/apps/shop",
            id: "cmd-browser-verify",
            kind: "verify",
            label: "Verify app in browser",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            artifacts: [
              {
                commandId: "cmd-other",
                createdAt: "2026-06-22T12:00:00.000Z",
                id: "artifact-browser-mismatched-screenshot",
                kind: "browser_screenshot",
                metadata: {
                  byteSize: 2048,
                  contentHash:
                    "sha256:3333333333333333333333333333333333333333333333333333333333333333",
                  screenshotCaptured: true,
                },
                receiptId: "command-receipt-browser",
                title: "Browser screenshot",
                uri: "valoride://build-mode/artifacts/browser-screenshot",
              },
              {
                commandId: "cmd-browser-verify",
                createdAt: "2026-06-22T12:00:00.000Z",
                id: "artifact-browser-mismatched-console",
                kind: "browser_console",
                metadata: {
                  byteSize: 128,
                  consoleErrorCount: 0,
                  contentHash:
                    "sha256:4444444444444444444444444444444444444444444444444444444444444444",
                },
                receiptId: "command-receipt-other",
                title: "Browser console",
                uri: "valoride://build-mode/artifacts/browser-console",
              },
            ],
            capabilityId: "browser.automation",
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-browser",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary:
              "Browser verification claimed success with mismatched proof identity.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(mismatchedIdentityResult.payload).toBeUndefined();
    expect(mismatchedIdentityResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode commandReceipt command-receipt-browser succeeded browser.automation requires browser_screenshot metadata with screenshotCaptured true plus sha256 contentHash and positive byteSize, and browser_console metadata with consoleErrorCount 0 plus sha256 contentHash and positive byteSize proof.",
        "Build Mode commandReceipt command-receipt-browser artifact artifact-browser-mismatched-screenshot commandId cmd-other does not match receipt commandId cmd-browser-verify.",
        "Build Mode commandReceipt command-receipt-browser artifact artifact-browser-mismatched-console receiptId command-receipt-other does not match containing receipt.",
      ]),
    );
  });

  it("rejects passed browser verification without complete browser evidence proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        browserVerification: {
          artifactIds: [
            "artifact-browser-screenshot",
            "artifact-browser-console",
          ],
          consoleErrorCount: 2,
          previewUrl: "http://localhost:5173/apps/shop",
          screenshotReceiptId: "command-receipt-other",
          status: "passed",
        },
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
          {
            enabled: true,
            id: "browser.automation",
            kind: "browser",
            label: "Browser verifier",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            capabilityId: "browser.automation",
            command: "verify:http://localhost:5173/apps/shop",
            id: "cmd-browser-verify",
            kind: "verify",
            label: "Verify app in browser",
            requiresApproval: false,
            status: "succeeded",
          },
        ],
        commandReceipts: [
          {
            approved: true,
            capabilityId: "terminal.execute",
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "command-receipt-browser",
            policyDecision: "allow",
            requiresApproval: false,
            status: "failed",
            summary: "Not browser proof.",
          },
          {
            approved: true,
            capabilityId: "browser.automation",
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "command-receipt-console",
            policyDecision: "allow",
            requiresApproval: false,
            status: "succeeded",
            summary: "Browser console captured separately.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "artifact-browser-screenshot",
            kind: "browser_screenshot",
            receiptId: "command-receipt-browser",
            title: "Browser screenshot",
            uri: "valoride://build-mode/artifacts/browser-screenshot",
          },
          {
            commandId: "cmd-browser-verify",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "artifact-browser-console",
            kind: "browser_console",
            receiptId: "command-receipt-console",
            title: "Browser console",
            uri: "valoride://build-mode/artifacts/browser-console",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode browserVerification passed state requires consoleErrorCount 0.",
        "Build Mode browserVerification evidenceArtifact artifact-browser-screenshot receipt command-receipt-browser must use capability browser.automation.",
        "Build Mode browserVerification evidenceArtifact artifact-browser-screenshot receipt command-receipt-browser must be succeeded before browserVerification can pass.",
        "Build Mode browserVerification screenshotReceiptId command-receipt-other must match browser_screenshot evidenceArtifact artifact-browser-screenshot receiptId command-receipt-browser.",
        "Build Mode browserVerification screenshotReceiptId command-receipt-other must match browser_console evidenceArtifact artifact-browser-console receiptId command-receipt-console.",
      ]),
    );
  });

  it("requires written GrayMatter memory proof before final report ready state", () => {
    const readyPayload = {
      ...basePayload,
      capabilities: [
        {
          enabled: true,
          id: "graymatter.memory",
          kind: "graymatter",
          label: "GrayMatter memory",
          requiresApproval: false,
          risk: "low",
        },
      ],
      commands: [
        {
          capabilityId: "graymatter.memory",
          command: "report:publish build-mode-final-report",
          id: "cmd-final-report",
          kind: "report",
          label: "Publish final report",
          requiresApproval: false,
          status: "succeeded",
        },
      ],
      commandReceipts: [
        {
          approved: true,
          capabilityId: "graymatter.memory",
          commandId: "cmd-final-report",
          createdAt: "2026-06-22T12:00:00.000Z",
          id: "receipt-final-report",
          requiresApproval: false,
          status: "succeeded",
          summary: "Final report published.",
        },
      ],
      evidenceArtifacts: [
        {
          commandId: "cmd-final-report",
          createdAt: "2026-06-22T12:00:00.000Z",
          id: "artifact-final-report",
          kind: "final_report",
          metadata: {
            byteSize: 4096,
            contentHash:
              "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            memoryId: "memory-entry-final-report-001",
            memoryStatus: "written",
          },
          receiptId: "receipt-final-report",
          title: "Final report",
          uri: "valoride://build-mode/reports/final",
        },
      ],
      finalReport: {
        filesChanged: [],
        gaps: [],
        nextHandoff: [],
        status: "ready",
        testsRun: [],
        title: "Final report",
      },
      readinessGates: [
        {
          blocksRun: true,
          commandIds: ["cmd-final-report"],
          evidenceArtifactIds: ["artifact-final-report"],
          id: "gate-final-report-ready",
          label: "Final report ready",
          requiredCapabilityIds: ["graymatter.memory"],
          requiredReceiptIds: ["receipt-final-report"],
          status: "passed",
          summary: "Final report is durably written.",
        },
      ],
    };

    expect(
      coerceBuildModeTaskLaunchPayload(readyPayload, {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      }).issues,
    ).toEqual([]);

    const unresolvedGateResult = coerceBuildModeTaskLaunchPayload(
      {
        ...readyPayload,
        readinessGates: [
          ...readyPayload.readinessGates,
          {
            blocksRun: true,
            commandIds: [],
            evidenceArtifactIds: [],
            id: "gate-browser-verify",
            label: "Browser verification",
            requiredCapabilityIds: ["browser.automation"],
            requiredReceiptIds: [],
            status: "pending",
            summary: "Browser verification has not completed.",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(unresolvedGateResult.payload).toBeUndefined();
    expect(unresolvedGateResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode finalReport ready state requires all blocking readiness gates to be passed; unresolved gates: gate-browser-verify:pending.",
      ]),
    );

    const queuedResult = coerceBuildModeTaskLaunchPayload(
      {
        ...readyPayload,
        evidenceArtifacts: [
          {
            ...readyPayload.evidenceArtifacts[0],
            metadata: {
              memoryStatus: "queued",
            },
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(queuedResult.payload).toBeUndefined();
    expect(queuedResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode finalReport ready state requires a final_report evidence artifact with GrayMatter memoryStatus written and a receiptId.",
      ]),
    );

    const missingIntegrityResult = coerceBuildModeTaskLaunchPayload(
      {
        ...readyPayload,
        evidenceArtifacts: [
          {
            ...readyPayload.evidenceArtifacts[0],
            metadata: {
              memoryId: "memory-entry-final-report-001",
              memoryStatus: "written",
            },
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(missingIntegrityResult.payload).toBeUndefined();
    expect(missingIntegrityResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode finalReport ready state requires a final_report evidence artifact with sha256 contentHash and positive byteSize metadata.",
      ]),
    );

    const failedReceiptResult = coerceBuildModeTaskLaunchPayload(
      {
        ...readyPayload,
        commandReceipts: [
          {
            ...readyPayload.commandReceipts[0],
            status: "failed",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(failedReceiptResult.payload).toBeUndefined();
    expect(failedReceiptResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode finalReport ready state requires final_report evidence artifact receiptId to reference a succeeded graymatter.memory commandReceipt.",
      ]),
    );

    const wrongCapabilityResult = coerceBuildModeTaskLaunchPayload(
      {
        ...readyPayload,
        commandReceipts: [
          {
            ...readyPayload.commandReceipts[0],
            capabilityId: "terminal.execute",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(wrongCapabilityResult.payload).toBeUndefined();
    expect(wrongCapabilityResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode finalReport ready state requires final_report evidence artifact receiptId to reference a succeeded graymatter.memory commandReceipt.",
      ]),
    );

    const { commandId: _omittedCommandId, ...artifactWithoutCommandId } =
      readyPayload.evidenceArtifacts[0];
    const missingCommandIdResult = coerceBuildModeTaskLaunchPayload(
      {
        ...readyPayload,
        evidenceArtifacts: [artifactWithoutCommandId],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(missingCommandIdResult.payload).toBeUndefined();
    expect(missingCommandIdResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode finalReport ready state requires final_report evidence artifact commandId to match its graymatter.memory commandReceipt commandId.",
      ]),
    );

    const mismatchedCommandIdResult = coerceBuildModeTaskLaunchPayload(
      {
        ...readyPayload,
        evidenceArtifacts: [
          {
            ...readyPayload.evidenceArtifacts[0],
            commandId: "cmd-other",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(mismatchedCommandIdResult.payload).toBeUndefined();
    expect(mismatchedCommandIdResult.issues).toEqual(
      expect.arrayContaining([
        "Build Mode finalReport ready state requires final_report evidence artifact commandId to match its graymatter.memory commandReceipt commandId.",
      ]),
    );
  });

  it("rejects broken Build Mode runbook graph references at launch", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        agentLoop: [
          {
            capabilityIds: [],
            id: "loop-plan",
            label: "Plan",
            receiptIds: [],
            status: "ready",
          },
        ],
        agentRuntimes: [
          {
            handoffPolicy: "supervised",
            id: "runtime-codex",
            label: "Codex",
            loopPhaseIds: ["loop-missing"],
            ownerRole: "Supervisor",
            promptProfileId: "prompt-missing",
            providerRoute: "unsupported-route",
            receiptIds: [],
            runtime: "Codex",
            status: "available",
          },
        ],
        appBundle: {
          ...basePayload.appBundle,
          componentBundleIds: ["component-missing"],
          execModuleIds: ["exec-missing"],
        },
        autonomyPolicy: {
          allowedCapabilityIds: ["capability-missing"],
          approvalRequiredCapabilityIds: ["capability-approval-missing"],
          escalationRefs: [],
          id: "autonomy-policy",
          label: "Autonomy",
          maxConsecutiveCommands: 3,
          maxEstimatedCredits: 10,
          mode: "autonomous-local",
          receiptRequired: true,
          stopConditions: [],
        },
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: "terminal",
            label: "Terminal",
            requiresApproval: false,
            risk: "medium",
          },
        ],
        commands: [
          {
            assignedRuntimeId: "runtime-missing",
            capabilityId: "capability-missing",
            command: "npm test",
            executionPlanStepId: "plan-missing",
            id: "cmd-test",
            kind: "test",
            label: "Run tests",
            requiresApproval: false,
            status: "queued",
          },
        ],
        componentBundles: [],
        execModules: [],
        executionPlan: [
          {
            commandIds: ["cmd-missing"],
            dependencyStepIds: ["plan-missing"],
            id: "plan-test",
            label: "Test",
            nextAction: "Run tests",
            readinessGateIds: ["gate-missing"],
            receiptIds: [],
            runtimeId: "runtime-missing",
            status: "ready",
            summary: "Run tests.",
          },
        ],
        promptBundles: [
          {
            id: "prompt-bundle",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Prompt Bundle",
            policy: "locked",
            receiptIds: [],
            sections: [],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Build operator",
            id: "prompt-profile",
            modelFamily: "gpt",
            name: "Build Operator",
            promptBundleRef: "prompt-bundle-missing",
          },
        ],
        readinessGates: [
          {
            blocksRun: true,
            commandIds: ["cmd-missing"],
            evidenceArtifactIds: [],
            id: "gate-tests",
            label: "Tests",
            requiredCapabilityIds: ["capability-missing"],
            requiredReceiptIds: [],
            status: "pending",
            summary: "Tests must pass.",
          },
        ],
        scheduledAutomations: [
          {
            approvalRequired: true,
            commandRef: "cmd-missing",
            id: "automation-nightly-check",
            label: "Nightly smoke check",
            promptContext: {
              promptBundleId: "prompt-bundle-missing",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: [],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-missing",
              promptProfileName: "Missing prompt",
            },
            providerRoute: "unsupported-route",
            receiptIds: [],
            schedule: "0 7 * * *",
            scheduler: "local",
            status: "draft",
            workflowRef: "workflow:nightly-smoke",
          },
        ],
        selectedPromptBundleId: "prompt-bundle-missing",
        selectedPromptProfileId: "prompt-missing",
        toolPermissions: [
          {
            approvalThreshold: "operator",
            capabilityId: "capability-missing",
            decision: "allow",
            id: "permission-missing",
            label: "Missing capability",
            reason: "Fixture",
            receiptRequired: false,
            scopeRefs: [],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode appBundle references missing componentBundle component-missing.",
        "Build Mode appBundle references missing execModule exec-missing.",
        "Build Mode selectedPromptProfileId references missing promptProfile prompt-missing.",
        "Build Mode selectedPromptBundleId references missing promptBundle prompt-bundle-missing.",
        "Build Mode promptProfile prompt-profile references missing promptBundle prompt-bundle-missing.",
        "Build Mode agentRuntime runtime-codex references missing promptProfile prompt-missing.",
        "Build Mode agentRuntime runtime-codex has unsupported providerRoute.",
        "Build Mode agentRuntime runtime-codex references missing agentLoop phase loop-missing.",
        "Build Mode command cmd-test references missing capability capability-missing.",
        "Build Mode command cmd-test references missing agentRuntime runtime-missing.",
        "Build Mode command cmd-test references missing executionPlan step plan-missing.",
        "Build Mode executionPlan step plan-test references missing agentRuntime runtime-missing.",
        "Build Mode executionPlan step plan-test references missing command cmd-missing.",
        "Build Mode executionPlan step plan-test references missing readinessGate gate-missing.",
        "Build Mode executionPlan step plan-test references missing dependency step plan-missing.",
        "Build Mode readinessGate gate-tests references missing command cmd-missing.",
        "Build Mode readinessGate gate-tests references missing capability capability-missing.",
        "Build Mode toolPermission permission-missing references missing capability capability-missing.",
        "Build Mode autonomyPolicy references missing allowed capability capability-missing.",
        "Build Mode autonomyPolicy references missing approval capability capability-approval-missing.",
        "Build Mode scheduledAutomation automation-nightly-check must use scheduler valkyrai-cron.",
        "Build Mode scheduledAutomation automation-nightly-check references missing commandRef cmd-missing.",
        "Build Mode scheduledAutomation automation-nightly-check has unsupported providerRoute.",
        "Build Mode scheduledAutomation automation-nightly-check promptContext references missing promptProfile prompt-missing.",
        "Build Mode scheduledAutomation automation-nightly-check promptContext references missing promptBundle prompt-bundle-missing.",
      ]),
    );
  });

  it("rejects raw provider credential secrets without echoing them", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        providerCredentials: [
          {
            apiKey: "sk-test-secret",
            displayName: "Use my API key",
            id: "credential-ref-user-key",
            route: "bring-your-own-key",
            secret: "sk-test-secret",
            secretAvailable: true,
            tenantScoped: true,
            token: "jwt-secret",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual([
      "Build Mode task payload contains inline secret material at payload.providerCredentials[0].apiKey, payload.providerCredentials[0].secret, payload.providerCredentials[0].token.",
    ]);
    expect(JSON.stringify(result.issues)).not.toContain("sk-test-secret");
    expect(JSON.stringify(result.issues)).not.toContain("jwt-secret");
  });

  it("rejects non-credential launch payload secret material without echoing it", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          summary:
            "Use retrieved context only. Authorization: Bearer launch-secret-token",
        },
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual([
      "Build Mode task payload contains inline secret material at payload.grayMatterContextPack.summary.",
    ]);
    expect(JSON.stringify(result.issues)).not.toContain("launch-secret-token");
  });

  it("rejects credentialed browser preview launch URLs without echoing them", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        browserVerification: {
          artifactIds: [],
          consoleErrorCount: 0,
          previewUrl:
            "http://preview-user:preview-password@localhost:5173/apps/digital-product-pro",
          status: "not-started",
        },
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual([
      "Build Mode task payload contains inline secret material at payload.browserVerification.previewUrl.",
    ]);
    expect(JSON.stringify(result.issues)).not.toContain("preview-user");
    expect(JSON.stringify(result.issues)).not.toContain("preview-password");
  });

  it("rejects launch receipt and evidence secret material without echoing it", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        commandReceipts: [
          {
            approved: true,
            artifacts: [
              {
                commandId: "cmd-test",
                createdAt: "2026-06-22T12:01:00.000Z",
                id: "artifact-command-secret",
                kind: "command_stdout",
                metadata: {
                  apiKey: "launch-metadata-secret",
                  resourceUri:
                    "https://example.test/resource?access_token=launch-resource-secret",
                },
                receiptId: "command-receipt-secret",
                summary: "stdout included ghp_launchsecret1234567890",
                title: "Command artifact",
                uri: "https://example.test/artifacts?token=launch-artifact-secret",
              },
            ],
            capabilityId: "terminal.execute",
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "command-receipt-secret",
            requiresApproval: false,
            status: "failed",
            summary: "Command failed with api_key=launch-command-secret.",
          },
        ],
        evidenceArtifacts: [
          {
            commandId: "cmd-test",
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "artifact-evidence-secret",
            kind: "mcp_result",
            metadata: {
              apiKey: "launch-evidence-metadata-secret",
              receiptRef: "credential-ref-safe",
            },
            receiptId: "command-receipt-secret",
            summary: "Evidence summary token=launch-evidence-summary-secret.",
            title: "Evidence artifact",
            uri: "https://example.test/evidence?token=launch-evidence-uri-secret",
          },
        ],
        finalReport: {
          filesChanged: [],
          gaps: ["Gap includes password=launch-report-secret."],
          nextHandoff: [],
          status: "draft",
          testsRun: [],
          title: "Secret launch report",
        },
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    const serializedIssues = JSON.stringify(result.issues);

    expect(result.payload).toBeUndefined();
    expect(result.issues.join("\n")).toContain(
      "Build Mode task payload contains inline secret material at",
    );
    expect(result.issues.join("\n")).toContain(
      "payload.commandReceipts[0].summary",
    );
    expect(result.issues.join("\n")).toContain(
      "payload.commandReceipts[0].artifacts[0].metadata.apiKey",
    );
    expect(result.issues.join("\n")).toContain(
      "payload.evidenceArtifacts[0].metadata.apiKey",
    );
    expect(result.issues.join("\n")).toContain("payload.finalReport.gaps[0]");
    for (const leaked of [
      "launch-command-secret",
      "launch-metadata-secret",
      "launch-resource-secret",
      "ghp_launchsecret1234567890",
      "launch-artifact-secret",
      "launch-evidence-metadata-secret",
      "launch-evidence-summary-secret",
      "launch-evidence-uri-secret",
      "launch-report-secret",
    ]) {
      expect(serializedIssues).not.toContain(leaked);
    }
  });

  it("rejects launch metadata secret material across cockpit contracts without echoing it", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          artifacts: [
            {
              kind: "config",
              path: "apps/generated/app.json?token=backend-app-artifact-secret",
            },
          ],
          componentBundleIds: ["component-bundle-secret"],
          execModuleIds: ["exec-module-secret"],
          intent: "Authorization: Bearer backend-app-intent-secret",
          name: "Generated app token=backend-app-name-secret",
        },
        appBundleDiffs: [
          {
            addedArtifacts: [
              "apps/generated/new.tsx?token=backend-diff-added-secret",
            ],
            appBundleId: "app-bundle-sagechat-001",
            changedArtifacts: [],
            evidenceArtifactIds: [
              "artifact-diff?token=backend-diff-artifact-secret",
            ],
            generatedAt: "2026-06-22T12:02:00.000Z",
            id: "app-bundle-diff-secret",
            receiptIds: ["receipt-diff?token=backend-diff-receipt-secret"],
            removedArtifacts: [],
            title: "Diff token=backend-diff-title-secret",
          },
        ],
        autonomyPolicy: {
          allowedCapabilityIds: ["terminal.execute"],
          approvalRequiredCapabilityIds: [],
          escalationRefs: [
            "owner://security?token=backend-autonomy-escalation-secret",
          ],
          id: "autonomy-policy",
          label: "Policy",
          maxConsecutiveCommands: 3,
          maxEstimatedCredits: 42,
          mode: "approval-gated",
          receiptRequired: true,
          stopConditions: ["Stop on token=backend-autonomy-stop-secret"],
        },
        commandPolicyRules: [
          {
            effect: "deny",
            enabled: true,
            id: "command-policy-secret",
            label: "No secrets",
            pattern: "token=backend-policy-pattern-secret",
            reason: "Policy token=backend-policy-reason-secret",
          },
        ],
        componentBundles: [
          {
            editablePaths: [
              "apps/generated/src/App.tsx?token=backend-component-edit-secret",
            ],
            entrypoints: [],
            framework: "React",
            generatedBy: "Aurora",
            generatedPaths: [],
            id: "component-bundle-secret",
            name: "Component token=backend-component-name-secret",
            status: "ready",
          },
        ],
        creditEstimate: {
          assumptions: [
            "Estimate includes access_token=backend-credit-assumption-secret",
          ],
          currency: "ValkyrCredits",
          estimatedCredits: 4,
          estimatedHostedInfrastructureCredits: 1,
          id: "credit-estimate-secret",
          providerRoute: "valkyr-credits",
        },
        execModules: [
          {
            capability: "Fulfill purchase",
            id: "exec-module-secret",
            inputSchemaRef: "schema://input?token=backend-exec-schema-secret",
            name: "execModule",
            outputSchemaRef: "schema://output",
            owner: "owner token=backend-exec-owner-secret",
            safetyLevel: "approval-required",
            version: "1.0.0",
          },
        ],
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          retrievalTraceId: "trace?token=backend-gm-trace-secret",
          sourceRefs: ["gm://source?token=backend-gm-source-secret"],
          summary: "Context token=backend-gm-summary-secret",
        },
        promptBundles: [
          {
            id: "prompt-bundle-secret",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Prompt bundle",
            policy: "locked",
            receiptIds: [],
            sections: [
              {
                id: "prompt-section-secret",
                purpose: "Use token=backend-prompt-purpose-secret",
                sourceRef:
                  "prompt://section?token=backend-prompt-source-secret",
                title: "Prompt section",
              },
            ],
            source: "Valkyr",
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Prompt token=backend-prompt-profile-secret",
            id: "prompt-profile-secret",
            modelFamily: "gpt",
            name: "Build Operator",
            promptBundleRef: "prompt-bundle-secret",
          },
        ],
        readinessGates: [
          {
            blocksRun: true,
            commandIds: [],
            evidenceArtifactIds: [
              "artifact-gate?token=backend-gate-artifact-secret",
            ],
            id: "gate-secret",
            label: "Gate",
            requiredCapabilityIds: [],
            requiredReceiptIds: [],
            status: "pending",
            summary: "Gate token=backend-gate-summary-secret",
          },
        ],
        safeEditPlans: [
          {
            commandId: "cmd-secret",
            id: "safe-edit-secret",
            label: "Safe edit",
            protectedPaths: [],
            receiptIds: [],
            status: "draft",
            summary: "Safe edit token=backend-safe-edit-summary-secret",
            targetPaths: [
              "apps/generated/src/App.tsx?token=backend-safe-edit-target-secret",
            ],
            tool: "psr.edit",
          },
        ],
        scheduledAutomations: [
          {
            approvalRequired: true,
            id: "automation-secret",
            label: "Nightly token=backend-automation-label-secret",
            promptContext: {
              promptBundleId: "prompt-bundle-secret",
              promptBundlePolicy: "locked",
              promptBundleReceiptIds: [
                "receipt-prompt?token=backend-automation-prompt-receipt-secret",
              ],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-profile-secret",
              promptProfileName: "Build Operator",
            },
            receiptIds: [],
            schedule: "0 7 * * *",
            scheduler: "valkyrai-cron",
            status: "draft",
            workflowRef:
              "workflow:nightly?token=backend-automation-workflow-secret",
          },
        ],
        scope: {
          ...basePayload.scope,
          policyRefs: ["policy://build?token=backend-scope-policy-secret"],
        },
        swarmRoles: [
          ...requiredSwarmRoleAssignments,
          {
            currentFocus: "Focus token=backend-swarm-focus-secret",
            owner: "owner token=backend-swarm-owner-secret",
            role: "Supervisor",
            status: "assigned",
          },
        ],
        thorApiVaixBindings: [
          {
            clientRef: "thorapi://client?token=backend-thorapi-client-secret",
            editableAdapterPaths: [],
            generatedPaths: [
              "src/thorapi/model/User.ts?token=backend-thorapi-path-secret",
            ],
            id: "thorapi-binding-secret",
            operationRefs: [],
            policy: "readonly-generated",
            receiptIds: [],
            serviceName: "ThorAPI",
            surface: "ThorAPI",
          },
        ],
        toolPermissions: [
          {
            approvalThreshold: "operator",
            capabilityId: "terminal.execute",
            decision: "approval-required",
            id: "tool-permission-secret",
            label: "Terminal",
            reason: "Permission token=backend-permission-reason-secret",
            receiptRequired: true,
            scopeRefs: [
              "scope://workspace?token=backend-permission-scope-secret",
            ],
          },
        ],
        workflowMcpBindings: [
          {
            approvalRequired: true,
            execModuleId: "exec-module-secret",
            id: "workflow-mcp-secret",
            inputContractRef:
              "contract://input?token=backend-workflow-contract-secret",
            serverName: "private-valkyr-workflows",
            toolName: "fulfillPurchase",
            workflowRef: "workflow:fulfill?token=backend-workflow-ref-secret",
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    const serializedIssues = JSON.stringify(result.issues);

    expect(result.payload).toBeUndefined();
    expect(result.issues.join("\n")).toContain(
      "Build Mode task payload contains inline secret material at",
    );
    for (const path of [
      "payload.appBundle.name",
      "payload.appBundle.intent",
      "payload.grayMatterContextPack.summary",
      "payload.componentBundles[0].name",
      "payload.execModules[0].inputSchemaRef",
      "payload.promptProfiles[0].description",
      "payload.promptBundles[0].sections[0].sourceRef",
      "payload.workflowMcpBindings[0].workflowRef",
      "payload.scheduledAutomations[0].workflowRef",
      "payload.commandPolicyRules[0].pattern",
      "payload.readinessGates[0].summary",
      "payload.appBundleDiffs[0].title",
    ]) {
      expect(result.issues.join("\n")).toContain(path);
    }
    for (const leaked of [
      "backend-app-artifact-secret",
      "backend-app-intent-secret",
      "backend-app-name-secret",
      "backend-diff-added-secret",
      "backend-diff-artifact-secret",
      "backend-diff-receipt-secret",
      "backend-diff-title-secret",
      "backend-autonomy-escalation-secret",
      "backend-autonomy-stop-secret",
      "backend-policy-pattern-secret",
      "backend-policy-reason-secret",
      "backend-component-edit-secret",
      "backend-component-name-secret",
      "backend-credit-assumption-secret",
      "backend-exec-schema-secret",
      "backend-exec-owner-secret",
      "backend-gm-trace-secret",
      "backend-gm-source-secret",
      "backend-gm-summary-secret",
      "backend-prompt-purpose-secret",
      "backend-prompt-source-secret",
      "backend-prompt-profile-secret",
      "backend-gate-artifact-secret",
      "backend-gate-summary-secret",
      "backend-safe-edit-summary-secret",
      "backend-safe-edit-target-secret",
      "backend-automation-label-secret",
      "backend-automation-prompt-receipt-secret",
      "backend-automation-workflow-secret",
      "backend-scope-policy-secret",
      "backend-swarm-focus-secret",
      "backend-swarm-owner-secret",
      "backend-thorapi-client-secret",
      "backend-thorapi-path-secret",
      "backend-permission-reason-secret",
      "backend-permission-scope-secret",
      "backend-workflow-contract-secret",
      "backend-workflow-ref-secret",
    ]) {
      expect(serializedIssues).not.toContain(leaked);
    }
  });

  it("rejects unsupported launch enum values without echoing enum payloads", () => {
    const invalidEnum = (field: string) => `token=backend-enum-${field}-secret`;
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        appBundle: {
          ...basePayload.appBundle,
          artifacts: [
            {
              kind: invalidEnum("app-artifact-kind"),
              path: "apps/generated/App.tsx",
            },
          ],
          componentBundleIds: ["component-bundle-enum"],
          execModuleIds: ["exec-module-enum"],
        },
        agentLoop: [
          {
            capabilityIds: [],
            id: "loop-enum",
            label: "Enum loop",
            receiptIds: [],
            status: invalidEnum("agent-loop-status"),
          },
        ],
        agentRuntimes: [
          {
            handoffPolicy: invalidEnum("runtime-handoff"),
            id: "runtime-enum",
            label: "Enum runtime",
            loopPhaseIds: ["loop-enum"],
            ownerRole: invalidEnum("runtime-owner-role"),
            promptProfileId: "prompt-profile-enum",
            providerRoute: invalidEnum("runtime-provider-route"),
            receiptIds: [],
            runtime: invalidEnum("runtime-kind"),
            status: invalidEnum("runtime-status"),
          },
        ],
        autonomyPolicy: {
          allowedCapabilityIds: ["terminal.execute"],
          approvalRequiredCapabilityIds: [],
          escalationRefs: [],
          id: "autonomy-enum",
          label: "Enum autonomy",
          maxConsecutiveCommands: 3,
          maxEstimatedCredits: 42,
          mode: invalidEnum("autonomy-mode"),
          receiptRequired: true,
          stopConditions: [],
        },
        browserVerification: {
          artifactIds: [],
          consoleErrorCount: 0,
          status: invalidEnum("browser-status"),
        },
        capabilities: [
          {
            enabled: true,
            id: "terminal.execute",
            kind: invalidEnum("capability-kind"),
            label: "Terminal",
            requiresApproval: false,
            risk: invalidEnum("capability-risk"),
          },
        ],
        checkpoints: [
          {
            id: "checkpoint-enum",
            label: "Enum checkpoint",
            receiptIds: [],
            status: invalidEnum("checkpoint-status"),
            summary: "Enum checkpoint",
          },
        ],
        commandPolicyRules: [
          {
            commandKinds: [invalidEnum("command-policy-kind")],
            effect: invalidEnum("command-policy-effect"),
            enabled: true,
            id: "policy-rule-enum",
            label: "Enum rule",
            pattern: "npm",
            reason: "Enum policy",
          },
        ],
        commandReceipts: [
          {
            approval: {
              approved: true,
              approverPrincipalId: "principal-valhalla-operator",
              approverRoles: ["Owner"],
              createdAt: "2026-06-22T12:01:00.000Z",
              reason: "Enum approval",
              threshold: invalidEnum("approval-threshold"),
            },
            approved: true,
            artifacts: [
              {
                createdAt: "2026-06-22T12:01:00.000Z",
                id: "receipt-artifact-enum",
                kind: invalidEnum("receipt-artifact-kind"),
                title: "Receipt artifact",
                uri: "valoride://artifact",
              },
            ],
            assignedSwarmRole: invalidEnum("receipt-swarm-role"),
            capabilityId: "terminal.execute",
            commandId: "cmd-enum",
            createdAt: "2026-06-22T12:01:00.000Z",
            creditUsageReceipt: {
              actualCredits: 1,
              capabilityId: "terminal.execute",
              commandId: "cmd-enum",
              commandStatus: invalidEnum("nested-credit-status"),
              createdAt: "2026-06-22T12:01:00.000Z",
              estimateId: "credit-estimate-enum",
              hostedInfrastructureCredits: 1,
              id: "credit-usage-nested-enum",
              providerCredits: 0,
              providerRoute: invalidEnum("nested-credit-provider-route"),
            },
            executionMode: invalidEnum("receipt-execution-mode"),
            grayMatterContextProof: {
              answerPolicy: invalidEnum("gm-proof-answer-policy"),
              contextPackId: "gm-context-sagechat-001",
              invariantPreflightStatus: invalidEnum("gm-proof-preflight"),
              retrievalReceiptIds: ["retrieval-receipt-sagechat-001"],
              retrievalStatus: invalidEnum("gm-proof-retrieval"),
            },
            id: "command-receipt-enum",
            nextOperatorAction: invalidEnum("receipt-next-action"),
            policyDecision: invalidEnum("receipt-policy-decision"),
            promptContext: {
              promptBundleId: "prompt-bundle-enum",
              promptBundlePolicy: invalidEnum("receipt-prompt-policy"),
              promptBundleReceiptIds: ["receipt-prompt-enum"],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-profile-enum",
              promptProfileName: "Enum prompt",
            },
            requiredApprovalThreshold: invalidEnum(
              "receipt-required-threshold",
            ),
            requiresApproval: true,
            status: invalidEnum("receipt-status"),
            summary: "Enum receipt",
          },
        ],
        commands: [
          {
            assignedSwarmRole: invalidEnum("command-swarm-role"),
            capabilityId: "terminal.execute",
            command: "npm test",
            id: "cmd-enum",
            kind: invalidEnum("command-kind"),
            label: "Enum command",
            requiresApproval: false,
            status: invalidEnum("command-status"),
          },
        ],
        componentBundles: [
          {
            editablePaths: [],
            entrypoints: [],
            framework: "React",
            generatedBy: invalidEnum("component-generated-by"),
            generatedPaths: [],
            id: "component-bundle-enum",
            name: "Enum component",
            status: invalidEnum("component-status"),
          },
        ],
        creditEstimate: {
          assumptions: [],
          currency: invalidEnum("credit-currency"),
          estimatedCredits: 1,
          estimatedHostedInfrastructureCredits: 1,
          id: "credit-estimate-enum",
          providerRoute: invalidEnum("credit-provider-route"),
        },
        creditUsageReceipts: [
          {
            actualCredits: 1,
            capabilityId: "terminal.execute",
            commandId: "cmd-enum",
            commandStatus: invalidEnum("credit-command-status"),
            createdAt: "2026-06-22T12:01:00.000Z",
            estimateId: "credit-estimate-enum",
            hostedInfrastructureCredits: 1,
            id: "credit-usage-enum",
            providerCredits: 0,
            providerRoute: invalidEnum("credit-provider-route"),
          },
        ],
        evidenceArtifacts: [
          {
            createdAt: "2026-06-22T12:01:00.000Z",
            id: "evidence-enum",
            kind: invalidEnum("evidence-kind"),
            title: "Evidence",
            uri: "valoride://evidence",
          },
        ],
        execModules: [
          {
            capability: "Enum capability",
            id: "exec-module-enum",
            inputSchemaRef: "schema://enum-input",
            name: "enumModule",
            outputSchemaRef: "schema://enum-output",
            owner: "ValorIDE",
            safetyLevel: invalidEnum("exec-safety"),
            version: "1.0.0",
          },
        ],
        executionPlan: [
          {
            commandIds: ["cmd-enum"],
            dependencyStepIds: [],
            id: "plan-enum",
            label: "Enum plan",
            nextAction: "Run enum command",
            readinessGateIds: ["gate-enum"],
            receiptIds: [],
            runtimeId: "runtime-enum",
            status: invalidEnum("execution-plan-status"),
            summary: "Enum plan",
          },
        ],
        finalReport: {
          filesChanged: [],
          gaps: [],
          nextHandoff: [],
          status: invalidEnum("final-report-status"),
          testsRun: [],
          title: "Enum report",
        },
        grayMatterContextPack: {
          ...basePayload.grayMatterContextPack,
          answerPolicy: invalidEnum("gm-answer-policy"),
          policy: invalidEnum("gm-policy"),
        },
        guardrails: [
          {
            enforcement: invalidEnum("guardrail-enforcement"),
            id: "guardrail-enum",
            label: "Enum guardrail",
            summary: "Enum guardrail",
          },
        ],
        promptBundles: [
          {
            id: "prompt-bundle-enum",
            loadedAt: "2026-06-22T12:00:00.000Z",
            name: "Enum prompt bundle",
            policy: invalidEnum("prompt-policy"),
            receiptIds: ["receipt-prompt-enum"],
            sections: [],
            source: invalidEnum("prompt-source"),
            version: "1.0.0",
          },
        ],
        promptProfiles: [
          {
            description: "Enum prompt",
            id: "prompt-profile-enum",
            modelFamily: "gpt",
            name: "Enum prompt",
            promptBundleRef: "prompt-bundle-enum",
          },
        ],
        readinessGates: [
          {
            blocksRun: true,
            commandIds: ["cmd-enum"],
            evidenceArtifactIds: [],
            id: "gate-enum",
            label: "Enum gate",
            requiredCapabilityIds: ["terminal.execute"],
            requiredReceiptIds: [],
            status: invalidEnum("readiness-status"),
            summary: "Enum gate",
          },
        ],
        receipts: [
          {
            actor: "ValorIDE",
            createdAt: "2026-06-22T12:00:00.000Z",
            id: "receipt-prompt-enum",
            kind: invalidEnum("receipt-kind"),
            status: invalidEnum("receipt-status"),
            summary: "Enum receipt",
            title: "Prompt receipt",
          },
        ],
        safeEditPlans: [
          {
            commandId: "cmd-enum",
            id: "safe-edit-enum",
            label: "Enum safe edit",
            protectedPaths: [],
            receiptIds: [],
            status: invalidEnum("safe-edit-status"),
            summary: "Enum safe edit",
            targetPaths: [],
            tool: invalidEnum("safe-edit-tool"),
          },
        ],
        scheduledAutomations: [
          {
            approvalRequired: true,
            id: "automation-enum",
            label: "Enum automation",
            lastRunStatus: invalidEnum("automation-last-run-status"),
            promptContext: {
              promptBundleId: "prompt-bundle-enum",
              promptBundlePolicy: invalidEnum("automation-prompt-policy"),
              promptBundleReceiptIds: ["receipt-prompt-enum"],
              promptBundleVersion: "1.0.0",
              promptProfileId: "prompt-profile-enum",
              promptProfileName: "Enum prompt",
            },
            receiptIds: [],
            runHistory: [
              {
                completedAt: "2026-06-22T12:01:00.000Z",
                receiptId: "command-receipt-enum",
                status: invalidEnum("automation-run-status"),
              },
            ],
            schedule: "0 7 * * *",
            scheduler: invalidEnum("automation-scheduler"),
            status: invalidEnum("automation-status"),
            workflowRef: "workflow:nightly-enum",
          },
        ],
        swarmRoles: [
          {
            currentFocus: "Enum focus",
            owner: "ValorIDE",
            role: invalidEnum("swarm-role"),
            status: invalidEnum("swarm-status"),
          },
        ],
        thorApiVaixBindings: [
          {
            clientRef: "thorapi://enum",
            editableAdapterPaths: [],
            generatedPaths: [],
            id: "thorapi-enum",
            operationRefs: [],
            policy: invalidEnum("thorapi-policy"),
            receiptIds: [],
            serviceName: "ThorAPI",
            surface: invalidEnum("thorapi-surface"),
          },
        ],
        toolPermissions: [
          {
            approvalThreshold: invalidEnum("tool-approval-threshold"),
            capabilityId: "terminal.execute",
            decision: invalidEnum("tool-decision"),
            id: "tool-permission-enum",
            label: "Enum permission",
            reason: "Enum permission",
            receiptRequired: true,
            scopeRefs: [],
          },
        ],
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    const serializedIssues = JSON.stringify(result.issues);

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "Build Mode appBundle.artifacts[0].kind has unsupported enum value.",
        "Build Mode componentBundles[0].generatedBy has unsupported enum value.",
        "Build Mode grayMatterContextPack.policy has unsupported enum value.",
        "Build Mode creditEstimate.currency has unsupported enum value.",
        "Build Mode scheduledAutomations[0].scheduler has unsupported enum value.",
        "Build Mode agentRuntimes[0].handoffPolicy has unsupported enum value.",
        "Build Mode commandReceipts[0].policyDecision has unsupported enum value.",
        "Build Mode commandReceipts[0].grayMatterContextProof.retrievalStatus has unsupported enum value.",
        "Build Mode evidenceArtifacts[0].kind has unsupported enum value.",
        "Build Mode finalReport.status has unsupported enum value.",
      ]),
    );
    for (const leaked of [
      "backend-enum-app-artifact-kind-secret",
      "backend-enum-component-generated-by-secret",
      "backend-enum-gm-policy-secret",
      "backend-enum-credit-provider-route-secret",
      "backend-enum-runtime-handoff-secret",
      "backend-enum-receipt-policy-decision-secret",
      "backend-enum-evidence-kind-secret",
      "backend-enum-final-report-status-secret",
      "backend-enum-swarm-role-secret",
      "backend-enum-automation-scheduler-secret",
    ]) {
      expect(serializedIssues).not.toContain(leaked);
    }
  });

  it("rejects launch payloads without GrayMatter receipt proof", () => {
    const result = coerceBuildModeTaskLaunchPayload(
      {
        ...basePayload,
        grayMatterContextPack: {
          id: "gm-context-sagechat-001",
          invariantPreflightStatus: "missing",
          retrievalReceiptIds: [],
          retrievalStatus: "blocked",
        },
      },
      {
        now: fixedNow,
        workspaceRoot: "/workspace/valor",
      },
    );

    expect(result.payload).toBeUndefined();
    expect(result.issues).toEqual(
      expect.arrayContaining([
        "GrayMatter context pack requires retrieval receipt ids.",
        "GrayMatter invariant preflight must be passed.",
        "GrayMatter context retrieval status must be ready.",
      ]),
    );
  });

  it("rejects launch payloads outside the active workspace root", () => {
    const result = coerceBuildModeTaskLaunchPayload(basePayload, {
      now: fixedNow,
      workspaceRoot: "/other/workspace",
    });

    expect(result.payload).toBeUndefined();
    expect(result.issues).toContain(
      "Build Mode task workspaceRoot is outside the active workspace: /workspace/valor/apps/generated.",
    );
  });
});
