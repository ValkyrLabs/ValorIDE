import OpenAI from "openai";
import { openAiModelInfoSaneDefaults, } from "@shared/api";
import { convertToOpenAiMessages } from "../transform/openai-format";
export class LmStudioHandler {
    options;
    client;
    constructor(options) {
        this.options = options;
        this.client = new OpenAI({
            baseURL: (this.options.lmStudioBaseUrl || "http://localhost:1234") + "/v1",
            apiKey: "noop",
        });
    }
    async *createMessage(systemPrompt, messages) {
        const openAiMessages = [
            { role: "system", content: systemPrompt },
            ...convertToOpenAiMessages(messages),
        ];
        try {
            const stream = await this.client.chat.completions.create({
                model: this.getModel().id,
                messages: openAiMessages,
                temperature: 0,
                stream: true,
            });
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (delta?.content) {
                    yield {
                        type: "text",
                        text: delta.content,
                    };
                }
            }
        }
        catch (error) {
            // LM Studio doesn't return an error code/body for now
            throw new Error("Please check the LM Studio developer logs to debug what went wrong. You may need to load the model with a larger context length to work with ValorIDE's prompts.");
        }
    }
    getModel() {
        return {
            id: this.options.lmStudioModelId || "",
            info: openAiModelInfoSaneDefaults,
        };
    }
}
//# sourceMappingURL=lmstudio.js.map