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

  it.each([
    "tool",
    "command",
    "browser_action_launch",
    "use_mcp_server",
    "command_output",
    "resume_task",
  ])("sends the canonical approval response for %s", async (ask) => {
    const { result } = renderHook(() =>
      useChatState({
        messages: [
          {
            ts: 1,
            type: "ask",
            ask,
            text:
              ask === "tool"
                ? '{"tool":"precisionSearchAndReplace"}'
                : "exact request",
          } as any,
        ],
      }),
    );
    await act(async () => {
      await result.current.handlePrimaryButtonClick();
    });
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: "askResponse",
      askResponse: "yesButtonClicked",
    });
    expect(clearTask).not.toHaveBeenCalled();
    expect(result.current.enableButtons).toBe(false);
  });

  it("rejects the exact file decision without sending ordinary chat text", async () => {
    const { result } = renderHook(() =>
      useChatState({
        messages: [
          {
            ts: 1,
            type: "ask",
            ask: "tool",
            text: '{"tool":"precisionSearchAndReplace"}',
          } as any,
        ],
      }),
    );
    await act(async () => {
      await result.current.handleSecondaryButtonClick();
    });
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: "askResponse",
      askResponse: "noButtonClicked",
    });
  });

  it.each(["completion_result", "resume_completed_task"])(
    "starts a new task after %s",
    async (ask) => {
      const { result } = renderHook(() =>
        useChatState({
          messages: [{ ts: 1, type: "ask", ask, text: "done" } as any],
        }),
      );
      await act(async () => {
        await result.current.handlePrimaryButtonClick();
      });
      expect(clearTask).toHaveBeenCalledExactlyOnceWith({});
      expect(postMessage).not.toHaveBeenCalled();
    },
  );

  it("keeps partial tool proposals unapproved", async () => {
    const { result } = renderHook(() =>
      useChatState({
        messages: [
          {
            ts: 1,
            type: "ask",
            ask: "tool",
            partial: true,
            text: '{"tool":"precisionSearchAndReplace"}',
          } as any,
        ],
      }),
    );
    await act(async () => {
      await result.current.handlePrimaryButtonClick();
    });
    expect(postMessage).not.toHaveBeenCalled();
  });

  it("preserves the explicit Stubborn-mode continuation control", async () => {
    vi.useFakeTimers();
    try {
      const { result, unmount } = renderHook(() =>
        useChatState({
          chatSettings: { stubbornMode: true, stubbornModeAttempts: 3 },
          messages: [
            {
              ts: 1,
              type: "ask",
              ask: "followup",
              text: "Are you sure you completed all of the tasks requested?",
            },
            { ts: 2, type: "ask", ask: "completion_result", text: "done" },
          ] as any,
        }),
      );
      expect(result.current.primaryButtonText).toBe("Stubborn 2/3");
      await act(async () => {
        await result.current.handlePrimaryButtonClick();
      });
      expect(clearTask).not.toHaveBeenCalled();
      expect(postMessage).toHaveBeenCalledExactlyOnceWith({
        type: "askResponse",
        askResponse: "messageResponse",
        text: "continue",
        images: [],
      });
      unmount();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
