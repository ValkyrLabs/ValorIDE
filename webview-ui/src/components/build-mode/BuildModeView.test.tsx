import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BuildModeView from "./BuildModeView";
import { digitalProductProBuildModePayload } from "./buildModeFixtures";
import type {
  BuildModeCommandReceipt,
  ValorTaskBridgePayload,
} from "@shared/BuildMode";

const createSucceededCommandReceipt = (
  id: string,
  commandId: string,
  capabilityId: string,
  createdAt: string,
): BuildModeCommandReceipt => ({
  id,
  commandId,
  capabilityId,
  status: "succeeded",
  approved: true,
  requiresApproval: false,
  summary: `${commandId} completed.`,
  createdAt,
});

const allowTerminalExecute = (
  payload: ValorTaskBridgePayload,
): ValorTaskBridgePayload["toolPermissions"] =>
  payload.toolPermissions.map((permission) =>
    permission.capabilityId === "terminal.execute"
      ? {
          ...permission,
          approvalThreshold: "none",
          decision: "allow",
        }
      : permission,
  );

const withRunnableTestStep = (
  payload: ValorTaskBridgePayload = digitalProductProBuildModePayload,
): ValorTaskBridgePayload => ({
  ...payload,
  autonomyPolicy: {
    ...payload.autonomyPolicy,
    mode: "autonomous-local",
    approvalRequiredCapabilityIds:
      payload.autonomyPolicy.approvalRequiredCapabilityIds.filter(
        (capabilityId) => capabilityId !== "terminal.execute",
      ),
  },
  executionPlan: payload.executionPlan.map((step) => {
    if (step.id === "plan-safe-edits") {
      return {
        ...step,
        status: "complete",
        receiptIds: ["receipt-safe-edit-checkout-copy"],
      };
    }
    if (step.id === "plan-thorapi-vaix") {
      return {
        ...step,
        status: "complete",
        receiptIds: ["receipt-openapi-update", "receipt-vaix-generate"],
      };
    }
    if (step.id === "plan-tests") {
      return { ...step, status: "ready" };
    }
    return step;
  }),
  commandReceipts: [
    ...payload.commandReceipts,
    createSucceededCommandReceipt(
      "receipt-safe-edit-checkout-copy",
      "cmd-safe-edit-checkout-copy",
      "psr.edit",
      "2026-06-22T12:00:00.000Z",
    ),
    createSucceededCommandReceipt(
      "receipt-openapi-update",
      "cmd-openapi-update-spec",
      "psr.edit",
      "2026-06-22T12:01:00.000Z",
    ),
    createSucceededCommandReceipt(
      "receipt-vaix-generate",
      "cmd-vaix-generate-thorapi",
      "terminal.execute",
      "2026-06-22T12:02:00.000Z",
    ),
  ],
  toolPermissions: allowTerminalExecute(payload),
});

const withApprovalRequiredBrowserStep = (
  payload: ValorTaskBridgePayload = digitalProductProBuildModePayload,
): ValorTaskBridgePayload => {
  const testStepPayload = withRunnableTestStep(payload);
  return {
    ...testStepPayload,
    autonomyPolicy: {
      ...testStepPayload.autonomyPolicy,
      maxConsecutiveCommands: 10,
    },
    executionPlan: testStepPayload.executionPlan.map((step) => {
      if (step.id === "plan-tests") {
        return {
          ...step,
          status: "complete",
          receiptIds: ["receipt-test-success", "receipt-build-success"],
        };
      }
      if (step.id === "plan-browser") {
        return { ...step, status: "approval-required" };
      }
      return step;
    }),
    commands: testStepPayload.commands.map((command) =>
      command.id === "cmd-open-generated-preview"
        ? {
            ...command,
            receiptId: "receipt-open-generated-preview",
            status: "succeeded",
          }
        : command,
    ),
    commandReceipts: [
      ...testStepPayload.commandReceipts,
      createSucceededCommandReceipt(
        "receipt-open-generated-preview",
        "cmd-open-generated-preview",
        "browser.automation",
        "2026-06-22T12:02:30.000Z",
      ),
      createSucceededCommandReceipt(
        "receipt-test-success",
        "cmd-test",
        "terminal.execute",
        "2026-06-22T12:03:00.000Z",
      ),
      createSucceededCommandReceipt(
        "receipt-build-success",
        "cmd-build",
        "terminal.execute",
        "2026-06-22T12:04:00.000Z",
      ),
    ],
  };
};

const withDirectMcpToolCommand = (
  payload: ValorTaskBridgePayload = digitalProductProBuildModePayload,
): ValorTaskBridgePayload => ({
  ...payload,
  commands: [
    ...payload.commands,
    {
      id: "cmd-mcp-graymatter-search",
      kind: "mcp",
      label: "Search GrayMatter memory",
      command: "mcp:graymatter.searchMemory input:context/search.json",
      capabilityId: "mcp.tool",
      assignedRuntimeId: "runtime-openclaw-workflow-operator",
      assignedSwarmRole: "Workflow Engineer",
      requiresApproval: true,
      status: "succeeded",
      receiptId: "receipt-mcp-graymatter-search",
    },
  ],
  commandReceipts: [
    ...payload.commandReceipts,
    {
      id: "receipt-mcp-graymatter-search",
      commandId: "cmd-mcp-graymatter-search",
      capabilityId: "mcp.tool",
      status: "succeeded",
      approved: true,
      requiresApproval: true,
      summary: "GrayMatter MCP search completed.",
      createdAt: "2026-06-22T12:05:00.000Z",
      artifacts: [
        {
          id: "artifact-mcp-graymatter-search",
          kind: "mcp_result",
          title: "GrayMatter MCP search result",
          uri: "valoride://build-mode/artifacts/mcp-graymatter-search",
          commandId: "cmd-mcp-graymatter-search",
          receiptId: "receipt-mcp-graymatter-search",
          metadata: {
            executionId: "mcp-exec-001",
            serverName: "graymatter",
            status: "succeeded",
            toolName: "searchMemory",
            traceId: "mcp-trace-001",
          },
          createdAt: "2026-06-22T12:05:00.000Z",
        },
      ],
    },
  ],
});

