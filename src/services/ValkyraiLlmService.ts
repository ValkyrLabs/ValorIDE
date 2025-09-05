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

export interface ValkyraiLlmRequest {
  host: string; // Valkyrai server base URL, e.g., http://localhost:8080
  serviceId: string; // UUID of the LLM provider
  jwt?: string; // Optional JWT token for Authorization header
  prompt: string; // User prompt
}

export interface ValkyraiLlmResponse {
  content: string;
}

export class ValkyraiLlmServiceError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
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
export async function callValkyraiLlm(req: ValkyraiLlmRequest): Promise<ValkyraiLlmResponse> {
  const { host, serviceId, jwt, prompt } = req;
  if (!host || !serviceId || !prompt) {
    throw new ValkyraiLlmServiceError("Missing required parameters: host, serviceId, or prompt");
  }

  const url = `${host.replace(/\/$/, "")}/v1/llm-details/${serviceId}/chat`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const body = JSON.stringify({
    role: "user",
    content: prompt,
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers,
      body,
    });
  } catch (err: any) {
    throw new ValkyraiLlmServiceError(`Network error: ${err?.message || err}`);
  }

  if (!res.ok) {
    let errorMsg = `Valkyrai LLM API error: ${res.status} ${res.statusText}`;
    try {
      const errorJson = await res.json();
      if (errorJson?.error) {
        errorMsg += ` - ${errorJson.error}`;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new ValkyraiLlmServiceError(errorMsg, res.status);
  }

  let data: any;
  try {
    data = await res.json();
  } catch (err: any) {
    throw new ValkyraiLlmServiceError(`Failed to parse response JSON: ${err?.message || err}`);
  }

  if (!data || typeof data.content !== "string") {
    throw new ValkyraiLlmServiceError("Invalid response from Valkyrai LLM API: missing 'content'");
  }

  return { content: data.content };
}
