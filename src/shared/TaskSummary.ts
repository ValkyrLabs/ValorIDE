import type { ValorIDEChangesSummary } from "./ExtensionMessage";
import type { TaskTerminalKind } from "./TaskLifecycle";

export type TaskSummaryStatus = TaskTerminalKind | "cancelled" | "in_progress";

export type TaskVerificationGate = "tests" | "build" | "typecheck" | "lint";

/** Recorded by command execution; never inferred from completion prose. */
export interface TaskVerificationEvidence {
  gate: TaskVerificationGate;
  evidenceRef: string;
  exitCode: number;
}

export interface TaskSummaryCheckpoint {
  label?: string;
  hash?: string;
}

export interface TaskSummaryTodo {
  text: string;
  done?: boolean;
}

export interface TaskSummaryInput {
  taskId: string;
  title?: string;
  status: TaskSummaryStatus;
  resultText?: string;
  changesSummary?: ValorIDEChangesSummary;
  decisions?: string[];
  todos?: TaskSummaryTodo[];
  checkpoints?: TaskSummaryCheckpoint[];
  attachments?: string[];
  completedAt?: string;
  /** Runtime-produced references only. */
  evidenceRefs?: string[];
  verificationEvidence?: TaskVerificationEvidence[];
}
