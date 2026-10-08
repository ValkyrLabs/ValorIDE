import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import { it } from "@jest/globals";
import {
  createOpenAiNativeOAuthAuthorizationUrl,
  resolveOpenAiNativeAuth,
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
    expect(url.searchParams.get("scope")).toBe(
      "openid profile email offline_access",
    );
    expect(url.searchParams.get("originator")).toBe("valoride");
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
          const callback = new URL(redirectUri!);
          callback.hostname = "127.0.0.1";
          http
            .get(`${callback}?code=oauth-code&state=${state}`, (res) => {
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

  it("preserves the OAuth mode and current access-token account identity", async () => {
    const accessToken = makeJwt({
      exp: Date.now() / 1000 + 3600,
      "https://api.openai.com/auth": { chatgpt_account_id: "acct_current" },
    });
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        auth_mode: "chatgpt",
        tokens: {
          access_token: accessToken,
          account_id: "acct_stale",
        },
      }),
    );
    expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toEqual({
      mode: "oauth",
      token: accessToken,
      accountId: "acct_current",
    });
  });

  it("keeps an explicit API key independent of the Codex account", async () => {
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        tokens: { access_token: "oauth", account_id: "acct_other" },
      }),
    );
    expect(
      await resolveOpenAiNativeAuth({
        codexAuthPath,
        openAiNativeApiKey: " sk-explicit ",
      }),
    ).toEqual({ mode: "api-key", token: "sk-explicit" });
  });

  it("recognizes native Codex API-key login without treating it as OAuth", async () => {
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        auth_mode: "api_key",
        OPENAI_API_KEY: "sk-saved",
        tokens: { access_token: "old-oauth" },
      }),
    );
    expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toEqual({
      mode: "api-key",
      token: "sk-saved",
    });
  });

  it("joins simultaneous token refreshes and preserves the refreshed account", async () => {
    const old = makeJwt({ exp: Date.now() / 1000 - 10 });
    const fresh = makeJwt({
      exp: Date.now() / 1000 + 3600,
      "https://api.openai.com/auth": { chatgpt_account_id: "acct_fresh" },
    });
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        tokens: {
          access_token: old,
          refresh_token: "rt_old",
          account_id: "acct_old",
        },
      }),
    );
    const post = jest
      .spyOn(axios, "post")
      .mockResolvedValue({
        data: { access_token: fresh, refresh_token: "rt_rotated" },
      } as any);
    const all = await Promise.all(
      Array.from({ length: 5 }, () =>
        resolveOpenAiNativeAuth({ codexAuthPath }),
      ),
    );
    expect(post).toHaveBeenCalledTimes(1);
    expect(
      all.every(
        (a) =>
          a?.mode === "oauth" &&
          a.token === fresh &&
          a.accountId === "acct_fresh",
      ),
    ).toBe(true);
    expect(
      JSON.parse(await fs.readFile(codexAuthPath, "utf8")).tokens.refresh_token,
    ).toBe("rt_rotated");
  });

  it("does not use an expired token when refresh fails", async () => {
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        tokens: {
          access_token: makeJwt({ exp: Date.now() / 1000 - 10 }),
          refresh_token: "rt_bad",
        },
      }),
    );
    jest.spyOn(axios, "post").mockRejectedValue(new Error("Invalid grant"));
    expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toBeUndefined();
  });

  it("does not fall back to stale OAuth after an API-key login is removed", async () => {
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        auth_mode: "api_key",
        tokens: { access_token: "old_oauth", account_id: "acct_old" },
      }),
    );
    expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toBeUndefined();
  });

  it("releases the callback port after interrupted browser opening so login can repeat", async () => {
    const callbackPort = 19_456;
    await expect(
      startOpenAiNativeOAuthLogin({
        callbackPort,
        codexAuthPath,
        timeoutMs: 5000,
        openAuthorizationUrl: async () => {
          throw new Error("Browser unavailable");
        },
      }),
    ).rejects.toThrow("Browser unavailable");
    await expect(
      startOpenAiNativeOAuthLogin({
        callbackPort,
        codexAuthPath,
        timeoutMs: 30,
        openAuthorizationUrl: async () => {},
      }),
    ).rejects.toThrow("login timed out");
    await expect(fs.access(codexAuthPath)).rejects.toThrow();
  });

  it("rejects a mismatched OAuth state without exchanging or overwriting credentials", async () => {
    const existing = JSON.stringify({
      auth_mode: "chatgpt",
      tokens: { access_token: "existing_fixture" },
    });
    await fs.writeFile(codexAuthPath, existing);
    const post = jest.spyOn(axios, "post");
    await expect(
      startOpenAiNativeOAuthLogin({
        callbackPort: 19_456,
        codexAuthPath,
        timeoutMs: 5000,
        openAuthorizationUrl: async (url) => {
          const callback = new URL(
            new URL(url).searchParams.get("redirect_uri")!,
          );
          callback.hostname = "127.0.0.1";
          callback.searchParams.set("code", "fixture_code");
          callback.searchParams.set("state", "wrong_state");
          await new Promise<void>((resolve, reject) =>
            http
              .get(callback, (res) => {
                res.resume();
                res.on("end", resolve);
              })
              .on("error", reject),
          );
        },
      }),
    ).rejects.toThrow("callback failed validation");
    expect(post).not.toHaveBeenCalled();
    expect(await fs.readFile(codexAuthPath, "utf8")).toBe(existing);
  });

  it("explains a busy callback port without opening another login or changing auth", async () => {
    const occupied = http.createServer();
    await new Promise<void>((resolve) =>
      occupied.listen(19_456, "127.0.0.1", resolve),
    );
    const openAuthorizationUrl = jest.fn();
    try {
      await expect(
        startOpenAiNativeOAuthLogin({
          callbackPort: 19_456,
          codexAuthPath,
          timeoutMs: 1000,
          openAuthorizationUrl,
        }),
      ).rejects.toThrow("callback port is busy");
      expect(openAuthorizationUrl).not.toHaveBeenCalled();
      await expect(fs.access(codexAuthPath)).rejects.toThrow();
    } finally {
      await new Promise<void>((resolve, reject) =>
        occupied.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  it("re-reads credentials after account switching and removal", async () => {
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        tokens: { access_token: "oauth_a", account_id: "acct_a" },
      }),
    );
    expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toMatchObject({
      accountId: "acct_a",
    });
    await fs.writeFile(
      codexAuthPath,
      JSON.stringify({
        tokens: { access_token: "oauth_b", account_id: "acct_b" },
      }),
    );
    expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toMatchObject({
      token: "oauth_b",
      accountId: "acct_b",
    });
    await fs.unlink(codexAuthPath);
    expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toBeUndefined();
  });

  it.each([
    "null",
    "[]",
    "broken JSON",
    '{"OPENAI_API_KEY":42,"tokens":{"access_token":12,"id_token":{}}}',
  ])(
    "handles malformed auth file %s without sending credentials",
    async (raw) => {
      await fs.writeFile(codexAuthPath, raw);
      expect(await resolveOpenAiNativeAuth({ codexAuthPath })).toBeUndefined();
    },
  );
});
