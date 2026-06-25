import { ModelInfo } from "@shared/api";
import { calculateApiCostOpenAI } from "@utils/cost";
import { ApiStreamUsageChunk } from "./stream";

type TokenDetails = {
  cached_tokens?: number;
};

export type OpenAiUsageLike = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  prompt_tokens_details?: TokenDetails;
  input_tokens_details?: TokenDetails;
};

const toTokenCount = (...values: unknown[]): number => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }
  return 0;
};

export function normalizeOpenAiUsageChunk(
  info: ModelInfo,
  usage: OpenAiUsageLike | undefined,
): ApiStreamUsageChunk {
  const inputTokens = toTokenCount(usage?.prompt_tokens, usage?.input_tokens);
  const outputTokens = toTokenCount(
    usage?.completion_tokens,
    usage?.output_tokens,
  );
  const cacheReadTokens = toTokenCount(
    usage?.prompt_tokens_details?.cached_tokens,
    usage?.input_tokens_details?.cached_tokens,
  );
  const cacheWriteTokens = 0;
  const nonCachedInputTokens = Math.max(
    0,
    inputTokens - cacheReadTokens - cacheWriteTokens,
  );

  return {
    type: "usage",
    inputTokens: nonCachedInputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    totalCost: calculateApiCostOpenAI(
      info,
      inputTokens,
      outputTokens,
      cacheWriteTokens,
      cacheReadTokens,
    ),
  };
}
