import { ValorIDEChangesSummary } from "./ExtensionMessage";

export type TaskSummaryStatus =
  | "completed"
  | "failed"
  | "cancelled"
  | "in_progress";

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
}
