/**
 * Helpers for importing OpenAPI specs into ThorAPI.
 * NOTE: Keep this logic free of VS Code dependencies for easier unit testing.
 */
export function getOpenApiContentType(filename) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) {
    return "application/yaml";
  }
  return "application/json";
}
export function buildOpenApiHeaders(filename, jwtToken) {
  const headers = {
    "Content-Type": getOpenApiContentType(filename),
  };
  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }
  return headers;
}
//# sourceMappingURL=openApiImport.js.map
