import { it } from "@jest/globals";
import {
  clearCredentialOrigins,
  registerCredentialOrigin,
} from "@shared/CredentialOrigin";
import { GrayMatterClientError } from "@services/graymatter/GrayMatterClient";
import {
  AgentContextAssembler,
  createAgentContextSectionForTask,
} from "./AgentContextAssembler";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? "application/json" : null,
    },
    json: jest.fn(async () => body),
    text: jest.fn(async () => JSON.stringify(body)),
  }) as unknown as Response;

const readySession = {
  baseUrl: "https://api-0.valkyrlabs.com/v1",
  capabilities: {
    agent: true,
    grayMatter: true,
    memoryEntry: true,
    memoryQuery: true,
    memoryRead: true,
    memoryWrite: true,
    project: true,
    projectObjectLink: true,
    swarmGraph: false,
    swarmOps: true,
  },
  checkedAt: "2026-05-13T12:00:00.000Z",
  status: "ready",
} as const;

beforeEach(() => clearCredentialOrigins());
afterEach(() => clearCredentialOrigins());

describe("AgentContextAssembler", () => {
  it("uses flat Lite compiler excerpts and their explicit correlation reference", async () => {
    const receiptId = "ca944002-b655-4f31-adcc-886fcd6e085c";
    const listMemory = jest.fn();
    const context = await new AgentContextAssembler({
      grayMatter: {
        listMemory,
        retrieveMemoryWithReceipt: async () => ({
          receiptId,
          contextPageRef: receiptId,
          policyVersion: "bifrost-lite-context/v1",
          contextHash: "a".repeat(64),
          retrievalStatus: "SUFFICIENT_CONTEXT",
          answerPolicy: "ANSWER_WITH_CITATIONS",
          recommendedAction: "use_context",
          staleRefs: [],
          omittedRefs: [],
          items: [
            {
              memoryId: "local-memory",
              type: "decision",
              excerpt:
                "Keep local project edits. api_key=example-fixture-value",
            },
          ],
        }),
      },
    }).assemble({ task: "Preserve edits" });
    expect(context.grayMatter.status).toBe("ready");
    expect(context.promptSection).toContain("[gm:local-memory]");
    expect(context.promptSection).not.toContain("example-fixture-value");
    expect(context.grayMatter.reads[0]).toMatchObject({
      receiptIds: [receiptId],
      traceIds: [receiptId],
    });
    expect(listMemory).not.toHaveBeenCalled();
  });

  it.each([
    {
      receipt: {
        receiptId: "r",
        traceId: "t",
        answerPolicy: "DENY",
        retrievalStatus: "ACCESS_DENIED",
      },
    },
    {
      receipt: {
        receiptId: "r",
        traceId: "t",
        answerPolicy: "REQUIRE_RETRY",
        retrievalStatus: "LOW_CONFIDENCE",
      },
    },
    {
      receipt: {
        receiptId: "r",
        answerPolicy: "ALLOW_ANSWER",
        retrievalStatus: "OK",
      },
    },
    { items: [{ memoryId: "unsafe", text: "Unaudited memory" }] },
  ])(
    "does not bypass a blocked or malformed receipt through the scoped list %j",
    async (reply) => {
      const listMemory = jest.fn(async () => [
        { id: "unreviewed", text: "Never inject this fallback" },
      ]);
      const queryMemory = jest.fn();
      const context = await new AgentContextAssembler({
        grayMatter: {
          listMemory,
          queryMemory,
          retrieveMemoryWithReceipt: async () => reply,
        },
      }).assemble({ task: "Safe task" });
      expect(context.grayMatter.status).toBe("unavailable");
      expect(context.grayMatter.citations).toEqual([]);
      expect(listMemory).not.toHaveBeenCalled();
      expect(queryMemory).not.toHaveBeenCalled();
    },
  );

  it.each([401, 403, 429, 500])(
    "does not use legacy reads after HTTP %s receipt failures",
    async (status) => {
      const listMemory = jest.fn();
      const context = await new AgentContextAssembler({
        grayMatter: {
          listMemory,
          retrieveMemoryWithReceipt: async () => {
            throw new GrayMatterClientError(
              "Receipt failed",
              status === 401
                ? "unauthenticated"
                : status === 403
                  ? "forbidden"
                  : status === 429
                    ? "quota"
                    : "unavailable",
              status,
            );
          },
        },
      }).assemble({ task: "Safe task" });
      expect(context.grayMatter.status).not.toBe("ready");
      expect(listMemory).not.toHaveBeenCalled();
    },
  );

  it("keeps authorized generated MemoryEntry compatibility only when the custom receipt route is absent", async () => {
    const listMemory = jest.fn(async () => [
      {
        id: "legacy-memory",
        text: "Keep ValorIDE generated ThorAPI clients.",
        tags: ["valoride", "thorapi"],
      },
    ]);
    const context = await new AgentContextAssembler({
      grayMatter: {
        listMemory,
        retrieveMemoryWithReceipt: async () => {
          throw new GrayMatterClientError(
            "Receipt route missing",
            "unavailable",
            404,
          );
        },
      },
    }).assemble({ task: "ValorIDE ThorAPI" });
    expect(context.grayMatter.status).toBe("ready");
    expect(listMemory).toHaveBeenCalledTimes(1);
  });

  it("cannot project or bypass an explicit ContextPage receipt denial", async () => {
    const compileContextPagePrompt = jest.fn();
    const listMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest.fn();
    const context = await new AgentContextAssembler({
      grayMatter: {
        compileContextPage: async () => ({
          contextPage: {
            pageRef: "page",
            status: "ready",
            traceId: "trace-denied",
            retrievalReceipt: {
              receiptId: "receipt-denied",
              answerPolicy: "DENY",
              retrievalStatus: "ACCESS_DENIED",
            },
            items: [
              {
                itemRef: "unsafe",
                summary: "This denied content must not enter the prompt",
              },
            ],
          },
        }),
        compileContextPagePrompt,
        listMemory,
        retrieveMemoryWithReceipt,
      },
    }).assemble({ task: "Safe task" });
    expect(context.grayMatter.status).toBe("forbidden");
    expect(context.grayMatter.reads[0]).toMatchObject({
      receiptIds: ["receipt-denied"],
      traceIds: ["trace-denied"],
    });
    expect(context.promptSection).not.toContain("This denied content");
    expect(compileContextPagePrompt).not.toHaveBeenCalled();
    expect(listMemory).not.toHaveBeenCalled();
    expect(retrieveMemoryWithReceipt).not.toHaveBeenCalled();
  });

  it("prefers a bounded Bifrost ContextPage prompt with source lineage", async () => {
    const queryMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest.fn();
    const compileContextPage = jest.fn(async () => ({
      contextPage: {
        pageRef: "context-page-1",
        status: "ready",
        traceId: "trace-1",
        tokenEstimate: 320,
        retrievalReceipt: { receiptId: "receipt-1" },
        items: [
          {
            itemRef: "item-1",
            sourceId: "memory-1",
            sourceType: "memory",
            summary: "Preserve generated ACL behavior.",
          },
        ],
      },
    }));
    const compileContextPagePrompt = jest.fn(async () => ({
      compilerVersion: "bifrost-1",
      contextHash: "b".repeat(64),
      contextPageRef: "context-page-1",
      contextTokenEstimate: 72,
      includedItemRefs: ["item-1"],
      lineageHash: "c".repeat(64),
      prompt: "BIFROST: preserve ACL; hydrate exact source only when needed.",
      promptHash: "a".repeat(64),
      retrievalReceiptRef: "receipt-1",
      sourceHashes: ["d".repeat(64)],
      tokenEstimate: 96,
      traceId: "trace-1",
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: {
        compileContextPage,
        compileContextPagePrompt,
        queryMemory,
        retrieveMemoryWithReceipt,
      },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      cwd: "/repo",
      task: "Fix context efficiency",
      tokenBudget: 640,
    });

    expect(compileContextPage).toHaveBeenCalledWith(
      expect.objectContaining({ tokenBudget: 640 }),
    );
    expect(compileContextPagePrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        contextPageRef: "context-page-1",
        maxTokens: 640,
        surface: "code",
      }),
    );
    expect(retrieveMemoryWithReceipt).not.toHaveBeenCalled();
    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.promptSection).toContain("BIFROST");
    expect(context.bifrost).toEqual(
      expect.objectContaining({
        compilerVersion: "bifrost-1",
        contextHash: "b".repeat(64),
        contextPageRef: "context-page-1",
        contextTokenEstimate: 72,
        includedItemCount: 1,
        lineageHash: "c".repeat(64),
        promptTokenEstimate: 96,
        retrievalReceiptRef: "receipt-1",
        sourceHashCount: 1,
        traceId: "trace-1",
      }),
    );
    expect(context.grayMatter.reads[0]).toEqual(
      expect.objectContaining({
        citations: ["gm:item-1"],
        receiptIds: ["receipt-1"],
      }),
    );
  });

  it("falls back when ContextPage reports an application-level failure", async () => {
    const compileContextPagePrompt = jest.fn();
    const listMemory = jest.fn(async () => [
      {
        id: "memory-fallback",
        tags: ["graymatter", "valoride"],
        text: "Preserve the GrayMatter receipt and authorization boundary.",
        type: "decision",
      },
    ]);
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        retrievalStatus: "OK",
        recommendedAction: "ANSWER",
        receiptId: "receipt-fresh",
        traceId: "trace-fresh",
        items: [
          {
            memoryId: "memory-fallback",
            textPreview:
              "Preserve the GrayMatter receipt and authorization boundary.",
          },
        ],
      },
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: {
        compileContextPage: jest.fn(async () => ({
          contextPage: {
            items: [],
            pageRef: "context-page-failed",
            retrievalReceipt: {
              receiptId: "receipt-failed",
            },
            status: "failed",
          },
        })),
        compileContextPagePrompt,
        listMemory,
        queryMemory: jest.fn(),
        retrieveMemoryWithReceipt,
      },
    });

    const context = await assembler.assemble({
      task: "Fix ValorIDE GrayMatter retrieval",
    });

    expect(compileContextPagePrompt).not.toHaveBeenCalled();
    expect(listMemory).not.toHaveBeenCalled();
    expect(retrieveMemoryWithReceipt).toHaveBeenCalledTimes(1);
    expect(context.bifrost).toBeUndefined();
    expect(context.grayMatter.status).toBe("ready");
    expect(context.grayMatter.citations).toEqual([
      expect.objectContaining({ id: "memory-fallback" }),
    ]);
  });

  it("does not report a successfully projected empty ContextPage as ready memory", async () => {
    const assembler = new AgentContextAssembler({
      grayMatter: {
        compileContextPage: jest.fn(async () => ({
          contextPage: {
            items: [],
            pageRef: "context-page-empty",
            retrievalReceipt: { receiptId: "receipt-empty" },
            status: "ready",
          },
        })),
        compileContextPagePrompt: jest.fn(async () => ({
          contextPageRef: "context-page-empty",
          includedItemRefs: [],
          prompt: "Authorized context is empty.",
          retrievalReceiptRef: "receipt-empty",
        })),
        queryMemory: jest.fn(),
      },
    });

    const context = await assembler.assemble({ task: "A novel task" });

    expect(context.grayMatter.status).toBe("empty");
    expect(context.grayMatter.citations).toEqual([]);
    expect(context.grayMatter.reads[0]).toEqual(
      expect.objectContaining({ status: "empty" }),
    );
  });

  it("fails fast after a Bifrost timeout instead of multiplying retrieval latency", async () => {
    const retrieveMemoryWithReceipt = jest.fn();
    const assembler = new AgentContextAssembler({
      grayMatter: {
        compileContextPage: jest.fn(async () => {
          throw new GrayMatterClientError(
            "GrayMatter request exceeded the chat latency budget.",
            "unavailable",
          );
        }),
        compileContextPagePrompt: jest.fn(),
        queryMemory: jest.fn(),
        retrieveMemoryWithReceipt,
      },
    });

    const context = await assembler.assemble({ task: "Keep first token fast" });

    expect(context.grayMatter.status).toBe("unavailable");
    expect(retrieveMemoryWithReceipt).not.toHaveBeenCalled();
  });

  it("uses receipt retrieval only when an older server lacks ContextPage routes", async () => {
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        items: [],
        receiptId: "receipt-fallback",
        retrievalStatus: "OK",
        traceId: "trace-receipt-fallback",
      },
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: {
        compileContextPage: jest.fn(async () => {
          throw new GrayMatterClientError(
            "ContextPage route not found.",
            "unavailable",
            404,
          );
        }),
        compileContextPagePrompt: jest.fn(),
        queryMemory: jest.fn(),
        retrieveMemoryWithReceipt,
      },
    });

    const context = await assembler.assemble({ task: "Legacy server" });

    expect(context.grayMatter.status).toBe("empty");
    expect(retrieveMemoryWithReceipt).toHaveBeenCalledTimes(1);
  });

  it("does not form prompt context from a direct memory query without a receipt", async () => {
    const queryMemory = jest.fn(async () => ({
      results: [
        {
          content:
            "Prefer generated ThorAPI services before custom REST wrappers for ValkyrAI resources.",
          id: "memory-1",
          metadata: { title: "ThorAPI standard" },
          tags: ["thorapi", "standards"],
          type: "decision",
        },
        {
          content:
            "Never leak bearer token abc.def.ghi or Authorization: Bearer secret-token in prompt context.",
          id: "memory-2",
          tags: ["security"],
          type: "context",
        },
      ],
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: { queryMemory },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      cwd: "/repo",
      maxEntryChars: 120,
      task: "Implement a ThorAPI-backed settings panel",
    });

    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.grayMatter.status).toBe("unavailable");
    expect(context.grayMatter.citations).toEqual([]);
    expect(context.grayMatter.reads[0]).toEqual(
      expect.objectContaining({
        citations: [],
        warning:
          "graymatter_acl_scoped_memory_read_unavailable:direct_query_not_authorized",
      }),
    );
    expect(context.promptSection).not.toContain("secret-token");
  });

  it("prefers retrieval receipts and records receipt metadata", async () => {
    const queryMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        items: [
          {
            fieldName: "Agent safety invariant",
            memoryId: "memory-1",
            sourceType: "decision",
            tags: ["security"],
            textPreview:
              "Do not execute destructive workspace operations without explicit user direction.",
          },
        ],
        receiptId: "receipt-1",
        recommendedAction: "ANSWER",
        retrievalStatus: "OK",
        traceId: "trace-1",
      },
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: { queryMemory, retrieveMemoryWithReceipt },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      cwd: "/repo",
      task: "Run an agentic edit",
    });

    expect(retrieveMemoryWithReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        includeEvaluator: false,
        includeItems: true,
        includeText: true,
        qualityProfile: "DEFAULT",
        query: expect.stringContaining(
          "ValorIDE task context: Run an agentic edit\nWorkspace: /repo",
        ),
        retrievalMode: "HYBRID",
        topK: 8,
      }),
    );
    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.grayMatter.status).toBe("ready");
    expect(context.grayMatter.reads[0]).toEqual(
      expect.objectContaining({
        citations: ["gm:memory-1"],
        receiptIds: ["receipt-1"],
        traceIds: ["trace-1"],
      }),
    );
    expect(context.promptSection).toContain("[gm:memory-1] decision");
    expect(context.promptSection).toContain("Agent safety invariant");
  });

  it("does not direct-query memory when a receipt has no items", async () => {
    const queryMemory = jest.fn(async () => ({
      results: [
        {
          content:
            "Use generated ThorAPI TypeScript models and RTK Query services for ValkyrAI API work.",
          id: "memory-thorapi",
          tags: ["invariant", "thorapi"],
          type: "decision",
        },
      ],
    }));
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        items: [],
        receiptId: "receipt-empty",
        recommendedAction: "ANSWER",
        retrievalStatus: "OK",
        traceId: "trace-receipt-empty",
      },
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: { queryMemory, retrieveMemoryWithReceipt },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      task: "Fix ValorIDE rating UUID handling",
    });

    expect(retrieveMemoryWithReceipt).toHaveBeenCalled();
    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.grayMatter.status).toBe("empty");
    expect(context.grayMatter.citations).toEqual([]);
    expect(context.grayMatter.reads[0]?.warning).toBeUndefined();
  });

  it("uses the ACL-scoped MemoryEntry list only when receipt capability is absent", async () => {
    const listMemory = jest.fn(async () => ({
      content: [
        {
          id: "memory-direct",
          metadata: JSON.stringify({ title: "ThorAPI invariant" }),
          tags: [{ name: "invariant" }, { name: "valoride" }],
          text: "Use generated ThorAPI RTK Query clients before custom REST wrappers in ValorIDE.",
          type: "decision",
        },
      ],
    }));
    const queryMemory = jest.fn(async () => ({ results: [] }));
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        items: [],
        receiptId: "receipt-empty",
        recommendedAction: "ANSWER",
        retrievalStatus: "OK",
        traceId: "trace-receipt-empty",
      },
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: { listMemory, queryMemory },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      task: "Fix ValorIDE ThorAPI GrayMatter behavior",
    });

    expect(listMemory).toHaveBeenCalledTimes(1);
    expect(retrieveMemoryWithReceipt).not.toHaveBeenCalled();
    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.grayMatter.status).toBe("ready");
    expect(context.grayMatter.citations).toEqual([
      expect.objectContaining({ id: "memory-direct" }),
    ]);
  });

  it("reports receipt unavailability without direct-querying memory", async () => {
    const queryMemory = jest.fn(async () => ({
      results: [
        {
          content:
            "Use local project context when GrayMatter receipts degrade.",
          id: "memory-1",
          tags: ["resilience"],
          type: "context",
        },
      ],
    }));
    const retrieveMemoryWithReceipt = jest.fn(async () => {
      throw new Error("receipt endpoint unavailable");
    });
    const assembler = new AgentContextAssembler({
      grayMatter: { queryMemory, retrieveMemoryWithReceipt },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      task: "Continue safely",
    });

    expect(retrieveMemoryWithReceipt).toHaveBeenCalled();
    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.grayMatter.status).toBe("unavailable");
    expect(context.grayMatter.error).toBe("receipt endpoint unavailable");
    expect(context.grayMatter.reads[0]).toEqual(
      expect.objectContaining({
        citations: [],
        error: "receipt endpoint unavailable",
      }),
    );
  });

  it("suppresses receipt-backed context when policy requires retry", async () => {
    const queryMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "REQUIRE_RETRY",
        items: [
          {
            memoryId: "memory-1",
            textPreview: "This should not be included in prompt context.",
          },
        ],
        receiptId: "receipt-retry",
        recommendedAction: "RETRY_WITH_EXPANDED_QUERY",
        retrievalStatus: "LOW_CONFIDENCE",
        traceId: "trace-retry",
      },
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: { queryMemory, retrieveMemoryWithReceipt },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      task: "Use uncertain memory",
    });

    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.grayMatter.status).toBe("unavailable");
    expect(context.grayMatter.policyState).toBe("retry_required");
    expect(context.grayMatter.citations).toEqual([]);
    expect(context.grayMatter.reads[0]).toEqual(
      expect.objectContaining({
        citations: [],
        receiptIds: ["receipt-retry"],
        traceIds: ["trace-retry"],
        warning: expect.stringContaining("LOW_CONFIDENCE"),
      }),
    );
    expect(context.promptSection).toContain(
      "GrayMatter status: unavailable. Continue with local project context only.",
    );
    expect(context.promptSection).not.toContain("This should not be included");
  });

  it("suppresses nested MCP graymatterPolicy-blocked receipt context without fallback", async () => {
    const queryMemory = jest.fn();
    const retrieveMemoryWithReceipt = jest.fn(async () => ({
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        graymatterPolicy: {
          answerAllowed: false,
          caveatRequired: false,
          disposition: "do_not_answer_from_memory",
          requiredActions: ["retry_or_clarify_before_answering"],
        },
        items: [
          {
            memoryId: "memory-blocked",
            textPreview: "This wrapper-blocked memory must stay out.",
          },
        ],
        receiptId: "receipt-policy",
        recommendedAction: "ANSWER",
        retrievalStatus: "OK",
        traceId: "trace-policy",
      },
    }));
    const assembler = new AgentContextAssembler({
      grayMatter: { queryMemory, retrieveMemoryWithReceipt },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      task: "Use wrapper-blocked memory",
    });

    expect(queryMemory).not.toHaveBeenCalled();
    expect(context.grayMatter.status).toBe("unavailable");
    expect(context.grayMatter.citations).toEqual([]);
    expect(context.grayMatter.reads[0]).toEqual(
      expect.objectContaining({
        citations: [],
        receiptIds: ["receipt-policy"],
        traceIds: ["trace-policy"],
        warning: expect.stringContaining("do_not_answer_from_memory"),
      }),
    );
    expect(context.promptSection).not.toContain(
      "This wrapper-blocked memory must stay out.",
    );
  });

  it("surfaces RBAC denials without throwing or inventing memory context", async () => {
    const assembler = new AgentContextAssembler({
      grayMatter: {
        queryMemory: async () => {
          throw new GrayMatterClientError(
            "Forbidden by RBAC",
            "forbidden",
            403,
          );
        },
        retrieveMemoryWithReceipt: async () => {
          throw new GrayMatterClientError(
            "Forbidden by RBAC",
            "forbidden",
            403,
          );
        },
      },
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({
      task: "Read private project standards",
    });

    expect(context.grayMatter.status).toBe("forbidden");
    expect(context.grayMatter.error).toBe("Forbidden by RBAC");
    expect(context.grayMatter.citations).toEqual([]);
    expect(context.promptSection).toContain(
      "GrayMatter status: forbidden. Continue with local project context only.",
    );
  });

  it("returns disabled context when no GrayMatter client is available", async () => {
    const assembler = new AgentContextAssembler({
      now: () => new Date("2026-05-13T12:00:00.000Z"),
    });

    const context = await assembler.assemble({ task: "Implement UI" });

    expect(context.grayMatter.status).toBe("disabled");
    expect(context.promptSection).toBe("");
  });

  it("creates a task prompt section only when the session can query GrayMatter", async () => {
    // Positive fixture models authenticated issuance at a literal origin.
    registerCredentialOrigin("session-token", "https://api-0.valkyrlabs.com");
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async (url) =>
        url.endsWith("/graymatter_ops/context_page/compile")
          ? jsonResponse(404, { message: "Not found" })
          : jsonResponse(200, {
              receipt: {
                receiptId: "task-receipt",
                traceId: "task-trace",
                answerPolicy: "ALLOW_ANSWER",
                retrievalStatus: "OK",
                recommendedAction: "ANSWER",
              },
              results: [
                {
                  content: "Use server-side RBAC for GrayMatter access.",
                  id: "memory-1",
                  tags: ["security"],
                  type: "decision",
                },
              ],
            }),
    );

    const section = await createAgentContextSectionForTask({
      baseUrl: "https://api-0.valkyrlabs.com",
      cwd: "/repo",
      fetch: fetchMock,
      grayMatterSession: readySession,
      task: "Implement GrayMatter prompt injection",
      token: "session-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/graymatter-retrieval-receipts",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer session-token",
        }),
      }),
    );
    expect(section).toContain("[gm:memory-1] decision");
    expect(section).toContain("Use server-side RBAC");
  });

  it("passes tenant context through GrayMatter task memory retrieval", async () => {
    // Positive fixture models authenticated issuance at a literal origin.
    registerCredentialOrigin("session-token", "https://api-0.valkyrlabs.com");
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          receipt: {
            receiptId: "tenant-receipt",
            traceId: "tenant-trace",
            answerPolicy: "ALLOW_ANSWER",
            retrievalStatus: "OK",
            recommendedAction: "ANSWER",
          },
          results: [
            {
              content: "Use tenant-scoped GrayMatter invariants.",
              id: "memory-tenant",
              tags: ["scope:organization"],
              type: "decision",
            },
          ],
        }),
    );

    await createAgentContextSectionForTask({
      baseUrl: "https://api-0.valkyrlabs.com",
      cwd: "/repo",
      fetch: fetchMock,
      grayMatterSession: readySession,
      task: "Implement GrayMatter prompt injection",
      tenantContext: { tenantId: "tenant-123" },
      token: "session-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-tenant-id": "tenant-123",
        }),
      }),
    );
  });

  it("skips task prompt context when the session lacks memory query permission", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

    const section = await createAgentContextSectionForTask({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      fetch: fetchMock,
      grayMatterSession: {
        ...readySession,
        capabilities: {
          ...readySession.capabilities,
          memoryQuery: false,
          memoryRead: false,
        },
      },
      task: "Implement GrayMatter prompt injection",
      token: "session-token",
    });

    expect(section).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
