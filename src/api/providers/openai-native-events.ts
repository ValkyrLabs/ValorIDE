const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object";

const getTextFromUnknown = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value.trim() ? value : undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  for (const key of ["text", "delta", "content"]) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }
  return undefined;
};

export const extractOpenAiResponsesReasoningText = (
  event: unknown,
): string | undefined => {
  if (!isRecord(event)) {
    return undefined;
  }

  switch (event.type) {
    case "response.reasoning_summary_text.delta":
      return getTextFromUnknown(event.delta);
    case "response.reasoning_summary_text.done":
    case "response.reasoning_summary.done":
      return getTextFromUnknown(event.text);
    case "response.reasoning_summary.delta":
      return getTextFromUnknown(event.delta);
    case "response.reasoning_summary_part.added":
    case "response.reasoning_summary_part.done":
      return getTextFromUnknown(
        isRecord(event.part) ? event.part.text : undefined,
      );
    case "response.output_item.done": {
      const item = isRecord(event.item) ? event.item : undefined;
      if (item?.type !== "reasoning" || !Array.isArray(item.summary)) {
        return undefined;
      }
      const summary = item.summary
        .map((part) => getTextFromUnknown(part))
        .filter((text): text is string => Boolean(text?.trim()))
        .join("\n");
      return summary || undefined;
    }
    default:
      return undefined;
  }
};
