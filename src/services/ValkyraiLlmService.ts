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

import { getValkyrLabsRtkApiClient } from "./valkyrai/ValkyrLabsRtkApi";

export interface ValkyraiLlmRequest {
  host: string; // Valkyrai server base URL, e.g., http://localhost:8080
  serviceId: string; // UUID of the LLM provider
  jwt?: string; // Optional JWT token for Authorization header
  prompt: string; // User prompt
}

export interface ValkyraiLlmResponse {
  content: string;
  reasoning?: string;
  usage?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  credits?: number;
  provider?: string;
  modelId?: string;
  contextWindow?: number;
  totalDurationMs?: number;
  loadDurationMs?: number;
  promptEvalDurationMs?: number;
  evalDurationMs?: number;
  raw?: unknown;
}

export type ValkyraiLlmStreamEvent =
  | { type: "text"; text: string }
  | { type: "reasoning"; reasoning: string }
  | ({
      type: "usage";
      usage?: Record<string, unknown>;
    } & Omit<ValkyraiLlmResponse, "content" | "reasoning" | "raw">)
  | { type: "done" };

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
export async function callValkyraiLlm(
  req: ValkyraiLlmRequest,
): Promise<ValkyraiLlmResponse> {
  const { host, serviceId, jwt, prompt } = req;
  if (!host || !serviceId || !prompt) {
    throw new ValkyraiLlmServiceError(
      "Missing required parameters: host, serviceId, or prompt",
    );
  }

  // Host is expected to be the full API base path (e.g., http://host:8080/v1)
  // so we append the resource path without adding /v1 again.
  const url = `${host.replace(/\/$/, "")}/llm-details/${serviceId}/chat`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
    headers["jwtSession"] = jwt;
  }

  let response;
  try {
    response = await getValkyrLabsRtkApiClient().request<any>({
      url,
      method: "POST",
      headers,
      json: { role: "user", content: prompt },
      acceptHttpErrors: true,
    });
  } catch (err: any) {
    throw new ValkyraiLlmServiceError(`Network error: ${err?.message || err}`);
  }

  if (response.status < 200 || response.status >= 300) {
    let errorMsg = `Valkyrai LLM API error: ${response.status} ${response.statusText}`;
    if (response.data?.error) {
      errorMsg += ` - ${response.data.error}`;
    }
    throw new ValkyraiLlmServiceError(errorMsg, response.status);
  }

  const normalized = normalizeValkyraiLlmResponse(response.data);
  if (!normalized.content) {
    throw new ValkyraiLlmServiceError(
      "Invalid response from Valkyrai LLM API: missing 'content'",
    );
  }

  return normalized;
}

export async function* callValkyraiLlmStream(
  req: ValkyraiLlmRequest,
): AsyncGenerator<ValkyraiLlmStreamEvent> {
  const { host, serviceId, jwt, prompt } = req;
  if (!host || !serviceId || !prompt) {
    throw new ValkyraiLlmServiceError(
      "Missing required parameters: host, serviceId, or prompt",
    );
  }

  const url = `${host.replace(/\/$/, "")}/llm-details/${serviceId}/chat/stream`;
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
  };
  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
    headers["jwtSession"] = jwt;
  }

  let res: Response;
  try {
    const response = await getValkyrLabsRtkApiClient().request<Response>({
      url,
      method: "POST",
      headers,
      json: { role: "user", content: prompt },
      responseType: "raw",
      acceptHttpErrors: true,
    });
    res = response.data;
  } catch (err: any) {
    throw new ValkyraiLlmServiceError(`Network error: ${err?.message || err}`);
  }

  if (!res.ok) {
    let errorMsg = `Valkyrai LLM stream API error: ${res.status} ${res.statusText}`;
    try {
      const bodyText = await res.text();
      const parsed = parseJsonMaybe(bodyText) as Record<string, unknown>;
      const message = firstString(
        parsed?.error,
        parsed?.message,
        getPath(parsed, ["error", "message"]),
        bodyText,
      );
      if (message) {
        errorMsg += ` - ${message}`;
      }
    } catch {
      // ignore response body read errors
    }
    throw new ValkyraiLlmServiceError(errorMsg, res.status);
  }

  if (!res.body) {
    throw new ValkyraiLlmServiceError(
      "Invalid response from Valkyrai LLM stream API: missing response body",
      res.status,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      buffer += decoder.decode(value, { stream: !done });
    }

    let separatorIndex = findSseSeparator(buffer);
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(
        buffer.startsWith("\r\n\r\n", separatorIndex)
          ? separatorIndex + 4
          : separatorIndex + 2,
      );
      const event = normalizeSseBlock(block);
      if (event) {
        if (event.type === "done") {
          return;
        }
        yield event;
      }
      separatorIndex = findSseSeparator(buffer);
    }

    if (done) {
      break;
    }
  }

  const finalEvent = normalizeSseBlock(buffer);
  if (finalEvent && finalEvent.type !== "done") {
    yield finalEvent;
  }
}

