import { computeIsChatLoadingState } from "./chatLoadingState";
import { ValorIDEMessage } from "./ExtensionMessage";

const baseParams = {
  messages: [] as ValorIDEMessage[],
  textAreaDisabled: false,
  enableButtons: true,
};

describe("computeIsChatLoadingState", () => {
  it("returns false when waiting for user to resume task", () => {
    const lastMessage: ValorIDEMessage = {
      ts: Date.now(),
      type: "ask",
      ask: "resume_task",
      text: "",
    };

    const result = computeIsChatLoadingState({
      ...baseParams,
      lastMessage,
    });

    expect(result).toBe(false);
  });

  it("returns false once api usage has been recorded on the last api_req_started", () => {
    const apiStarted: ValorIDEMessage = {
      ts: Date.now() - 10,
      type: "say",
      say: "api_req_started",
      text: JSON.stringify({
        request: "GET /api/data",
        tokensIn: 10,
        tokensOut: 20,
        cost: 0.005,
      }),
    };
    const completionResult: ValorIDEMessage = {
      ts: Date.now(),
      type: "ask",
      ask: "completion_result",
      text: "done",
    };

    const result = computeIsChatLoadingState({
      ...baseParams,
      messages: [apiStarted, completionResult],
      lastMessage: completionResult,
    });

    expect(result).toBe(false);
  });

  it("returns true while command output is still streaming", () => {
    const lastMessage: ValorIDEMessage = {
      ts: Date.now(),
      type: "ask",
      ask: "command_output",
      text: "",
      partial: true,
    };

    const result = computeIsChatLoadingState({
      ...baseParams,
      lastMessage,
    });

    expect(result).toBe(true);
  });

  it("returns true when an API request is in flight", () => {
    const apiStarted: ValorIDEMessage = {
      ts: Date.now() - 10,
      type: "say",
      say: "api_req_started",
      text: JSON.stringify({ cancelReason: null }),
    };

    const result = computeIsChatLoadingState({
      ...baseParams,
      messages: [apiStarted],
      lastMessage: apiStarted,
    });

    expect(result).toBe(true);
  });

  it("ignores in-flight API state once a resume prompt is shown", () => {
    const apiStarted: ValorIDEMessage = {
      ts: Date.now() - 20,
      type: "say",
      say: "api_req_started",
      text: JSON.stringify({ cancelReason: null }),
    };
    const lastMessage: ValorIDEMessage = {
      ts: Date.now(),
      type: "ask",
      ask: "resume_task",
      text: "",
    };

    const result = computeIsChatLoadingState({
      ...baseParams,
      messages: [apiStarted, lastMessage],
      lastMessage,
    });

    expect(result).toBe(false);
  });
});
