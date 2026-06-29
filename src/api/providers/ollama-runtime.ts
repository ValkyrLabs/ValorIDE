import {
  ModelInfo,
  ollamaModelPresets,
  openAiModelInfoSaneDefaults,
} from "@shared/api";
import { ApiStream } from "../transform/stream";

const NANOSECONDS_PER_MILLISECOND = 1_000_000;
const DEFAULT_OLLAMA_REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
const MAX_OLLAMA_REQUEST_TIMEOUT_MS = 60 * 60 * 1000;
const THINKING_TAG_TAIL_LENGTH = 24;

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

export function resolveOllamaRequestTimeoutMs(
  timeout?: string | number,
): number {
  const parsed = parsePositiveInteger(timeout);
  return parsed
    ? Math.min(parsed, MAX_OLLAMA_REQUEST_TIMEOUT_MS)
    : DEFAULT_OLLAMA_REQUEST_TIMEOUT_MS;
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

type OllamaContentMode = "text" | "reasoning";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractOllamaStructuredThinking(chunk: any): string | undefined {
  return (
    stringValue(chunk?.message?.thinking) ||
    stringValue(chunk?.message?.reasoning) ||
    stringValue(chunk?.message?.reasoning_content) ||
    stringValue(chunk?.thinking) ||
    stringValue(chunk?.reasoning) ||
    stringValue(chunk?.reasoning_content)
  );
}

function diffPossiblyCumulativeText(previous: string, next: string) {
  if (!previous) {
    return next;
  }

  if (next.startsWith(previous)) {
    return next.slice(previous.length);
  }

  return next === previous ? "" : next;
}

function findTag(buffer: string, tagPattern: RegExp) {
  tagPattern.lastIndex = 0;
  const match = tagPattern.exec(buffer);
  return match
    ? {
        index: match.index,
        length: match[0].length,
      }
    : undefined;
}

function splitStablePrefix(buffer: string, final: boolean) {
  if (final || buffer.length <= THINKING_TAG_TAIL_LENGTH) {
    return {
      stable: final ? buffer : "",
      pending: final ? "" : buffer,
    };
  }

  return {
    stable: buffer.slice(0, -THINKING_TAG_TAIL_LENGTH),
    pending: buffer.slice(-THINKING_TAG_TAIL_LENGTH),
  };
}

function createOllamaThinkingParser() {
  let mode: OllamaContentMode = "text";
  let buffer = "";

  function consume(content = "", final = false) {
    buffer += content;
    const chunks: Array<
      { type: "text"; text: string } | { type: "reasoning"; reasoning: string }
    > = [];

    while (buffer.length > 0) {
      if (mode === "text") {
        const openingTag = findTag(buffer, /<\s*think(?:ing)?\s*>/i);
        if (openingTag) {
          const text = buffer.slice(0, openingTag.index);
          if (text) {
            chunks.push({ type: "text", text });
          }
          buffer = buffer.slice(openingTag.index + openingTag.length);
          mode = "reasoning";
          continue;
        }

        const { stable, pending } = splitStablePrefix(buffer, final);
        if (stable) {
          chunks.push({ type: "text", text: stable });
        }
        buffer = pending;
        break;
      }

      const closingTag = findTag(buffer, /<\s*\/\s*think(?:ing)?\s*>/i);
      if (closingTag) {
        const reasoning = buffer.slice(0, closingTag.index);
        if (reasoning) {
          chunks.push({ type: "reasoning", reasoning });
        }
        buffer = buffer.slice(closingTag.index + closingTag.length);
        mode = "text";
        continue;
      }

      const { stable, pending } = splitStablePrefix(buffer, final);
      if (stable) {
        chunks.push({ type: "reasoning", reasoning: stable });
      }
      buffer = pending;
      break;
    }

    return chunks;
  }

  return {
    consume,
    flush: () => consume("", true),
  };
}

export async function* streamOllamaChatResponse(
  stream: AsyncIterable<any>,
  metadata: OllamaStreamMetadata,
): ApiStream {
  let inputTokens = 0;
  let outputTokens = 0;
  let sawDone = false;
  let finalChunk: any | undefined;
  let structuredThinkingSeen = "";
  const thinkingParser = createOllamaThinkingParser();

  for await (const chunk of stream) {
    finalChunk = chunk;
    inputTokens = numberValue(chunk.prompt_eval_count, inputTokens);
    outputTokens = numberValue(chunk.eval_count, outputTokens);

    const structuredThinking = extractOllamaStructuredThinking(chunk);
    if (structuredThinking) {
      const reasoning = diffPossiblyCumulativeText(
        structuredThinkingSeen,
        structuredThinking,
      );
      structuredThinkingSeen = structuredThinking;
      if (reasoning) {
        yield { type: "reasoning", reasoning };
      }
    }

    if (typeof chunk.message?.content === "string") {
      yield* thinkingParser.consume(chunk.message.content);
    }

    if (chunk.done) {
      sawDone = true;
      yield* thinkingParser.flush();
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

  yield* thinkingParser.flush();

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
