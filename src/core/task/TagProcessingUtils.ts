import { ToolParamName } from "@core/assistant-message";

/**
 * Utility functions for processing XML tags in tool parameters
 */
export class TagProcessingUtils {
  /**
   * If block is partial, remove partial closing tag so it's not presented to user
   */
  static removeClosingTag(tag: ToolParamName, text?: string, isPartial?: boolean): string {
    if (!isPartial) {
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

  /**
   * Removes thinking tags and partial XML tags from content
   */
  static cleanContent(content: string): string {
    if (!content) return content;

    // Remove all instances of <thinking> (with optional line break after) and </thinking> (with optional line break before)
    content = content.replace(/<thinking>\s?/g, "");
    content = content.replace(/\s?<\/thinking>/g, "");

    // Remove partial XML tag at the very end of the content (for tool use and thinking tags)
    const lastOpenBracketIndex = content.lastIndexOf("<");
    if (lastOpenBracketIndex !== -1) {
      const possibleTag = content.slice(lastOpenBracketIndex);
      // Check if there's a '>' after the last '<' (i.e., if the tag is complete)
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
        // Preemptively remove < or </ to keep from these artifacts showing up in chat
        const isOpeningOrClosing = possibleTag === "<" || possibleTag === "</";
        // If the tag is incomplete and at the end, remove it from the content
        if (isOpeningOrClosing || isLikelyTagName) {
          content = content.slice(0, lastOpenBracketIndex).trim();
        }
      }
    }

    return content;
  }

  /**
   * Removes code block artifacts that some models add around tool calls
   */
  static removeCodeBlockArtifacts(content: string): string {
    if (!content) return content;

    // matches ``` with at least one char after the last backtick, at the end of the string
    const match = content.trimEnd().match(/```[a-zA-Z0-9_-]+$/);
    if (match) {
      const matchLength = match[0].length;
      content = content.trimEnd().slice(0, -matchLength);
    }

    return content;
  }
}
