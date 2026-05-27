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
