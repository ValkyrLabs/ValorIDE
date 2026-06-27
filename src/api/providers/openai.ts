import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI, { AzureOpenAI } from "openai";
import { withRetry } from "../retry";
import {
  ApiHandlerOptions,
  azureOpenAiDefaultApiVersion,
  ModelInfo,
  openAiModelInfoSaneDefaults,
} from "@shared/api";
import { ApiHandler } from "../index";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { ApiStream } from "../transform/stream";
import { convertToR1Format } from "../transform/r1-format";
import type { ChatCompletionReasoningEffort } from "openai/resources/chat/completions";
import type { Headers } from "openai/core";
import { normalizeOpenAiUsageChunk } from "../transform/openai-usage";

export class OpenAiHandler implements ApiHandler {
  private options: ApiHandlerOptions;
  private client: OpenAI;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
    const configuredOpenAiApiKey = this.options.openAiApiKey?.trim();
    const openAiApiKey = configuredOpenAiApiKey || "noop";
    const hasConfiguredAuthorizationHeader = Object.keys(
      this.options.openAiHeaders ?? {},
    ).some((header) => header.toLowerCase() === "authorization");
    const openAiHeaders: Headers | undefined =
      configuredOpenAiApiKey ||
      this.options.azureApiVersion ||
      hasConfiguredAuthorizationHeader
        ? this.options.openAiHeaders
        : {
            ...this.options.openAiHeaders,
            Authorization: null,
          };
    // Azure API shape slightly differs from the core API shape: https://github.com/openai/openai-node?tab=readme-ov-file#microsoft-azure-openai
    // Use azureApiVersion to determine if this is an Azure endpoint, since the URL may not always contain 'azure.com'
    if (
      this.options.azureApiVersion ||
      (this.options.openAiBaseUrl?.toLowerCase().includes("azure.com") &&
        !this.options.openAiModelId?.toLowerCase().includes("deepseek"))
    ) {
      this.client = new AzureOpenAI({
        baseURL: this.options.openAiBaseUrl,
        apiKey: openAiApiKey,
        apiVersion:
          this.options.azureApiVersion || azureOpenAiDefaultApiVersion,
        defaultHeaders: openAiHeaders,
      });
    } else {
      this.client = new OpenAI({
        baseURL: this.options.openAiBaseUrl,
        apiKey: openAiApiKey,
        defaultHeaders: openAiHeaders,
      });
    }
  }

  @withRetry()
  async *createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const modelId = this.options.openAiModelId ?? "";
    const isDeepseekReasoner = modelId.includes("deepseek-reasoner");
    const isR1FormatRequired =
      this.options.openAiModelInfo?.isR1FormatRequired ?? false;
    const isReasoningModelFamily =
      modelId.includes("o1") ||
      modelId.includes("o3") ||
      modelId.includes("o4");

    let openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...convertToOpenAiMessages(messages),
    ];
    let temperature: number | undefined =
      this.options.openAiModelInfo?.temperature ??
      openAiModelInfoSaneDefaults.temperature;
    let reasoningEffort: ChatCompletionReasoningEffort | undefined = undefined;
    let maxTokens: number | undefined;

    if (
      this.options.openAiModelInfo?.maxTokens &&
      this.options.openAiModelInfo.maxTokens > 0
    ) {
      maxTokens = Number(this.options.openAiModelInfo.maxTokens);
    } else {
      maxTokens = undefined;
    }

    if (isDeepseekReasoner || isR1FormatRequired) {
      openAiMessages = convertToR1Format([
        { role: "user", content: systemPrompt },
        ...messages,
      ]);
    }

    if (isReasoningModelFamily) {
      openAiMessages = [
        { role: "developer", content: systemPrompt },
        ...convertToOpenAiMessages(messages),
      ];
      temperature = undefined; // does not support temperature
      reasoningEffort =
        (this.options.o3MiniReasoningEffort as ChatCompletionReasoningEffort) ||
        "medium";
    }

    const stream = await this.client.chat.completions.create({
      model: modelId,
      messages: openAiMessages,
      temperature,
      max_tokens: maxTokens,
      reasoning_effort: reasoningEffort,
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
        yield normalizeOpenAiUsageChunk(this.getModel().info, chunk.usage);
      }
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    return {
      id: this.options.openAiModelId ?? "",
      info: this.options.openAiModelInfo ?? openAiModelInfoSaneDefaults,
    };
  }
}
