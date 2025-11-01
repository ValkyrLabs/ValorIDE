import { Anthropic } from "@anthropic-ai/sdk";
import cloneDeep from "clone-deep";
import pWaitFor from "p-wait-for";
import { AssistantMessageContent, parseAssistantMessage, ToolParamName } from "@core/assistant-message";
import { MessageHandler } from "./MessageHandler";

/**
 * Handles streaming API responses and assistant message presentation
 */
export class StreamingHandler {
  // streaming state
  isWaitingForFirstChunk = false;
  isStreaming = false;
  private currentStreamingContentIndex = 0;
  private assistantMessageContent: AssistantMessageContent[] = [];
  private presentAssistantMessageLocked = false;
  private presentAssistantMessageHasPendingUpdates = false;
  private userMessageContent: (
    | Anthropic.TextBlockParam
    | Anthropic.ImageBlockParam
  )[] = [];
  private userMessageContentReady = false;
  private didRejectTool = false;
  private didAlreadyUseTool = false;
  private didCompleteReadingStream = false;

  constructor(
    private messageHandler: MessageHandler,
  ) {}

  resetStreamingState(): void {
    this.currentStreamingContentIndex = 0;
    this.assistantMessageContent = [];
    this.didCompleteReadingStream = false;
    this.userMessageContent = [];
    this.userMessageContentReady = false;
    this.didRejectTool = false;
    this.didAlreadyUseTool = false;
    this.presentAssistantMessageLocked = false;
    this.presentAssistantMessageHasPendingUpdates = false;
  }

  getUserMessageContent(): (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[] {
    return this.userMessageContent;
  }

  setUserMessageContentReady(ready: boolean): void {
    this.userMessageContentReady = ready;
  }

  isUserMessageContentReady(): boolean {
    return this.userMessageContentReady;
  }

  setDidRejectTool(rejected: boolean): void {
    this.didRejectTool = rejected;
  }

  getDidRejectTool(): boolean {
    return this.didRejectTool;
  }

  setDidAlreadyUseTool(used: boolean): void {
    this.didAlreadyUseTool = used;
  }

  getDidAlreadyUseTool(): boolean {
    return this.didAlreadyUseTool;
  }

  setDidCompleteReadingStream(completed: boolean): void {
    this.didCompleteReadingStream = completed;
  }

  getDidCompleteReadingStream(): boolean {
    return this.didCompleteReadingStream;
  }

  getCurrentStreamingContentIndex(): number {
    return this.currentStreamingContentIndex;
  }

  getAssistantMessageContent(): AssistantMessageContent[] {
    return this.assistantMessageContent;
  }

  addUserMessageContent(content: Anthropic.TextBlockParam | Anthropic.ImageBlockParam): void {
    this.userMessageContent.push(content);
  }

  pushTextBlock(text: string): void {
    this.userMessageContent.push({
      type: "text",
      text,
    });
  }

  pushContentBlocks(content: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam)[]): void {
    this.userMessageContent.push(...content);
  }

  async waitForUserMessageContentReady(): Promise<void> {
    await pWaitFor(() => this.userMessageContentReady);
  }

  processStreamChunk(assistantMessage: string): void {
    // parse raw assistant message into content blocks
    const prevLength = this.assistantMessageContent.length;
    this.assistantMessageContent = parseAssistantMessage(assistantMessage);
    if (this.assistantMessageContent.length > prevLength) {
      this.userMessageContentReady = false; // new content we need to present, reset to false in case previous content set this to true
    }
  }

  finishStreaming(): void {
    this.didCompleteReadingStream = true;
    
    // set any blocks to be complete to allow presentAssistantMessage to finish and set userMessageContentReady to true
    const partialBlocks = this.assistantMessageContent.filter(
      (block) => block.partial,
    );
    partialBlocks.forEach((block) => {
      block.partial = false;
    });
  }

