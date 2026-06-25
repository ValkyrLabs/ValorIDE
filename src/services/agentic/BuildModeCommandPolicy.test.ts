import {
  evaluateBuildModeCommandPolicy,
  findSecretMaterialPaths,
  redactCommandSecrets,
} from "./BuildModeCommandPolicy";
import type {
  BuildModeCommand,
  ProviderCredentialRef,
  Receipt,
} from "@shared/BuildMode";

const baseCommand: BuildModeCommand = {
  id: "cmd-policy-test",
  kind: "test",
  label: "Policy test command",
  command: "npm test",
  capabilityId: "terminal.execute",
  requiresApproval: false,
  status: "queued",
};

const providerCredentialReceipts: Receipt[] = [
  {
    id: "receipt-provider-byo",
    kind: "context",
    title: "BYO provider credential proof",
    status: "approved",
    createdAt: "2026-06-21T20:00:00.000Z",
    actor: "Build Mode",
    summary: "BYO provider credential ref authorized.",
  },
  {
    id: "receipt-provider-local",
    kind: "context",
    title: "Local model provider proof",
    status: "approved",
    createdAt: "2026-06-21T20:00:00.000Z",
    actor: "Build Mode",
    summary: "Local model route authorized.",
  },
  {
    id: "receipt-provider-enterprise",
    kind: "context",
    title: "Enterprise proxy provider proof",
    status: "approved",
    createdAt: "2026-06-21T20:00:00.000Z",
    actor: "Build Mode",
    summary: "Enterprise proxy route authorized.",
  },
];

const providerCredentials: ProviderCredentialRef[] = [
  {
    id: "credential-ref-byo",
    route: "bring-your-own-key",
    displayName: "Use my API key",
    tenantScoped: true,
    secretAvailable: true,
    receiptIds: ["receipt-provider-byo"],
  },
  {
    id: "credential-ref-local",
    route: "local-model",
    displayName: "Use local model",
    tenantScoped: false,
    secretAvailable: false,
    receiptIds: ["receipt-provider-local"],
  },
  {
    id: "credential-ref-enterprise",
    route: "enterprise-proxy",
    displayName: "Use enterprise proxy",
    tenantScoped: true,
    secretAvailable: true,
    receiptIds: ["receipt-provider-enterprise"],
  },
];

describe("BuildModeCommandPolicy secret material detection", () => {
  it("finds nested raw secret arguments and allows credential refs", () => {
    expect(
      findSecretMaterialPaths({
        credentials: {
          apiKey: "raw-workflow-secret",
          tokenRef: "credential-ref-user-key",
        },
        workflow: "fulfillment",
      }),
    ).toEqual(["payload.credentials.apiKey"]);
  });

  it("redacts quoted JSON secret properties without redacting refs", () => {
    const redacted = redactCommandSecrets(
      'mcp:workflow.run args:{"apiKey":"raw-workflow-secret","token":"secret-ref:tenant/workflow"}',
    );

    expect(redacted).toContain('"apiKey":"<redacted>"');
    expect(redacted).toContain('"token":"secret-ref:tenant/workflow"');
    expect(redacted).not.toContain("raw-workflow-secret");
  });

  it("redacts URL embedded credentials and flags them as secret material", () => {
    const value =
      "browser:verify url:http://preview-user:preview-password@localhost:5173/apps/digital-product-pro";

    expect(redactCommandSecrets(value)).toBe(
      "browser:verify url:http://<redacted-secret>@localhost:5173/apps/digital-product-pro",
    );
    expect(findSecretMaterialPaths({ previewUrl: value })).toEqual([
      "payload.previewUrl",
    ]);
  });
});

