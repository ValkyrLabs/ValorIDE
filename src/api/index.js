import { AnthropicHandler } from "./providers/anthropic";
import { AwsBedrockHandler } from "./providers/bedrock";
import { OpenRouterHandler } from "./providers/openrouter";
import { VertexHandler } from "./providers/vertex";
import { OpenAiHandler } from "./providers/openai";
import { OllamaHandler } from "./providers/ollama";
import { LmStudioHandler } from "./providers/lmstudio";
import { GeminiHandler } from "./providers/gemini";
import { OpenAiNativeHandler } from "./providers/openai-native";
import { DeepSeekHandler } from "./providers/deepseek";
import { RequestyHandler } from "./providers/requesty";
import { TogetherHandler } from "./providers/together";
import { QwenHandler } from "./providers/qwen";
import { MistralHandler } from "./providers/mistral";
import { DoubaoHandler } from "./providers/doubao";
import { VsCodeLmHandler } from "./providers/vscode-lm";
import { ValorIDEHandler } from "./providers/valoride";
import { LiteLlmHandler } from "./providers/litellm";
import { AskSageHandler } from "./providers/asksage";
import { XAIHandler } from "./providers/xai";
import { SambanovaHandler } from "./providers/sambanova";
import { ValkyraiHandler } from "./providers/valkyrai";
export function buildApiHandler(configuration) {
    const { apiProvider, ...options } = configuration;
    switch (apiProvider) {
        case "anthropic":
            return new AnthropicHandler(options);
        case "valkyrai":
            return new ValkyraiHandler(options);
        case "openrouter":
            return new OpenRouterHandler(options);
        case "bedrock":
            return new AwsBedrockHandler(options);
        case "vertex":
            return new VertexHandler(options);
        case "openai":
            return new OpenAiHandler(options);
        case "ollama":
            return new OllamaHandler(options);
        case "lmstudio":
            return new LmStudioHandler(options);
        case "gemini":
            return new GeminiHandler(options);
        case "openai-native":
            return new OpenAiNativeHandler(options);
        case "deepseek":
            return new DeepSeekHandler(options);
        case "requesty":
            return new RequestyHandler(options);
        case "together":
            return new TogetherHandler(options);
        case "qwen":
            return new QwenHandler(options);
        case "doubao":
            return new DoubaoHandler(options);
        case "mistral":
            return new MistralHandler(options);
        case "vscode-lm":
            return new VsCodeLmHandler(options);
        case "valoride":
            return new ValorIDEHandler(options);
        case "litellm":
            return new LiteLlmHandler(options);
        case "asksage":
            return new AskSageHandler(options);
        case "xai":
            return new XAIHandler(options);
        case "sambanova":
            return new SambanovaHandler(options);
        default:
            return new AnthropicHandler(options);
    }
}
//# sourceMappingURL=index.js.map