import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BuildModeView from "./BuildModeView";
import { digitalProductProBuildModePayload } from "./buildModeFixtures";

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
    expect(screen.getByText("tenant-valkyr-demo")).toBeInTheDocument();
    expect(screen.getByText("principal-valhalla-operator")).toBeInTheDocument();
    expect(
      screen.getByText("/workspace/apps/digital-product-pro"),
    ).toBeInTheDocument();
    expect(screen.getByText("WorkflowEngineer")).toBeInTheDocument();
    expect(
      screen.getAllByText("policy:generated-thorapi-readonly").length,
    ).toBeGreaterThan(0);
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
    expect(screen.getByText("ThorAPI And VAIX")).toBeInTheDocument();
    expect(screen.getByText("DigitalProductService")).toBeInTheDocument();
    expect(
      screen.getByText(/ThorAPI - readonly-generated/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("issuePrivateDownloadEntitlement"),
    ).toBeInTheDocument();
    expect(screen.getByText("Capability Matrix")).toBeInTheDocument();
    expect(
      screen.getByText("Read authorized connector data"),
    ).toBeInTheDocument();
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
        "bootstrap-credit-estimate (graymatter.context, valkyr-credits, succeeded): 0 credits",
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
    expect(screen.getByText("Pre-edit checkpoint proof")).toBeInTheDocument();
    expect(screen.getByText("Safe Edits")).toBeInTheDocument();
    expect(screen.getByText("Checkout copy refinement")).toBeInTheDocument();
    expect(
      screen.getAllByText("apps/digital-product-pro/src/pages/Checkout.tsx")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Nightly fulfillment smoke check"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Read order-support Gmail thread"),
    ).toBeInTheDocument();
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
    expect(screen.getAllByText(/blocks run/).length).toBeGreaterThan(0);
    expect(screen.getByText("Execution Plan")).toBeInTheDocument();
    expect(screen.getByText("Apply safe editable changes")).toBeInTheDocument();
    expect(screen.getByText("Run tests and build")).toBeInTheDocument();
    expect(screen.getByText("Run unit tests, then build.")).toBeInTheDocument();
    expect(screen.getByText("Agent Runtime Lanes")).toBeInTheDocument();
    expect(screen.getByText("Codex local build operator")).toBeInTheDocument();
    expect(screen.getByText("OpenClaw workflow executor")).toBeInTheDocument();
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
      screen.getByText("approval-gate - next: approve"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Prompt Valhalla Build Operator - prompt-bundle-valhalla-001@2026.06.21",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review and approve this command with the required threshold before dispatch.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Command declares approval required."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Digital Product Pro Build Mode Report/),
    ).toBeInTheDocument();
  });

  it("renders swarm role ownership for commands and receipts", () => {
    render(<BuildModeView payload={digitalProductProBuildModePayload} />);

    expect(
      screen.getAllByText(
        "role: Workflow Engineer - runtime-openclaw-workflow-operator",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("role: Supervisor - runtime-codex-build-operator")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("Role Browser Verifier - runtime-valoride-verifier"),
    ).toBeInTheDocument();
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
  });

  it("emits selected provider and prompt context with command requests", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            nextCommandId: "cmd-test",
            nextStepId: "plan-tests",
            status: "continue",
          },
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) =>
              step.id === "plan-safe-edits"
                ? { ...step, status: "complete" }
                : step.id === "plan-tests"
                  ? { ...step, status: "ready" }
                  : step,
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
              if (step.id === "plan-tests") {
                return { ...step, status: "ready" };
              }
              return step;
            },
          ),
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
      "valkyr-credits",
      expectedPromptContext,
      expect.any(Array),
    );
  });

  it("emits command runner requests for the current next command", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            nextCommandId: "cmd-test",
            nextStepId: "plan-tests",
            status: "continue",
          },
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) =>
              step.id === "plan-safe-edits"
                ? { ...step, status: "complete" }
                : step.id === "plan-tests"
                  ? { ...step, status: "ready" }
                  : step,
          ),
        }}
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
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            nextCommandId: "cmd-browser-verify",
            nextStepId: "plan-browser-verify",
            status: "approval-required",
          },
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) =>
              step.id === "plan-safe-edits" || step.id === "plan-tests"
                ? { ...step, status: "complete" }
                : step.id === "plan-browser-verify"
                  ? { ...step, status: "approval-required" }
                  : step,
          ),
        }}
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
          capabilityId: "mcp.tool",
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

  it("blocks next execution controls when the autonomy decision is blocked", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            reasonCodes: ["secret-inline-literal"],
            status: "blocked",
            summary:
              "Autonomy is blocked because the next command includes inline secret material.",
          },
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

  it("emits checkpoint rollback commands from checkpoint controls", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={digitalProductProBuildModePayload}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Rollback Pre-edit checkpoint",
      }),
    );

    expect(onRunCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "checkpoint.manage",
        command: "checkpoint:rollback checkpoint-pre-edit-dpp",
        id: "cmd-checkpoint-rollback",
        kind: "checkpoint",
        requiresApproval: true,
      }),
      undefined,
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

    const runVerification = screen.getByRole("button", {
      name: "Run Verification",
    });
    expect(runVerification).toBeDisabled();
    fireEvent.click(runVerification);
    expect(onRunCommand).not.toHaveBeenCalled();
  });

  it("emits browser verification approvals when verification is next", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            nextCommandId: "cmd-browser-verify",
            nextStepId: "plan-browser",
            status: "approval-required",
          },
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) =>
              step.id === "plan-safe-edits" || step.id === "plan-tests"
                ? { ...step, status: "complete" }
                : step.id === "plan-browser"
                  ? { ...step, status: "approval-required" }
                  : step,
          ),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Run Verification" }));

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

  it("blocks out-of-order MCP workflow tool commands", () => {
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

  it("emits MCP workflow tool approvals when workflow execution is next", () => {
    const onRunCommand = vi.fn();
    render(
      <BuildModeView
        onRunCommand={onRunCommand}
        payload={{
          ...digitalProductProBuildModePayload,
          autonomyDecision: {
            ...digitalProductProBuildModePayload.autonomyDecision,
            capabilityId: "mcp.tool",
            nextCommandId: "cmd-workflow-workflow-mcp-dpp-fulfillment",
            nextStepId: "plan-workflow",
            requiredApprovalThreshold: "owner",
            status: "approval-required",
          },
          executionPlan: digitalProductProBuildModePayload.executionPlan.map(
            (step) =>
              ["plan-safe-edits", "plan-tests", "plan-browser"].includes(
                step.id,
              )
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
        capabilityId: "mcp.tool",
        command:
          "mcp:private-valkyr-workflows.digitalProduct.fulfillPurchase workflow:workflow:digital-product-fulfillment input:schemas/digitalProduct.fulfillPurchase.input.json",
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
              capabilityId: "mcp.tool",
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
              ["plan-safe-edits", "plan-tests", "plan-browser"].includes(
                step.id,
              )
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
          capabilityId: "mcp.tool",
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
            status: "scheduled" as const,
          }),
        ),
    };
    const pausedPayload = {
      ...digitalProductProBuildModePayload,
      scheduledAutomations:
        digitalProductProBuildModePayload.scheduledAutomations.map(
          (automation) => ({
            ...automation,
            status: "paused" as const,
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
});
