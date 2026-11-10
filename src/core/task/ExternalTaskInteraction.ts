import type { ExtensionMessage, ValorIDEMessage } from "@shared/ExtensionMessage";
import type { ValorIDEAskResponse } from "@shared/WebviewMessage";
import type { TaskTerminalEvent } from "@shared/TaskLifecycle";

export interface ExternalTaskAnswer {
  response: ValorIDEAskResponse;
  text?: string;
  images?: string[];
}

/** A task-owned interaction channel; never simulates buttons in another chat. */
export interface ExternalTaskInteraction {
  ask(message: Readonly<ValorIDEMessage>): Promise<ExternalTaskAnswer>;
  onFatalError(error: unknown): void;
}

export interface DetachedTaskHooks extends ExternalTaskInteraction {
  assertActive(): Promise<void>;
  onMessages(messages: readonly ValorIDEMessage[]): void | Promise<void>;
  onMessage(message: ExtensionMessage): void | Promise<void>;
  onTerminal(event: TaskTerminalEvent): void | Promise<void>;
}

/** Approval is valid only for the ask which was actually displayed. */
export async function answerExternalTaskAsk(
  interaction: ExternalTaskInteraction,
  message: Readonly<ValorIDEMessage>,
  isCurrent: () => boolean,
): Promise<ExternalTaskAnswer> {
  if (!isCurrent()) throw new Error("External task ask is no longer active.");
  const answer = await interaction.ask({ ...message });
  if (!isCurrent()) throw new Error("External task ask is no longer active.");
  if (!["yesButtonClicked", "noButtonClicked", "messageResponse"].includes(answer.response)) {
    throw new Error("Invalid external task answer.");
  }
  return answer;
}
