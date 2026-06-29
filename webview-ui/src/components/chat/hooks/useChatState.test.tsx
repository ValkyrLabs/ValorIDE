import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatState } from "./useChatState";

const postMessage = vi.fn();
const clearTask = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: (...args: unknown[]) => postMessage(...args),
  },
}));

vi.mock("@thorapi/services/grpc-client", () => ({
  TaskServiceClient: {
    clearTask: (...args: unknown[]) => clearTask(...args),
  },
}));

describe("useChatState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTask.mockResolvedValue(undefined);
  });

  it("sends an explicit End Task instruction from the cancel control", () => {
    const { result } = renderHook(() =>
      useChatState({
        messages: [{ type: "ask", ask: "command", text: "npm test" } as any],
      }),
    );

    act(() => {
      result.current.handleCancelClick();
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: "askResponse",
      askResponse: "messageResponse",
      text: "End this task now. Summarize the current state and stop without starting new work.",
      images: [],
    });
  });
});
