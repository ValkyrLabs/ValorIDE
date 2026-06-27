import {
  GrayMatterContextProvider,
  GrayMatterContextConfig,
} from "./GrayMatterContextProvider";

const baseConfig = (
  queryMemory: GrayMatterContextConfig["queryMemory"],
  retrieveMemoryWithReceipt?: GrayMatterContextConfig["retrieveMemoryWithReceipt"],
): GrayMatterContextConfig => ({
  enabled: true,
  maxTokens: 400,
  queryMemory,
  retrieveMemoryWithReceipt,
  scopes: ["project", "organization", "user"],
  timeoutMs: 3000,
});

describe("GrayMatterContextProvider", () => {
  it("formats scoped memories as a Remembered Context block", async () => {
    const provider = new GrayMatterContextProvider(undefined, () => 1000);
    const queryMemory = jest
      .fn()
      .mockResolvedValueOnce({
        results: [
          {
            content: "Rule: Use generated ThorAPI services for ACL behavior.",
            id: "invariant-1",
            tags: ["scope:organization", "invariant", "acl", "thorapi"],
            type: "decision",
          },
        ],
      })
      .mockResolvedValueOnce({
        results: [
          {
            content: "Use Zod for validation and never Yup.",
            id: "project-1",
            tags: ["scope:project", "project:abc"],
            type: "decision",
          },
          {
            content: "Prefer terse responses.",
            id: "user-1",
            tags: ["scope:user"],
            type: "preference",
          },
        ],
      });

    const result = await provider.getContextForPrompt(
      "React form validation",
      baseConfig(queryMemory),
    );

    expect(queryMemory).toHaveBeenNthCalledWith(1, {
      limit: 12,
      query: expect.stringContaining("invariant decision methodology"),
    });
    expect(queryMemory).toHaveBeenNthCalledWith(2, {
      limit: 24,
      query: "React form validation",
    });
    expect(result?.formattedBlock).toContain("## Remembered Context");
    expect(result?.formattedBlock).toContain("[gm:invariant-1] decision");
    expect(result?.formattedBlock).toContain("### project");
    expect(result?.formattedBlock).toContain("[gm:project-1] decision");
    expect(result?.formattedBlock).toContain("### user");
    expect(result?.fromScopes).toEqual(["organization", "project", "user"]);
  });

  it("prefers retrieval receipts and keeps receipt ids for audit metadata", async () => {
    const provider = new GrayMatterContextProvider(undefined, () => 1000);
    const queryMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest
      .fn()
      .mockResolvedValueOnce({
        receipt: {
          answerPolicy: "ALLOW_ANSWER",
          items: [
            {
              memoryId: "invariant-1",
              tags: ["scope:organization", "invariant", "thorapi"],
              textPreview: "Rule: Keep generated ThorAPI clients untouched.",
              sourceType: "decision",
            },
          ],
          receiptId: "gm_rr_invariant",
          recommendedAction: "ANSWER",
          retrievalStatus: "OK",
          traceId: "gm_trace_1",
        },
      })
      .mockResolvedValueOnce({
        receipt: {
          answerPolicy: "ALLOW_WITH_CAVEAT",
          items: [
            {
              memoryId: "project-1",
              tags: ["scope:project"],
              textPreview: "Use GrayMatter before prompt planning.",
              sourceType: "decision",
            },
          ],
          receiptId: "gm_rr_context",
          recommendedAction: "ANSWER_WITH_CAVEAT",
          retrievalStatus: "OK",
          traceId: "gm_trace_2",
        },
      });

    const result = await provider.getContextForPrompt(
      "GrayMatter prompt context",
      baseConfig(queryMemory, retrieveMemoryWithReceipt),
    );

    expect(retrieveMemoryWithReceipt).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        includeItems: true,
        includeText: true,
        query: expect.stringContaining("invariant decision methodology"),
        retrievalMode: "HYBRID",
        topK: 12,
      }),
    );
    expect(retrieveMemoryWithReceipt).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        query: "GrayMatter prompt context",
        topK: 24,
      }),
    );
    expect(queryMemory).not.toHaveBeenCalled();
    expect(result?.formattedBlock).toContain("[gm:invariant-1] decision");
    expect(result?.formattedBlock).toContain("[gm:project-1] decision");
    expect(result?.retrievalReceiptIds).toEqual([
      "gm_rr_invariant",
      "gm_rr_context",
    ]);
    expect(result?.retrievalTraceIds).toEqual(["gm_trace_1", "gm_trace_2"]);
  });

  it("falls back to MemoryEntry query when receipt retrieval is unavailable", async () => {
    const appendLine = jest.fn();
    const provider = new GrayMatterContextProvider({ appendLine }, () => 1000);
    const queryMemory = jest.fn(async () => ({
      results: [
        {
          content: "Use MemoryEntry/query only as degraded fallback.",
          id: "fallback-1",
          tags: ["scope:project"],
          type: "decision",
        },
      ],
    }));
    const retrieveMemoryWithReceipt = jest.fn(async () => {
      throw new Error("receipt endpoint unavailable");
    });

    const result = await provider.getContextForPrompt(
      "fallback behavior",
      baseConfig(queryMemory, retrieveMemoryWithReceipt),
    );

    expect(retrieveMemoryWithReceipt).toHaveBeenCalledTimes(2);
    expect(queryMemory).toHaveBeenCalledTimes(2);
    expect(result?.formattedBlock).toContain("[gm:fallback-1] decision");
    expect(result?.retrievalWarnings).toEqual([
      "receipt_fallback:invariant",
      "receipt_fallback:context",
    ]);
    expect(appendLine).toHaveBeenCalledWith(
      expect.stringContaining("Receipt retrieval degraded"),
    );
  });

  it("suppresses receipt-backed context when receipt policy requires retry", async () => {
    const appendLine = jest.fn();
    const provider = new GrayMatterContextProvider({ appendLine }, () => 1000);
    const queryMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "REQUIRE_RETRY",
        items: [
          {
            memoryId: "unsafe-1",
            textPreview: "This should not enter the prompt.",
          },
        ],
        receiptId: "gm_rr_retry",
        recommendedAction: "RETRY_WITH_EXPANDED_QUERY",
        retrievalStatus: "LOW_CONFIDENCE",
      },
    }));

    const result = await provider.getContextForPrompt(
      "uncertain context",
      baseConfig(queryMemory, retrieveMemoryWithReceipt),
    );

    expect(result).toBeNull();
    expect(queryMemory).not.toHaveBeenCalled();
    expect(appendLine).toHaveBeenCalledWith(
      expect.stringContaining("Receipt policy suppressed"),
    );
  });

  it("suppresses MCP graymatterPolicy-blocked receipt context without fallback", async () => {
    const appendLine = jest.fn();
    const provider = new GrayMatterContextProvider({ appendLine }, () => 1000);
    const queryMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      graymatterPolicy: {
        answerAllowed: false,
        answerPolicy: "ALLOW_ANSWER",
        caveatRequired: false,
        disposition: "do_not_answer_from_memory",
        receiptId: "gm_rr_policy",
        requiredActions: ["retry_or_clarify_before_answering"],
        retrievalStatus: "OK",
        traceId: "gm_trace_policy",
      },
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        items: [
          {
            memoryId: "blocked-1",
            textPreview: "This wrapper-blocked memory must stay out.",
          },
        ],
        receiptId: "gm_rr_policy",
        recommendedAction: "ANSWER",
        retrievalStatus: "OK",
        traceId: "gm_trace_policy",
      },
    }));

    const result = await provider.getContextForPrompt(
      "wrapper-blocked context",
      baseConfig(queryMemory, retrieveMemoryWithReceipt),
    );

    expect(result).toBeNull();
    expect(queryMemory).not.toHaveBeenCalled();
    expect(appendLine).toHaveBeenCalledWith(
      expect.stringContaining("disposition=do_not_answer_from_memory"),
    );
  });

  it("keeps invariant decisions when the ordinary context query also returns them", async () => {
    const provider = new GrayMatterContextProvider(undefined, () => 1000);
    const invariant = {
      content: "Rule: Never hand-edit generated ThorAPI clients.",
      id: "invariant-1",
      tags: ["scope:project", "invariant", "generated-code"],
      type: "decision",
    };
    const queryMemory = jest
      .fn()
      .mockResolvedValueOnce({ results: [invariant] })
      .mockResolvedValueOnce({
        results: [
          invariant,
          {
            content: "Use Vitest for webview tests.",
            id: "project-2",
            tags: ["scope:project"],
            type: "context",
          },
        ],
      });

    const result = await provider.getContextForPrompt(
      "generated clients",
      baseConfig(queryMemory),
    );

    expect(result?.entriesUsed).toBe(2);
    expect(result?.formattedBlock.match(/invariant-1/g)?.length).toBe(1);
    expect(result?.formattedBlock.indexOf("invariant-1")).toBeLessThan(
      result?.formattedBlock.indexOf("project-2") ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("returns null when GrayMatter query fails so prompt generation can continue", async () => {
    const appendLine = jest.fn();
    const provider = new GrayMatterContextProvider({ appendLine });

    const result = await provider.getContextForPrompt(
      "anything",
      baseConfig(async () => {
        throw new Error("network down");
      }),
    );

    expect(result).toBeNull();
    expect(appendLine).toHaveBeenCalledWith(
      expect.stringContaining("Skipping context layer"),
    );
  });
});