  // Remove partial XML tag at the very end of the content (for tool use and thinking tags)
  // (prevents scrollview from jumping when tags are automatically removed)
  private removePartialXMLTag(content: string): string {
    const lastOpenBracketIndex = content.lastIndexOf("<");
    if (lastOpenBracketIndex !== -1) {
      const possibleTag = content.slice(lastOpenBracketIndex);
      // Check if there's a '>' after the last '<' (i.e., if the tag is complete) (complete thinking and tool tags will have been removed by now)
      const hasCloseBracket = possibleTag.includes(">");
      if (!hasCloseBracket) {
        // Extract the potential tag name
        let tagContent: string;
        if (possibleTag.startsWith("</")) {
          tagContent = possibleTag.slice(2).trim();
        } else {
          tagContent = possibleTag.slice(1).trim();
        }
        // Check if tagContent is likely an incomplete tag name (letters and underscores only)
        const isLikelyTagName = /^[a-zA-Z_]+$/.test(tagContent);
        // Preemptively remove < or </ to keep from these artifacts showing up in chat (also handles closing thinking tags)
        const isOpeningOrClosing =
          possibleTag === "<" || possibleTag === "</";
        // If the tag is incomplete and at the end, remove it from the content
        if (isOpeningOrClosing || isLikelyTagName) {
          content = content.slice(0, lastOpenBracketIndex).trim();
        }
      }
    }
    return content;
  }

  async presentTextBlock(block: AssistantMessageContent): Promise<void> {
    if (this.didRejectTool || this.didAlreadyUseTool) {
      return;
    }
    
    // Type guard to ensure we're working with a TextContent block
    if (block.type !== "text") {
      return;
    }
    
    let content = block.content;
    if (content) {
      // Remove all instances of <thinking> (with optional line break after) and </thinking> (with optional line break before)
      content = content.replace(/<thinking>\s?/g, "");
      content = content.replace(/\s?<\/thinking>/g, "");

      content = this.removePartialXMLTag(content);
    }

    if (!block.partial) {
      // Some models add code block artifacts (around the tool calls) which show up at the end of text content
      // matches ``` with at least one char after the last backtick, at the end of the string
      const match = content?.trimEnd().match(/```[a-zA-Z0-9_-]+$/);
      if (match) {
        const matchLength = match[0].length;
        content = content.trimEnd().slice(0, -matchLength);
      }
    }

    await this.messageHandler.say("text", content, undefined, block.partial);
  }

  // If block is partial, remove partial closing tag so its not presented to user
  removeClosingTag(tag: ToolParamName, text?: string): string {
    const block = this.assistantMessageContent[this.currentStreamingContentIndex];
    if (!block?.partial) {
      return text || "";
    }
    if (!text) {
      return "";
    }
    // This regex dynamically constructs a pattern to match the closing tag:
    // - Optionally matches whitespace before the tag
    // - Matches '<' or '</' optionally followed by any subset of characters from the tag name
    const tagRegex = new RegExp(
      `\\s?</?${tag
        .split("")
        .map((char) => `(?:${char})?`)
        .join("")}$`,
      "g",
    );
    return text.replace(tagRegex, "");
  }

  // This is a simplified version - the actual implementation will need the full context and tool handlers
  async presentNextContent(): Promise<void> {
    if (this.presentAssistantMessageLocked) {
      this.presentAssistantMessageHasPendingUpdates = true;
      return;
    }
    this.presentAssistantMessageLocked = true;
    this.presentAssistantMessageHasPendingUpdates = false;

    if (this.currentStreamingContentIndex >= this.assistantMessageContent.length) {
      if (this.didCompleteReadingStream) {
        this.userMessageContentReady = true;
      }
      this.presentAssistantMessageLocked = false;
      return;
    }

    const block = cloneDeep(
      this.assistantMessageContent[this.currentStreamingContentIndex],
    );

    switch (block.type) {
      case "text":
        await this.presentTextBlock(block);
        break;
      case "tool_use":
        // Tool use presentation will be handled by the main Task class
        // This is just a placeholder - the actual tool use logic is complex
        // and needs access to many other services
        break;
    }

    this.presentAssistantMessageLocked = false;

    if (!block.partial || this.didRejectTool || this.didAlreadyUseTool) {
      if (this.currentStreamingContentIndex === this.assistantMessageContent.length - 1) {
        this.userMessageContentReady = true;
      }

      this.currentStreamingContentIndex++;

      if (this.currentStreamingContentIndex < this.assistantMessageContent.length) {
        this.presentNextContent();
        return;
      }
    }

    if (this.presentAssistantMessageHasPendingUpdates) {
      this.presentNextContent();
    }
  }
}
