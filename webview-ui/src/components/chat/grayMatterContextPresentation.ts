export interface GrayMatterContextPayload {
  citations?: number;
  checkedAt?: string;
  message?: string;
  policyState?: string;
  recovery?: {
    actions?: Array<{ id?: string; label?: string; primary?: boolean }>;
    message?: string;
    reason?: string;
  };
  status?: string;
}

interface GrayMatterContextPresentation {
  title: string;
  statusLabel: string;
  tone: "ready" | "neutral" | "warning";
  message?: string;
  showRecoveryActions: boolean;
}

const unusedMemoryMessages: Record<string, string> = {
  retry_required:
    "GrayMatter is connected. Retrieved memory was not reliable enough to use for this task. Continuing with project context.",
  clarification_required:
    "GrayMatter is connected. Memory that needs clarification was left out of this task. Continuing with project context.",
  conflicting:
    "GrayMatter is connected. Conflicting memories were left out of this task. Continuing with project context.",
  partial:
    "GrayMatter is connected. Incomplete memory was left out of this task. Continuing with project context.",
  stale:
    "GrayMatter is connected. Outdated memory was left out of this task. Continuing with project context.",
};

/** Prompt eligibility and connection health are separate outcomes. */
export function getGrayMatterContextPresentation(
  payload: GrayMatterContextPayload,
): GrayMatterContextPresentation {
  const status = payload.status || "unavailable";
  const message = payload.recovery?.message || payload.message;
  const issue = (
    statusLabel: string,
    showRecoveryActions = true,
  ): GrayMatterContextPresentation => ({
    title: "needs attention",
    statusLabel,
    tone: "warning",
    message,
    showRecoveryActions,
  });

  // A real access failure takes precedence over any stale receipt metadata.
  if (status === "unauthenticated") return issue("sign in required");
  if (status === "forbidden") return issue("access denied");
  if (status === "quota") return issue("credits needed");
  if (payload.policyState === "denied") return issue("access denied");
  if (payload.policyState === "quota") return issue("credits needed");

  if (
    payload.policyState &&
    Object.prototype.hasOwnProperty.call(
      unusedMemoryMessages,
      payload.policyState,
    )
  ) {
    return {
      title: "memory checked",
      statusLabel: "no context used",
      tone: "neutral",
      message: unusedMemoryMessages[payload.policyState],
      showRecoveryActions: false,
    };
  }
  if (payload.policyState === "unavailable") {
    return {
      ...issue("receipt not verified", false),
      title: "memory check failed",
    };
  }

  switch (status) {
    case "ready":
      return {
        title: "memory checked",
        statusLabel: "ready",
        tone: "ready",
        message: payload.message,
        showRecoveryActions: false,
      };
    case "empty":
      return {
        title: "memory checked",
        statusLabel: "no relevant memories",
        tone: "ready",
        message:
          "GrayMatter is connected. No relevant memories were found for this task. Continuing with project context.",
        showRecoveryActions: false,
      };
    case "checking":
      return {
        title: "checking connection",
        statusLabel: "checking",
        tone: "neutral",
        message: payload.message,
        showRecoveryActions: false,
      };
    case "disabled":
      return {
        title: "memory off",
        statusLabel: "off",
        tone: "neutral",
        message: payload.message,
        showRecoveryActions: false,
      };
    default:
      return issue("unavailable");
  }
}
