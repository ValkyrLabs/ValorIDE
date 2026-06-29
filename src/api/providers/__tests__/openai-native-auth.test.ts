import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import {
  createOpenAiNativeOAuthAuthorizationUrl,
  resolveOpenAiNativeAuthToken,
  startOpenAiNativeOAuthLogin,
} from "../openai-native-auth";

const toBase64Url = (obj: unknown): string =>
  Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const makeJwt = (payload: Record<string, unknown>): string => {
  const header = { alg: "RS256", typ: "JWT" };
  return `${toBase64Url(header)}.${toBase64Url(payload)}.sig`;
};

describe("resolveOpenAiNativeAuthToken", () => {
  let tmpDir: string;
  let codexAuthPath: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "valoride-codex-auth-"));
    codexAuthPath = path.join(tmpDir, "auth.json");
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("returns explicit API key when provided", async () => {
    const token = await resolveOpenAiNativeAuthToken({
      openAiNativeApiKey: "sk-explicit",
      codexAuthPath,
    });
    expect(token).toBe("sk-explicit");
  });

  it("loads OAuth access token from Codex auth file when API key is absent", async () => {
    const accessToken = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await fs.writeFile(
      codexAuthPath,
      JSON.stringify(
        {
          auth_mode: "chatgpt",
          OPENAI_API_KEY: null,
          tokens: {
            access_token: accessToken,
            refresh_token: "rt_old",
            account_id: "acct_old",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    const token = await resolveOpenAiNativeAuthToken({ codexAuthPath });

    expect(token).toBe(accessToken);
  });

  it("refreshes an expired OAuth access token and persists updated auth.json", async () => {
    const expiredAccessToken = makeJwt({
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    const refreshedAccessToken = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      "https://api.openai.com/auth": {
        chatgpt_account_id: "acct_new",
      },
    });

    await fs.writeFile(
      codexAuthPath,
      JSON.stringify(
        {
          auth_mode: "chatgpt",
          OPENAI_API_KEY: null,
          tokens: {
            access_token: expiredAccessToken,
            refresh_token: "rt_old",
            account_id: "acct_old",
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        access_token: refreshedAccessToken,
        refresh_token: "rt_new",
        expires_in: 3600,
        id_token: makeJwt({
          "https://api.openai.com/auth": {
            chatgpt_account_id: "acct_new",
          },
        }),
      },
    } as any);

    const token = await resolveOpenAiNativeAuthToken({ codexAuthPath });
    const updatedAuthRaw = await fs.readFile(codexAuthPath, "utf8");
    const updatedAuth = JSON.parse(updatedAuthRaw);

    expect(token).toBe(refreshedAccessToken);
    expect(updatedAuth.tokens.access_token).toBe(refreshedAccessToken);
    expect(updatedAuth.tokens.refresh_token).toBe("rt_new");
    expect(updatedAuth.tokens.account_id).toBe("acct_new");
    expect(typeof updatedAuth.last_refresh).toBe("string");
  });

  it("returns undefined when API key and OAuth credentials are both unavailable", async () => {
    const token = await resolveOpenAiNativeAuthToken({ codexAuthPath });
    expect(token).toBeUndefined();
  });

  it("creates a PKCE authorization URL for the Codex OpenAI OAuth client", () => {
    const url = new URL(
      createOpenAiNativeOAuthAuthorizationUrl({
        codeChallenge: "challenge",
        redirectUri: "http://localhost:1455/auth/callback",
        state: "state-1",
      }),
    );

    expect(url.origin + url.pathname).toBe(
      "https://auth.openai.com/oauth/authorize",
    );
    expect(url.searchParams.get("client_id")).toBe(
      "app_EMoamEEZ73f0CkXaXp7hrann",
    );
    expect(url.searchParams.get("code_challenge")).toBe("challenge");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:1455/auth/callback",
    );
    expect(url.searchParams.get("scope")).toContain("offline_access");
    expect(url.searchParams.get("scope")).toContain("api.connectors.read");
    expect(url.searchParams.get("scope")).toContain("api.connectors.invoke");
    expect(url.searchParams.get("originator")).toBe("Codex Desktop");
  });

  it("completes OAuth callback exchange and writes Codex auth.json", async () => {
    const accessToken = makeJwt({
      exp: Math.floor(Date.now() / 1000) + 3600,
      "https://api.openai.com/auth": {
        chatgpt_account_id: "acct_oauth",
      },
    });
    jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        access_token: accessToken,
        refresh_token: "rt_oauth",
        id_token: makeJwt({
          "https://api.openai.com/auth": {
            chatgpt_account_id: "acct_oauth",
          },
        }),
      },
    } as any);

    let openedUrl: URL | undefined;
    const port = 19_455;
    const resultPromise = startOpenAiNativeOAuthLogin({
      callbackPort: port,
      codexAuthPath,
      openAuthorizationUrl: async (url) => {
        openedUrl = new URL(url);
        const redirectUri = openedUrl.searchParams.get("redirect_uri");
        const state = openedUrl.searchParams.get("state");
        expect(redirectUri).toBe(`http://localhost:${port}/auth/callback`);
        expect(state).toBeTruthy();
        await new Promise<void>((resolve, reject) => {
          http
            .get(`${redirectUri}?code=oauth-code&state=${state}`, (res) => {
              res.resume();
              res.on("end", resolve);
            })
            .on("error", reject);
        });
      },
      timeoutMs: 5000,
    });

    const result = await resultPromise;
    const authFile = JSON.parse(await fs.readFile(codexAuthPath, "utf8"));

    expect(openedUrl?.searchParams.get("response_type")).toBe("code");
    expect(result.accountId).toBe("acct_oauth");
    expect(authFile.auth_mode).toBe("chatgpt");
    expect(authFile.OPENAI_API_KEY).toBeNull();
    expect(authFile.tokens.access_token).toBe(accessToken);
    expect(authFile.tokens.refresh_token).toBe("rt_oauth");
    expect(authFile.tokens.account_id).toBe("acct_oauth");
    expect(axios.post).toHaveBeenCalledWith(
      "https://auth.openai.com/oauth/token",
      expect.any(URLSearchParams),
      expect.objectContaining({
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
      }),
    );
  });
});
