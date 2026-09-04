/**
 * Helpers for importing OpenAPI specs into ThorAPI.
 * NOTE: Keep this logic free of VS Code dependencies for easier unit testing.
 */
export function getOpenApiContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) {
    return "application/yaml";
  }
  return "application/json";
}

export function buildOpenApiHeaders(
  filename: string,
  jwtToken?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": getOpenApiContentType(filename),
  };

  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  return headers;
}
