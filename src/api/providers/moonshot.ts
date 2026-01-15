import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ApiHandler } from "../";
import {
  ApiHandlerOptions,
  ModelInfo,
  MoonshotModelId,
  moonshotDefaultModelId,
  moonshotModels,
} from "@shared/api";
import { withRetry } from "../retry";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { ApiStream } from "../transform/stream";
import { calculateApiCostOpenAI } from "@utils/cost";

export class MoonshotHandler implements ApiHandler {
  private options: ApiHandlerOptions;
  private client: OpenAI;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
    this.client = new OpenAI({
      baseURL:
        this.options.moonshotApiLine === "china"
          ? "https://api.moonshot.cn/v1"
          : "https://api.moonshot.ai/v1",
      apiKey: this.options.moonshotApiKey,
    });
  }

  @withRetry()
  async *createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const model = this.getModel();
    const temperature =
      (model.info as { temperature?: number })?.temperature ?? 0;
    const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...convertToOpenAiMessages(messages),
    ];

    const stream = await this.client.chat.completions.create({
      model: model.id,
      max_tokens: model.info.maxTokens,
      messages: openAiMessages,
      temperature,
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield {
          type: "text",
          text: delta.content,
        };
      }

      if (delta && "reasoning_content" in delta && delta.reasoning_content) {
        yield {
          type: "reasoning",
          reasoning: (delta.reasoning_content as string | undefined) || "",
        };
      }

      if (chunk.usage) {
        const inputTokens = chunk.usage.prompt_tokens || 0;
        const outputTokens = chunk.usage.completion_tokens || 0;
        const usage = chunk.usage as {
          cached_tokens?: number;
          prompt_tokens_details?: { cached_tokens?: number };
        };
        const cacheReadTokens =
          usage.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0;
        const cacheWriteTokens = 0;
        const totalCost = calculateApiCostOpenAI(
          model.info,
          inputTokens,
          outputTokens,
          cacheWriteTokens,
          cacheReadTokens,
        );
        const nonCachedInputTokens = Math.max(
          0,
          inputTokens - cacheReadTokens - cacheWriteTokens,
        );
        yield {
          type: "usage",
          inputTokens: nonCachedInputTokens,
          outputTokens: outputTokens,
          cacheWriteTokens: cacheWriteTokens,
          cacheReadTokens: cacheReadTokens,
          totalCost: totalCost,
        };
      }
    }
  }

  getModel(): { id: MoonshotModelId; info: ModelInfo } {
    const modelId = this.options.apiModelId;
    if (modelId && modelId in moonshotModels) {
      const id = modelId as MoonshotModelId;
      return { id, info: moonshotModels[id] };
    }
    return {
      id: moonshotDefaultModelId,
      info: moonshotModels[moonshotDefaultModelId],
    };
  }
}
