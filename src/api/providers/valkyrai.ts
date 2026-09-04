import { Anthropic } from "@anthropic-ai/sdk";
import { ApiHandler } from "..";
import {
  ApiHandlerOptions,
  ModelInfo,
  openAiModelInfoSaneDefaults,
} from "@shared/api";
import { ApiStream } from "../transform/stream";
import {
  callValkyraiLlm,
  callValkyraiLlmStream,
  ValkyraiLlmServiceError,
  type ValkyraiLlmResponse,
  type ValkyraiLlmStreamEvent,
} from "../../services/ValkyraiLlmService";
import {
  normalizeOpenAiUsageChunk,
  type OpenAiUsageLike,
} from "../transform/openai-usage";
import {
  getValkyraiBasePath,
  normalizeValkyraiHost,
} from "@utils/serverValkyraiHost";

const CREDITS_PER_USD = 100;
const STREAM_UNAVAILABLE_STATUSES = new Set([404, 405, 406, 501]);

const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }
  return undefined;
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

function stringifyBlockContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (block.type === "text") {
        return block.text ?? "";
      }

      if (block.type === "tool_use") {
        const input =
          typeof block.input === "string"
            ? block.input
            : JSON.stringify(block.input ?? {});
        return `<tool_use name="${block.name ?? "unknown"}">${input}</tool_use>`;
      }

      if (block.type === "tool_result") {
        return stringifyBlockContent(block.content);
      }

      return "";
    })
    .filter((text) => text.length > 0)
    .join("\n\n");
}

function buildValkyraiPrompt(
  systemPrompt: string,
  messages: Anthropic.Messages.MessageParam[],
): string {
  const sections: string[] = [];

  if (systemPrompt.trim()) {
    sections.push(`# System Instructions\n\n${systemPrompt.trim()}`);
  }

  const conversation = messages
    .map((message) => {
      const content = stringifyBlockContent(message.content).trim();
      if (!content) {
        return "";
      }
      return `## ${message.role.toUpperCase()}\n\n${content}`;
    })
    .filter(Boolean)
    .join("\n\n");

  if (conversation) {
    sections.push(`# Conversation\n\n${conversation}`);
  }

  return sections.join("\n\n---\n\n").trim();
}

type ValkyraiUsageSource =
  | ValkyraiLlmResponse
  | Extract<ValkyraiLlmStreamEvent, { type: "usage" }>;

function buildValkyraiUsageChunk(
  modelInfo: ModelInfo,
  serviceId: string,
  source: ValkyraiUsageSource,
) {
  const openAiUsage = normalizeOpenAiUsageChunk(
    modelInfo,
    source.usage as OpenAiUsageLike | undefined,
  );
  const explicitCredits = firstNumber(
    source.credits,
    getPath(source.usage, ["credits"]),
    getPath(source.usage, ["creditCost"]),
    getPath(source.usage, ["actualCreditCost"]),
    getPath(source.usage, ["debitedCredits"]),
    getPath(source.metadata, ["credits"]),
    getPath(source.metadata, ["creditCost"]),
  );
  const estimatedCredits =
    explicitCredits ?? (openAiUsage.totalCost ?? 0) * CREDITS_PER_USD;
  return {
    ...openAiUsage,
    totalCost: estimatedCredits,
    costUnit: "credits" as const,
    provider: source.provider ?? "valkyrai",
    modelId: source.modelId ?? serviceId,
    contextWindow: source.contextWindow ?? openAiUsage.contextWindow,
    totalDurationMs: source.totalDurationMs,
    loadDurationMs: source.loadDurationMs,
    promptEvalDurationMs: source.promptEvalDurationMs,
    evalDurationMs: source.evalDurationMs,
  };
}

function isStreamRouteUnavailable(error: unknown): boolean {
  return (
    error instanceof ValkyraiLlmServiceError &&
    error.status !== undefined &&
    STREAM_UNAVAILABLE_STATUSES.has(error.status)
  );
}

export class ValkyraiHandler implements ApiHandler {
  private options: ApiHandlerOptions;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
  }

  async *createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const host = normalizeValkyraiHost(
      this.options.valkyraiHost || getValkyraiBasePath(),
    );
    const serviceId =
      this.options.valkyraiServiceId || this.options.apiModelId || "";
    const jwt = this.options.valkyraiJwt || this.options.valkyraiSessionJwt;

    const prompt = buildValkyraiPrompt(systemPrompt, messages);

    if (!host || !serviceId || !prompt) {
      throw new Error(
        "ValkyrAI: missing host, serviceId or prompt:" +
          host +
          "," +
          serviceId +
          "," +
          prompt,
      );
    }

    const request = {
      host,
      serviceId,
      jwt,
      prompt,
    };

    let streamedAnyChunk = false;
    try {
      for await (const event of callValkyraiLlmStream(request)) {
        streamedAnyChunk = true;
        if (event.type === "reasoning") {
          yield { type: "reasoning", reasoning: event.reasoning };
        } else if (event.type === "text") {
          yield { type: "text", text: event.text };
        } else if (event.type === "usage") {
          yield buildValkyraiUsageChunk(this.getModel().info, serviceId, event);
        }
      }
      if (streamedAnyChunk) {
        return;
      }
    } catch (error) {
      if (!isStreamRouteUnavailable(error)) {
        throw error;
      }
    }

    const res = await callValkyraiLlm(request);
    if (res.reasoning) {
      yield { type: "reasoning", reasoning: res.reasoning };
    }
    yield { type: "text", text: res.content };

    if (res.usage || res.credits !== undefined) {
      yield buildValkyraiUsageChunk(this.getModel().info, serviceId, res);
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    // Expose selected service id as the model id for UI purposes
    return {
      id: this.options.valkyraiServiceId || this.options.apiModelId || "",
      info: this.options.valkyraiModelInfo ?? openAiModelInfoSaneDefaults,
    };
  }
}