describe("BuildModeView", () => {
  const expectedPromptContext = expect.objectContaining({
    promptProfileId: "prompt-profile-valhalla",
    promptProfileName: "Valhalla Build Operator",
    promptBundleId: "prompt-bundle-valhalla-001",
    promptBundleVersion: "2026.06.21",
    promptBundlePolicy: "locked",
    promptBundleReceiptIds: ["receipt-prompt-bundle-dpp-001"],
  });

  it("renders the Valhalla Build Mode cockpit from fixture payload", () => {
    render(<BuildModeView payload={digitalProductProBuildModePayload} />);

    expect(screen.getByTestId("build-mode-view")).toBeInTheDocument();
    expect(
      screen.getByText("Build Mode: Digital Product Pro"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("App Bundle Inspector")).toBeInTheDocument();
    expect(
      screen.getAllByText(/proof: receipt-generation-dpp-001/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("tenant-valkyr-demo")).toBeInTheDocument();
    expect(screen.getByText("principal-valhalla-operator")).toBeInTheDocument();
    expect(
      screen.getByText("/workspace/apps/digital-product-pro"),
    ).toBeInTheDocument();
    expect(screen.getByText("WorkflowEngineer")).toBeInTheDocument();
    expect(
      screen.getAllByText("policy:generated-thorapi-readonly").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Ignored Path Patterns")).toBeInTheDocument();
    expect(screen.getByText("secrets/")).toBeInTheDocument();
    expect(screen.getByText("gm-context-pack-dpp-001")).toBeInTheDocument();
    expect(screen.getByText("Retrieval Status")).toBeInTheDocument();
    expect(screen.getByText("Invariant Preflight")).toBeInTheDocument();
    expect(screen.getAllByText("ready").length).toBeGreaterThan(0);
    expect(screen.getAllByText("passed").length).toBeGreaterThan(0);
    expect(screen.getByText("gm-trace-dpp-context-001")).toBeInTheDocument();
    expect(
      screen.getAllByText("graymatter-preflight-dpp-001").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("graymatter://MemoryEntry/memory-entry-valhalla-prd"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("plan-safe-edits").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("receipt-workflow-dpp-001").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("digitalProduct.fulfillPurchase").length,
    ).toBeGreaterThan(1);
    expect(
      screen.getAllByText("execmodule-digital-product-fulfillment").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("ThorAPI And VAIX")).toBeInTheDocument();
    expect(screen.getByText("DigitalProductService")).toBeInTheDocument();
    expect(
      screen.getByText(/ThorAPI - readonly-generated/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "apps/digital-product-pro/openapi/digital-product.yaml (editable)",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("issuePrivateDownloadEntitlement"),
    ).toBeInTheDocument();
    expect(screen.getByText("Capability Matrix")).toBeInTheDocument();
    expect(
      screen.getByText("Read authorized connector data"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/proof: receipt-context-dpp-001/).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Generated ThorAPI code")).toBeInTheDocument();
    expect(screen.getByText("Tool Permissions")).toBeInTheDocument();
    expect(screen.getByText("Guarded file writes")).toBeInTheDocument();
    expect(screen.getByText("Authorized connector reads")).toBeInTheDocument();
    expect(screen.getAllByText(/threshold operator/).length).toBeGreaterThan(0);
    expect(screen.getByText("Autonomy Policy")).toBeInTheDocument();
    expect(
      screen.getByText("Valhalla approval-gated local autonomy"),
    ).toBeInTheDocument();
    expect(screen.getByText("Autonomy Decision")).toBeInTheDocument();
    expect(
      screen.getByText(/scheduler: ValkyrAI cron workflow launcher/),
    ).toBeInTheDocument();
    expect(screen.getByText("Connector Access")).toBeInTheDocument();
    expect(screen.getByText("Gmail")).toBeInTheDocument();
    expect(screen.getByText("Google Calendar")).toBeInTheDocument();
    expect(screen.getByText("Google Tasks")).toBeInTheDocument();
    expect(
      screen.getAllByText(/commands: cmd-connector-gmail-thread/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/ExecModule execmodule-digital-product-fulfillment/)
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("MCP Servers")).toBeInTheDocument();
    expect(screen.getByText("MCP Tool Registry")).toBeInTheDocument();
    expect(screen.getAllByText("private-valkyr-workflows").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText("digitalProduct.fulfillPurchase").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/proof: receipt-workflow-dpp-001/).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/credential-ref-valkyr-credits.*proof: receipt-context-dpp-001/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Operator approval is required before running Apply checkout copy edit.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText("pending-approval:cmd-browser-verify"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("next-command:cmd-safe-edit-checkout-copy"),
    ).toBeInTheDocument();
    expect(screen.getByText("Autonomous Queue Plan")).toBeInTheDocument();
    expect(
      screen.getByText(
        /dispatchable none - approval cmd-safe-edit-checkout-copy/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/blocked none - receipt yes/)).toBeInTheDocument();
    expect(screen.getAllByText("Commands").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Estimated Credits").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "estimate proof: receipt-credit-estimate-dpp-001",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "bootstrap-credit-estimate (graymatter.context, valkyr-credits, succeeded): 0 credits (0 provider, 0 hosted)",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Hosted infrastructure credits apply even when a BYO provider key is selected.",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("approval-gated").length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Stop when a command is rejected, fails, or requests approval.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Command Policy")).toBeInTheDocument();
    expect(screen.getByText("Local build loop allow list")).toBeInTheDocument();
    expect(screen.getByText("Remote shell bootstrap")).toBeInTheDocument();
    expect(screen.getByText("Checkpoints And Rollback")).toBeInTheDocument();
    expect(screen.getByText("Pre-edit checkpoint")).toBeInTheDocument();
    expect(
      screen.getAllByText(/shadowgit:dpp-pre-edit/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Evidence Artifacts")).toBeInTheDocument();
    expect(
      screen.getAllByText("Unit test command stdout").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/completed false/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/sha256:fixture-command-stdout/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Initial app bundle diff")).toBeInTheDocument();
    expect(
      screen.getAllByText("app-bundle-digital-product-pro").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("receipt-generation-dpp-001").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "apps/digital-product-pro/app-bundle.json (config; hash sha256:bundle-fixture)",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Authorized Calendar connector read").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Authorized Tasks connector read").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/connector google-calendar; data calendar\.events/)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/connector google-tasks; data task\.list/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Pre-edit checkpoint proof")).toBeInTheDocument();
    expect(screen.getByText("Safe Edits")).toBeInTheDocument();
    expect(screen.getByText("Checkout copy refinement")).toBeInTheDocument();
    expect(
      screen.getAllByText("build-command-receipt-safe-edit-policy").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("apps/digital-product-pro/src/pages/Checkout.tsx")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Nightly fulfillment smoke check"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Inspect private workflow MCP server").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("build-command-receipt-mcp-server-inspect").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("artifact-mcp-server-inspect-dpp-001").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Read order-support Gmail thread"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Update OpenAPI purchase spec"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Generate ThorAPI through VAIX"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Inspect generated ThorAPI artifact"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Generated ThorAPI artifact inspection").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("build-command-receipt-generated-artifact-read")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Generate app bundle diff")).toBeInTheDocument();
    expect(
      screen.getAllByText("App bundle diff receipt").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("build-command-receipt-app-bundle-diff").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Read launch-window Calendar events"),
    ).toBeInTheDocument();
    expect(screen.getByText("Read launch task checklist")).toBeInTheDocument();
    expect(screen.getByText("provider: valkyr-credits")).toBeInTheDocument();
    expect(
      screen.getByText(
        "prompt: Valhalla Build Operator - prompt-bundle-valhalla-001@2026.06.21",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Prompt Bundle")).toBeInTheDocument();
    expect(
      screen.getByText("Valhalla Build Mode Prompt Bundle"),
    ).toBeInTheDocument();
    expect(screen.getByText("Toolchain doctrine")).toBeInTheDocument();
    expect(
      screen.getAllByText("receipt-prompt-bundle-dpp-001").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Security Auditor").length).toBeGreaterThan(0);
    expect(screen.getByText("Readiness Gates")).toBeInTheDocument();
    expect(screen.getByText("Safe edits applied")).toBeInTheDocument();
    expect(screen.getByText("Browser evidence captured")).toBeInTheDocument();
    expect(
      screen.getByText("ThorAPI generated through VAIX"),
    ).toBeInTheDocument();
    expect(screen.getByText("Draft deploy ready")).toBeInTheDocument();
    expect(screen.getAllByText(/blocks run/).length).toBeGreaterThan(0);
    expect(screen.getByText("Execution Plan")).toBeInTheDocument();
    expect(screen.getByText("Apply safe editable changes")).toBeInTheDocument();
    expect(screen.getByText("Run tests and build")).toBeInTheDocument();
    expect(screen.getByText("Run unit tests, then build.")).toBeInTheDocument();
    expect(
      screen.getByText("Update OpenAPI and generate ThorAPI"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Approve the OpenAPI spec update before VAIX generation.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Ship draft deploy")).toBeInTheDocument();
    expect(
      screen.getByText("Approve and run the draft deploy command."),
    ).toBeInTheDocument();
    expect(screen.getByText("Agent Runtime Lanes")).toBeInTheDocument();
    expect(screen.getByText("Codex local build operator")).toBeInTheDocument();
    expect(
      screen.getByText("ValorIDE ThorAPI and VAIX generator"),
    ).toBeInTheDocument();
    expect(screen.getByText("Codex Aurora UI engineer")).toBeInTheDocument();
    expect(screen.getByText("OpenClaw workflow executor")).toBeInTheDocument();
    expect(screen.getByText("ValorIDE deploy operator")).toBeInTheDocument();
    expect(screen.getByText("Local Model Runtime")).toBeInTheDocument();
    expect(
      screen.getByText("Local browser/report verifier model"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("local://valoride-verifier/default - available - workspace-local"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Endpoint: workspace-local:valoride-verifier"),
    ).toBeInTheDocument();
    expect(screen.getByText("Health check: cmd-browser-verify")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "role: Deploy Operator - runtime-valkyr-deploy-operator",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "role: ThorAPI Generator - runtime-thorapi-vaix-generator",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Compile GrayMatter context").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("npm run test --workspace webview-ui"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("build-command-receipt-fixture-context"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("approval-gate - next: approve").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Prompt Valhalla Build Operator - prompt-bundle-valhalla-001@2026.06.21",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        "Review and approve this command with the required threshold before dispatch.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("Command declares approval required.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/Digital Product Pro Build Mode Report/),
    ).toBeInTheDocument();
  });

  it("renders direct MCP tool commands with receipt artifact proof", () => {
    render(<BuildModeView payload={withDirectMcpToolCommand()} />);

    expect(screen.getByText("Connected MCP Tools")).toBeInTheDocument();
    expect(screen.getAllByText("Search GrayMatter memory").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText(/graymatter - searchMemory/)).toBeInTheDocument();
    expect(screen.getAllByText(/mcp.tool - succeeded/).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText(/proof: receipt-mcp-graymatter-search/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/artifact: artifact-mcp-graymatter-search/),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Search GrayMatter memory: graymatter.searchMemory/)
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders swarm role ownership for commands and receipts", () => {
    render(<BuildModeView payload={digitalProductProBuildModePayload} />);

    expect(
      screen.getAllByText(
        "role: Workflow Engineer - runtime-openclaw-workflow-operator",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "role: Aurora UI Engineer - runtime-aurora-ui-engineer",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("ThorAPI Generator").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Aurora UI Engineer").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Role Browser Verifier - runtime-valoride-verifier")
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders GrayMatter proof on command receipts", () => {
    render(<BuildModeView payload={digitalProductProBuildModePayload} />);

    expect(
      screen.getAllByText("Context gm-context-pack-dpp-001 - ready - passed")
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders workflow execution proof in evidence artifact cards", () => {
    render(
      <BuildModeView
        payload={{
          ...digitalProductProBuildModePayload,
          evidenceArtifacts: [
            ...digitalProductProBuildModePayload.evidenceArtifacts,
            {
              id: "artifact-workflow-execution-proof",
              kind: "workflow_receipt",
              title: "Workflow execution receipt",
              uri: "valkyrai://mcp/workflows/4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1/executions/4dd7fbf3-17fb-40ca-8ecf-96a6b4609867",
              commandId: "cmd-workflow-digital-product-fulfillment",
              receiptId: "build-command-receipt-workflow-run",
              summary: "ValkyrAI workflow accepted execution.",
              createdAt: "2026-06-21T21:20:00.000Z",
              metadata: {
                executionId: "4dd7fbf3-17fb-40ca-8ecf-96a6b4609867",
                executionState: "SUCCESS",
                receiptRef:
                  "workflow_execution:4dd7fbf3-17fb-40ca-8ecf-96a6b4609867",
                status: "READY",
                traceId: "workflow-4dd7fbf3-17fb-40ca-8ecf-96a6b4609867",
                workflowRef: "workflow:4e6c4199-8fb1-4f7f-8c34-4a65dfb7c9a1",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Workflow execution receipt")).toBeInTheDocument();
    expect(
      screen.getAllByText(/execution 4dd7fbf3-17fb-40ca-8ecf-96a6b4609867/)
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        /receipt workflow_execution:4dd7fbf3-17fb-40ca-8ecf-96a6b4609867/,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/trace workflow-4dd7fbf3-17fb-40ca-8ecf-96a6b4609867/)
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders artifact integrity proof in evidence artifact cards", () => {
    render(
      <BuildModeView
        payload={{
          ...digitalProductProBuildModePayload,
          evidenceArtifacts: [
            {
              id: "artifact-final-report-proof",
              kind: "final_report",
              title: "Final report proof",
              uri: "valoride://build-mode/artifacts/task-alpha/cmd-final-report/final-report-final_report.md",
              commandId: "cmd-final-report",
              receiptId: "receipt-final-report",
              summary: "Stored final report.",
              createdAt: "2026-06-21T21:20:00.000Z",
              metadata: {
                byteSize: 1234,
                contentHash:
                  "sha256:4dd7fbf317fb40ca8ecf96a6b46098674dd7fbf317fb40ca8ecf96a6b4609867",
                memoryStatus: "written",
              },
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Final report proof")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /memory status written; hash sha256:4dd7fbf317fb40ca8ecf96a6b46098674dd7fbf317fb40ca8ecf96a6b4609867; bytes 1234/,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("emits artifact open requests for durable Build Mode artifact uris", () => {
    const onOpenArtifact = vi.fn();
    render(
      <BuildModeView
        onOpenArtifact={onOpenArtifact}
        payload={{
          ...digitalProductProBuildModePayload,
          evidenceArtifacts: [
            {
              id: "artifact-terminal-output",
              kind: "command_stdout",
              title: "Terminal stdout",
              uri: "valoride://build-mode/artifacts/task-alpha/cmd-test/output-command_stdout.txt",
              commandId: "cmd-test",
              receiptId: "receipt-test",
              summary: "Stored terminal output.",
              createdAt: "2026-06-21T21:20:00.000Z",
            },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Artifact" }));

    expect(onOpenArtifact).toHaveBeenCalledWith(
      "valoride://build-mode/artifacts/task-alpha/cmd-test/output-command_stdout.txt",
    );
  });

  it("blocks malformed Build Mode artifact open requests", () => {
    const onOpenArtifact = vi.fn();
    render(
      <BuildModeView
        onOpenArtifact={onOpenArtifact}
        payload={{
          ...digitalProductProBuildModePayload,
          evidenceArtifacts: [
            {
              id: "artifact-terminal-traversal",
              kind: "command_stdout",
              title: "Traversal stdout",
              uri: "valoride://build-mode/artifacts/task-alpha/cmd-test/%2E%2E%2Fsecret.txt",
              commandId: "cmd-test",
              receiptId: "receipt-test",
              summary: "Stored terminal output.",
              createdAt: "2026-06-21T21:20:00.000Z",
            },
            {
              id: "artifact-terminal-redacted-query",
              kind: "command_stdout",
              title: "Redacted query stdout",
              uri: "valoride://build-mode/artifacts/task-alpha/cmd-test/output-command_stdout.txt?token=<redacted-secret>",
              commandId: "cmd-test",
              receiptId: "receipt-test",
              summary: "Stored terminal output.",
              createdAt: "2026-06-21T21:20:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(screen.queryByRole("button", { name: "Open Artifact" })).toBeNull();
    expect(onOpenArtifact).not.toHaveBeenCalled();
  });

  it("supports provider route and prompt profile selection", () => {
    render(<BuildModeView payload={digitalProductProBuildModePayload} />);

    fireEvent.change(screen.getByLabelText("Provider route"), {
      target: { value: "local-model" },
    });
    expect(screen.getByLabelText("Provider route")).toHaveValue("local-model");

    fireEvent.change(screen.getByLabelText("Prompt profile"), {
      target: { value: "prompt-profile-security-auditor" },
    });
    expect(screen.getByText(/RBAC, secret isolation/)).toBeInTheDocument();
    expect(
      screen.getByText("Security Audit Prompt Bundle"),
    ).toBeInTheDocument();
    expect(screen.getByText("Security review doctrine")).toBeInTheDocument();
    expect(
      screen.getAllByText(/proof: receipt-prompt-bundle-security-001/).length,
    ).toBeGreaterThan(0);
  });

  it("emits selected provider and prompt context with command requests", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={withRunnableTestStep()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Provider route"), {
      target: { value: "local-model" },
    });
    fireEvent.change(screen.getByLabelText("Prompt profile"), {
      target: { value: "prompt-profile-security-auditor" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Run Unit tests" }));

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({ id: "cmd-test" }),
      undefined,
      "local-model",
      expect.objectContaining({
        promptProfileId: "prompt-profile-security-auditor",
        promptProfileName: "Security Auditor",
        promptBundleId: "prompt-bundle-security-001",
        promptBundlePolicy: "review-required",
        promptBundleReceiptIds: ["receipt-prompt-bundle-security-001"],
      }),
      expect.any(Array),
    );
  });

  it("renders final report with the selected provider route and prompt profile", () => {
    render(<BuildModeView payload={digitalProductProBuildModePayload} />);

    expect(screen.getByText(/provider route: valkyr-credits/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Provider route"), {
      target: { value: "local-model" },
    });
    fireEvent.change(screen.getByLabelText("Prompt profile"), {
      target: { value: "prompt-profile-security-auditor" },
    });

    expect(screen.getByText(/provider route: local-model/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Security Auditor: frontier \(prompt-bundle-security-001; proof: receipt-prompt-bundle-security-001\)/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Security Audit Prompt Bundle: review-required \(1 sections, receipts: receipt-prompt-bundle-security-001\)/,
      ),
    ).toBeInTheDocument();
  });

  it("disables command runner actions that are not the next runbook command", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    const runUnitTests = screen.getByRole("button", {
      name: "Run Unit tests",
    });
    expect(runUnitTests).toBeDisabled();
    fireEvent.click(runUnitTests);
    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("blocks autonomous queue execution when the queue plan needs approval", () => {
    const onRunAutonomousQueue = vi.fn();
    render(
      <BuildModeView
        onRunAutonomousQueue={onRunAutonomousQueue}
        payload={digitalProductProBuildModePayload}
      />,
    );

    const runQueue = screen.getByRole("button", {
      name: "Run Autonomous Queue",
    });
    expect(runQueue).toBeDisabled();
    fireEvent.click(runQueue);
    expect(onRunAutonomousQueue).not.toHaveBeenCalled();
  });

  it("emits autonomous queue requests for dispatchable receipt-gated commands", () => {
    const onRunAutonomousQueue = vi.fn();
    render(
      <BuildModeView
        onRunAutonomousQueue={onRunAutonomousQueue}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyPolicy: {
            ...digitalProductProBuildModePayload.autonomyPolicy,
            mode: "autonomous-local",
            approvalRequiredCapabilityIds:
              digitalProductProBuildModePayload.autonomyPolicy.approvalRequiredCapabilityIds.filter(
                (capabilityId) => capabilityId !== "terminal.execute",
              ),
          },
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) => {
              if (step.id === "plan-safe-edits") {
                return {
                  ...step,
                  status: "complete",
                  receiptIds: ["receipt-safe-edit-checkout-copy"],
                };
              }
              if (step.id === "plan-thorapi-vaix") {
                return {
                  ...step,
                  status: "complete",
                  receiptIds: [
                    "receipt-openapi-update",
                    "receipt-vaix-generate",
                  ],
                };
              }
              if (step.id === "plan-tests") {
                return { ...step, status: "ready" };
              }
              return step;
            },
          ),
          commands: digitalProductProBuildModePayload.commands.map((command) => {
            if (command.id === "cmd-safe-edit-checkout-copy") {
              return {
                ...command,
                receiptId: "receipt-safe-edit-checkout-copy",
                status: "succeeded" as const,
              };
            }
            if (command.id === "cmd-openapi-update-spec") {
              return {
                ...command,
                receiptId: "receipt-openapi-update",
                status: "succeeded" as const,
              };
            }
            if (command.id === "cmd-vaix-generate-thorapi") {
              return {
                ...command,
                receiptId: "receipt-vaix-generate",
                status: "succeeded" as const,
              };
            }
            return command;
          }),
          commandReceipts: [
            ...digitalProductProBuildModePayload.commandReceipts,
            {
              id: "receipt-safe-edit-checkout-copy",
              commandId: "cmd-safe-edit-checkout-copy",
              capabilityId: "psr.edit",
              status: "succeeded",
              approved: true,
              requiresApproval: false,
              summary: "Safe edit applied.",
              createdAt: "2026-06-22T12:00:00.000Z",
            },
            {
              id: "receipt-openapi-update",
              commandId: "cmd-openapi-update-spec",
              capabilityId: "psr.edit",
              status: "succeeded",
              approved: true,
              requiresApproval: true,
              summary: "OpenAPI spec update applied.",
              createdAt: "2026-06-22T12:01:00.000Z",
            },
            {
              id: "receipt-vaix-generate",
              commandId: "cmd-vaix-generate-thorapi",
              capabilityId: "terminal.execute",
              status: "succeeded",
              approved: true,
              requiresApproval: true,
              summary: "ThorAPI generated through VAIX.",
              createdAt: "2026-06-22T12:02:00.000Z",
            },
          ],
          toolPermissions:
            digitalProductProBuildModePayload.toolPermissions.map(
              (permission) =>
                permission.capabilityId === "terminal.execute"
                  ? {
                      ...permission,
                      approvalThreshold: "none",
                      decision: "allow",
                    }
                  : permission,
            ),
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("Provider route"), {
      target: { value: "local-model" },
    });
    fireEvent.change(screen.getByLabelText("Prompt profile"), {
      target: { value: "prompt-profile-security-auditor" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Run Autonomous Queue" }),
    );

    expect(onRunAutonomousQueue).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          id: "cmd-test",
          capabilityId: "terminal.execute",
        }),
      ],
      "local-model",
      expect.objectContaining({
        promptProfileId: "prompt-profile-security-auditor",
        promptProfileName: "Security Auditor",
        promptBundleId: "prompt-bundle-security-001",
        promptBundlePolicy: "review-required",
        promptBundleReceiptIds: ["receipt-prompt-bundle-security-001"],
      }),
      expect.any(Array),
    );
  });

  it("emits command runner requests for the current next command", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={withRunnableTestStep()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Run Unit tests" }));

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cmd-test",
        command: "npm run test --workspace webview-ui",
      }),
      undefined,
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("blocks manual command runs when the derived runtime ownership proof is unavailable", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...withRunnableTestStep(),
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            nextCommandId: "cmd-test",
            nextStepId: "plan-tests",
            status: "continue",
          },
          agentRuntimes: digitalProductProBuildModePayload.agentRuntimes.map(
            (runtime) =>
              runtime.id === "runtime-codex-build-operator"
                ? { ...runtime, status: "blocked" }
                : runtime,
          ),
        }}
      />,
    );

    expect(
      screen.getAllByText(/Autonomy is blocked by runtime ownership proof/)
        .length,
    ).toBeGreaterThan(0);
    const runUnitTests = screen.getByRole("button", {
      name: "Run Unit tests",
    });
    expect(runUnitTests).toBeDisabled();
    fireEvent.click(runUnitTests);
    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("disables approval runner actions that are not the next runbook command", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    const approveBrowserVerification = screen.getByRole("button", {
      name: "Approve Browser verification",
    });
    expect(approveBrowserVerification).toBeDisabled();
    fireEvent.click(approveBrowserVerification);
    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("emits approval metadata for the current approval-gated command", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={withApprovalRequiredBrowserStep()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Approve Browser verification" }),
    );

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "browser.automation",
        id: "cmd-browser-verify",
      }),
      expect.objectContaining({
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        approverRoles: expect.arrayContaining(["Owner", "BuildOperator"]),
        reason: "Approved in Build Mode for Browser verification.",
        threshold: "operator",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.arrayContaining([
        expect.objectContaining({
          id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
          capabilityId: "workflow.execute",
        }),
      ]),
    );
  });

  it("runs the next dependency-ready execution plan command", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    expect(
      screen.getByText("Next: Apply safe editable changes"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run Next Execution Step" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Approve Next Execution Step" }),
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Approve Next Execution Step" }),
    );

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "psr.edit",
        id: "cmd-safe-edit-checkout-copy",
      }),
      expect.objectContaining({
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        threshold: "operator",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("uses the autonomy decision threshold when approving hard-rule commands", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={withRunnableTestStep({
          ...digitalProductProBuildModePayload,
          commands: digitalProductProBuildModePayload.commands.map((command) =>
            command.id === "cmd-test"
              ? {
                  ...command,
                  command:
                    "valkyr deploy --target production --app digital-product-pro",
                  requiresApproval: false,
                  status: "queued",
                }
              : command,
          ),
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Approve Unit tests" }));

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "terminal.execute",
        id: "cmd-test",
      }),
      expect.objectContaining({
        approved: true,
        threshold: "owner",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("blocks next execution controls when the autonomy decision is blocked", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          commands: digitalProductProBuildModePayload.commands.map((command) =>
            command.id === "cmd-safe-edit-checkout-copy"
              ? {
                  ...command,
                  command:
                    "psr.edit target:apps/digital-product-pro/src/pages/Checkout.tsx token=inline-secret",
                }
              : command,
          ),
        }}
      />,
    );

    const runNext = screen.getByRole("button", {
      name: "Run Next Execution Step",
    });
    const approveNext = screen.getByRole("button", {
      name: "Approve Next Execution Step",
    });
    expect(runNext).toBeDisabled();
    expect(approveNext).toBeDisabled();

    fireEvent.click(runNext);
    fireEvent.click(approveNext);
    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("blocks out-of-order checkpoint rollback commands from checkpoint controls", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    const rollback = screen.getByRole("button", {
      name: "Rollback Pre-edit checkpoint",
    });
    expect(rollback).toBeDisabled();
    fireEvent.click(rollback);
    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("emits approval metadata for checkpoint creation only when it is the next runbook action", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          commandReceipts:
            digitalProductProBuildModePayload.commandReceipts.filter(
              (receipt) =>
                receipt.id !== "build-command-receipt-checkpoint-create",
            ),
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) => {
              if (step.id === "plan-checkpoint") {
                return { ...step, status: "approval-required" };
              }
              if (step.id === "plan-safe-edits") {
                return { ...step, status: "pending" };
              }
              return step;
            },
          ),
        }}
      />,
    );

    const createCheckpoint = screen
      .getAllByRole("button", { name: "Run Create checkpoint" })
      .find((button) => !button.hasAttribute("disabled"));
    expect(createCheckpoint).toBeDefined();
    fireEvent.click(createCheckpoint!);

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "checkpoint.manage",
        command: "checkpoint:create pre-edit digital-product-pro",
        id: "cmd-checkpoint-create",
        kind: "checkpoint",
      }),
      expect.objectContaining({
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        threshold: "operator",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("emits safe edit commands from safe edit controls", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Apply Checkout copy refinement",
      }),
    );

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "psr.edit",
        id: "cmd-safe-edit-checkout-copy",
        kind: "edit",
        targetPaths: ["apps/digital-product-pro/src/pages/Checkout.tsx"],
      }),
      expect.objectContaining({
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        threshold: "operator",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("opens preview and blocks out-of-order browser verification requests", () => {
    const onOpenPreview = vi.fn();
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onOpenPreview={onOpenPreview}
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Preview" }));
    expect(onOpenPreview).toHaveBeenCalledWith(
      "http://localhost:5173/apps/digital-product-pro",
    );

    expect(screen.getByRole("button", {
      name: "Run Open generated preview from Browser Verification panel",
    })).toBeDisabled();
    const runVerification = screen.getByRole("button", {
      name: "Run Browser verification from Browser Verification panel",
    });
    expect(runVerification).toBeDisabled();
    fireEvent.click(runVerification);
    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("blocks external browser preview URLs from opening outside browser automation approval", () => {
    const onOpenPreview = vi.fn();
    render(
      <BuildModeView
        onOpenPreview={onOpenPreview}
        payload={{
          ...digitalProductProBuildModePayload,
          browserVerification: {
            ...digitalProductProBuildModePayload.browserVerification,
            previewUrl: "https://example.com/apps/digital-product-pro",
          },
        }}
      />,
    );

    const openPreview = screen.getByRole("button", { name: "Open Preview" });
    expect(openPreview).toBeDisabled();
    fireEvent.click(openPreview);
    expect(onOpenPreview).not.toHaveBeenCalled();
  });

  it("blocks redacted browser preview URLs from opening", () => {
    const onOpenPreview = vi.fn();
    render(
      <BuildModeView
        onOpenPreview={onOpenPreview}
        payload={{
          ...digitalProductProBuildModePayload,
          browserVerification: {
            ...digitalProductProBuildModePayload.browserVerification,
            previewUrl:
              "http://localhost:5173/apps/digital-product-pro?token=<redacted-secret>",
          },
        }}
      />,
    );

    const openPreview = screen.getByRole("button", { name: "Open Preview" });
    expect(openPreview).toBeDisabled();
    fireEvent.click(openPreview);
    expect(onOpenPreview).not.toHaveBeenCalled();
  });

  it("blocks browser preview URLs with embedded credentials", () => {
    const onOpenPreview = vi.fn();
    render(
      <BuildModeView
        onOpenPreview={onOpenPreview}
        payload={{
          ...digitalProductProBuildModePayload,
          browserVerification: {
            ...digitalProductProBuildModePayload.browserVerification,
            previewUrl:
              "http://preview-user:preview-password@localhost:5173/apps/digital-product-pro",
          },
        }}
      />,
    );

    const openPreview = screen.getByRole("button", { name: "Open Preview" });
    expect(openPreview).toBeDisabled();
    fireEvent.click(openPreview);
    expect(onOpenPreview).not.toHaveBeenCalled();
  });

  it("emits browser verification approvals when verification is next", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={withApprovalRequiredBrowserStep()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Run Browser verification from Browser Verification panel",
      }),
    );

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "browser.automation",
        id: "cmd-browser-verify",
      }),
      expect.objectContaining({
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        threshold: "operator",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("blocks out-of-order workflow commands", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Run digitalProduct.fulfillPurchase",
      }),
    );

    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("emits workflow approvals when workflow execution is next", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            capabilityId: "workflow.execute",
            nextCommandId: "cmd-workflow-workflow-mcp-dpp-fulfillment",
            nextStepId: "plan-workflow",
            requiredApprovalThreshold: "owner",
            status: "approval-required",
          },
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) =>
              [
                "plan-safe-edits",
                "plan-thorapi-vaix",
                "plan-tests",
                "plan-browser",
              ].includes(step.id)
                ? { ...step, status: "complete" }
                : step.id === "plan-workflow"
                  ? { ...step, status: "approval-required" }
                  : step,
          ),
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Run digitalProduct.fulfillPurchase",
      }),
    );

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "workflow.execute",
        command:
          "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase execmodule:execmodule-digital-product-fulfillment workflow:workflow:digital-product-fulfillment input:schemas/digitalProduct.fulfillPurchase.input.json",
        id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
        kind: "workflow",
        requiresApproval: true,
        status: "approval-required",
      }),
      expect.objectContaining({
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        threshold: "owner",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("blocks out-of-order scheduled automation commands", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Schedule Nightly fulfillment smoke check",
      }),
    );

    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("emits scheduled automation approvals when automation execution is next", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            capabilityId: "automation.schedule",
            nextCommandId:
              "cmd-automation-automation-nightly-fulfillment-check",
            nextStepId: "plan-workflow",
            requiredApprovalThreshold: "owner",
            status: "approval-required",
          },
          commandReceipts: [
            ...digitalProductProBuildModePayload.commandReceipts,
            {
              approved: true,
              capabilityId: "workflow.execute",
              commandId: "cmd-workflow-workflow-mcp-dpp-fulfillment",
              createdAt: "2026-06-22T12:20:00.000Z",
              id: "receipt-workflow-run-dpp-001",
              requiresApproval: true,
              status: "succeeded",
              summary: "Workflow tool completed.",
            },
          ],
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) =>
              [
                "plan-safe-edits",
                "plan-thorapi-vaix",
                "plan-tests",
                "plan-browser",
              ].includes(step.id)
                ? { ...step, status: "complete" }
                : step.id === "plan-workflow"
                  ? { ...step, status: "approval-required" }
                  : step,
          ),
        }}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Schedule Nightly fulfillment smoke check",
      }),
    );

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "automation.schedule",
        command:
          "schedule:0 7 * * * workflow:workflow:digital-product-fulfillment command:cmd-workflow-workflow-mcp-dpp-fulfillment",
        id: "cmd-automation-automation-nightly-fulfillment-check",
        kind: "automation",
        requiresApproval: true,
        status: "approval-required",
      }),
      expect.objectContaining({
        approved: true,
        approverPrincipalId: "principal-valhalla-operator",
        threshold: "owner",
      }),
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("emits scheduled automation refreshes with the current command catalog", () => {
    const onRunDueAutomations = vi.fn();
    render(
      <BuildModeView
        onRunDueAutomations={onRunDueAutomations}
        payload={digitalProductProBuildModePayload}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Refresh scheduled automations" }),
    );

    expect(onRunDueAutomations).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cmd-workflow-workflow-mcp-dpp-fulfillment",
          capabilityId: "workflow.execute",
        }),
        expect.objectContaining({
          id: "cmd-automation-automation-nightly-fulfillment-check",
          capabilityId: "automation.schedule",
        }),
      ]),
      "valkyr-credits",
      expectedPromptContext,
    );
  });

  it("renders scheduled automation monitor run status", () => {
    render(
      <BuildModeView
        payload={{
          ...digitalProductProBuildModePayload,
          scheduledAutomations:
            digitalProductProBuildModePayload.scheduledAutomations.map(
              (automation) => ({
                ...automation,
                lastRunAt: "2026-06-23T07:01:00.000Z",
                lastRunReceiptId: "build-command-receipt-workflow-run-001",
                lastRunStatus: "succeeded",
                nextRunAt: "2026-06-24T07:00:00.000Z",
                runHistory: [
                  {
                    completedAt: "2026-06-23T07:01:00.000Z",
                    receiptId: "build-command-receipt-workflow-run-001",
                    status: "succeeded",
                  },
                ],
              }),
            ),
        }}
      />,
    );

    expect(
      screen.getByText("last run: succeeded at 2026-06-23T07:01:00.000Z"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("build-command-receipt-workflow-run-001"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "succeeded at 2026-06-23T07:01:00.000Z (build-command-receipt-workflow-run-001)",
      ),
    ).toBeInTheDocument();
  });

  it("emits scheduled automation pause and resume controls", () => {
    const onSetAutomationStatus = vi.fn();
    const scheduledPayload = {
      ...digitalProductProBuildModePayload,
      scheduledAutomations:
        digitalProductProBuildModePayload.scheduledAutomations.map(
          (automation) => ({
            ...automation,
            scheduler: "valkyrai-cron" as const,
            status: "scheduled" as const,
            valkyraiScheduleUri:
              "valkyrai://vaiworkflow/workflow:digital-product-fulfillment/schedule",
            valkyraiWorkflowId: "workflow:digital-product-fulfillment",
          }),
        ),
    };
    const pausedPayload = {
      ...digitalProductProBuildModePayload,
      scheduledAutomations:
        digitalProductProBuildModePayload.scheduledAutomations.map(
          (automation) => ({
            ...automation,
            scheduler: "valkyrai-cron" as const,
            status: "paused" as const,
            valkyraiScheduleUri:
              "valkyrai://vaiworkflow/workflow:digital-product-fulfillment/schedule",
            valkyraiWorkflowId: "workflow:digital-product-fulfillment",
          }),
        ),
    };

    const { rerender } = render(
      <BuildModeView
        onSetAutomationStatus={onSetAutomationStatus}
        payload={scheduledPayload}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Pause Nightly fulfillment smoke check",
      }),
    );
    expect(onSetAutomationStatus).toHaveBeenCalledWith(
      "automation-nightly-fulfillment-check",
      "paused",
    );

    rerender(
      <BuildModeView
        onSetAutomationStatus={onSetAutomationStatus}
        payload={pausedPayload}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Resume Nightly fulfillment smoke check",
      }),
    );
    expect(onSetAutomationStatus).toHaveBeenCalledWith(
      "automation-nightly-fulfillment-check",
      "scheduled",
    );
  });

  it("blocks scheduled automation lifecycle controls without ValkyrAI cron registration proof", () => {
    const onSetAutomationStatus = vi.fn();
    render(
      <BuildModeView
        onSetAutomationStatus={onSetAutomationStatus}
        payload={{
          ...digitalProductProBuildModePayload,
          scheduledAutomations:
            digitalProductProBuildModePayload.scheduledAutomations.map(
              (automation) => ({
                ...automation,
                scheduler: "valkyrai-cron" as const,
                status: "scheduled" as const,
                valkyraiScheduleUri: undefined,
                valkyraiWorkflowId: undefined,
              }),
            ),
        }}
      />,
    );

    const pause = screen.getByRole("button", {
      name: "Pause Nightly fulfillment smoke check",
    });
    expect(pause).toBeDisabled();
    fireEvent.click(pause);
    expect(onSetAutomationStatus).not.toHaveBeenCalled();
  });
});