const parseJsonMaybe = (value: unknown): unknown => {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const getPath = (source: unknown, path: Array<string | number>): unknown => {
  let current = source as any;
  for (const part of path) {
    if (current == null) {
      return undefined;
    }
    current = current[part as any];
  }
  return current;
};

const firstString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
};

const firstObject = (
  ...values: unknown[]
): Record<string, unknown> | undefined => {
  for (const value of values) {
    if (value != null && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
  }
  return undefined;
};

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }
  return undefined;
};

const findSseSeparator = (value: string): number => {
  const lf = value.indexOf("\n\n");
  const crlf = value.indexOf("\r\n\r\n");
  if (lf < 0) {
    return crlf;
  }
  if (crlf < 0) {
    return lf;
  }
  return Math.min(lf, crlf);
};

const normalizeSseBlock = (
  block: string,
): ValkyraiLlmStreamEvent | undefined => {
  if (!block.trim()) {
    return undefined;
  }
  let eventName = "message";
  const dataLines: string[] = [];
  for (const rawLine of block.split(/\r?\n/)) {
    if (!rawLine || rawLine.startsWith(":")) {
      continue;
    }
    const separatorIndex = rawLine.indexOf(":");
    const field =
      separatorIndex >= 0 ? rawLine.slice(0, separatorIndex).trim() : rawLine;
    const value =
      separatorIndex >= 0
        ? rawLine.slice(separatorIndex + 1).replace(/^ /, "")
        : "";
    if (field === "event") {
      eventName = value || "message";
    } else if (field === "data") {
      dataLines.push(value);
    }
  }
  const data = dataLines.join("\n");
  if (data === "[DONE]" || eventName === "done") {
    return { type: "done" };
  }
  const parsed = parseJsonMaybe(data);
  const dataText = eventDataText(data, parsed);
  if (eventName === "text") {
    return dataText ? { type: "text", text: dataText } : undefined;
  }
  if (
    eventName === "reasoning" ||
    eventName === "reasoning_delta" ||
    eventName === "reasoning_content" ||
    eventName === "thinking" ||
    eventName === "thinking_delta"
  ) {
    return dataText ? { type: "reasoning", reasoning: dataText } : undefined;
  }
  if (eventName === "usage") {
    const numericCredits = Number(data);
    const usage =
      firstObject(parsed) ??
      (Number.isFinite(numericCredits)
        ? firstObject({ credits: numericCredits })
        : undefined);
    const normalized = normalizeValkyraiLlmResponse({
      usage,
      ...(firstObject(parsed) ?? {}),
    });
    return {
      type: "usage",
      usage: usage ?? normalized.usage,
      metadata: normalized.metadata,
      credits: normalized.credits,
      provider: normalized.provider,
      modelId: normalized.modelId,
      contextWindow: normalized.contextWindow,
      totalDurationMs: normalized.totalDurationMs,
      loadDurationMs: normalized.loadDurationMs,
      promptEvalDurationMs: normalized.promptEvalDurationMs,
      evalDurationMs: normalized.evalDurationMs,
    };
  }
  if (eventName === "error") {
    const message = firstString(
      getPath(parsed, ["message"]),
      getPath(parsed, ["error"]),
      dataText,
    );
    throw new ValkyraiLlmServiceError(message ?? "Valkyrai LLM stream error");
  }

  const normalized = normalizeValkyraiLlmResponse(parsed ?? data);
  if (normalized.reasoning) {
    return { type: "reasoning", reasoning: normalized.reasoning };
  }
  if (normalized.content) {
    return { type: "text", text: normalized.content };
  }
  if (normalized.usage || normalized.credits !== undefined) {
    return {
      type: "usage",
      usage: normalized.usage,
      metadata: normalized.metadata,
      credits: normalized.credits,
      provider: normalized.provider,
      modelId: normalized.modelId,
      contextWindow: normalized.contextWindow,
      totalDurationMs: normalized.totalDurationMs,
      loadDurationMs: normalized.loadDurationMs,
      promptEvalDurationMs: normalized.promptEvalDurationMs,
      evalDurationMs: normalized.evalDurationMs,
    };
  }
  return undefined;
};

const eventDataText = (data: string, parsed: unknown): string | undefined => {
  return firstString(
    parsed,
    getPath(parsed, ["text"]),
    getPath(parsed, ["content"]),
    getPath(parsed, ["reasoning"]),
    getPath(parsed, ["message"]),
    data,
  );
};

