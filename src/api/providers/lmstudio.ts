import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ApiHandler } from "../";
import {
  ApiHandlerOptions,
  ModelInfo,
  openAiModelInfoSaneDefaults,
} from "@shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { ApiStream } from "../transform/stream";
import { assertGovernedCodingDescriptor, beginGovernedCodingRequest } from "@services/swarm/SwarmCodingInference";

export class LmStudioHandler implements ApiHandler {
  private options: ApiHandlerOptions;
  private client: OpenAI;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
    if (options.governedCodingInference) {
      assertGovernedCodingDescriptor(options.governedCodingInference);
      if (typeof options.governedCodingRevalidate !== "function") {
        throw new Error("Governed coding requests require current Core authorization revalidation.");
      }
      if (options.lmStudioModelId !== options.governedCodingInference.model
        || new URL(options.lmStudioBaseUrl!).origin !== new URL(options.governedCodingInference.endpoint).origin) {
        throw new Error("Native coding provider differs from the approved canonical binding.");
      }
    }
    this.client = new OpenAI({
      baseURL:
        (this.options.lmStudioBaseUrl || "http://localhost:1234") + "/v1",
      apiKey: "noop",
      ...(this.options.governedCodingInference ? { maxRetries: 0 } : {}),
    });
  }

  async *createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...convertToOpenAiMessages(messages),
    ];

    const binding = this.options.governedCodingInference;
    if (binding) await this.options.governedCodingRevalidate!();
    const receipt = binding ? beginGovernedCodingRequest(binding) : undefined;
    let responseObserved = false;
    try {
      const stream = await this.client.chat.completions.create({
        model: this.getModel().id,
        messages: openAiMessages,
        ...(binding ? (binding.temperature != null ? { temperature: binding.temperature } : {}) : { temperature: 0 }),
        ...(binding?.maxTokens != null ? { max_tokens: binding.maxTokens } : {}),
        stream: true,
      });
      for await (const chunk of stream) {
        responseObserved = true;
        if (receipt) {
          if (chunk.model) receipt.responseModelId = chunk.model;
          if (chunk.id) receipt.responseId = chunk.id;
          // Persist the authenticated provider response before yielding it to
          // the task. A terminal tool can save task history immediately after
          // consuming this chunk, before the stream iterator is drained.
          if (receipt.status === "REQUESTED") {
            receipt.status = "RECEIVED";
            receipt.completedAt = new Date().toISOString();
          }
        }
        const delta = chunk.choices[0]?.delta;
        const reasoningDelta = delta as
          | {
              reasoning?: unknown;
              reasoning_content?: unknown;
            }
          | undefined;
        const reasoning =
          typeof reasoningDelta?.reasoning === "string" &&
          reasoningDelta.reasoning.length > 0
            ? reasoningDelta.reasoning
            : typeof reasoningDelta?.reasoning_content === "string"
              ? reasoningDelta.reasoning_content
              : undefined;
        if (reasoning) {
          yield {
            type: "reasoning",
            reasoning,
          };
        }
        if (delta?.content) {
          yield {
            type: "text",
            text: delta.content,
          };
        }
      }
      if (receipt) { receipt.status = "RECEIVED"; receipt.completedAt = new Date().toISOString(); }
    } catch (error) {
      if (receipt) { receipt.status = "FAILED"; receipt.completedAt = new Date().toISOString(); }
      // LM Studio doesn't return an error code/body for now
      throw new Error(
        "Please check the LM Studio developer logs to debug what went wrong. You may need to load the model with a larger context length to work with ValorIDE's prompts.",
      );
    } finally {
      // An agent can stop consuming after it has received enough streamed
      // content to finish the task. Async-generator return skips the code
      // following the loop, so close that admitted request here as well.
      if (receipt?.status === "REQUESTED") {
        receipt.status = responseObserved ? "RECEIVED" : "FAILED";
        receipt.completedAt = new Date().toISOString();
      }
    }
  }

  getModel(): { id: string; info: ModelInfo } {
    return {
      id: (this.options.governedCodingInference?.model ?? this.options.lmStudioModelId) || "",
      info: openAiModelInfoSaneDefaults,
    };
  }

  /**
   * A first-chunk failure has not exposed a model action to the task, so one
   * product-owned retry is safe. Governed retries re-enter createMessage,
   * revalidate Core authorization, and receive a distinct provider receipt.
   */
  getApiStreamStartRetryPolicy(): { maxRetries: number; backoffMs: number } {
    return { maxRetries: 1, backoffMs: 1_000 };
  }
}
