import { ValorIDEMessage } from "@shared/ExtensionMessage";

export type TaskPhase = "PLAN" | "ACT" | "EDIT" | "RUN" | "VERIFY" | "DONE";
export type TaskConfidence = "normal" | "warning";

export interface TaskProgress {
  phase: TaskPhase;
  ratio: number;
  confidence: TaskConfidence;
  anchors: Partial<Record<TaskPhase, number>>;
}

export const TASK_PHASES: TaskPhase[] = [
  "PLAN",
  "ACT",
  "EDIT",
  "RUN",
  "VERIFY",
  "DONE",
];

const PHASE_PRIORITY: Record<TaskPhase, number> = {
  PLAN: 0,
  ACT: 1,
  EDIT: 2,
  RUN: 3,
  VERIFY: 4,
  DONE: 5,
};

const phaseFromMessage = (message: ValorIDEMessage): TaskPhase | undefined => {
  if (
    message.say === "completion_result" ||
    message.ask === "completion_result" ||
    message.ask === "resume_completed_task"
  ) {
    return "DONE";
  }

  if (message.say === "api_req_finished") {
    return "VERIFY";
  }

  if (
    message.say === "command_output" ||
    message.ask === "command_output" ||
    message.say === "browser_action_result"
  ) {
    return "RUN";
  }

  if (
    message.say === "command" ||
    message.ask === "command" ||
    message.say === "browser_action" ||
    message.say === "browser_action_launch"
  ) {
    return "ACT";
  }

  if (
    message.say === "tool" ||
    message.ask === "tool" ||
    message.say === "diff_error"
  ) {
    return "EDIT";
  }

  if (message.ask === "resume_task") {
    return "VERIFY";
  }

  return undefined;
};

const parseExitCode = (text?: string): number | undefined => {
  if (!text) return undefined;
  const match = /\bexit code\s+(-?\d+)/i.exec(text);
  if (!match) return undefined;
  const code = Number.parseInt(match[1], 10);
  return Number.isNaN(code) ? undefined : code;
};

const inferConfidence = (messages: ValorIDEMessage[]): TaskConfidence => {
  const retryCount = messages.filter((m) => m.say === "api_req_retried").length;
  const hasApiFailure = messages.some(
    (m) => m.ask === "api_req_failed" || m.say === "api_req_failed",
  );
  const hasResumePrompt = messages.some((m) => m.ask === "resume_task");
  const hasNonZeroExit = messages.some((m) => {
    const code = parseExitCode(m.text);
    return code != null && code !== 0;
  });

  if (hasNonZeroExit || retryCount >= 2 || hasApiFailure || hasResumePrompt) {
    return "warning";
  }

  return "normal";
};

export function deriveTaskProgress(messages: ValorIDEMessage[]): TaskProgress {
  let phase: TaskPhase = "PLAN";
  let ratio = 0;
  const anchors: Partial<Record<TaskPhase, number>> = {};

  for (const msg of messages) {
    const candidate = phaseFromMessage(msg);
    if (candidate) {
      phase = candidate;
      anchors[candidate] = msg.ts;
      ratio = phaseToIndex(candidate) / (TASK_PHASES.length - 1 || 1);
    }
  }

  return {
    phase,
    ratio,
    anchors,
    confidence: inferConfidence(messages),
  };
}

export function deriveTaskPhase(messages: ValorIDEMessage[]): {
  phase: TaskPhase;
  ratio: number;
} {
  const { phase, ratio } = deriveTaskProgress(messages);
  return { phase, ratio };
}

export function phaseToIndex(phase: TaskPhase): number {
  const idx = TASK_PHASES.indexOf(phase);
  return idx === -1 ? 0 : idx;
}