describe("BuildModeCommandPolicy generated artifact protection", () => {
  it("rejects direct edits to generated source directories outside ThorAPI folders", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        capabilityId: "psr.edit",
        command: 'psr:apps/shop/src/generated/client.ts replace:"old" with:"new"',
        id: "cmd-edit-generated-client",
        kind: "edit",
        label: "Edit generated client",
        targetPaths: ["apps/shop/src/generated/client.ts"],
      }),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Generated artifact is protected from direct edits: apps/shop/src/generated/client.ts.",
      ]),
    });
  });

  it("rejects inline interpreter writes to generated source files", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        command:
          "node -e \"require('fs').writeFileSync('apps/shop/src/generated.ts', 'bad')\"",
        id: "cmd-inline-generated-file-write",
        kind: "build",
        label: "Inline generated file write",
      }),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Generated artifact is protected from direct edits: apps/shop/src/generated.ts.",
      ]),
    });
  });

  it("allows OpenAPI spec edits so VAIX can regenerate derived artifacts", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        capabilityId: "psr.edit",
        command:
          'psr:apps/shop/openapi/product.yaml replace:"old" with:"new"',
        id: "cmd-edit-openapi-spec",
        kind: "edit",
        label: "Edit OpenAPI spec",
        targetPaths: ["apps/shop/openapi/product.yaml"],
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining(["Safe edit commands require approval."]),
    });
  });
});

describe("BuildModeCommandPolicy default high-risk capability approval", () => {
  it("requires approval for MCP tools even when command metadata omits it", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        capabilityId: "mcp.tool",
        command: "mcp:private-valkyr-workflows.run input:workflow.json",
        id: "cmd-mcp-default-approval",
        kind: "mcp",
        label: "Run MCP tool",
        requiresApproval: false,
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Capability mcp.tool requires approval by default.",
      ]),
      requiredApprovalThreshold: "operator",
      requiresApproval: true,
    });
  });

  it("requires approval for ValkyrAI workflows even when command metadata omits it", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        capabilityId: "workflow.execute",
        command:
          "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase workflow:workflow:digital-product-fulfillment",
        id: "cmd-workflow-default-approval",
        kind: "workflow",
        label: "Run workflow",
        requiresApproval: false,
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Capability workflow.execute requires approval by default.",
      ]),
      requiredApprovalThreshold: "operator",
      requiresApproval: true,
    });
  });
});

