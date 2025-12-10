/**
 * ValkyraiLlmService
 * Service for calling the Valkyrai LLM pass-through endpoint.
 *
 * Usage:
 *   import { callValkyraiLlm, ValkyraiLlmRequest, ValkyraiLlmResponse } from "./ValkyraiLlmService";
 *
 *   const response = await callValkyraiLlm({
 *     host: "http://localhost:8080",
 *     serviceId: "123e4567-e89b-12d3-a456-426614174000",
 *     jwt: "your-jwt-token",
 *     prompt: "What is the capital of France?"
 *   });
 *
 *   // response.content -> "The capital of France is Paris."
 */
export class ValkyraiLlmServiceError extends Error {
    status;
    constructor(message, status) {
        super(message);
        this.name = "ValkyraiLlmServiceError";
        this.status = status;
    }
}
/**
 * Calls the Valkyrai LLM pass-through endpoint.
 * @param req ValkyraiLlmRequest
 * @returns ValkyraiLlmResponse
 * @throws ValkyraiLlmServiceError on network or API error
 */
export async function callValkyraiLlm(req) {
    const { host, serviceId, jwt, prompt } = req;
    if (!host || !serviceId || !prompt) {
        throw new ValkyraiLlmServiceError("Missing required parameters: host, serviceId, or prompt");
    }
    // Host is expected to be the full API base path (e.g., http://host:8080/v1)
    // so we append the resource path without adding /v1 again.
    const url = `${host.replace(/\/$/, "")}/llm-details/${serviceId}/chat`;
    const headers = {
        "Content-Type": "application/json",
    };
    if (jwt) {
        headers["Authorization"] = `Bearer ${jwt}`;
    }
    const body = JSON.stringify({
        role: "user",
        content: prompt,
    });
    let res;
    try {
        res = await fetch(url, {
            method: "POST",
            headers,
            body,
        });
    }
    catch (err) {
        throw new ValkyraiLlmServiceError(`Network error: ${err?.message || err}`);
    }
    if (!res.ok) {
        let errorMsg = `Valkyrai LLM API error: ${res.status} ${res.statusText}`;
        try {
            const errorJson = await res.json();
            if (errorJson?.error) {
                errorMsg += ` - ${errorJson.error}`;
            }
        }
        catch {
            // ignore JSON parse error
        }
        throw new ValkyraiLlmServiceError(errorMsg, res.status);
    }
    let data;
    try {
        data = await res.json();
    }
    catch (err) {
        throw new ValkyraiLlmServiceError(`Failed to parse response JSON: ${err?.message || err}`);
    }
    if (!data || typeof data.content !== "string") {
        throw new ValkyraiLlmServiceError("Invalid response from Valkyrai LLM API: missing 'content'");
    }
    return { content: data.content };
}
//# sourceMappingURL=ValkyraiLlmService.js.map