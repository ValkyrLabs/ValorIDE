import { COMMAND_OUTPUT_STRING } from "./combineCommandSequences";
import { ValorIDEMessage } from "./ExtensionMessage";

export interface ChatLoadingStateParams {
  messages: ValorIDEMessage[];
  lastMessage?: ValorIDEMessage;
  textAreaDisabled: boolean;
  enableButtons: boolean;
}

export interface DerivedChatLoadingState {
  isChatLoading: boolean;
  inlineSpinnerCount: number;
  inlineSources: Array<"api" | "command">;
}

export function deriveChatLoadingState({
  messages,
  lastMessage,
  textAreaDisabled,
  enableButtons,
}: ChatLoadingStateParams): DerivedChatLoadingState {
  const inlineSources: Array<"api" | "command"> = [];

  const userAttentionAsks = new Set<ValorIDEMessage["ask"]>([
    "resume_task",
    "resume_completed_task",
    "new_task",
    "condense",
  ]);

  if (lastMessage?.ask && userAttentionAsks.has(lastMessage.ask)) {
    return { isChatLoading: false, inlineSpinnerCount: 0, inlineSources };
  }

  const lastApiStatus = (() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (
        msg.say === "api_req_started" ||
        msg.say === "api_req_finished" ||
        msg.say === "api_req_retried" ||
        (msg.type === "ask" && msg.ask === "api_req_failed")
      ) {
        return msg;
      }
    }
    return undefined;
  })();

  const apiReqInFlight =
    (lastApiStatus?.say === "api_req_started" ||
      lastApiStatus?.say === "api_req_retried") &&
    (() => {
      if (!lastApiStatus?.text) return true;
      try {
        const parsed = JSON.parse(lastApiStatus.text);
        const hasCompletionDetails =
          parsed?.cancelReason != null ||
          typeof parsed?.cost === "number" ||
          typeof parsed?.tokensIn === "number" ||
          typeof parsed?.tokensOut === "number" ||
          typeof parsed?.cacheWrites === "number" ||
          typeof parsed?.cacheReads === "number";
        return !hasCompletionDetails;
      } catch {
        return true;
      }
    })();
  if (apiReqInFlight) {
    inlineSources.push("api");
  }

  const isCommandFlow =
    lastMessage?.ask === "command" ||
    lastMessage?.say === "command" ||
    lastMessage?.ask === "command_output" ||
    lastMessage?.say === "command_output";
  const hasCommandOutput =
    typeof lastMessage?.text === "string" &&
    lastMessage.text.includes(COMMAND_OUTPUT_STRING);
  const isCommandStillRunning =
    isCommandFlow &&
    (lastMessage?.ask === "command_output" ||
      lastMessage?.partial ||
      !hasCommandOutput);
  if (isCommandStillRunning) {
    inlineSources.push("command");
  }

  const isWaitingForResponse =
    apiReqInFlight ||
    lastMessage?.partial === true ||
    (textAreaDisabled && !enableButtons) ||
    (lastMessage?.ask === "followup" && lastMessage?.partial) ||
    isCommandStillRunning;

  return {
    isChatLoading: isWaitingForResponse,
    inlineSpinnerCount: inlineSources.length,
    inlineSources,
  };
}

/** Derives whether the chat should show a loading indicator. */
export function computeIsChatLoadingState({
  messages,
  lastMessage,
  textAreaDisabled,
  enableButtons,
}: ChatLoadingStateParams): boolean {
  return deriveChatLoadingState({
    messages,
    lastMessage,
    textAreaDisabled,
    enableButtons,
  }).isChatLoading;
}
