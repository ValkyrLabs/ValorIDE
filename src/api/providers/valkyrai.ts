import { Anthropic } from "@anthropic-ai/sdk";
import { ApiHandler } from "..";
import { ApiHandlerOptions, ModelInfo, openAiModelInfoSaneDefaults } from "@shared/api";
import { ApiStream } from "../transform/stream";
import { callValkyraiLlm } from "../../services/ValkyraiLlmService";

export class ValkyraiHandler implements ApiHandler {
  private options: ApiHandlerOptions;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
  }

  async *createMessage(
    _systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const host = this.options.valkyraiHost || process.env.REACT_APP_BASE_PATH || "http://localhost:8080";
    const serviceId = this.options.valkyraiServiceId || this.options.apiModelId || "";
    const jwt = this.options.valkyraiJwt;

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const content = typeof lastUser?.content === "string" ? lastUser?.content : "";

    if (!host || !serviceId || !content) {
      throw new Error("Valkyrai: missing host, serviceId or content");
    }

    const res = await callValkyraiLlm({ host, serviceId, jwt, prompt: content });
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

