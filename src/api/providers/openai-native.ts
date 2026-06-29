import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { withRetry } from "../retry";
import { ApiHandler } from "../";
import {
  ApiHandlerOptions,
  ModelInfo,
  openAiNativeDefaultModelId,
  OpenAiNativeModelId,
  openAiNativeModels,
} from "@shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { ApiStream } from "../transform/stream";
import type { ChatCompletionReasoningEffort } from "openai/resources/chat/completions";
import type {
  EasyInputMessage,
  ResponseInputMessageContentList,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import { resolveOpenAiNativeAuthToken } from "./openai-native-auth";
import { normalizeOpenAiUsageChunk } from "../transform/openai-usage";
import { extractOpenAiResponsesReasoningText } from "./openai-native-events";

interface OpenAiNativeHandlerOptions {
  openAiNativeApiKey?: string;
  reasoningEffort?: string;
  apiModelId?: string;
}

const OPENAI_NATIVE_REASONING_SUMMARY = "detailed" as const;

export class OpenAiNativeHandler implements ApiHandler {
  private options: OpenAiNativeHandlerOptions;
  private client: OpenAI | undefined;

  constructor(options: OpenAiNativeHandlerOptions) {
    this.options = options;
  }

  private async ensureClient(): Promise<OpenAI> {
    if (!this.client) {
      const authToken = await resolveOpenAiNativeAuthToken({
        openAiNativeApiKey: this.options.openAiNativeApiKey,
      });
      if (!authToken) {
        throw new Error(
          "OpenAI authentication is required. Provide an OpenAI API key or run `codex login` to use OAuth.",
        );
      }
      try {
        this.client = new OpenAI({
          apiKey: authToken,
        });
      } catch (error: any) {
        throw new Error(`Error creating OpenAI client: ${error.message}`);
      }
    }
    return this.client;
  }

  private async *yieldUsage(
    info: ModelInfo,
    usage: OpenAI.Completions.CompletionUsage | undefined,
  ): ApiStream {
    yield normalizeOpenAiUsageChunk(info, usage);
  }

  private convertToResponsesInput(
    messages: Anthropic.Messages.MessageParam[],
  ): EasyInputMessage[] {
    return messages
      .map((message): EasyInputMessage | undefined => {
        if (typeof message.content === "string") {
          return {
            role: message.role,
            content: message.content,
          };
        }

        if (message.role === "assistant") {
          const text = message.content
            .map((part) => {
              if (part.type === "text") return part.text;
              if (part.type === "tool_use") {
                return `<${part.name}>\n${JSON.stringify(part.input)}\n</${part.name}>`;
              }
              return "";
            })
            .filter(Boolean)
            .join("\n\n");

          return text
            ? {
                role: "assistant",
                content: text,
              }
            : undefined;
        }

        const content = message.content.reduce<ResponseInputMessageContentList>(
          (acc, part) => {
            if (part.type === "text") {
              acc.push({ type: "input_text", text: part.text });
            } else if (part.type === "image") {
              acc.push({
                type: "input_image",
                detail: "auto",
                image_url:
                  part.source.type === "base64"
                    ? `data:${part.source.media_type};base64,${part.source.data}`
                    : part.source.url,
              });
            } else if (part.type === "tool_result") {
              const toolText =
                typeof part.content === "string"
                  ? part.content
                  : (part.content ?? [])
                      .map((block) => {
                        if (block.type === "text") return block.text;
                        if (block.type === "image") {
                          return "(tool result image omitted from Responses input)";
                        }
                        return "";
                      })
                      .filter(Boolean)
                      .join("\n");
              acc.push({
                type: "input_text",
                text: `<tool_result id="${part.tool_use_id}">\n${toolText}\n</tool_result>`,
              });
            }
            return acc;
          },
          [],
        );

        return {
          role: message.role,
          content,
        };
      })
      .filter((message): message is EasyInputMessage => Boolean(message));
  }

  private async *createResponsesMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const client = await this.ensureClient();
    const model = this.getModel();
    const emittedReasoning = new Set<string>();
    const stream = await client.responses.create({
      model: model.id,
      instructions: systemPrompt,
      input: this.convertToResponsesInput(messages),
      stream: true,
      reasoning: {
        effort:
          (this.options.reasoningEffort as ChatCompletionReasoningEffort) ||
          "medium",
        summary: OPENAI_NATIVE_REASONING_SUMMARY,
      },
    });

    for await (const event of stream as AsyncIterable<ResponseStreamEvent>) {
      const reasoningText = extractOpenAiResponsesReasoningText(event);
      if (reasoningText && !emittedReasoning.has(reasoningText)) {
        emittedReasoning.add(reasoningText);
        yield {
          type: "reasoning",
          reasoning: reasoningText,
        };
      }

      switch (event.type) {
        case "response.output_text.delta":
          if (event.delta) {
            yield {
              type: "text",
              text: event.delta,
            };
          }
          break;
        case "response.completed":
          yield normalizeOpenAiUsageChunk(model.info, event.response.usage);
          break;
        case "response.failed":
          throw new Error(
            event.response.error?.message || "OpenAI response failed",
          );
        case "error":
          throw new Error(event.message || "OpenAI response stream failed");
      }
    }
  }

  @withRetry()
  async *createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const client = await this.ensureClient();
    const model = this.getModel();

    switch (model.id) {
      case "gpt-5.5":
      case "gpt-5.4":
      case "gpt-5.4-mini":
      case "gpt-5.4-nano":
        yield* this.createResponsesMessage(systemPrompt, messages);
        break;
      default: {
        const stream = await client.chat.completions.create({
          model: model.id,
          // max_completion_tokens: this.getModel().info.maxTokens,
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            ...convertToOpenAiMessages(messages),
          ],
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
          if (
            delta &&
            "reasoning_content" in delta &&
            delta.reasoning_content
          ) {
            yield {
              type: "reasoning",
              reasoning: (delta.reasoning_content as string | undefined) || "",
            };
          }
          if (chunk.usage) {
            // Only last chunk contains usage
            yield* this.yieldUsage(model.info, chunk.usage);
          }
        }
      }
    }
  }

  getModel(): { id: OpenAiNativeModelId; info: ModelInfo } {
    const modelId = this.options.apiModelId;
    if (modelId && modelId in openAiNativeModels) {
      const id = modelId as OpenAiNativeModelId;
      return { id, info: openAiNativeModels[id] };
    }
    return {
      id: openAiNativeDefaultModelId,
      info: openAiNativeModels[openAiNativeDefaultModelId],
    };
  }
}
