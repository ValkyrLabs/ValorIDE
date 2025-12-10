import OpenAI from "openai";
import { mainlandQwenModels, internationalQwenModels, mainlandQwenDefaultModelId, internationalQwenDefaultModelId, } from "@shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
import { convertToR1Format } from "../transform/r1-format";
export class QwenHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        this.client = new OpenAI({
            baseURL: this.options.qwenApiLine === "china"
                ? "https://dashscope.aliyuncs.com/compatible-mode/v1"
                : "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
            apiKey: this.options.qwenApiKey,
        });
    }
    getModel() {
        const modelId = this.options.apiModelId;
        // Branch based on API line to let poor typescript know what to do
        if (this.options.qwenApiLine === "china") {
            return {
                id: modelId ?? mainlandQwenDefaultModelId,
                info: mainlandQwenModels[modelId] ??
                    mainlandQwenModels[mainlandQwenDefaultModelId],
            };
        }
        else {
            return {
                id: modelId ??
                    internationalQwenDefaultModelId,
                info: internationalQwenModels[modelId] ??
                    internationalQwenModels[internationalQwenDefaultModelId],
            };
        }
    }
    async *createMessage(systemPrompt, messages) {
        const model = this.getModel();
        const isDeepseekReasoner = model.id.includes("deepseek-r1");
        let openAiMessages = [
            { role: "system", content: systemPrompt },
            ...convertToOpenAiMessages(messages),
        ];
        if (isDeepseekReasoner) {
            openAiMessages = convertToR1Format([
                { role: "user", content: systemPrompt },
                ...messages,
            ]);
        }
        const stream = await this.client.chat.completions.create({
            model: model.id,
            max_completion_tokens: model.info.maxTokens,
            messages: openAiMessages,
            stream: true,
            stream_options: { include_usage: true },
            ...(model.id === "deepseek-r1" ? {} : { temperature: 0 }),
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
                    reasoning: delta.reasoning_content || "",
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
//# sourceMappingURL=qwen.js.map