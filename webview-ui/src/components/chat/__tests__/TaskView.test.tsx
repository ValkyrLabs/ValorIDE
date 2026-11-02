import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ValorIDEMessage } from "@shared/ExtensionMessage";
import TaskView from "../TaskView";
import { getVisibleTaskMessages } from "../taskMessageVisibility";

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("react-virtuoso", () => ({
  Virtuoso: React.forwardRef(({ data, itemContent }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      scrollTo: vi.fn(),
      scrollToIndex: vi.fn(),
    }));
    return data.map((item: any, index: number) => (
      <React.Fragment key={index}>{itemContent(index, item)}</React.Fragment>
    ));
  }),
}));

vi.mock("@thorapi/components/settings/ApiOptions", () => ({
  normalizeApiConfiguration: () => ({ selectedModelInfo: {} }),
}));

vi.mock("@thorapi/components/chat/TaskHeader", () => ({
  default: () => null,
}));

vi.mock("@thorapi/components/chat/ChatRow", () => ({
  default: ({ message, isExpanded, onToggleExpand }: any) => (
    <button
      aria-label={`row-${message.ts}`}
      aria-expanded={isExpanded}
      onClick={onToggleExpand}
    >
      {message.text}
    </button>
  ),
}));

vi.mock("@thorapi/components/chat/BrowserSessionRow", () => ({
  default: ({ messages, isExpanded, onToggleExpand }: any) =>
    messages.map((message: ValorIDEMessage) => (
      <button
        key={message.ts}
        aria-label={`row-${message.ts}`}
        aria-expanded={isExpanded(message.ts)}
        onClick={() => onToggleExpand(message.ts)}
      >
        {message.text}
      </button>
    )),
}));

const task: ValorIDEMessage = {
  ts: 1,
  type: "say",
  say: "text",
  text: "Build an app",
};

const props = {
  task,
  apiConfiguration: {},
  inputValue: "",
  setInputValue: vi.fn(),
  sendMessageFromChatRow: vi.fn(),
  isChatLoading: false,
  textAreaDisabled: false,
  valorideAsk: undefined,
  enableButtons: false,
  onTaskClose: vi.fn(),
  onPrimaryButton: vi.fn(),
  onSecondaryButton: vi.fn(),
  onCancel: vi.fn(),
};

describe("getVisibleTaskMessages", () => {
  it("hides empty completion_result ask control messages even when old history has report metadata", () => {
    const completionReport = "# 🎯 Feature X — COMPLETE";
    const messages = [
      {
        type: "say",
        say: "completion_result",
        ts: 1,
        text: "Completed Feature X",
        summaryMarkdown: completionReport,
        summaryTitle: "Feature X",
      },
      {
        type: "ask",
        ask: "completion_result",
        ts: 2,
        text: "",
        summaryMarkdown: completionReport,
        summaryTitle: "Feature X",
        changesSummary: { totalFiles: 1 },
      },
    ] as any;

    expect(getVisibleTaskMessages(messages)).toEqual([messages[0]]);
  });

  it("keeps non-empty completion_result asks renderable", () => {
    const message = {
      type: "ask",
      ask: "completion_result",
      ts: 1,
      text: "Completed Feature X",
    } as any;

    expect(getVisibleTaskMessages([message])).toEqual([message]);
  });

  it("hides empty follow-up question messages with no options", () => {
    const messages = [
      {
        type: "ask",
        ask: "followup",
        ts: 1,
        text: JSON.stringify({ question: "", options: [] }),
      },
      {
        type: "ask",
        ask: "followup",
        ts: 2,
        text: "   \n\t",
      },
    ] as any;

    expect(getVisibleTaskMessages(messages)).toEqual([]);
  });

  it("keeps option-only follow-up question messages renderable", () => {
    const message = {
      type: "ask",
      ask: "followup",
      ts: 1,
      text: JSON.stringify({ options: ["Continue", "Stop"] }),
    } as any;

    expect(getVisibleTaskMessages([message])).toEqual([message]);
  });
});

describe("TaskView reasoning expansion", () => {
  it.each([false, true])(
    "defaults reasoning to expanded and preserves manual collapse during streaming (browser session: %s)",
    (inBrowserSession) => {
      const messages: ValorIDEMessage[] = [task];
      if (inBrowserSession) {
        messages.push({
          ts: 2,
          type: "say",
          say: "browser_action_launch",
          text: "https://example.com",
        });
      }
      messages.push({
        ts: 3,
        type: "say",
        say: "reasoning",
        partial: true,
        text: "Inspecting the app",
      });

      const { rerender } = render(<TaskView {...props} messages={messages} />);
      expect(screen.getByRole("button", { name: "row-3" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      if (inBrowserSession) {
        expect(screen.getByRole("button", { name: "row-2" })).toHaveAttribute(
          "aria-expanded",
          "false",
        );
      }

      fireEvent.click(screen.getByRole("button", { name: "row-3" }));
      expect(screen.getByRole("button", { name: "row-3" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );

      const updatedMessages = messages.map((message) =>
        message.ts === 3
          ? { ...message, text: "Inspecting the app and preparing changes" }
          : message,
      );
      rerender(<TaskView {...props} messages={updatedMessages} />);
      expect(screen.getByRole("button", { name: "row-3" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(
        screen.getByText("Inspecting the app and preparing changes"),
      ).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "row-3" }));
      expect(screen.getByRole("button", { name: "row-3" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    },
  );
});
