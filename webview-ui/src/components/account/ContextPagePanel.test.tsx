import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import ContextPagePanel from "./ContextPagePanel";

const mockCompileContextPage = vi.fn();
const mockHydrateContextPage = vi.fn();
const mockRecompressContextPage = vi.fn();
const mockTraverseContextPage = vi.fn();
const mockGetContextPageQuery = vi.fn();

vi.mock("@thorapi/services/creditsApi", () => ({
  useCompileContextPageMutation: () => [
    mockCompileContextPage,
    { isLoading: false, error: undefined },
  ],
  useHydrateContextPageMutation: () => [
    mockHydrateContextPage,
    { isLoading: false, error: undefined },
  ],
  useRecompressContextPageMutation: () => [
    mockRecompressContextPage,
    { isLoading: false, error: undefined },
  ],
  useTraverseContextPageMutation: () => [
    mockTraverseContextPage,
    { isLoading: false, error: undefined },
  ],
  useGetContextPageQuery: (...args: any[]) => mockGetContextPageQuery(...args),
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

const contextResponse = {
  contextPage: {
    pageRef: "ctx-page-123",
    traceId: "trace-123",
    taskIntent: "Generate a tenant app",
    compactSummary: "Use account billing, app generation, and ContextPage evidence.",
    status: "compiled",
    tenantId: "main",
    tokenEstimate: 512,
    confidence: 0.82,
    freshness: 0.74,
    policy: "tenant_scope_verified",
    recommendedAction: "hydrate_context",
    items: [
      {
        itemRef: "item-1",
        sourceType: "memory",
        sourceId: "memory-1",
        summary: "Billing policy memory",
        relevanceScore: 0.91,
        confidence: 0.88,
        retained: true,
        hydrated: true,
        policyDecision: "allow",
        retrievalReceiptItem: {
          memoryId: "memory-1",
          sourceType: "memory",
          rank: 1,
          finalScore: 0.93,
          textPreview: "Credits must be tenant scoped and idempotent.",
          textHash: "hash-1",
        },
      },
    ],
    hydrationPointers: [
      {
        pointerRef: "ptr-1",
        targetType: "memory",
        targetId: "memory-1",
        status: "available",
        summary: "Relevant memory",
        estimatedTokens: 320,
        policy: "allow",
      },
    ],
    retrievalReceipt: {
      receiptId: "retrieval-1",
      traceId: "trace-123",
      retrievalMode: "semantic",
      retrievalStatus: "succeeded",
      recommendedAction: "use_context",
      quality: {
        overallScore: 0.86,
        resultCount: 1,
      },
      coverage: {
        coverageStatus: "complete",
        matchedEntities: ["MemoryEntry"],
      },
      provenance: {
        sourceCount: 1,
        sourceTypes: ["memory"],
      },
      policy: {
        rbacDecision: "allow",
        tenantScopeVerified: true,
        secureFieldRedactions: 2,
        restrictedRecordsExcluded: 0,
        policyNotes: ["main schema"],
      },
      items: [
        {
          memoryId: "memory-1",
          sourceType: "memory",
          finalScore: 0.93,
          textPreview: "Credits must be tenant scoped and idempotent.",
        },
      ],
    },
    compressionReceipt: {
      receiptRef: "compression-1",
      traceId: "trace-123",
      hydratedSourcesIncluded: ["memory-1"],
      retainedItemRefs: ["item-1"],
      discardedItemRefs: ["item-old"],
      newCompactSummary: "Recompressed billing and app generation evidence.",
      tokenDelta: -1200,
      confidenceChange: 0.04,
      policyDecision: "allow",
    },
  },
};

describe("ContextPagePanel", () => {
  beforeEach(() => {
    mockCompileContextPage.mockReset();
    mockHydrateContextPage.mockReset();
    mockRecompressContextPage.mockReset();
    mockTraverseContextPage.mockReset();
    mockGetContextPageQuery.mockReset();
    mockGetContextPageQuery.mockReturnValue({
      data: undefined,
      isFetching: false,
      error: undefined,
    });
    mockCompileContextPage.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(contextResponse),
    });
    mockHydrateContextPage.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(contextResponse),
    });
    mockRecompressContextPage.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(contextResponse),
    });
    mockTraverseContextPage.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue(contextResponse),
    });
  });

  it("compiles, hydrates, recompresses, and traverses a ContextPage", async () => {
    const { container } = render(<ContextPagePanel accountId="account-123" />);

    const textAreas = container.querySelectorAll("vscode-text-area");
    setWebComponentValue(textAreas[0], "Generate a tenant app");

    fireEvent.click(screen.getByText("Compile"));

    await waitFor(() =>
      expect(mockCompileContextPage).toHaveBeenCalledWith(
        expect.objectContaining({
          taskIntent: "Generate a tenant app",
          tenantId: "main",
          tokenBudget: 8000,
          includeProcedures: true,
          includeRatings: true,
          filters: expect.objectContaining({
            accountId: "account-123",
            sourceSurface: "valoride",
          }),
        }),
      ),
    );
    expect(await screen.findByText("ctx-page-123")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hydrate"));
    await waitFor(() =>
      expect(mockHydrateContextPage).toHaveBeenCalledWith(
        expect.objectContaining({
          contextPageRef: "ctx-page-123",
          pointerRefs: ["ptr-1"],
          maxItems: 1,
        }),
      ),
    );

    fireEvent.click(screen.getByText("Recompress"));
    await waitFor(() =>
      expect(mockRecompressContextPage).toHaveBeenCalledWith(
        expect.objectContaining({
          contextPageRef: "ctx-page-123",
          targetTokenBudget: 8000,
          retainedItemRefs: ["item-1"],
        }),
      ),
    );

    fireEvent.click(screen.getByText("Traverse"));
    await waitFor(() =>
      expect(mockTraverseContextPage).toHaveBeenCalledWith(
        expect.objectContaining({
          contextPageRef: "ctx-page-123",
          traversalType: "intent_shift",
          fromScope: "intent",
          toScope: "app_generation",
          metadata: expect.objectContaining({
            accountId: "account-123",
            sourceSurface: "valoride",
          }),
        }),
      ),
    );
  });

  it("looks up an existing ContextPage ref", () => {
    const { container } = render(<ContextPagePanel accountId="account-123" />);

    const textFields = container.querySelectorAll("vscode-text-field");
    setWebComponentValue(textFields[2], "ctx-existing");
    fireEvent.click(screen.getByTitle("Lookup ContextPage"));

    expect(mockGetContextPageQuery).toHaveBeenLastCalledWith(
      "ctx-existing",
      expect.objectContaining({ skip: false }),
    );
  });

  it("renders source hydration, retrieval, and recompression drill-down evidence", async () => {
    const { container } = render(<ContextPagePanel accountId="account-123" />);

    const textAreas = container.querySelectorAll("vscode-text-area");
    setWebComponentValue(textAreas[0], "Generate a tenant app");
    fireEvent.click(screen.getByText("Compile"));

    expect(await screen.findByText("Source Hydration")).toBeInTheDocument();
    expect(screen.getByText("Included Sources")).toBeInTheDocument();
    expect(screen.getByText("Billing policy memory")).toBeInTheDocument();
    expect(screen.getAllByText("memory-1").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Credits must be tenant scoped and idempotent.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Hydration Pointers")).toBeInTheDocument();
    expect(screen.getByText("ptr-1")).toBeInTheDocument();
    expect(screen.getByText("Retrieval Receipt")).toBeInTheDocument();
    expect(screen.getByText("retrieval-1")).toBeInTheDocument();
    expect(screen.getByText("86%")).toBeInTheDocument();
    expect(screen.getByText("Policy Boundary")).toBeInTheDocument();
    expect(screen.getByText("main schema")).toBeInTheDocument();
    expect(screen.getByText("Recompression")).toBeInTheDocument();
    expect(screen.getByText("compression-1")).toBeInTheDocument();
    expect(
      screen.getByText("Recompressed billing and app generation evidence."),
    ).toBeInTheDocument();
  });
});
