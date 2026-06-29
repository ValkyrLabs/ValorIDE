import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const querySpies = vi.hoisted(() => ({
  appGeneration: vi.fn(),
  creditDebit: vi.fn(),
  skillopt: vi.fn(),
}));

const emptyQuery = {
  data: undefined,
  isLoading: false,
  isFetching: false,
  error: undefined,
  refetch: vi.fn(),
};

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
  VSCodeDivider: (props: any) => <hr {...props} />,
  VSCodeTextField: ({ onInput, ...props }: any) => (
    <input onInput={onInput} {...props} />
  ),
}));

vi.mock("@thorapi/services/creditsApi", () => ({
  useGetAppGenerationTraceQuery: querySpies.appGeneration,
  useGetCreditDebitReceiptByReceiptRefQuery: querySpies.creditDebit,
  useGetSkilloptRouteReceiptQuery: querySpies.skillopt,
  useListCreditDebitReceiptsQuery: () => ({
    ...emptyQuery,
    data: [{ receiptRef: "credit-receipt-1", authorization: "secret" }],
  }),
  useListSkilloptRouteReceiptsQuery: () => ({
    ...emptyQuery,
    data: [{ receiptRef: "route-receipt-1", token: "secret" }],
  }),
}));

import ReceiptTraceInspector, {
  sanitizeReceiptPayload,
} from "./ReceiptTraceInspector";

