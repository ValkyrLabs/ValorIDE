import fs from "fs";
import path from "path";
import { VALKYR_LABS_API_TIMEOUT_MS } from "@shared/ValkyrLabsApi";
import { getValkyrLabsRtkApiClient } from "./ValkyrLabsRtkApi";

describe("ValkyrLabsRtkApi", () => {
  const jsonResponse = (status: number, body: unknown): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      statusText: "",
      headers: {
        forEach: (callback: (value: string, key: string) => void) =>
          callback("application/json", "content-type"),
        get: (name: string) =>
          name.toLowerCase() === "content-type" ? "application/json" : null,
      },
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as unknown as Response;

  it("uses one deadline longer than the bounded ThorAPI generator window", () => {
    expect(VALKYR_LABS_API_TIMEOUT_MS).toBe(16 * 60_000);
  });

  it("serializes JSON and query parameters through RTK Query", async () => {
    const fetchImpl = jest.fn<Promise<Response>, [string, RequestInit?]>(
      async () => jsonResponse(200, { ok: true }),
    );
    const client = getValkyrLabsRtkApiClient(fetchImpl);

    const response = await client.request<{ ok: boolean }>({
      url: "https://api-0.valkyrlabs.com/v1/example",
      method: "POST",
      json: { value: 1 },
      params: { tag: ["one", "two"] },
    });

    expect(response.data).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api-0.valkyrlabs.com/v1/example?tag=one&tag=two");
    expect(init?.body).toBe(JSON.stringify({ value: 1 }));
  });

  it("reports HTTP failures with the status and parsed body", async () => {
    const client = getValkyrLabsRtkApiClient(async () =>
      jsonResponse(503, { error: "unavailable" }),
    );

    await expect(
      client.request({ url: "https://api-0.valkyrlabs.com/v1/example" }),
    ).rejects.toEqual(
      expect.objectContaining({
        status: 503,
        data: { error: "unavailable" },
      }),
    );
  });

  it("preserves repeated Set-Cookie values for authentication consumers", async () => {
    const setCookies = [
      "VALKYR_AUTH=issued.jwt.token; Path=/; Domain=.valkyrlabs.com; HttpOnly; Secure",
      "VALKYR_AUTH=; Path=/; Max-Age=0; HttpOnly; Secure",
      "VALKYR_AUTH=; Path=/v1; Domain=.valkyrlabs.com; Max-Age=0; HttpOnly; Secure",
    ];
    const response = jsonResponse(200, {
      authenticatedPrincipal: { username: "super" },
    });
    const responseHeaders = response.headers as Headers & {
      getSetCookie: () => string[];
    };
    responseHeaders.forEach = (callback) => {
      callback("application/json", "content-type", responseHeaders);
      setCookies.forEach((cookie) =>
        callback(cookie, "set-cookie", responseHeaders),
      );
    };
    responseHeaders.getSetCookie = () => setCookies;

    const client = getValkyrLabsRtkApiClient(async () => response);
    const result = await client.request({
      url: "https://api-0.valkyrlabs.com/v1/auth/login",
      method: "POST",
    });

    expect(result.setCookies).toEqual(setCookies);
    expect(result.headers["set-cookie"]).toBeUndefined();
  });
});

describe("Valkyr Labs transport invariant", () => {
  const requestOwners = [
    "src/api/providers/valoride.ts",
    "src/integrations/workflows/WorkflowProjectProvider.ts",
    "src/services/ValkyraiLlmService.ts",
    "src/services/appService.ts",
    "src/services/applicationArtifactDownload.ts",
    "src/services/applicationSourcePublish.ts",
    "src/services/auth/AuthCodeExchangeService.ts",
    "src/services/auth/TokenStorageService.ts",
    "src/services/auth/ValorideAuthCodeExchangeService.ts",
    "src/services/auth/ValoridePasswordLoginService.ts",
    "src/services/llmPromptService.ts",
    "src/services/monetization/api.ts",
    "src/utils/authFetch.ts",
    "src/views/openapi/OpenAPIEditorPanel.ts",
  ];

  requestOwners.forEach((file) => {
    it(`keeps ${file} off one-off HTTP transports`, () => {
      const source = fs.readFileSync(path.resolve(file), "utf8");
      expect(source).not.toMatch(
        /\baxios\.(?:create|get|post|put|patch|delete|request)\s*\(/,
      );
      expect(source).not.toMatch(/\bfetch\s*\(/);
    });
  });

  it("keeps the central webview bridge on RTK Query", () => {
    const source = fs.readFileSync(
      path.resolve("src/core/controller/index.ts"),
      "utf8",
    );
    expect(source).toContain("getValkyrLabsRtkApiClient().request");
    expect(source).not.toMatch(/axios\.request\s*\(/);
    expect(source).not.toContain("VALKYR_LABS_API_TIMEOUT_MS");
  });
});
