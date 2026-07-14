import { GrayMatterClient, GrayMatterClientError } from "./GrayMatterClient";

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

const headerValue = (
  headers: RequestInit["headers"] | undefined,
  name: string,
): string | undefined =>
  (headers as Record<string, string> | undefined)?.[name.toLowerCase()];

describe("GrayMatterClient", () => {
  it("loads RBAC-scoped GrayMatter capabilities from the Valhalla control surface", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          suite: {
            memoryLayer: "GrayMatter",
            name: "Valhalla",
          },
          memory: {
            primitives: ["MemoryEntry", "GrayMatter", "SemanticIndexEntry"],
          },
          objectGraph: {
            businessDomains: ["Project"],
            coordinationPrimitives: ["Agent", "SwarmOps"],
            mode: "rbac_visible_schema",
            suitePrimitives: ["Project", "ProjectObjectLink"],
          },
          clients: {
            valoride: {
              swarmAgent: true,
            },
          },
          endpoints: {
            agent: {
              list: "/Agent",
            },
            memory: {
              query: "/MemoryEntry/query",
              read: "/MemoryEntry/read",
              write: "/MemoryEntry/write",
            },
            projects: {
              list: "/Project",
              objectLinks: "/ProjectObjectLink",
            },
            swarm: {
              graph: "/swarm-ops/graph",
              register: "/swarm-ops/register",
            },
          },
        }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    const capabilities = await client.loadCapabilities();
    const [url, init] = fetchMock.mock.calls[0];

    expect(url).toBe("https://api-0.valkyrlabs.com/v1/graymatter/control");
    expect(headerValue(init?.headers, "authorization")).toBe(
      "Bearer session-token",
    );
    expect(capabilities).toMatchObject({
      agent: true,
      grayMatter: true,
      memoryEntry: true,
      memoryQuery: true,
      memoryRead: true,
      memoryWrite: true,
      project: true,
      projectObjectLink: true,
      swarmGraph: true,
      swarmOps: true,
    });
  });

  it("falls back to the live OpenAPI schema when the control surface is unavailable", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async (url) =>
        url.endsWith("/graymatter/control")
          ? jsonResponse(404, { message: "Control surface unavailable" })
          : jsonResponse(200, {
              paths: {
                "/GrayMatter": {},
                "/MemoryEntry": {},
                "/MemoryEntry/query": {},
                "/MemoryEntry/write": {},
                "/Project": {},
                "/ProjectObjectLink": {},
                "/swarm-ops/graph": {},
              },
            }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    const capabilities = await client.loadCapabilities();
    const [controlUrl] = fetchMock.mock.calls[0];
    const [apiDocsUrl, init] = fetchMock.mock.calls[1];

    expect(controlUrl).toBe(
      "https://api-0.valkyrlabs.com/v1/graymatter/control",
    );
    expect(apiDocsUrl).toBe("https://api-0.valkyrlabs.com/v1/api-docs");
    expect(headerValue(init?.headers, "authorization")).toBe(
      "Bearer session-token",
    );
    expect(capabilities).toMatchObject({
      grayMatter: true,
      memoryQuery: true,
      memoryRead: true,
      memoryWrite: true,
      project: true,
      projectObjectLink: true,
      swarmGraph: true,
    });
  });

  it("merges live OpenAPI capabilities when the control surface omits MemoryEntry query endpoints", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async (url) =>
        url.endsWith("/graymatter/control")
          ? jsonResponse(200, {
              suite: {
                memoryLayer: "GrayMatter",
                name: "Valhalla",
              },
              memory: {
                primitives: ["MemoryEntry", "GrayMatter"],
              },
              endpoints: {
                memory: {
                  read: "/MemoryEntry/read",
                  write: "/MemoryEntry/write",
                },
              },
            })
          : jsonResponse(200, {
              paths: {
                "/v1/GrayMatter/search": {},
                "/v1/MemoryEntry": {},
                "/v1/MemoryEntry/query": {},
                "/v1/MemoryEntry/write": {},
              },
            }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await expect(client.loadCapabilities()).resolves.toMatchObject({
      grayMatter: true,
      memoryEntry: true,
      memoryQuery: true,
      memoryRead: true,
      memoryWrite: true,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/api-docs",
      expect.any(Object),
    );
  });

  it("discovers GrayMatter, MemoryEntry, Agent, and canonical swarm-ops paths even when OpenAPI includes the /v1 prefix", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async (url) =>
        url.endsWith("/graymatter/control")
          ? jsonResponse(404, { message: "Control surface unavailable" })
          : jsonResponse(200, {
              paths: {
                "/v1/Agent": {},
                "/v1/GrayMatter/search": {},
                "/v1/MemoryEntry/{id}": {},
                "/v1/MemoryEntry/query": {},
                "/v1/MemoryEntry/write": {},
                "/v1/Project": {},
                "/v1/ProjectObjectLink": {},
                "/v1/swarm-ops/graph": {},
                "/v1/swarm-ops/register": {},
              },
            }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await expect(client.loadCapabilities()).resolves.toMatchObject({
      agent: true,
      grayMatter: true,
      memoryEntry: true,
      memoryQuery: true,
      memoryRead: true,
      memoryWrite: true,
      project: true,
      projectObjectLink: true,
      swarmGraph: true,
      swarmOps: true,
    });
  });

  it("does not treat stale PascalCase SwarmOps aliases as canonical swarm-ops capability", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async (url) =>
        url.endsWith("/graymatter/control")
          ? jsonResponse(404, { message: "Control surface unavailable" })
          : jsonResponse(200, {
              paths: {
                "/v1/Agent": {},
                "/v1/GrayMatter/search": {},
                "/v1/MemoryEntry/query": {},
                "/v1/MemoryEntry/write": {},
                "/v1/SwarmOps/graph": {},
                "/v1/SwarmOps/register": {},
              },
            }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await expect(client.loadCapabilities()).resolves.toMatchObject({
      agent: true,
      grayMatter: true,
      memoryQuery: true,
      memoryWrite: true,
      swarmGraph: false,
      swarmOps: false,
    });
  });

  it("writes durable memory records with an explicit GrayMatter memory type", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(201, {
          id: "memory-1",
          type: "decision",
        }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.writeMemory({
      content: "ValorIDE uses GrayMatter as primary durable memory.",
      metadata: { source: "valoride" },
      tags: ["valoride", "graymatter"],
      type: "decision",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);

    expect(url).toBe("https://api.example.test/v1/MemoryEntry/write");
    expect(init?.method).toBe("POST");
    expect(body).toEqual({
      content: "ValorIDE uses GrayMatter as primary durable memory.",
      metadata: JSON.stringify({ source: "valoride" }),
      tags: ["valoride", "graymatter"],
      text: "ValorIDE uses GrayMatter as primary durable memory.",
      type: "decision",
    });
  });

  it("queries durable memory with Codex plugin-compatible aliases", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, { results: [] }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.queryMemory({
      limit: 5,
      query: "ValorIDE GrayMatter invariant",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);

    expect(url).toBe("https://api.example.test/v1/MemoryEntry/query");
    expect(init?.method).toBe("POST");
    expect(body).toEqual({
      limit: 5,
      maxResults: 5,
      q: "ValorIDE GrayMatter invariant",
      query: "ValorIDE GrayMatter invariant",
    });
  });

  it("recalls through the receipt-backed OmegaRAG contract without client identity", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, { receiptRef: "rr-1", trajectoryRef: "traj-1" }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.recallOmegaMemory({
      budgets: { maxCredits: 2, maxContextTokens: 1200 },
      idempotencyKey: "recall-1",
      includeEvaluator: true,
      mode: "BALANCED",
      query: "what changed in the project",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(url).toBe("https://api.example.test/v1/graymatter/omega/recall");
    expect(body).toEqual({
      budgets: { maxCredits: 2, maxContextTokens: 1200 },
      idempotencyKey: "recall-1",
      includeEvaluator: true,
      mode: "BALANCED",
      query: "what changed in the project",
    });
    expect(body.ownerId).toBeUndefined();
    expect(body.tenantId).toBeUndefined();
  });

  it("plans through the content-free OmegaRAG planning contract", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, { plan: { planId: "plan-1" }, steps: [] }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.planOmegaRetrieval({
      budgets: { maxCredits: 2 },
      idempotencyKey: "plan-1",
      mode: "DEEP",
      query: "what changed in the project",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(url).toBe("https://api.example.test/v1/graymatter/omega/plan");
    expect(body).toEqual({
      budgets: { maxCredits: 2 },
      idempotencyKey: "plan-1",
      mode: "DEEP",
      query: "what changed in the project",
    });
    expect(body.ownerId).toBeUndefined();
    expect(body.tenantId).toBeUndefined();
  });

  it("remembers through the canonical idempotent OmegaRAG formation contract", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(201, { memoryRef: "mem-1", receiptRef: "rr-1" }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.rememberOmegaMemory({
      idempotencyKey: "remember-1",
      sourceChannel: "valoride",
      tags: ["decision", "omega"],
      text: "The retrieval contract is receipt-backed.",
      title: "Omega decision",
      type: "decision",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(url).toBe("https://api.example.test/v1/graymatter/omega/remember");
    expect(body).toEqual({
      idempotencyKey: "remember-1",
      sourceChannel: "valoride",
      tags: ["decision", "omega"],
      text: "The retrieval contract is receipt-backed.",
      title: "Omega decision",
      type: "decision",
    });
    expect(body.ownerId).toBeUndefined();
    expect(body.tenantId).toBeUndefined();
  });

  it("forgets through the idempotent OmegaRAG deletion contract", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, { deletionStatus: "deleted", replayed: false }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.forgetOmegaMemory({
      idempotencyKey: "forget-1",
      memoryRef: "11111111-1111-4111-8111-111111111111",
      reason: "user requested deletion",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(url).toBe("https://api.example.test/v1/graymatter/omega/forget");
    expect(body).toEqual({
      idempotencyKey: "forget-1",
      memoryRef: "11111111-1111-4111-8111-111111111111",
      reason: "user requested deletion",
    });
    expect(body.ownerId).toBeUndefined();
    expect(body.tenantId).toBeUndefined();
  });

  it("reads an authorized redacted OmegaRAG trajectory", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, { trajectory: { trajectoryId: "traj-1" }, steps: [] }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.getOmegaTrajectory("traj-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/graymatter/omega/trajectories/traj-1",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("evaluates an authorized OmegaRAG trajectory without client identity", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, { evaluation: { evaluationId: "eval-1" }, replayed: false }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.evaluateOmegaRetrieval({
      profile: "MEMORY_RECALL",
      trajectoryId: "traj-1",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(url).toBe("https://api.example.test/v1/graymatter/omega/evaluate");
    expect(body).toEqual({ profile: "MEMORY_RECALL", trajectoryId: "traj-1" });
    expect(body.ownerId).toBeUndefined();
    expect(body.tenantId).toBeUndefined();
  });

  it("can list MemoryEntry records for direct-scan fallback", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, [{ id: "memory-1" }]),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await expect(client.listMemory()).resolves.toEqual([{ id: "memory-1" }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/MemoryEntry",
      expect.any(Object),
    );
  });

  it("creates Project records with ValorIDE as the source surface", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(201, {
          id: "project-1",
          name: "Generated app",
        }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await client.createProject({
      currentStage: "vibe-code",
      name: "Generated app",
      projectType: "valoride-coding",
      workspacePath: "/workspace/generated-app",
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);

    expect(url).toBe("https://api.example.test/v1/Project");
    expect(init?.method).toBe("POST");
    expect(body).toMatchObject({
      currentStage: "vibe-code",
      name: "Generated app",
      projectType: "valoride-coding",
      sourceSurface: "valoride",
      workspacePath: "/workspace/generated-app",
    });
  });

  it("preserves RBAC denials as structured forbidden errors", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(403, {
          message: "Forbidden by RBAC",
        }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await expect(client.queryMemory("project standards")).rejects.toMatchObject<
      Partial<GrayMatterClientError>
    >({
      kind: "forbidden",
      status: 403,
    });
  });

  it("retrieves GrayMatter memory through retrieval receipts with policy metadata", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          receipt: {
            answerPolicy: "ALLOW_ANSWER",
            receiptId: "gm_rr_123",
            retrievalStatus: "OK",
          },
        }),
    );
    const client = new GrayMatterClient({
      baseUrl: "https://api.example.test/v1",
      fetch: fetchMock,
      getAuthToken: async () => "session-token",
    });

    await expect(
      client.retrieveMemoryWithReceipt({
        filters: { entityTypes: ["MemoryEntry"] },
        query: "ValorIDE invariants",
        topK: 12,
      }),
    ).resolves.toMatchObject({
      receipt: {
        answerPolicy: "ALLOW_ANSWER",
        receiptId: "gm_rr_123",
      },
    });

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);

    expect(url).toBe(
      "https://api.example.test/v1/graymatter-retrieval-receipts",
    );
    expect(init?.method).toBe("POST");
    expect(body).toEqual({
      filters: { entityTypes: ["MemoryEntry"] },
      includeEvaluator: false,
      includeItems: true,
      includeText: true,
      qualityProfile: "DEFAULT",
      query: "ValorIDE invariants",
      retrievalMode: "HYBRID",
      topK: 12,
    });
  });
});
