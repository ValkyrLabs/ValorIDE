import type { ApiStreamReasoningChunk, ApiStreamTextChunk } from "./stream";

type VisibleChunk = ApiStreamReasoningChunk | ApiStreamTextChunk;

/** LM Studio and other compatible endpoints expose either of these public delta fields. */
export function compatibleSummary(delta: unknown): string | undefined {
  const fields = delta as
    | { reasoning?: unknown; reasoning_content?: unknown }
    | null
    | undefined;
  return [fields?.reasoning, fields?.reasoning_content].find(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

/** Older local model templates return an explicit leading <think> section in
 * content instead of a separate reasoning delta. Only consume a leading section:
 * examples, XML tools and literal tags in an ordinary answer must stay intact. */
export class LocalNarrativeStream {
  private mode: "start" | "summary" | "answer" = "start";
  private pending = "";
  private closingTag = "";

  *read(delta: unknown): Generator<VisibleChunk> {
    const summary = compatibleSummary(delta);
    if (summary !== undefined) {
      if (this.mode === "start") {
        this.mode = "answer";
        if (this.pending) yield* this.flush();
      }
      yield { type: "reasoning", reasoning: summary };
    }
    const content = (delta as { content?: unknown } | undefined)?.content;
    if (typeof content !== "string" || !content) return;
    this.pending += content;
    if (this.mode === "start") {
      const trimmed = this.pending.trimStart().toLowerCase();
      const tags = ["<think>", "<thinking>"];
      const opening = tags.find((tag) => trimmed.startsWith(tag));
      if (!opening) {
        if (
          this.pending.length <= 128 &&
          tags.some((tag) => tag.startsWith(trimmed))
        )
          return;
        this.mode = "answer";
      } else {
        this.pending = this.pending.trimStart().slice(opening.length);
        this.closingTag = "</" + opening.slice(1);
        this.mode = "summary";
      }
    }
    if (this.mode === "summary") {
      const value = this.pending.toLowerCase();
      const end = value.indexOf(this.closingTag);
      if (end < 0) {
        // Hold only the possible incomplete closing marker, not an arbitrary tail of tokens.
        let keep = Math.min(value.length, this.closingTag.length - 1);
        while (keep && !value.endsWith(this.closingTag.slice(0, keep))) keep--;
        const text = this.pending.slice(0, this.pending.length - keep);
        this.pending = this.pending.slice(text.length);
        if (text) yield { type: "reasoning", reasoning: text };
        return;
      }
      if (end)
        yield { type: "reasoning", reasoning: this.pending.slice(0, end) };
      this.pending = this.pending.slice(end + this.closingTag.length);
      this.mode = "answer";
    }
    yield* this.flush();
  }

  *flush(): Generator<VisibleChunk> {
    const text = this.pending;
    this.pending = "";
    if (text)
      yield this.mode === "summary"
        ? { type: "reasoning", reasoning: text }
        : { type: "text", text };
  }
}
