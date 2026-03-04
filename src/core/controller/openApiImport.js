export const OPENAPI_IMPORT_TIMEOUT_MS = 60_000;
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
export function buildOpenApiImportConfig(filename, jwtToken) {
    return {
        headers: buildOpenApiHeaders(filename, jwtToken),
        timeout: OPENAPI_IMPORT_TIMEOUT_MS,
    };
}
//# sourceMappingURL=openApiImport.js.map