describe("BuildModeCommandPolicy approval thresholds", () => {
  it("rejects receipt-required execution dependencies without succeeded receipt proof", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          id: "cmd-test",
        },
        {
          autonomyPolicy: {
            id: "autonomy-policy-receipts",
            label: "Receipt-gated autonomy",
            mode: "autonomous-local",
            maxConsecutiveCommands: 4,
            maxEstimatedCredits: 50,
            allowedCapabilityIds: ["terminal.execute"],
            approvalRequiredCapabilityIds: [],
            stopConditions: [],
            escalationRefs: [],
            receiptRequired: true,
          },
          commandReceipts: [],
          executionPlan: [
            {
              commandIds: ["cmd-safe-edit"],
              dependencyStepIds: [],
              id: "plan-safe-edits",
              label: "Safe edits",
              nextAction: "Run tests.",
              readinessGateIds: [],
              receiptIds: ["receipt-safe-edit"],
              runtimeId: "runtime-codex",
              status: "complete",
              summary: "Safe edits complete.",
            },
            {
              commandIds: ["cmd-test"],
              dependencyStepIds: ["plan-safe-edits"],
              id: "plan-tests",
              label: "Run tests",
              nextAction: "Run tests.",
              readinessGateIds: [],
              receiptIds: [],
              runtimeId: "runtime-codex",
              status: "ready",
              summary: "Run tests.",
            },
          ],
        },
      ),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Command policy dependency receipt proof is missing for cmd-safe-edit.",
      ]),
    });
  });

  it("rejects commands attached to pending execution-plan steps", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          assignedRuntimeId: "runtime-codex",
          assignedSwarmRole: "Test Runner",
          executionPlanStepId: "plan-tests",
          id: "cmd-test",
        },
        {
          executionPlan: [
            {
              commandIds: ["cmd-test"],
              dependencyStepIds: [],
              id: "plan-tests",
              label: "Run tests",
              nextAction: "Run tests.",
              readinessGateIds: [],
              receiptIds: [],
              runtimeId: "runtime-codex",
              status: "pending",
              summary: "Run tests.",
            },
          ],
        },
      ),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Execution plan step is not runnable: Run tests (pending).",
      ]),
    });
  });

  it("allows commands attached to running execution-plan steps", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          assignedRuntimeId: "runtime-codex",
          assignedSwarmRole: "Test Runner",
          executionPlanStepId: "plan-tests",
          id: "cmd-test",
        },
        {
          executionPlan: [
            {
              commandIds: ["cmd-test"],
              dependencyStepIds: [],
              id: "plan-tests",
              label: "Run tests",
              nextAction: "Run tests.",
              readinessGateIds: [],
              receiptIds: [],
              runtimeId: "runtime-codex",
              status: "running",
              summary: "Run tests.",
            },
          ],
        },
      ),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
    });
  });

  it("rejects execution-plan commands with unavailable or mismatched ownership proof", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          assignedRuntimeId: "runtime-test-runner",
          assignedSwarmRole: "Test Runner",
          executionPlanStepId: "plan-tests",
          id: "cmd-test",
        },
        {
          agentRuntimes: [
            {
              id: "runtime-test-runner",
              runtime: "Codex",
              label: "Test runner",
              status: "blocked",
              ownerRole: "Security Auditor",
              promptProfileId: "prompt-profile-valhalla",
              providerRoute: "enterprise-proxy",
              loopPhaseIds: [],
              handoffPolicy: "supervised",
              receiptIds: [],
            },
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
              status: "ready",
              summary: "Run tests.",
            },
          ],
          swarmRoles: [
            {
              role: "Test Runner",
              status: "blocked",
              owner: "ValorIDE",
              currentFocus: "Run tests",
            },
          ],
        },
      ),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Command policy agentRuntime runtime-test-runner is not available: blocked.",
        "Command policy assignedSwarmRole Test Runner does not match runtime runtime-test-runner ownerRole Security Auditor.",
        "Command policy swarmRole Test Runner is not available: blocked.",
      ]),
    });
  });

  it("rejects execution-plan commands assigned to busy runtime and swarm ownership", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          assignedRuntimeId: "runtime-test-runner",
          assignedSwarmRole: "Test Runner",
          executionPlanStepId: "plan-tests",
          id: "cmd-test",
        },
        {
          agentRuntimes: [
            {
              id: "runtime-test-runner",
              runtime: "Codex",
              label: "Test runner",
              status: "running",
              ownerRole: "Test Runner",
              promptProfileId: "prompt-profile-valhalla",
              providerRoute: "enterprise-proxy",
              loopPhaseIds: [],
              handoffPolicy: "supervised",
              receiptIds: [],
            },
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
              status: "ready",
              summary: "Run tests.",
            },
          ],
          swarmRoles: [
            {
              role: "Test Runner",
              status: "running",
              owner: "ValorIDE",
              currentFocus: "Running previous test command",
            },
          ],
        },
      ),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Command policy agentRuntime runtime-test-runner is not available: running.",
        "Command policy swarmRole Test Runner is not available: running.",
      ]),
    });
  });

  it("rejects billing mutations approved below the owner threshold", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          id: "cmd-billing-refund",
          label: "Refund customer",
          command: "stripe refunds create --payment pi_123",
        },
        {
          approval: {
            approved: true,
            approverPrincipalId: "principal-operator",
            approverRoles: ["BuildOperator"],
            createdAt: "2026-06-22T18:00:00.000Z",
            reason: "Operator approved billing mutation.",
            threshold: "operator",
          },
          approvalEvaluatedAt: new Date("2026-06-22T18:01:00.000Z"),
          scope: {
            tenantId: "tenant-valkyr-demo",
            principalId: "principal-operator",
            roles: ["BuildOperator"],
            workspaceRoot: "/workspace/valor",
            policyRefs: ["policy:valhalla-build-mode"],
          },
        },
      ),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Approval threshold operator is below required threshold owner.",
        "Approver roles do not satisfy required threshold owner.",
      ]),
    });
  });

  it("preserves owner-approved public MCP publication as approval-required policy evidence", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          id: "cmd-public-mcp",
          kind: "mcp",
          label: "Publish MCP tool",
          command: "mcp publish digitalProduct.fulfillPurchase --public",
          capabilityId: "mcp.tool",
        },
        {
          approval: {
            approved: true,
            approverPrincipalId: "principal-owner",
            approverRoles: ["Owner"],
            createdAt: "2026-06-22T18:00:00.000Z",
            reason: "Owner approved public MCP publication.",
            threshold: "owner",
          },
          approvalEvaluatedAt: new Date("2026-06-22T18:01:00.000Z"),
          scope: {
            tenantId: "tenant-valkyr-demo",
            principalId: "principal-owner",
            roles: ["Owner"],
            workspaceRoot: "/workspace/valor",
            policyRefs: ["policy:valhalla-build-mode"],
          },
        },
      ),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Public MCP publication requires approval.",
      ]),
    });
  });

  it("requires owner approval when public MCP publication is phrased before the MCP target", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-public-mcp-reversed",
        kind: "mcp",
        label: "Publish MCP tool publicly",
        command: "publish digitalProduct.fulfillPurchase mcp tool --public",
        capabilityId: "mcp.tool",
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Public MCP publication requires approval.",
      ]),
      requiredApprovalThreshold: "owner",
      requiresApproval: true,
    });
  });

  it("requires owner approval for email send operations", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-email-send",
        kind: "connector",
        label: "Send customer email",
        command: "gmail send to:customer@example.com template:receipt",
        capabilityId: "connector.read",
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Email send operation requires approval.",
      ]),
      requiresApproval: true,
    });
  });

  it("requires owner approval when email send intent is phrased before the provider", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-email-send-reversed",
        kind: "connector",
        label: "Send customer email",
        command: "send email receipt via gmail to:customer@example.com",
        capabilityId: "connector.read",
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Email send operation requires approval.",
      ]),
      requiredApprovalThreshold: "owner",
      requiresApproval: true,
    });
  });

  it("requires approval for shell file deletion commands", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-rm-file",
        command: "rm docs/draft.md",
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining(["File deletion requires approval."]),
      requiredApprovalThreshold: "operator",
      requiresApproval: true,
    });
  });

  it("requires owner approval for recursive forced deletion regardless of flag order", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-rm-fr",
        command: "rm -fr dist",
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Recursive forced deletion requires approval.",
        "File deletion requires approval.",
      ]),
      requiredApprovalThreshold: "owner",
      requiresApproval: true,
    });
  });

  it("does not treat package manager removal as shell file deletion", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-npm-rm",
        command: "npm rm lodash",
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
      requiredApprovalThreshold: "none",
    });
  });

  it("requires approval for shell redirection writes", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-shell-redirect-write",
        command: "printf done > logs/build.txt",
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Shell redirection write requires approval.",
      ]),
      requiredApprovalThreshold: "operator",
      requiresApproval: true,
    });
  });

  it("requires approval for inline append redirection writes", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-shell-inline-append",
        command: "npm test >>logs/test-output.log",
      }),
    ).toMatchObject({
      decision: "approval-required",
      reasons: expect.arrayContaining([
        "Shell redirection write requires approval.",
      ]),
      requiredApprovalThreshold: "operator",
      requiresApproval: true,
    });
  });

  it("does not require approval for file-descriptor-only redirection", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-shell-fd-redirect",
        command: "npm test 2>&1",
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
      requiredApprovalThreshold: "none",
    });
  });

  it("requires approval for shell file mutation commands", () => {
    for (const commandText of [
      "cp src/template.ts src/scratch.ts",
      "sed -i 's/old/new/' src/index.ts",
      "grep warning logs/build.log | tee logs/warnings.log",
    ]) {
      expect(
        evaluateBuildModeCommandPolicy({
          ...baseCommand,
          id: `cmd-${commandText.split(" ")[0]}`,
          command: commandText,
        }),
      ).toMatchObject({
        decision: "approval-required",
        reasons: expect.arrayContaining([
          "Shell file mutation requires approval.",
        ]),
        requiredApprovalThreshold: "operator",
        requiresApproval: true,
      });
    }
  });

  it("requires approval for inline interpreter file mutations", () => {
    for (const commandText of [
      "node -e \"require('fs').writeFileSync('src/scratch.ts', 'ok')\"",
      "python -c \"open('src/scratch.py', 'w').write('ok')\"",
      "ruby -e \"File.write('src/scratch.rb', 'ok')\"",
    ]) {
      expect(
        evaluateBuildModeCommandPolicy({
          ...baseCommand,
          id: `cmd-inline-${commandText.split(" ")[0]}`,
          command: commandText,
        }),
      ).toMatchObject({
        decision: "approval-required",
        reasons: expect.arrayContaining([
          "Interpreter inline file mutation requires approval.",
        ]),
        requiredApprovalThreshold: "operator",
        requiresApproval: true,
      });
    }
  });

  it("does not require interpreter mutation approval for inline read-only scripts", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-inline-read",
        command: "python -c \"print(open('src/index.ts').read())\"",
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
      requiredApprovalThreshold: "none",
    });
  });

  it("allows inline interpreter read-only inspection of generated ThorAPI artifacts", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-inline-read-generated",
        command:
          "python -c \"print(open('apps/shop/thorapi/redux/ProductService.tsx').read())\"",
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
      requiredApprovalThreshold: "none",
    });
  });

  it("rejects ignored paths from inline interpreter file mutations", () => {
    expect(
      evaluateBuildModeCommandPolicy(
        {
          ...baseCommand,
          id: "cmd-inline-env-write",
          command: "python -c \"open('.env', 'w').write('VALUE=raw')\"",
        },
        {
          scope: {
            ignoredPathPatterns: [".env"],
            policyRefs: ["policy:build-mode"],
            principalId: "principal-valhalla-operator",
            roles: ["BuildOperator"],
            tenantId: "tenant-valkyr-demo",
            workspaceRoot: "/workspace/valor",
          },
          workspaceRoot: "/workspace/valor",
        },
      ),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Command path is blocked by **/.env: .env.",
      ]),
    });
  });

  it("does not treat package scripts with copy in the name as shell file mutation", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-npm-copy-script",
        command: "npm run copy-assets",
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
      requiredApprovalThreshold: "none",
    });
  });
});

