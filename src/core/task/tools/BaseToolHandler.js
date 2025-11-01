export class BaseToolHandler {
    context;
    constructor(context) {
        this.context = context;
    }
    removeClosingTag(tag, text, partial = false) {
        if (!text || !partial) {
            return text || "";
        }
        const tagRegex = new RegExp(`\\s?</?${tag
            .split("")
            .map((char) => `(?:${char})?`)
            .join("")}$`, "g");
        return text.replace(tagRegex, "");
    }
    async handleError(action, error) {
        const errorString = `Error ${action}: ${JSON.stringify(error, null, 2)}`;
        await this.context.say("error", `Error ${action}:\n${error.message ?? JSON.stringify(error, null, 2)}`);
        return `Error ${action}: ${error.message}`;
    }
    async askApproval(type, partialMessage) {
        const { response, text, images } = await this.context.ask(type, partialMessage, false);
        const normalizedText = text?.trim().toLowerCase();
        const approved = response === "yesButtonClicked" ||
            (response === "messageResponse" &&
                (normalizedText === "yes" || normalizedText === "approve"));
        if (!approved) {
            // User pressed reject button or responded with a message
            if (text || images?.length) {
                await this.context.say("user_feedback", text, images);
            }
            return false;
        }
        else {
            // User hit the approve button, and may have provided feedback
            if (text || images?.length) {
                await this.context.say("user_feedback", text, images);
            }
            return true;
        }
    }
    getToolDescription(block) {
        if (block.type !== "tool_use")
            return "";
        switch (block.name) {
            case "execute_command":
                return `[${block.name} for '${block.params.command}']`;
            case "read_file":
                return `[${block.name} for '${block.params.path}']`;
            case "write_to_file":
                return `[${block.name} for '${block.params.path}']`;
            case "replace_in_file":
                return `[${block.name} for '${block.params.path}']`;
            case "search_files":
                return `[${block.name} for '${block.params.regex}'${block.params.file_pattern
                    ? ` in '${block.params.file_pattern}'`
                    : ""}]`;
            case "list_files":
                return `[${block.name} for '${block.params.path}']`;
            case "list_code_definition_names":
                return `[${block.name} for '${block.params.path}']`;
            case "browser_action":
                return `[${block.name} for '${block.params.action}']`;
            case "use_mcp_tool":
                return `[${block.name} for '${block.params.server_name}']`;
            case "access_mcp_resource":
                return `[${block.name} for '${block.params.server_name}']`;
            case "ask_followup_question":
                return `[${block.name} for '${block.params.question}']`;
            case "plan_mode_respond":
                return `[${block.name}]`;
            case "load_mcp_documentation":
                return `[${block.name}]`;
            case "attempt_completion":
                return `[${block.name}]`;
            case "new_task":
                return `[${block.name} for creating a new task]`;
            case "condense":
                return `[${block.name}]`;
            default:
                return `[${block.name}]`;
        }
    }
}
//# sourceMappingURL=BaseToolHandler.js.map