export function normalizeValkyraiLlmResponse(
  data: unknown,
): ValkyraiLlmResponse {
  const root = (data ?? {}) as Record<string, unknown>;
  const embeddedJson = parseJsonMaybe(root.json);
  const rawProviderResponse = embeddedJson ?? root;
  const usage = firstObject(
    root.usage,
    root.tokenUsage,
    root.token_usage,
    getPath(root, ["metadata", "usage"]),
    getPath(root, ["metrics", "usage"]),
    getPath(rawProviderResponse, ["usage"]),
    getPath(rawProviderResponse, ["metadata", "usage"]),
  );
  const metadata = firstObject(
    root.metadata,
    getPath(rawProviderResponse, ["metadata"]),
  );

  const content = firstString(
    root.content,
    root.text,
    root.response,
    root.answer,
    getPath(root, ["message", "content"]),
    getPath(root, ["result", "content"]),
    getPath(rawProviderResponse, ["content"]),
    getPath(rawProviderResponse, ["message", "content"]),
    getPath(rawProviderResponse, ["choices", 0, "message", "content"]),
    getPath(rawProviderResponse, ["choices", 0, "delta", "content"]),
    getPath(rawProviderResponse, ["output", 0, "content", 0, "text"]),
  );

  const reasoning = firstString(
    root.reasoning,
    root.thinking,
    root.reasoningContent,
    root.reasoning_content,
    getPath(root, ["message", "reasoning_content"]),
    getPath(root, ["metadata", "reasoning"]),
    getPath(rawProviderResponse, ["reasoning"]),
    getPath(rawProviderResponse, ["thinking"]),
    getPath(rawProviderResponse, ["choices", 0, "message", "reasoning"]),
    getPath(rawProviderResponse, [
      "choices",
      0,
      "message",
      "reasoning_content",
    ]),
    getPath(rawProviderResponse, ["choices", 0, "message", "thinking"]),
    getPath(rawProviderResponse, ["choices", 0, "delta", "reasoning"]),
    getPath(rawProviderResponse, ["choices", 0, "delta", "reasoning_content"]),
    getPath(rawProviderResponse, ["choices", 0, "delta", "thinking"]),
  );

  return {
    content: content ?? "",
    reasoning,
    usage,
    metadata,
    credits: firstNumber(
      root.credits,
      root.creditCost,
      root.actualCreditCost,
      root.debitedCredits,
      getPath(root, ["creditDebitReceipt", "credits"]),
      getPath(root, ["creditDebitReceipt", "debitedCredits"]),
      getPath(usage, ["credits"]),
      getPath(usage, ["creditCost"]),
      getPath(usage, ["actualCreditCost"]),
      getPath(usage, ["debitedCredits"]),
      getPath(metadata, ["credits"]),
      getPath(metadata, ["creditCost"]),
    ),
    provider: firstString(
      root.provider,
      getPath(root, ["metadata", "provider"]),
      getPath(rawProviderResponse, ["provider"]),
    ),
    modelId: firstString(
      root.modelId,
      root.model,
      getPath(root, ["metadata", "modelId"]),
      getPath(rawProviderResponse, ["model"]),
    ),
    contextWindow: firstNumber(
      root.contextWindow,
      root.context_window,
      getPath(root, ["metadata", "contextWindow"]),
      getPath(root, ["metadata", "context_window"]),
    ),
    totalDurationMs: firstNumber(
      root.totalDurationMs,
      root.total_duration_ms,
      getPath(usage, ["totalDurationMs"]),
      getPath(usage, ["total_duration_ms"]),
      getPath(rawProviderResponse, ["total_duration"]),
    ),
    loadDurationMs: firstNumber(
      root.loadDurationMs,
      root.load_duration_ms,
      getPath(usage, ["loadDurationMs"]),
      getPath(usage, ["load_duration_ms"]),
      getPath(rawProviderResponse, ["load_duration"]),
    ),
    promptEvalDurationMs: firstNumber(
      root.promptEvalDurationMs,
      root.prompt_eval_duration_ms,
      getPath(usage, ["promptEvalDurationMs"]),
      getPath(usage, ["prompt_eval_duration_ms"]),
      getPath(rawProviderResponse, ["prompt_eval_duration"]),
    ),
    evalDurationMs: firstNumber(
      root.evalDurationMs,
      root.eval_duration_ms,
      getPath(usage, ["evalDurationMs"]),
      getPath(usage, ["eval_duration_ms"]),
      getPath(rawProviderResponse, ["eval_duration"]),
    ),
    raw: data,
  };
}