describe("BuildModeCommandPolicy ThorAPI/VAIX launcher doctrine", () => {
  it("rejects direct ThorAPI generator shortcuts that bypass VAIX launchers", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-direct-thorapi-generate",
        kind: "build",
        label: "Generate ThorAPI client",
        command: "yarn generate:thorapi-client",
      }),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "ThorAPI/VAIX operations must use ./vaix or ./vai project launchers instead of direct generator/build shortcuts.",
      ]),
    });

    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-direct-maven-generate",
        kind: "build",
        label: "Generate ThorAPI backend",
        command: "mvn -pl valkyrai generate-sources",
      }),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "ThorAPI/VAIX operations must use ./vaix or ./vai project launchers instead of direct generator/build shortcuts.",
      ]),
    });
  });

  it("allows ThorAPI generation through the VAIX launcher", () => {
    expect(
      evaluateBuildModeCommandPolicy({
        ...baseCommand,
        id: "cmd-vaix-generate",
        kind: "build",
        label: "Generate ThorAPI through VAIX",
        command: "./vaix generate thorapi",
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
    });
  });
});

describe("BuildModeCommandPolicy prompt bundle proof", () => {
  it("rejects required major commands without prompt bundle receipts", () => {
    expect(
      evaluateBuildModeCommandPolicy(baseCommand, {
        grayMatterContextPack: {
          answerPolicy: "answer-confidently",
          compiledAt: "2026-06-22T18:00:00.000Z",
          id: "gm-context-pack-dpp-001",
          invariantPreflightStatus: "passed",
          majorTaskRefs: ["plan-tests"],
          memoryEntryIds: ["memory-entry-valhalla-prd"],
          policy: "answer-confidently",
          retrievalReceiptIds: ["retrieval-receipt-dpp-001"],
          retrievalStatus: "ready",
          source: "GrayMatter retrieval receipts",
          sourceRefs: ["graymatter://MemoryEntry/memory-entry-valhalla-prd"],
          summary: "Validated context.",
        },
        requireGrayMatterContext: true,
      }),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Prompt bundle proof is required before command execution.",
      ]),
    });
  });

  it("allows valid prompt bundle proof to accompany required context", () => {
    expect(
      evaluateBuildModeCommandPolicy(baseCommand, {
        grayMatterContextPack: {
          answerPolicy: "answer-confidently",
          compiledAt: "2026-06-22T18:00:00.000Z",
          id: "gm-context-pack-dpp-001",
          invariantPreflightStatus: "passed",
          majorTaskRefs: ["plan-tests"],
          memoryEntryIds: ["memory-entry-valhalla-prd"],
          policy: "answer-confidently",
          retrievalReceiptIds: ["retrieval-receipt-dpp-001"],
          retrievalStatus: "ready",
          source: "GrayMatter retrieval receipts",
          sourceRefs: ["graymatter://MemoryEntry/memory-entry-valhalla-prd"],
          summary: "Validated context.",
        },
        promptContext: {
          promptProfileId: "prompt-profile-valhalla",
          promptProfileName: "Valhalla Build Operator",
          promptBundleId: "prompt-bundle-valhalla-001",
          promptBundleVersion: "2026.06.21",
          promptBundlePolicy: "locked",
          promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
        },
        requireGrayMatterContext: true,
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
    });
  });
});

