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
  it("loads RBAC-scoped capability state after authentication", async () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () =>
        jsonResponse(200, {
          paths: {
            "/v1/Agent": {},
            "/v1/GrayMatter/search": {},
            "/v1/MemoryEntry": {},
            "/v1/MemoryEntry/query": {},
            "/v1/MemoryEntry/write": {},
            "/v1/SwarmOps/register": {},
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
    ).resolves.toEqual({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      capabilities: defaultGrayMatterCapabilities,
      checkedAt: "2026-05-13T12:00:00.000Z",
      error: "Forbidden by RBAC",
      status: "forbidden",
    });
  });

  it("marks the session unauthenticated when no token is available", async () => {
    await expect(
      createGrayMatterSessionState({
        baseUrl: "https://api-0.valkyrlabs.com/v1",
        now: () => new Date("2026-05-13T12:00:00.000Z"),
        token: undefined,
      }),
    ).resolves.toEqual({
      baseUrl: "https://api-0.valkyrlabs.com/v1",
      capabilities: defaultGrayMatterCapabilities,
      checkedAt: "2026-05-13T12:00:00.000Z",
      error: "GrayMatter authentication is required.",
      status: "unauthenticated",
    });
  });
});