describe("ReceiptTraceInspector", () => {
  beforeEach(() => {
    querySpies.appGeneration.mockImplementation(
      () =>
        ({
          ...emptyQuery,
          data: {
            receiptRef: "generation-receipt-1",
            requestRef: "request-1",
            generationRunRef: "run-1",
            traceId: "trace-generation-1",
            tenantId: "main",
            accountId: "account-123",
            applicationId: "app-1",
            contextPageRef: "ctx-generation-1",
            skillOptRouteReceiptRef: "route-generation-1",
            creditDebitReceiptRef: "credit-generation-1",
            artifactSetRef: "artifact-set-1",
            buildRunRef: "build-1",
            testRunRef: "test-1",
            runtimeBindingRef: "runtime-1",
            generationReceipt: {
              receiptRef: "generation-receipt-1",
              requestRef: "request-1",
              generationRunRef: "run-1",
              tenantId: "main",
              traceId: "trace-generation-1",
              status: "succeeded",
              accountId: "account-123",
              applicationId: "app-1",
              contextPageRef: "ctx-generation-1",
              skillOptRouteReceiptRef: "route-generation-1",
              artifactSetRef: "artifact-set-1",
              buildRunRef: "build-1",
              testRunRef: "test-1",
              runtimeBindingRef: "runtime-1",
              billable: true,
              estimatedCredits: 100,
              debitedCredits: 32,
              generator: "ThorAPI Maven generator",
              summaryJson: JSON.stringify({
                buildReadiness: "ready_for_external_build",
              }),
            },
            appGenerationRequest: {
              requestRef: "request-1",
              tenantId: "main",
              traceId: "trace-generation-1",
              status: "completed",
              accountId: "account-123",
              intentSummary: "Generate onboarding portal",
              applicationId: "app-1",
              specDraftRef: "draft-1",
              objectModelRef: "object-model-1",
              specRevisionRef: "spec-revision-1",
              generationRunRef: "run-1",
              idempotencyKey: "idem-1",
            },
            thorApiGenerationRun: {
              generationRunRef: "run-1",
              tenantId: "main",
              traceId: "trace-generation-1",
              status: "succeeded",
              requestRef: "request-1",
              accountId: "account-123",
              applicationId: "app-1",
              artifactSetRef: "artifact-set-1",
              buildRunRef: "build-1",
              testRunRef: "test-1",
              runtimeBindingRef: "runtime-1",
              generator: "ThorAPI Maven generator",
              durationMillis: 2400,
              summaryJson: JSON.stringify({ javaCompilePassed: true }),
            },
            generatedArtifactSet: {
              artifactSetRef: "artifact-set-1",
              generationRunRef: "run-1",
              tenantId: "main",
              traceId: "trace-generation-1",
              status: "packaged",
              applicationId: "app-1",
              zipFileName: "package.zip",
              artifactCount: 2,
              totalBytes: 4096,
              manifestJson: JSON.stringify({ safePaths: true }),
            },
            generatedArtifacts: [
              {
                artifactRef: "artifact-backend-1",
                artifactSetRef: "artifact-set-1",
                generationRunRef: "run-1",
                tenantId: "main",
                traceId: "trace-generation-1",
                artifactType: "backend",
                status: "validated",
                fileName: "backend.zip",
                byteSize: 2048,
              },
              {
                artifactRef: "artifact-frontend-1",
                artifactSetRef: "artifact-set-1",
                generationRunRef: "run-1",
                tenantId: "main",
                traceId: "trace-generation-1",
                artifactType: "frontend",
                status: "validated",
                fileName: "frontend.zip",
                byteSize: 2048,
              },
            ],
            skillOptRouteReceipt: {
              receiptRef: "route-generation-1",
              traceId: "trace-generation-1",
              taskType: "tenant_app_generation",
              recommendedRoute: "run_thorapi_generation",
              routeExplanation: "Route allowed generation.",
              estimatedCreditCost: 100,
              confidence: 0.88,
              contextSufficiency: 0.79,
            },
            contextPage: {
              pageRef: "ctx-generation-1",
              traceId: "trace-generation-1",
              taskIntent: "Generate onboarding portal",
              compactSummary: "Source-backed onboarding app context.",
              status: "compiled",
              tokenEstimate: 1200,
            },
            creditDebitReceipt: {
              receiptRef: "credit-generation-1",
              customerId: "account-123",
              reservationRef: "reservation-1",
              status: "settled",
              amountCredits: 32,
              idempotencyKey: "debit-1",
              accountId: "account-123",
              tenantId: "main",
              traceId: "trace-generation-1",
              currentBalance: 68,
            },
          },
        }) as any,
    );
    querySpies.creditDebit.mockImplementation((_request: any, options: any) =>
      options?.skip
        ? emptyQuery
        : {
            ...emptyQuery,
            data: {
              receiptRef: "cdr_gm_0f635915-ac93-4514-b4e5-332747906e65",
              customerId: "account-123",
              status: "settled",
              amountCredits: 12,
              accountId: "account-123",
              tenantId: "main",
              traceId: "trace-credit-1",
              currentBalance: 2000000,
            },
          },
    );
    querySpies.skillopt.mockImplementation(
      () =>
        ({
          ...emptyQuery,
          data: {
            receiptRef: "route-receipt-1",
            traceId: "trace-1",
            taskType: "tenant_app_generation",
            recommendedRoute: "run_thorapi_generation",
            routeExplanation:
              "Credits are sufficient and the ContextPage has enough source-backed evidence.",
            estimatedCreditCost: 12.5,
            confidence: 0.82,
            creditBalance: 140,
            contextSufficiency: 0.76,
            requiredHydration: false,
            requiredApproval: false,
            billable: true,
            fallbackRoute: "ask_human_approval",
            policyDecision: "allow",
            routeScoresJson: JSON.stringify({
              run_thorapi_generation: 0.82,
              hydrate_context: 0.41,
            }),
            contextPage: {
              pageRef: "ctx-page-1",
            },
            procedure: {
              procedureRef: "procedure-1",
            },
            outcome: "success",
          },
        }) as any,
    );
  });

  it("redacts sensitive fields recursively", () => {
    expect(
      sanitizeReceiptPayload({
        receiptRef: "receipt-1",
        authorization: "Bearer abc",
        nested: {
          csrfToken: "csrf-secret",
          retained: "visible",
        },
      }),
    ).toEqual({
      receiptRef: "receipt-1",
      authorization: "[redacted]",
      nested: {
        csrfToken: "[redacted]",
        retained: "visible",
      },
    });
  });

  it("renders account-scoped recent receipt shortcuts", () => {
    render(<ReceiptTraceInspector accountId="account-123" />);

    expect(screen.getAllByText("account-123").length).toBeGreaterThan(0);
    expect(screen.getByText("route-receipt-1")).toBeInTheDocument();
    expect(screen.getByText("credit-receipt-1")).toBeInTheDocument();
  });

  it("renders the generation receipt chain as readable lifecycle evidence", () => {
    render(<ReceiptTraceInspector accountId="account-123" />);

    expect(screen.getByText("ThorAPI Maven generator")).toBeInTheDocument();
    expect(screen.getByText("Generate onboarding portal")).toBeInTheDocument();
    expect(screen.getAllByText("request-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("run-1").length).toBeGreaterThan(0);
    expect(screen.getByText("draft-1")).toBeInTheDocument();
    expect(screen.getByText("object-model-1")).toBeInTheDocument();
    expect(screen.getByText("spec-revision-1")).toBeInTheDocument();
    expect(screen.getAllByText("ctx-generation-1").length).toBeGreaterThan(0);
    expect(screen.getByText("package.zip")).toBeInTheDocument();
    expect(screen.getByText("artifact-backend-1")).toBeInTheDocument();
    expect(screen.getByText("artifact-frontend-1")).toBeInTheDocument();
    expect(screen.getByText("runtime-1")).toBeInTheDocument();
    expect(screen.getByText("68 credits")).toBeInTheDocument();
    expect(
      screen.getAllByText(/ready_for_external_build/).length,
    ).toBeGreaterThan(0);
  });

  it("renders a first-class SkillOpt route explanation", () => {
    render(<ReceiptTraceInspector accountId="account-123" />);

    fireEvent.click(screen.getAllByRole("button", { name: /SkillOpt/i })[0]);

    expect(screen.getByText("run thorapi generation")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Credits are sufficient and the ContextPage has enough source-backed evidence.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("76%")).toBeInTheDocument();
    expect(screen.getByText("12.5 credits")).toBeInTheDocument();
    expect(screen.getByText("140 credits")).toBeInTheDocument();
    expect(screen.getByText("ask human approval")).toBeInTheDocument();
    expect(screen.getByText("ctx-page-1")).toBeInTheDocument();
    expect(
      screen.getAllByText(/run_thorapi_generation/).length,
    ).toBeGreaterThan(1);
  });

  it("renders pasted SWARM command response evidence with trace refs", () => {
    render(<ReceiptTraceInspector accountId="account-123" />);

    fireEvent.click(screen.getByRole("button", { name: /SWARM/i }));
    fireEvent.input(screen.getByPlaceholderText(/SwarmCommandResponse JSON/i), {
      target: {
        value: JSON.stringify({
          status: "accepted",
          targetInstanceId: "valor-agent-1",
          issuedAt: "2026-06-11T17:00:00Z",
          commandId: "cmd-1",
          receiptRef: "swarm-command:cmd-1",
          traceId: "swarm-trace:trace-1",
          contextPageRef: "ctx-1",
          skillOptReceiptRef: "skillopt-route-1",
          workflowExecutionRef: "workflow_execution:run-1",
          workflowDispatchJson: JSON.stringify({
            workflowId: "workflow-1",
            secretToken: "super-secret",
          }),
        }),
      },
    });
    fireEvent.click(screen.getByTitle("Lookup receipt"));

    expect(screen.getByText("SWARM Command")).toBeInTheDocument();
    expect(screen.getAllByText("swarm-command:cmd-1").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("cmd-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("swarm-trace:trace-1").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("valor-agent-1")).toBeInTheDocument();
    expect(screen.getAllByText("ctx-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("skillopt-route-1").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("workflow_execution:run-1").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/accepted/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Workflow dispatch evidence")).toBeInTheDocument();
    expect(screen.getAllByText(/workflow-1/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/super-secret/)).not.toBeInTheDocument();
  });

  it("routes credit receipt references to the credit trace endpoint", () => {
    render(<ReceiptTraceInspector accountId="account-123" />);

    fireEvent.click(screen.getAllByRole("button", { name: /SkillOpt/i })[0]);
    fireEvent.input(screen.getByPlaceholderText("receiptRef"), {
      target: {
        value: "cdr_gm_0f635915-ac93-4514-b4e5-332747906e65",
      },
    });
    fireEvent.click(screen.getByTitle("Lookup receipt"));

    expect(querySpies.creditDebit).toHaveBeenLastCalledWith(
      {
        accountId: "account-123",
        receiptRef: "cdr_gm_0f635915-ac93-4514-b4e5-332747906e65",
      },
      { skip: false },
    );
    expect(
      screen.getAllByText("cdr_gm_0f635915-ac93-4514-b4e5-332747906e65").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/"currentBalance": 2000000/)).toBeInTheDocument();
  });
});
