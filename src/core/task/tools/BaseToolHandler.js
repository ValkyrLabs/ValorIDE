import { ToolDescriptionHelper } from "@core/task/ToolDescriptionHelper";
export class BaseToolHandler {
  context;
  constructor(context) {
    this.context = context;
  }
  removeClosingTag(tag, text, partial = false) {
    if (!text || !partial) {
      return text || "";
    }
    const tagRegex = new RegExp(
      `\\s?</?${tag
        .split("")
        .map((char) => `(?:${char})?`)
        .join("")}$`,
      "g",
    );
    return text.replace(tagRegex, "");
  }
  async handleError(action, error) {
    const errorString = `Error ${action}: ${JSON.stringify(error, null, 2)}`;
    await this.context.say(
      "error",
      `Error ${action}:\n${error.message ?? JSON.stringify(error, null, 2)}`,
    );
    return `Error ${action}: ${error.message}`;
  }
  async askApproval(type, partialMessage) {
    const { response, text, images } = await this.context.ask(
      type,
      partialMessage,
      false,
    );
    const normalizedText = text?.trim().toLowerCase();
    const approved =
      response === "yesButtonClicked" ||
      (response === "messageResponse" &&
        (normalizedText === "yes" || normalizedText === "approve"));
    if (!approved) {
      // User pressed reject button or responded with a message
      if (text || images?.length) {
        await this.context.say("user_feedback", text, images);
      }
      return false;
    } else {
      // User hit the approve button, and may have provided feedback
      if (text || images?.length) {
        await this.context.say("user_feedback", text, images);
      }
      return true;
    }
  }
  getToolDescription(block) {
    if (block.type !== "tool_use") return "";
    // Use centralized helper to keep descriptions consistent across the codebase
    try {
      return ToolDescriptionHelper.getToolDescription(
        block.name,
        block.params || {},
      );
    } catch {
      return `[${block.name}]`;
    }
  }
}
//# sourceMappingURL=BaseToolHandler.js.map
