export type TaskTerminalKind =
  | "blocked"
  | "completed"
  | "failed"
  | "outcome-uncertain"
  | "waiting-approval";

export type TaskTerminalSource = "legacy-classifier" | "runtime-envelope";

export type TaskTerminalConfidence = "EXPLICIT" | "INFERRED" | "UNRESOLVED";

export interface TaskTerminalEvent {
  completedAt: string;
  confidence: TaskTerminalConfidence;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  evidenceRefs?: string[];
  exitCode?: number;
  kind: TaskTerminalKind;
  source: TaskTerminalSource;
  summary: string;
  taskId: string;
}

export type TaskTerminalListener = (
  event: TaskTerminalEvent,
) => Promise<void> | void;

export interface TaskCompletionClassificationInput {
  /** Machine-produced references only; never derive these from model prose. */
  evidenceRefs?: string[];
  summary: string;
}

export type TaskCompletionClassification = Pick<
  TaskTerminalEvent,
  "confidence" | "evidenceRefs" | "kind" | "source" | "summary"
>;

/**
 * Converts legacy attempt_completion prose into a conservative lifecycle event.
 * Negative declarations win over proof. A success is explicit only when the
 * runtime supplies a machine-produced evidence carrier outside the prose.
 */
export const classifyTaskCompletion = (
  input: TaskCompletionClassificationInput,
): TaskCompletionClassification => {
  const summary = String(input.summary ?? "").trim();
  const evidenceRefs = Array.from(
    new Set(
      (input.evidenceRefs ?? []).filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      ),
    ),
  );
  const declaredStatus = summary
    .match(
      /^\s*(?:status\s*[:=-]\s*)?(WAITING_APPROVAL|OUTCOME_UNCERTAIN|BLOCKED|FAILED|SUCCEEDED)\b/i,
    )?.[1]
    ?.toUpperCase();
  const inferred = (
    kind: Extract<TaskTerminalKind, "blocked" | "failed" | "waiting-approval">,
  ): TaskCompletionClassification => ({
    confidence: "INFERRED",
    evidenceRefs,
    kind,
    source: "legacy-classifier",
    summary,
  });

  if (
    declaredStatus === "WAITING_APPROVAL" ||
    /\b(?:approval required|awaiting (?:human )?approval|waiting for (?:human )?approval|requires (?:human )?approval)\b/i.test(
      summary,
    )
  ) {
    return inferred("waiting-approval");
  }
  if (
    declaredStatus === "BLOCKED" ||
    /\b(?:is|was|remains) blocked\b/i.test(summary) ||
    /\b(?:could not|cannot|can't|unable to) (?:complete|continue|proceed)\b/i.test(
      summary,
    ) ||
    /\bno (?:page|artifact|file|record|deployment) was created\b/i.test(summary)
  ) {
    return inferred("blocked");
  }
  if (
    declaredStatus === "FAILED" ||
    /\b(?:failed explicitly|failure|failed to|tests? failed|build failed|deployment failed)\b/i.test(
      summary,
    )
  ) {
    return inferred("failed");
  }
  if (
    declaredStatus === "OUTCOME_UNCERTAIN" ||
    /\b(?:outcome (?:is )?uncertain|could not verify|unable to verify|not verified)\b/i.test(
      summary,
    )
  ) {
    return {
      confidence: "INFERRED",
      evidenceRefs,
      kind: "outcome-uncertain",
      source: "legacy-classifier",
      summary,
    };
  }
  if (evidenceRefs.length > 0) {
    return {
      confidence: "EXPLICIT",
      evidenceRefs,
      kind: "completed",
      source: "runtime-envelope",
      summary,
    };
  }
  return {
    confidence: "UNRESOLVED",
    evidenceRefs: [],
    kind: "outcome-uncertain",
    source: "legacy-classifier",
    summary,
  };
};
