import { ValorIDEMessage } from "./ExtensionMessage";

/**
 * Combines API request start and finish messages in an array of ValorIDEMessages.
 *
 * This function looks for pairs of 'api_req_started' and 'api_req_finished' messages.
 * When it finds a pair, it combines them into a single 'api_req_combined' message.
 * The JSON data in the text fields of both messages are merged.
 *
 * @param messages - An array of ValorIDEMessage objects to process.
 * @returns A new array of ValorIDEMessage objects with API requests combined.
 *
 * @example
 * const messages = [
 *   { type: "say", say: "api_req_started", text: '{"request":"GET /api/data"}', ts: 1000 },
 *   { type: "say", say: "api_req_finished", text: '{"cost":0.005}', ts: 1001 }
 * ];
 * const result = combineApiRequests(messages);
 * // Result: [{ type: "say", say: "api_req_started", text: '{"request":"GET /api/data","cost":0.005}', ts: 1000 }]
 */
export function combineApiRequests(
  messages: ValorIDEMessage[],
): ValorIDEMessage[] {
  const parseMetadata = (text?: string): Record<string, unknown> => {
    try {
      const value = JSON.parse(text || "{}");
      return value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
        ? value
        : {};
    } catch {
      return {};
    }
  };
  const combined: ValorIDEMessage[] = [];
  let pendingIndex: number | undefined;
  for (const message of messages) {
    if (message.type === "say" && message.say === "api_req_started") {
      // A new start supersedes an unfinished request; timestamps are not identities.
      pendingIndex = combined.length;
    } else if (
      message.type === "say" &&
      message.say === "api_req_finished" &&
      pendingIndex !== undefined
    ) {
      const start = combined[pendingIndex];
      combined[pendingIndex] = {
        ...start,
        text: JSON.stringify({
          ...parseMetadata(start.text),
          ...parseMetadata(message.text),
        }),
      };
      pendingIndex = undefined;
      continue;
    }
    combined.push(message);
  }
  return combined;
}
