import fs from "node:fs/promises";
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

const OPENAI_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_OAUTH_TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 60_000;

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
  const baseDir = codexHome && codexHome.length > 0
    ? codexHome
    : path.join(os.homedir(), ".codex");
  return path.join(baseDir, "auth.json");
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
      await fs.writeFile(authPath, `${JSON.stringify(updatedAuth, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
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
