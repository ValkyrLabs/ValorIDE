import { Anthropic } from "@anthropic-ai/sdk";
import { ApiHandler } from "..";
import {
  ApiHandlerOptions,
  ModelInfo,
  openAiModelInfoSaneDefaults,
} from "@shared/api";
import { ApiStream } from "../transform/stream";
import { callValkyraiLlm } from "../../services/ValkyraiLlmService";
import {
  getValkyraiBasePath,
  normalizeValkyraiHost,
} from "@utils/serverValkyraiHost";

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

    const res = await callValkyraiLlm({
      host,
      serviceId,
      jwt,
      prompt,
    });
    yield { type: "text", text: res.content };
  }

  getModel(): { id: string; info: ModelInfo } {
    // Expose selected service id as the model id for UI purposes
    return {
      id: this.options.valkyraiServiceId || this.options.apiModelId || "",
      info: openAiModelInfoSaneDefaults,
    };
  }
}
