export const SENSITIVE_AUTH_CALLBACK_PARAMS = [
  "token",
  "apiKey",
  "jwt",
  "authorization",
  "authenticatedPrincipal",
] as const;

const SENSITIVE_PARAM_SET = new Set<string>(
  SENSITIVE_AUTH_CALLBACK_PARAMS.map((param) => param.toLowerCase()),
);

export interface AuthCallbackSummary {
  path: string;
  scheme: string;
  hasQuery: boolean;
  hasState: boolean;
  hasCode: boolean;
  hasDirectCredential: boolean;
  hasApiCredential: boolean;
  hasPrincipalPayload: boolean;
  queryParamNames: string[];
}

export interface LegacyAuthCallbackCredentials {
  token: string;
  apiKey: string;
  authenticatedPrincipal?: unknown;
}

export const parseAuthCallbackQuery = (
  rawQuery: string | undefined,
): URLSearchParams =>
  new URLSearchParams((rawQuery || "").replace(/\+/g, "%2B"));

export const summarizeAuthCallback = (
  params: URLSearchParams,
  path = "",
  scheme = "",
): AuthCallbackSummary => {
  const queryParamNames = Array.from(new Set(Array.from(params.keys()))).map(
    (name) =>
      SENSITIVE_PARAM_SET.has(name.toLowerCase()) ? "sensitive:redacted" : name,
  );

  return {
    path,
    scheme,
    hasQuery: Array.from(params.keys()).length > 0,
    hasState: params.has("state"),
    hasCode: params.has("code"),
    hasDirectCredential: params.has("token") || params.has("jwt"),
    hasApiCredential: params.has("apiKey"),
    hasPrincipalPayload: params.has("authenticatedPrincipal"),
    queryParamNames,
  };
};

export const hasDirectCallbackCredentials = (
  params: URLSearchParams,
): boolean =>
  params.has("token") ||
  params.has("apiKey") ||
  params.has("jwt") ||
  params.has("authenticatedPrincipal");

export const parseLegacyAuthCallbackCredentials = (
  params: URLSearchParams,
): LegacyAuthCallbackCredentials | null => {
  const token = params.get("token") || params.get("jwt");
  const apiKey = params.get("apiKey");

  if (!token || !apiKey) {
    return null;
  }

  const rawPrincipal = params.get("authenticatedPrincipal");
  let authenticatedPrincipal: unknown;
  if (rawPrincipal) {
    try {
      authenticatedPrincipal = JSON.parse(decodeURIComponent(rawPrincipal));
    } catch {
      authenticatedPrincipal = undefined;
    }
  }

  return { token, apiKey, authenticatedPrincipal };
};

export const redactAuthCallbackLogPayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      SENSITIVE_PARAM_SET.has(key.toLowerCase()) ? "[redacted]" : value,
    ]),
  );
};
