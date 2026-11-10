const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

export const isOpenAiResponsesCompletedEvent = (event: unknown): boolean =>
  isRecord(event) &&
  (event.type === "response.completed" || event.type === "response.done");

/**
 * OpenAI's `response.completed` (Codex also uses `response.done`) ends a Responses
 * stream. Stop consuming there so a transport that remains open cannot leave
 * ValorIDE in a permanent streaming/Working state.
 */
export async function* takeOpenAiResponsesEventsThroughCompletion<T>(
  events: AsyncIterable<T>,
): AsyncGenerator<T> {
  for await (const event of events) {
    yield event;
    if (isOpenAiResponsesCompletedEvent(event)) {
      return;
    }
  }
}

/** The API sends both token deltas and complete snapshots of the same summary at
 * several boundaries. Deduplicate snapshots by item/part identity, never token value. */
export class OpenAiSummaryStream {
  private readonly parts = new Map<string, string>();
  private lastKey?: string;

  private accept(key: string, text: unknown, delta: boolean): string {
    if (typeof text !== "string" || !text) return "";
    const previous = this.parts.get(key) ?? "";
    const next = delta
      ? text
      : text.startsWith(previous)
        ? text.slice(previous.length)
        : "";
    if (!next) return "";
    this.parts.set(key, previous + next);
    const separator =
      this.lastKey !== undefined && this.lastKey !== key ? "\n\n" : "";
    this.lastKey = key;
    return separator + next;
  }

  private item(item: unknown, index: unknown): string {
    if (
      !isRecord(item) ||
      item.type !== "reasoning" ||
      !Array.isArray(item.summary)
    )
      return "";
    return item.summary
      .map((p, i) =>
        isRecord(p) && p.type === "summary_text"
          ? this.accept(
              JSON.stringify([item.id ?? index ?? 0, i]),
              p.text,
              false,
            )
          : "",
      )
      .join("");
  }

  consume(event: unknown): string {
    if (!isRecord(event)) return "";
    const key = JSON.stringify([
      event.item_id ?? event.output_index ?? 0,
      event.summary_index ?? 0,
    ]);
    switch (event.type) {
      case "response.reasoning_summary_text.delta":
      case "response.reasoning_summary.delta":
        return this.accept(key, event.delta, true);
      case "response.reasoning_summary_text.done":
      case "response.reasoning_summary.done":
        return this.accept(key, event.text, false);
      case "response.reasoning_summary_part.added":
      case "response.reasoning_summary_part.done":
        return isRecord(event.part) && event.part.type === "summary_text"
          ? this.accept(key, event.part.text, false)
          : "";
      case "response.output_item.added":
      case "response.output_item.done":
        return this.item(event.item, event.output_index);
      case "response.completed":
      case "response.done":
        return isRecord(event.response) && Array.isArray(event.response.output)
          ? event.response.output.map((item, i) => this.item(item, i)).join("")
          : "";
      default:
        return ""; // Never surface signatures, encrypted_content or private reasoning events.
    }
  }
}

export const extractOpenAiResponsesReasoningText = (
  event: unknown,
): string | undefined => new OpenAiSummaryStream().consume(event) || undefined;
