import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatState } from "./useChatState";

const postMessage = vi.fn();
const clearTask = vi.fn();
const cancelTask = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: (...args: unknown[]) => postMessage(...args),
  },
}));

vi.mock("@thorapi/services/grpc-client", () => ({
  TaskServiceClient: {
    cancelTask: (...args: unknown[]) => cancelTask(...args),
    clearTask: (...args: unknown[]) => clearTask(...args),
  },
}));

describe("useChatState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cancelTask.mockResolvedValue(undefined);
    clearTask.mockResolvedValue(undefined);
  });

  it("cancels the current task from the cancel control without sending chat text", async () => {
    const { result } = renderHook(() =>
      useChatState({
        messages: [{ type: "ask", ask: "command", text: "npm test" } as any],
      }),
    );

    await act(async () => {
      await result.current.handleCancelClick();
    });

    expect(clearTask).not.toHaveBeenCalled();
    expect(cancelTask).toHaveBeenCalledWith({});
    expect(postMessage).not.toHaveBeenCalled();
  });
});
