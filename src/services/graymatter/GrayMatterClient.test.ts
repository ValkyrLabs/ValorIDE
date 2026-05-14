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
  it("loads RBAC-scoped GrayMatter capabilities from the live OpenAPI schema", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          paths: {
            "/GrayMatter": {},
            "/MemoryEntry": {},
            "/MemoryEntry/query": {},
            "/MemoryEntry/write": {},
            "/SwarmOps/graph": {},
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

    expect(url).toBe("https://api-0.valkyrlabs.com/v1/api-docs");
    expect(headerValue(init?.headers, "authorization")).toBe(
      "Bearer session-token",
    );
    expect(capabilities).toMatchObject({
      grayMatter: true,
      memoryQuery: true,
      memoryRead: true,
      memoryWrite: true,
      swarmGraph: true,
    });
  });

  it("discovers GrayMatter, MemoryEntry, Agent, and SwarmOps paths even when OpenAPI includes the /v1 prefix", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          paths: {
            "/v1/Agent": {},
            "/v1/GrayMatter/search": {},
            "/v1/MemoryEntry/{id}": {},
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
      memoryEntry: true,
      memoryQuery: true,
      memoryRead: true,
      memoryWrite: true,
      swarmGraph: true,
      swarmOps: true,
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
});
