import fs from "node:fs/promises";
import crypto from "node:crypto";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import axios from "axios";

export interface ResolveOpenAiNativeAuthTokenOptions {
  openAiNativeApiKey?: string;
  codexAuthPath?: string;
  nowMs?: number;
}

interface CodexAuthTokens {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  account_id?: string;
}

interface CodexAuthFile {
  auth_mode?: string;
  OPENAI_API_KEY?: string | null;
  tokens?: CodexAuthTokens;
  last_refresh?: string;
  [key: string]: unknown;
}

interface RefreshCodexTokenResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

export interface OpenAiNativeOAuthLoginOptions {
  callbackPort?: number;
  codexAuthPath?: string;
  nowMs?: number;
  openAuthorizationUrl: (url: string) => Promise<void>;
  timeoutMs?: number;
}

export interface OpenAiNativeOAuthLoginResult {
  accountId?: string;
  authPath: string;
  expiresAt?: string;
}

const OPENAI_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_OAUTH_AUTHORIZE_ENDPOINT = "https://auth.openai.com/oauth/authorize";
const OPENAI_OAUTH_TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
const OPENAI_OAUTH_SCOPE =
  "openid profile email offline_access api.connectors.read api.connectors.invoke";
const OPENAI_OAUTH_ORIGINATOR = "Codex Desktop";
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;
const DEFAULT_OAUTH_CALLBACK_PORT = 1455;
const DEFAULT_OAUTH_TIMEOUT_MS = 5 * 60_000;

const parseJwtPayload = (
  token?: string,
): Record<string, unknown> | undefined => {
  if (!token || !token.includes(".")) {
    return undefined;
  }

  const [, payload] = token.split(".", 3);
  if (!payload) {
    return undefined;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const getTokenExpiryMs = (token?: string): number | undefined => {
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  return typeof exp === "number" ? exp * 1000 : undefined;
};

const getAccountIdFromToken = (token?: string): string | undefined => {
  const payload = parseJwtPayload(token);
  if (!payload) {
    return undefined;
  }

  const direct = payload.chatgpt_account_id;
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  const flattened = payload["https://api.openai.com/auth.chatgpt_account_id"];
  if (typeof flattened === "string" && flattened.length > 0) {
    return flattened;
  }

  const nested = payload["https://api.openai.com/auth"];
  if (nested && typeof nested === "object") {
    const nestedAccountId = (nested as Record<string, unknown>)
      .chatgpt_account_id;
    if (typeof nestedAccountId === "string" && nestedAccountId.length > 0) {
      return nestedAccountId;
    }
  }

  return undefined;
};

const createPkceVerifier = (): string =>
  crypto.randomBytes(32).toString("base64url");

const createPkceChallenge = (verifier: string): string =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

export const createOpenAiNativeOAuthAuthorizationUrl = ({
  codeChallenge,
  redirectUri,
  state,
}: {
  codeChallenge: string;
  redirectUri: string;
  state: string;
}): string => {
  const url = new URL(OPENAI_OAUTH_AUTHORIZE_ENDPOINT);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", OPENAI_OAUTH_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", OPENAI_OAUTH_SCOPE);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("id_token_add_organizations", "true");
  url.searchParams.set("codex_cli_simplified_flow", "true");
  url.searchParams.set("originator", OPENAI_OAUTH_ORIGINATOR);
  return url.toString();
};

const waitForOAuthCode = async ({
  onReady,
  redirectUri,
  state,
  timeoutMs,
}: {
  onReady?: () => void;
  redirectUri: string;
  state: string;
  timeoutMs: number;
}): Promise<string> =>
  new Promise((resolve, reject) => {
    const redirectUrl = new URL(redirectUri);
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.closeAllConnections?.();
      if (server.listening) {
        server.close(fn);
      } else {
        fn();
      }
    };

    const server = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url || "/", redirectUri);
        if (requestUrl.pathname !== redirectUrl.pathname) {
          res.writeHead(404, { "content-type": "text/plain" });
          res.end("Not found");
          return;
        }

        const error = requestUrl.searchParams.get("error");
        const code = requestUrl.searchParams.get("code");
        const returnedState = requestUrl.searchParams.get("state");

        if (error) {
          res.writeHead(400, { "content-type": "text/html" });
          res.end(renderOAuthCallbackPage(false));
          settle(() => reject(new Error(`OpenAI OAuth failed: ${error}`)));
          return;
        }

        if (!code || returnedState !== state) {
          res.writeHead(400, { "content-type": "text/html" });
          res.end(renderOAuthCallbackPage(false));
          settle(() =>
            reject(new Error("OpenAI OAuth callback failed validation.")),
          );
          return;
        }

        res.writeHead(200, { "content-type": "text/html" });
        res.end(renderOAuthCallbackPage(true));
        settle(() => resolve(code));
      } catch (error) {
        settle(() => reject(error));
      }
    });

    const timeout = setTimeout(() => {
      settle(() => reject(new Error("OpenAI OAuth login timed out.")));
    }, timeoutMs);

    server.on("error", (error) => {
      settle(() => reject(error));
    });
    server.listen(Number(redirectUrl.port), () => onReady?.());
  });

