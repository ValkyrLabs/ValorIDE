import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useMessageHandling } from "./useMessageHandling";

const postMessage = vi.fn();
const newTask = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: (...args: unknown[]) => postMessage(...args),
  },
}));

vi.mock("@thorapi/services/grpc-client", () => ({
  TaskServiceClient: {
    newTask: (...args: unknown[]) => newTask(...args),
  },
}));

describe("useMessageHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    newTask.mockResolvedValue(undefined);
  });

  it("sends typed text as an askResponse for any active ask state", async () => {
    const clearChatInput = vi.fn();
    const setTextAreaDisabled = vi.fn();
    const setValorIDEAsk = vi.fn();
    const setEnableButtons = vi.fn();

    const { result } = renderHook(() =>
      useMessageHandling({
        clearChatInput,
        messages: [{ type: "ask", ask: "api_req_failed" }],
        ourSenderId: "local",
        setEnableButtons,
        setTextAreaDisabled,
        setValorIDEAsk,
        valorideAsk: "api_req_failed",
      }),
    );

    await act(async () => {
      await result.current.handleSendMessage("please retry", []);
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: "askResponse",
      askResponse: "messageResponse",
      text: "please retry",
      images: [],
    });
    expect(clearChatInput).toHaveBeenCalled();
    expect(setTextAreaDisabled).toHaveBeenCalledWith(true);
    expect(setValorIDEAsk).toHaveBeenCalledWith(undefined);
    expect(setEnableButtons).toHaveBeenCalledWith(false);
    expect(newTask).not.toHaveBeenCalled();
  });
});
