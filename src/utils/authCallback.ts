export function buildAuthCallbackDiagnostics(
  path: string,
  query: URLSearchParams,
): Record<string, boolean | string> {
  return {
    path,
    hasState: Boolean(query.get("state")),
    hasCode: Boolean(query.get("code")),
    hasToken: Boolean(query.get("token")),
    hasApiKey: Boolean(query.get("apiKey")),
    hasAuthenticatedPrincipal: Boolean(query.get("authenticatedPrincipal")),
  };
}
