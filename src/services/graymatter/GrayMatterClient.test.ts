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

    expect(url).toBe("https://api.example.test/v1/MemoryEntry");
    expect(init?.method).toBe("POST");
    expect(body).toEqual({
      content: "ValorIDE uses GrayMatter as primary durable memory.",
      metadata: { source: "valoride" },
      tags: ["valoride", "graymatter"],
      type: "decision",
    });
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