describe("BuildModeCommandPolicy provider route proof", () => {
  it("rejects BYO execution without matching credential receipt proof", () => {
    expect(
      evaluateBuildModeCommandPolicy(baseCommand, {
        providerRoute: "bring-your-own-key",
      }),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Provider route bring-your-own-key requires a matching ProviderCredentialRef before command execution.",
      ]),
    });
  });

  it("allows BYO execution with credential ref and receipt proof", () => {
    expect(
      evaluateBuildModeCommandPolicy(baseCommand, {
        providerCredentials,
        providerRoute: "bring-your-own-key",
        receipts: providerCredentialReceipts,
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
    });
  });

  it("rejects local-model execution without an available local runtime", () => {
    expect(
      evaluateBuildModeCommandPolicy(baseCommand, {
        agentRuntimes: [
          {
            handoffPolicy: "autonomous-local",
            id: "runtime-local-offline",
            label: "Offline local model",
            loopPhaseIds: [],
            ownerRole: "Browser Verifier",
            promptProfileId: "prompt-profile-local",
            providerRoute: "local-model",
            receiptIds: [],
            runtime: "ValorIDE",
            status: "offline",
          },
        ],
        providerCredentials,
        providerRoute: "local-model",
        receipts: providerCredentialReceipts,
      }),
    ).toMatchObject({
      decision: "reject",
      reasons: expect.arrayContaining([
        "Local model provider route requires an available autonomous-local runtime with providerRoute local-model.",
      ]),
    });
  });

  it("allows local-model execution with an available autonomous local runtime", () => {
    expect(
      evaluateBuildModeCommandPolicy(baseCommand, {
        agentRuntimes: [
          {
            handoffPolicy: "autonomous-local",
            id: "runtime-local-verifier",
            label: "Local model verifier",
            loopPhaseIds: [],
            ownerRole: "Browser Verifier",
            promptProfileId: "prompt-profile-local",
            providerRoute: "local-model",
            receiptIds: ["receipt-local-runtime-ready"],
            runtime: "ValorIDE",
            status: "available",
          },
        ],
        providerCredentials,
        providerRoute: "local-model",
        receipts: providerCredentialReceipts,
      }),
    ).toMatchObject({
      decision: "allow",
      reasons: [],
    });
  });
});
