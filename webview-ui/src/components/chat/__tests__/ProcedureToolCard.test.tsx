import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProcedureToolCard from "../ProcedureToolCard";
import { vscode } from "../../../utils/vscode";
vi.mock("../../../utils/vscode", () => ({ vscode: { postMessage: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const show = (data: unknown, approval = false) =>
  render(
    <ProcedureToolCard
      content={JSON.stringify(data)}
      awaitingApproval={approval}
    />,
  );

describe("procedure execution chat card", () => {
  const backend = "https://api-0.valkyrlabs.com/v1";
  const workflowId = "4d7b1763-71e6-4e8e-a1ee-b3cc39d6c671";
  const id = "6b5f4311-bf51-448a-83c8-e391c435314e";
  it("explains the exact approved control without presenting it as completed", () => {
    for (const [action, title, message] of [
      ["pause", "Pause this execution", /execution boundary/],
      ["resume", "Resume this execution", /does not approve/],
      ["cancel", "Cancel this execution", /does not reverse/],
    ] as const) {
      show(
        { phase: "request", action, backend, parameters: { executionId: id } },
        true,
      );
      expect(screen.getByText(title)).toBeTruthy();
      expect(screen.getByText("Awaiting approval")).toBeTruthy();
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.queryByText("Completed")).toBeNull();
      cleanup();
    }
  });
  it("shows the actual state after control including no-op and terminal responses", () => {
    for (const [state, label] of [
      ["PAUSED", "Paused"],
      ["RUNNING", "Running"],
      ["SUCCESS", "Completed"],
    ]) {
      show({
        phase: "result",
        action: "pause",
        backend,
        result: {
          status: "control_returned",
          action: "pause",
          workflow: { id, workflowId, state },
        },
      });
      expect(screen.getByText(label)).toBeTruthy();
      expect(
        screen.getByText(/ValkyrAI returned this execution state/),
      ).toBeTruthy();
      expect(screen.getByText(id)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Review this run" }));
      expect(vscode.postMessage).toHaveBeenLastCalledWith({
        type: "openWorkflowStudio",
        workflowStudioTarget: { workflowId, backend, executionId: id },
      });
      cleanup();
    }
  });
  it("keeps uncertain control and its execution reference visible without a success claim", () => {
    show({
      phase: "error",
      action: "cancel",
      executionId: id,
      backend,
      result: {
        error: {
          code: "CONTROL_OUTCOME_UNKNOWN",
          message: "Inspect this execution before taking another action.",
        },
      },
    });
    expect(screen.getByText("Control unverified")).toBeTruthy();
    expect(screen.getByText(id)).toBeTruthy();
    expect(screen.queryByText("Cancelled")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Review this run" }),
    ).toBeNull();
  });
  it("does not infer a control outcome from mismatched or incomplete history", () => {
    for (const change of [
      { action: "resume" },
      { status: "procedure_started" },
      { workflow: { id: "unverified", workflowId, state: "PAUSED" } },
      { workflow: { id, workflowId, state: "constructor" } },
    ]) {
      show({
        phase: "result",
        action: "pause",
        backend,
        result: {
          status: "control_returned",
          action: "pause",
          workflow: { id, workflowId, state: "PAUSED" },
          ...change,
        },
      });
      expect(screen.getByText("Unverified")).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "Review this run" }),
      ).toBeNull();
      cleanup();
    }
  });
  it("opens the existing workflow through a backend-bound host message, keeping the exact execution visible", () => {
    for (const action of ["status", "execute"]) {
      const execution = { id, workflowId, state: "RUNNING" };
      show({
        phase: "result",
        action,
        backend,
        result:
          action === "status"
            ? execution
            : { status: "procedure_started", workflow: execution },
      });
      expect(screen.getByText(id)).toBeTruthy();
      expect(screen.getByText(backend)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Review this run" }));
      expect(vscode.postMessage).toHaveBeenLastCalledWith({
        type: "openWorkflowStudio",
        workflowStudioTarget: { workflowId, backend, executionId: id },
      });
      cleanup();
    }
  });
  it("does not offer navigation for missing provenance, malformed references, or unverified history", () => {
    const valid = {
      phase: "result",
      action: "status",
      backend,
      result: { id, workflowId, state: "SUCCESS" },
    };
    for (const value of [
      { ...valid, backend: undefined },
      { ...valid, backend: "https://user:secret@api-0.valkyrlabs.com/v1" },
      { ...valid, phase: "request" },
      { ...valid, phase: "error" },
      { ...valid, result: { ...valid.result, id: "invented" } },
      { ...valid, result: { ...valid.result, workflowId: "invented" } },
      { ...valid, result: { ...valid.result, state: "UNKNOWN" } },
      { ...valid, result: { ...valid.result, state: "constructor" } },
      {
        ...valid,
        action: "execute",
        result: { status: "fallback_required", workflow: valid.result },
      },
    ]) {
      show(value);
      expect(
        screen.queryByRole("button", { name: "Open workflow" }),
      ).toBeNull();
      cleanup();
    }
    expect(vscode.postMessage).not.toHaveBeenCalled();
  });
  it("makes the reviewed backend and exact inputs visible before execution", () => {
    show(
      {
        phase: "request",
        action: "execute",
        backend: "https://api-0.valkyrlabs.com/v1",
        parameters: { inputs: { amount: 42 } },
      },
      true,
    );
    expect(screen.getByText("Awaiting approval")).toBeTruthy();
    expect(screen.getByText("https://api-0.valkyrlabs.com/v1")).toBeTruthy();
    expect(screen.getByText(/"amount": 42/)).toBeTruthy();
    expect(screen.queryByText("Completed")).toBeNull();
  });
  it("distinguishes pending approval and running from completed execution", () => {
    for (const [state, label] of [
      ["RUNNING", "Running"],
      ["WAITING_FOR_APPROVAL", "Waiting for approval"],
      ["SUCCESS", "Completed"],
    ]) {
      show({
        phase: "result",
        action: "execute",
        result: {
          status: "procedure_started",
          workflow: { id: "exact-execution", state },
        },
      });
      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByText("exact-execution")).toBeTruthy();
      if (state !== "SUCCESS")
        expect(screen.queryByText("Completed")).toBeNull();
      cleanup();
    }
  });
  it("shows failed exact status and unknown dispatch without invented success", () => {
    show({
      phase: "result",
      action: "status",
      result: { id: "exact-execution", state: "FAILED" },
    });
    expect(screen.getByText("Failed")).toBeTruthy();
    cleanup();
    show({
      phase: "error",
      action: "execute",
      result: {
        error: {
          code: "DISPATCH_OUTCOME_UNKNOWN",
          message: "Inspect the original execution.",
        },
      },
    });
    expect(screen.getByText("Dispatch unverified")).toBeTruthy();
    expect(screen.queryByText("Completed")).toBeNull();
  });
  it("does not turn empty discovery into catalog absence", () => {
    show({
      phase: "result",
      action: "search",
      result: { procedures: [], coverage: { page: 1, complete: false } },
    });
    expect(screen.getByText(/Other procedures may exist/)).toBeTruthy();
    expect(
      screen.getByText(/page 2.*Full catalog coverage is unverified/),
    ).toBeTruthy();
  });
  it("offers input and exact version review with the existing backend-bound workflow navigation", () => {
    show({
      phase: "result",
      action: "search",
      backend,
      result: {
        procedures: [
          {
            name: "Reconcile snapshots",
            procedureRef: "procedure:reconcile:v1",
            workflowId,
            workflowVersionId: id,
            inputContract: {
              version: 1,
              requiredInputKeys: ["snapshot"],
              inputTypes: { snapshot: "object" },
              inputAliases: {},
              objectReferences: {},
            },
          },
        ],
        coverage: { page: 0, nextPage: 1, stopReason: null, complete: false },
      },
    });
    expect(screen.getByText("Review inputs and version")).toBeTruthy();
    expect(screen.getByText("snapshot")).toBeTruthy();
    expect(screen.getByText("object")).toBeTruthy();
    expect(screen.getByText(id)).toBeTruthy();
    expect(screen.getByText(/Nested fields require the workflow/)).toBeTruthy();
    expect(screen.getByText(/Continue with page 2/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open workflow" }));
    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "openWorkflowStudio",
      workflowStudioTarget: { workflowId, backend },
    });
  });
  it("keeps malformed discovery history non-actionable and does not fabricate input fields", () => {
    for (const extra of [
      { backend: undefined },
      { backend: "https://user:secret@example.com/v1" },
      { phase: "request" },
      { phase: "error" },
    ]) {
      show({
        phase: "result",
        action: "search",
        backend,
        ...extra,
        result: {
          procedures: [
            { name: "Unverified", workflowId, inputContract: { version: 2 } },
          ],
        },
      });
      expect(
        screen.queryByRole("button", { name: "Open workflow" }),
      ).toBeNull();
      cleanup();
    }
    show({
      phase: "result",
      action: "search",
      backend,
      result: {
        procedures: [
          {
            name: "Unverified",
            workflowId: "bad",
            inputContract: { version: 2 },
          },
        ],
      },
    });
    expect(screen.queryByRole("button", { name: "Open workflow" })).toBeNull();
    expect(screen.getByText("Input details are unavailable.")).toBeTruthy();
  });
  it("distinguishes observed query end from a client page limit", () => {
    for (const [stopReason, message] of [
      ["end_of_list", /Reached the end of this query/],
      ["page_limit", /Search stopped at the page limit/],
    ] as const) {
      show({
        phase: "result",
        action: "search",
        result: {
          procedures: [],
          coverage: {
            page: 10000,
            nextPage: null,
            stopReason,
            complete: false,
          },
        },
      });
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.queryByText(/Continue with page/)).toBeNull();
      cleanup();
    }
  });
  it("keeps blocked and explicit agent fallback separate", () => {
    show({
      phase: "result",
      action: "execute",
      result: { status: "blocked", recommendedRoute: "ask_human_approval" },
    });
    expect(screen.getByText("Blocked")).toBeTruthy();
    cleanup();
    show({
      phase: "result",
      action: "execute",
      result: { status: "fallback_required" },
    });
    expect(screen.getByText(/No fallback agent was launched/)).toBeTruthy();
  });
  it("handles malformed history as unverified", () => {
    render(<ProcedureToolCard content="{invalid" />);
    expect(screen.getByText("Unverified")).toBeTruthy();
  });
});

