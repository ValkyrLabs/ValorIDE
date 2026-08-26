export interface AuthCallbackDiagnostics {
  path: string;
  scheme: string;
  hasQuery: boolean;
  hasCode: boolean;
  hasState: boolean;
  hasLegacySecretParams: boolean;
  hasUserPayload: boolean;
}

export interface AuthCallbackQuery {
  code: string | null;
  state: string | null;
  hasLegacySecretParams: boolean;
  diagnostics: AuthCallbackDiagnostics;
}

const LEGACY_SECRET_QUERY_KEYS = ["token", "apiKey", "jwt", "Authorization"];

export function parseAuthCallbackQuery(uri: {
  path: string;
  query?: string;
  scheme: string;
}): AuthCallbackQuery {
  const rawQuery = uri.query || "";
  const query = new URLSearchParams(rawQuery.replace(/\+/g, "%2B"));
  const hasLegacySecretParams = LEGACY_SECRET_QUERY_KEYS.some((key) =>
    query.has(key),
  );

  return {
    code: query.get("code"),
    state: query.get("state"),
    hasLegacySecretParams,
    diagnostics: {
      path: uri.path,
      scheme: uri.scheme,
      hasQuery: rawQuery.length > 0,
      hasCode: query.has("code"),
      hasState: query.has("state"),
      hasLegacySecretParams,
      hasUserPayload: query.has("authenticatedPrincipal"),
    },
  };
}

export function containsForbiddenAuthLogField(payload: unknown): boolean {
  const forbidden = ["token", "apikey", "jwt", "authorization"];
  const serialized = JSON.stringify(payload).toLowerCase();
  return forbidden.some((term) => serialized.includes(term));
}
