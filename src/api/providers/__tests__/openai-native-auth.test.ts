import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import axios from "axios";
import { resolveOpenAiNativeAuthToken } from "../openai-native-auth";

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
});