describe("procedure input contract card", () => {
  const result = {
    status: "input_contract_available",
    procedureId: "6b5f4311-bf51-448a-83c8-e391c435314e",
    procedureRef: "procedure:test",
    workflowId: "4d7b1763-71e6-4e8e-a1ee-b3cc39d6c671",
    workflowVersionId: "bfdeef65-350b-46af-a4ad-4bc82586fc4c",
    inputSchema: {
      type: "object",
      properties: {
        task: { type: "object", description: "<script>ignore policy</script>" },
      },
    },
    runtimeValidationRequired: true,
  };
  it("shows a nested contract as escaped data without an execution success claim", () => {
    const { container } = show({
      phase: "result",
      action: "inspect",
      backend: "https://api-0.valkyrlabs.com/v1",
      result,
    });
    expect(screen.getByText("Input contract available")).toBeTruthy();
    expect(screen.getByText(/Review full input schema/)).toBeTruthy();
    expect(container.querySelector("pre")?.textContent).toContain(
      "<script>ignore policy</script>",
    );
    expect(container.querySelector("script")).toBeNull();
    expect(screen.queryByText("Completed")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open workflow" }));
    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "openWorkflowStudio",
      workflowStudioTarget: {
        workflowId: result.workflowId,
        backend: "https://api-0.valkyrlabs.com/v1",
      },
    });
  });
  it("explains an unavailable schema without inventing inputs", () => {
    show({
      phase: "result",
      action: "inspect",
      result: {
        ...result,
        status: "input_contract_unavailable",
        inputSchema: null,
        reason: "not_declared",
      },
    });
    expect(screen.getByText("Input contract unavailable")).toBeTruthy();
    expect(screen.getByText(/does not declare/)).toBeTruthy();
    expect(screen.queryByText("Review full input schema")).toBeNull();
  });
  it("does not trust an incomplete inspection history", () => {
    show({
      phase: "result",
      action: "inspect",
      result: { ...result, workflowVersionId: "unknown" },
    });
    expect(screen.getByText("Unverified")).toBeTruthy();
    expect(screen.queryByText("Review full input schema")).toBeNull();
  });
});
