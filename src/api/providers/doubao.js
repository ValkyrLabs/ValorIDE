import { doubaoDefaultModelId, doubaoModels, } from "@shared/api";
import OpenAI from "openai";
import { convertToOpenAiMessages } from "../transform/openai-format";
export class DoubaoHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        this.client = new OpenAI({
            baseURL: "https://ark.cn-beijing.volces.com/api/v3/",
            apiKey: this.options.doubaoApiKey,
        });
    }
    getModel() {
        const modelId = this.options.apiModelId;
        if (modelId && modelId in doubaoModels) {
            const id = modelId;
            return { id, info: doubaoModels[id] };
        }
        return {
            id: doubaoDefaultModelId,
            info: doubaoModels[doubaoDefaultModelId],
        };
    }
    async *createMessage(systemPrompt, messages) {
        const model = this.getModel();
        let openAiMessages = [
            { role: "system", content: systemPrompt },
            ...convertToOpenAiMessages(messages),
        ];
        const stream = await this.client.chat.completions.create({
            model: model.id,
            max_completion_tokens: model.info.maxTokens,
            messages: openAiMessages,
            stream: true,
            stream_options: { include_usage: true },
            temperature: 0,
        });
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                yield {
                    type: "text",
                    text: delta.content,
                };
            }
            if (chunk.usage) {
                yield {
                    type: "usage",
                    inputTokens: chunk.usage.prompt_tokens || 0,
                    outputTokens: chunk.usage.completion_tokens || 0,
                    // @ts-ignore-next-line
                    cacheReadTokens: chunk.usage.prompt_cache_hit_tokens || 0,
                    // @ts-ignore-next-line
                    cacheWriteTokens: chunk.usage.prompt_cache_miss_tokens || 0,
                };
            }
        }
    }
}
//# sourceMappingURL=doubao.js.map