const renderOAuthCallbackPage = (success: boolean): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>ValorIDE OpenAI OAuth</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#111;color:#ddd;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:520px;padding:24px;border:1px solid #333;border-radius:8px;background:#181818"><h1 style="margin-top:0;color:${success ? "#7ee787" : "#ff7b72"}">${success ? "OpenAI connected" : "OpenAI connection failed"}</h1><p>${success ? "ValorIDE saved your OpenAI OAuth token. You can close this editor tab." : "ValorIDE could not complete the OpenAI OAuth flow. Return to ValorIDE settings and try again."}</p></main></body></html>`;

const exchangeOpenAiNativeOAuthCode = async ({
  code,
  codeVerifier,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<RefreshCodexTokenResult> => {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: OPENAI_OAUTH_CLIENT_ID,
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const response = await axios.post(OPENAI_OAUTH_TOKEN_ENDPOINT, params, {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    timeout: 15_000,
  });

  const accessToken = response.data?.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error("Invalid OAuth response: missing access_token");
  }

  return {
    accessToken,
    refreshToken:
      typeof response.data?.refresh_token === "string"
        ? response.data.refresh_token
        : undefined,
    idToken:
      typeof response.data?.id_token === "string"
        ? response.data.id_token
        : undefined,
  };
};

const writeCodexAuthFile = async ({
  authPath,
  nowMs,
  tokens,
}: {
  authPath: string;
  nowMs: number;
  tokens: RefreshCodexTokenResult;
}): Promise<OpenAiNativeOAuthLoginResult> => {
  const accountId =
    getAccountIdFromToken(tokens.idToken) ||
    getAccountIdFromToken(tokens.accessToken);
  const updatedAuth: CodexAuthFile = {
    auth_mode: "chatgpt",
    OPENAI_API_KEY: null,
    tokens: {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      id_token: tokens.idToken,
      account_id: accountId,
    },
    last_refresh: new Date(nowMs).toISOString(),
  };

  await fs.mkdir(path.dirname(authPath), { recursive: true });
  await fs.writeFile(authPath, `${JSON.stringify(updatedAuth, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await fs.chmod(authPath, 0o600).catch(() => undefined);

  const expiresAtMs = getTokenExpiryMs(tokens.accessToken);
  return {
    accountId,
    authPath,
    expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : undefined,
  };
};

const refreshCodexToken = async (
  refreshToken: string,
): Promise<RefreshCodexTokenResult> => {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: OPENAI_OAUTH_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const response = await axios.post(OPENAI_OAUTH_TOKEN_ENDPOINT, params, {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    timeout: 15_000,
  });

  const accessToken = response.data?.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new Error("Invalid token refresh response: missing access_token");
  }

  return {
    accessToken,
    refreshToken:
      typeof response.data?.refresh_token === "string"
        ? response.data.refresh_token
        : undefined,
    idToken:
      typeof response.data?.id_token === "string"
        ? response.data.id_token
        : undefined,
  };
};

export const getDefaultCodexAuthPath = (): string => {
  const codexHome = process.env.CODEX_HOME?.trim();
  const baseDir =
    codexHome && codexHome.length > 0
      ? codexHome
      : path.join(os.homedir(), ".codex");
  return path.join(baseDir, "auth.json");
};

export const startOpenAiNativeOAuthLogin = async (
  options: OpenAiNativeOAuthLoginOptions,
): Promise<OpenAiNativeOAuthLoginResult> => {
  const callbackPort = options.callbackPort ?? DEFAULT_OAUTH_CALLBACK_PORT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_OAUTH_TIMEOUT_MS;
  const authPath = options.codexAuthPath || getDefaultCodexAuthPath();
  const redirectUri = `http://localhost:${callbackPort}/auth/callback`;
  const codeVerifier = createPkceVerifier();
  const state = crypto.randomBytes(24).toString("base64url");
  const authorizationUrl = createOpenAiNativeOAuthAuthorizationUrl({
    codeChallenge: createPkceChallenge(codeVerifier),
    redirectUri,
    state,
  });
  let resolveServerReady: () => void;
  let rejectServerReady: (error: Error) => void;
  const serverReady = new Promise<void>((resolve, reject) => {
    resolveServerReady = resolve;
    rejectServerReady = reject;
  });

  const codePromise = waitForOAuthCode({
    onReady: resolveServerReady!,
    redirectUri,
    state,
    timeoutMs,
  });
  codePromise.catch((error) => {
    rejectServerReady!(
      error instanceof Error ? error : new Error(String(error)),
    );
  });
  await serverReady;
  await options.openAuthorizationUrl(authorizationUrl);
  const code = await codePromise;
  const tokens = await exchangeOpenAiNativeOAuthCode({
    code,
    codeVerifier,
    redirectUri,
  });
  return writeCodexAuthFile({
    authPath,
    nowMs: options.nowMs ?? Date.now(),
    tokens,
  });
};

export const resolveOpenAiNativeAuthToken = async (
  options: ResolveOpenAiNativeAuthTokenOptions = {},
): Promise<string | undefined> => {
  const explicitApiKey = options.openAiNativeApiKey?.trim();
  if (explicitApiKey) {
    return explicitApiKey;
  }

  const authPath = options.codexAuthPath || getDefaultCodexAuthPath();

  let authFileRaw: string;
  try {
    authFileRaw = await fs.readFile(authPath, "utf8");
  } catch {
    return undefined;
  }

  let authFile: CodexAuthFile;
  try {
    authFile = JSON.parse(authFileRaw) as CodexAuthFile;
  } catch {
    return undefined;
  }

  let accessToken = authFile.tokens?.access_token?.trim();
  const storedRefreshToken = authFile.tokens?.refresh_token?.trim();
  if (!accessToken) {
    return undefined;
  }

  const nowMs = options.nowMs ?? Date.now();
  const accessTokenExpiryMs = getTokenExpiryMs(accessToken);

  const shouldRefresh =
    accessTokenExpiryMs !== undefined &&
    accessTokenExpiryMs - nowMs <= ACCESS_TOKEN_EXPIRY_SKEW_MS &&
    !!storedRefreshToken;

  if (shouldRefresh && storedRefreshToken) {
    try {
      const refreshed = await refreshCodexToken(storedRefreshToken);
      accessToken = refreshed.accessToken;
      const nextRefreshToken = refreshed.refreshToken || storedRefreshToken;
      const nextAccountId =
        getAccountIdFromToken(refreshed.idToken) ||
        getAccountIdFromToken(refreshed.accessToken) ||
        authFile.tokens?.account_id;

      const updatedAuth: CodexAuthFile = {
        ...authFile,
        auth_mode: authFile.auth_mode ?? "chatgpt",
        OPENAI_API_KEY: authFile.OPENAI_API_KEY ?? null,
        tokens: {
          ...(authFile.tokens || {}),
          access_token: refreshed.accessToken,
          refresh_token: nextRefreshToken,
          id_token: refreshed.idToken || authFile.tokens?.id_token,
          account_id: nextAccountId,
        },
        last_refresh: new Date(nowMs).toISOString(),
      };

      await fs.mkdir(path.dirname(authPath), { recursive: true });
      await fs.writeFile(
        authPath,
        `${JSON.stringify(updatedAuth, null, 2)}\n`,
        {
          encoding: "utf8",
          mode: 0o600,
        },
      );
      await fs.chmod(authPath, 0o600).catch(() => undefined);
    } catch {
      if ((accessTokenExpiryMs ?? 0) <= nowMs) {
        return undefined;
      }
    }
  } else if (
    accessTokenExpiryMs !== undefined &&
    accessTokenExpiryMs <= nowMs
  ) {
    return undefined;
  }

  return accessToken;
};
