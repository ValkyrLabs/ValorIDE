import {
  createGrayMatterSessionState,
  defaultGrayMatterCapabilities,
} from "./GrayMatterSessionService";

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

describe("GrayMatterSessionService", () => {
  it("loads the Valhalla GrayMatter control surface when api-0 exposes it", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          suite: {
            backend: "ValkyrAI api-0",
            memoryLayer: "GrayMatter",
            name: "Valhalla",
          },
          memory: {
            excludedPrimitives: ["SwarmOps"],
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
              grayMatterClient: true,
              swarmAgent: true,
            },
          },
          endpoints: {
            agent: {
              activate: "/Agent/{id}/activate",
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

    await expect(
      createGrayMatterSessionState({
        baseUrl: "https://api-0.valkyrlabs.com",
        fetch: fetchMock,
        now: () => new Date("2026-05-26T12:00:00.000Z"),
        token: "jwt-token",
      }),
    ).resolves.toMatchObject({
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
        swarmGraph: true,
        swarmOps: true,
      },
      checkedAt: "2026-05-26T12:00:00.000Z",
      controlSurface: {
        suite: {
          name: "Valhalla",
        },
        memory: {
          excludedPrimitives: ["SwarmOps"],
        },
        objectGraph: {
          mode: "rbac_visible_schema",
        },
      },
      error: undefined,
      status: "ready",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api-0.valkyrlabs.com/v1/graymatter/control",
      expect.any(Object),
    );
  });

  it("loads RBAC-scoped capability state after authentication", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async (url) =>
        url.endsWith("/graymatter/control")
          ? jsonResponse(404, { message: "Control surface unavailable" })
          : jsonResponse(200, {
              paths: {
                "/v1/Agent": {},
                "/v1/GrayMatter/search": {},
                "/v1/MemoryEntry": {},
                "/v1/MemoryEntry/query": {},
                "/v1/MemoryEntry/write": {},
                "/v1/Project": {},
                "/v1/ProjectObjectLink": {},
                "/v1/swarm-ops/register": {},
              },
            }),
    );

    await expect(
      createGrayMatterSessionState({
        baseUrl: "https://api-0.valkyrlabs.com",
        fetch: fetchMock,
        now: () => new Date("2026-05-13T12:00:00.000Z"),
        token: "jwt-token",
      }),
    ).resolves.toEqual({
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
      error: undefined,
      status: "ready",
    });
  });

  it("surfaces RBAC denials without pretending GrayMatter is ready", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(403, { message: "Forbidden by RBAC" }),
    );

    await expect(
      createGrayMatterSessionState({
        baseUrl: "https://api-0.valkyrlabs.com/v1",
        fetch: fetchMock,
        now: () => new Date("2026-05-13T12:00:00.000Z"),
        token: "jwt-token",
      }),
    ).resolves.toMatchObject({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      capabilities: defaultGrayMatterCapabilities,
      checkedAt: "2026-05-13T12:00:00.000Z",
      error: "Forbidden by RBAC",
      recovery: {
        backendBaseUrl: "https://api-0.valkyrlabs.com/v1",
        command: "valoride.accountButtonClicked",
        actions: [
          {
            command: "valoride.accountButtonClicked",
            id: "open_account",
            primary: true,
          },
        ],
        reason: "forbidden",
        retryable: true,
      },
      status: "forbidden",
    });
  });

  it("routes exhausted GrayMatter credits to the recharge flow", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(402, { message: "Insufficient credits" }),
    );

    const session = await createGrayMatterSessionState({
      baseUrl: "https://api-0.valkyrlabs.com",
      fetch: fetchMock,
      now: () => new Date("2026-05-13T12:00:00.000Z"),
      token: "jwt-token",
    });

    expect(session).toMatchObject({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      capabilities: defaultGrayMatterCapabilities,
      checkedAt: "2026-05-13T12:00:00.000Z",
      error: "Insufficient credits",
      recovery: {
        backendBaseUrl: "https://api-0.valkyrlabs.com/v1",
        command: "valoride.accountButtonClicked",
        actions: [
          {
            command: "valoride.accountButtonClicked",
            id: "buy_credits",
            primary: true,
          },
          {
            command: "valoride.accountButtonClicked",
            id: "open_account",
          },
        ],
        reason: "quota",
        retryable: true,
      },
      status: "quota",
    });
  });

  it("marks the session unauthenticated when no token is available", async () => {
    await expect(
      createGrayMatterSessionState({
        baseUrl: "https://api-0.valkyrlabs.com/v1",
        now: () => new Date("2026-05-13T12:00:00.000Z"),
        token: undefined,
      }),
    ).resolves.toMatchObject({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      capabilities: defaultGrayMatterCapabilities,
      checkedAt: "2026-05-13T12:00:00.000Z",
      error: "GrayMatter authentication is required.",
      recovery: {
        backendBaseUrl: "https://api-0.valkyrlabs.com/v1",
        command: "valoride.accountButtonClicked",
        actions: [
          {
            command: "valoride.accountButtonClicked",
            id: "open_account",
            primary: true,
          },
        ],
        reason: "unauthenticated",
        retryable: true,
      },
      status: "unauthenticated",
    });
  });
});
