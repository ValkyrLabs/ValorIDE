import { ApiHandler } from "@api/index";
import { ChatSettings, DEFAULT_CHAT_SETTINGS } from "@shared/ChatSettings";

const FALLBACK_FIRST_CHUNK_TIMEOUT_MS = 45_000;

function positiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function resolveFirstChunkTimeoutMs(
  api: ApiHandler,
  chatSettings?: ChatSettings,
): number {
  const providerTimeout = api.getApiStreamStartTimeoutMs?.();
  if (positiveFiniteNumber(providerTimeout)) {
    return providerTimeout;
  }

  if (positiveFiniteNumber(chatSettings?.apiFirstChunkTimeoutMs)) {
    return chatSettings.apiFirstChunkTimeoutMs;
  }

  return (
    DEFAULT_CHAT_SETTINGS.apiFirstChunkTimeoutMs ??
    FALLBACK_FIRST_CHUNK_TIMEOUT_MS
  );
}

export interface FirstChunkRetryPolicy {
  maxRetries: number;
  backoffMs: number;
}

/** Resolve a bounded provider-declared retry for failures before any model output is consumed. */
export function resolveFirstChunkRetryPolicy(
  api: ApiHandler,
): FirstChunkRetryPolicy | undefined {
  const declared = api.getApiStreamStartRetryPolicy?.();
  if (
    !declared ||
    !Number.isInteger(declared.maxRetries) ||
    declared.maxRetries < 1 ||
    declared.maxRetries > 3 ||
    !positiveFiniteNumber(declared.backoffMs)
  ) {
    return undefined;
  }
  return {
    maxRetries: declared.maxRetries,
    backoffMs: Math.min(30_000, Math.max(100, Math.round(declared.backoffMs))),
  };
}
