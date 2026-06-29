import { describe, expect, it } from "vitest";
import { getVisibleTaskMessages } from "../taskMessageVisibility";

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
