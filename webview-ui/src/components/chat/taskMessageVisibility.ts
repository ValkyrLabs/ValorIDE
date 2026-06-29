import { ValorIDEMessage } from "@shared/ExtensionMessage";

export const getVisibleTaskMessages = (
  modifiedMessages: ValorIDEMessage[],
): ValorIDEMessage[] => {
  return modifiedMessages.filter((message) => {
    switch (message.ask) {
      case "completion_result":
        if ((message.text ?? "") === "") {
          return false;
        }
        break;
      case "followup":
        if (!hasRenderableFollowupContent(message.text)) {
          return false;
        }
        break;
      case "api_req_failed":
      case "resume_task":
      case "resume_completed_task":
        return false;
    }
    switch (message.say) {
      case "api_req_finished":
      case "api_req_retried":
      case "deleted_api_reqs":
        return false;
      case "text":
        if (
          (message.text ?? "") === "" &&
          (message.images?.length ?? 0) === 0
        ) {
          return false;
        }
        break;
      case "mcp_server_request_started":
        return false;
    }
    return true;
  });
};

export const hasRenderableFollowupContent = (text?: string): boolean => {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.length > 0;
    }
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as Record<string, unknown>;
      const question = firstNonEmptyString(
        candidate.question,
        candidate.prompt,
        candidate.message,
        candidate.content,
        candidate.text,
        candidate.body,
      );
      const options = firstArray(
        candidate.options,
        candidate.choices,
        candidate.actions,
        candidate.suggestions,
        candidate.quickReplies,
        candidate.quick_replies,
      );
      return Boolean(question || options?.length);
    }
  } catch {
    return true;
  }

  return true;
};

const firstNonEmptyString = (...values: unknown[]) =>
  values.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

const firstArray = (...values: unknown[]) =>
  values.find((value): value is unknown[] => Array.isArray(value));
