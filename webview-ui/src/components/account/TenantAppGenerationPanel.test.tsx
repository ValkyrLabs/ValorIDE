import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import TenantAppGenerationPanel from "./TenantAppGenerationPanel";

const mockCreateAppGenerationRequest = vi.fn();
const mockRunAppGenerationRequest = vi.fn();
const mockTraceQuery = vi.fn();

vi.mock("@thorapi/services/creditsApi", () => ({
  useCreateAppGenerationRequestMutation: () => [
    mockCreateAppGenerationRequest,
    { isLoading: false, error: undefined },
  ],
  useRunAppGenerationRequestMutation: () => [
    mockRunAppGenerationRequest,
    { isLoading: false, error: undefined },
  ],
  useGetAppGenerationTraceQuery: (...args: any[]) => mockTraceQuery(...args),
}));

vi.mock("./ReceiptTraceInspector", () => ({
  sanitizeReceiptPayload: (value: unknown) => value,
}));

const setWebComponentValue = (element: Element, value: string) => {
  Object.defineProperty(element, "value", {
    configurable: true,
    writable: true,
    value,
  });
  fireEvent(element, new Event("input", { bubbles: true }));
};

describe("TenantAppGenerationPanel", () => {
  beforeEach(() => {
    mockCreateAppGenerationRequest.mockReset();
    mockRunAppGenerationRequest.mockReset();
    mockTraceQuery.mockReset();
    mockTraceQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: undefined,
    });
  });

  it("creates an app generation request and runs the returned request ref", async () => {
    const createdRequest = {
      requestRef: "appgen-req-123",
      traceId: "trace-123",
      tenantId: "main",
      accountId: "account-123",
      applicationId: "application-123",
      status: "ready",
    };
    const receipt = {
      receiptRef: "generation-receipt-123",
      requestRef: "appgen-req-123",
      generationRunRef: "thorapi-run-123",
      tenantId: "main",
      traceId: "trace-123",
      status: "succeeded",
    };
    mockCreateAppGenerationRequest.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(createdRequest),
    });
    mockRunAppGenerationRequest.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(receipt),
    });

    const { container } = render(
      <TenantAppGenerationPanel accountId="account-123" />,
    );

    const textFields = container.querySelectorAll("vscode-text-field");
    setWebComponentValue(textFields[1], "application-123");
    const textAreas = container.querySelectorAll("vscode-text-area");
    setWebComponentValue(
      textAreas[0],
      "Create a tenant app from this Application record",
    );

    fireEvent.click(screen.getByText("Create"));

    await waitFor(() =>
      expect(mockCreateAppGenerationRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "main",
          accountId: "account-123",
          applicationId: "application-123",
          status: "ready",
          intentSummary: "Create a tenant app from this Application record",
        }),
      ),
    );

    await screen.findByText("appgen-req-123");
    fireEvent.click(screen.getByText("Run"));

    await waitFor(() =>
      expect(mockRunAppGenerationRequest).toHaveBeenCalledWith("appgen-req-123"),
    );
    expect(await screen.findByText("generation-receipt-123")).toBeInTheDocument();
  });

  it("blocks creation until an application id is present", () => {
    render(<TenantAppGenerationPanel accountId="account-123" />);

    expect(screen.getByText("Application id is required before run."))
      .toBeInTheDocument();
    fireEvent.click(screen.getByText("Create"));
    expect(mockCreateAppGenerationRequest).not.toHaveBeenCalled();
  });
});
