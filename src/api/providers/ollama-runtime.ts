import {
  ModelInfo,
  ollamaModelPresets,
  openAiModelInfoSaneDefaults,
} from "@shared/api";
import { ApiStream } from "../transform/stream";

const NANOSECONDS_PER_MILLISECOND = 1_000_000;

export interface OllamaStreamMetadata {
  modelId: string;
  contextWindow?: number;
}

function parsePositiveInteger(value?: string | number): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function getOllamaModelInfo(
  modelId?: string,
  configuredContextWindow?: string | number,
): ModelInfo {
  const preset = modelId
    ? ollamaModelPresets[modelId as keyof typeof ollamaModelPresets]
    : undefined;
  const configuredContext = parsePositiveInteger(configuredContextWindow);

  return {
    ...openAiModelInfoSaneDefaults,
    ...(preset || {}),
    supportsPromptCache: false,
    contextWindow:
      configuredContext ||
      preset?.contextWindow ||
      openAiModelInfoSaneDefaults.contextWindow,
  };
}

function durationMs(value: unknown): number | undefined {
  return typeof value === "number"
    ? value / NANOSECONDS_PER_MILLISECOND
    : undefined;
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function* streamOllamaChatResponse(
  stream: AsyncIterable<any>,
  metadata: OllamaStreamMetadata,
): ApiStream {
  let inputTokens = 0;
  let outputTokens = 0;
  let textBuffer = "";
  let sawDone = false;
  let finalChunk: any | undefined;

  for await (const chunk of stream) {
    finalChunk = chunk;
    inputTokens = numberValue(chunk.prompt_eval_count, inputTokens);
    outputTokens = numberValue(chunk.eval_count, outputTokens);

    if (typeof chunk.message?.content === "string") {
      textBuffer += chunk.message.content;
    }

    if (textBuffer.length > 256 || chunk.done) {
      yield { type: "text", text: textBuffer };
      textBuffer = "";
    }

    if (chunk.done) {
      sawDone = true;
      yield {
        type: "usage",
        inputTokens,
        outputTokens,
        provider: "ollama",
        modelId: chunk.model || metadata.modelId,
        contextWindow: metadata.contextWindow,
        totalDurationMs: durationMs(chunk.total_duration),
        loadDurationMs: durationMs(chunk.load_duration),
        promptEvalDurationMs: durationMs(chunk.prompt_eval_duration),
        evalDurationMs: durationMs(chunk.eval_duration),
      };
    }
  }

  if (textBuffer.length > 0) {
    yield { type: "text", text: textBuffer };
  }

  if (!sawDone && (inputTokens > 0 || outputTokens > 0)) {
    yield {
      type: "usage",
      inputTokens,
      outputTokens,
      provider: "ollama",
      modelId: finalChunk?.model || metadata.modelId,
      contextWindow: metadata.contextWindow,
      totalDurationMs: durationMs(finalChunk?.total_duration),
      loadDurationMs: durationMs(finalChunk?.load_duration),
      promptEvalDurationMs: durationMs(finalChunk?.prompt_eval_duration),
      evalDurationMs: durationMs(finalChunk?.eval_duration),
    };
  }
}
