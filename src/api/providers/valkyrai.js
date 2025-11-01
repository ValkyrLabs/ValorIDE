import { openAiModelInfoSaneDefaults } from "@shared/api";
import { callValkyraiLlm } from "../../services/ValkyraiLlmService";
function extractUserText(message) {
    if (!message) {
        return "";
    }
    const { content } = message;
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
        if (block.type === "tool_use" && typeof block.input === "string") {
            return block.input;
        }
        return "";
    })
        .filter((text) => text.length > 0)
        .join("\n\n");
}
export class ValkyraiHandler {
    options;
    constructor(options) {
        this.options = options;
    }
    async *createMessage(_systemPrompt, messages) {
        const host = this.options.valkyraiHost ||
            process.env.VITE_basePath ||
            "https://api-0.valkyrlabs.com/v1";
        const serviceId = this.options.valkyraiServiceId || this.options.apiModelId || "";
        const jwt = this.options.valkyraiJwt;
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const content = extractUserText(lastUser).trim();
        if (!host || !serviceId || !content) {
            throw new Error("ValkyrAI: missing host, serviceId or content:" +
                host +
                "," +
                serviceId +
                "," +
                content);
        }
        const res = await callValkyraiLlm({ host, serviceId, jwt, prompt: content });
        yield { type: "text", text: res.content };
    }
    getModel() {
        // Expose selected service id as the model id for UI purposes
        return {
            id: this.options.valkyraiServiceId || this.options.apiModelId || "",
            info: openAiModelInfoSaneDefaults,
        };
    }
}
//# sourceMappingURL=valkyrai.js.map