import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChatRow, {
  ChatRowContent,
  CompletionSummaryCard,
  API_REQUEST_TIMEOUT_MS,
} from "../ChatRow";
import { ExtensionStateContextProvider } from "@thorapi/context/ExtensionStateContext";
const ProviderAny = ExtensionStateContextProvider as any;

vi.mock("@vscode/webview-ui-toolkit/react", () => {
  const component =
    (Tag: any = "div") =>
    (props: any) => <Tag {...props} />;
  const baseMocks = {
    useTheme: () => ({ themeType: "light" }),
    VSCodeBadge: component("span"),
    VSCodeProgressRing: component("div"),
    VSCodeButton: component("button"),
  };
  return new Proxy(baseMocks, {
    get(target, prop) {
      if (prop in target) return (target as any)[prop];
      if (typeof prop === "string" && prop.startsWith("VSCode")) {
        return component("div");
      }
      return undefined;
    },
  });
});

vi.mock("@thorapi/context/ExtensionStateContext", () => {
  const mockExtensionState = {
    version: "test",
    valorideMessages: [],
    taskHistory: [],
    apiConfiguration: {},
    telemetrySetting: undefined,
    chatSettings: {},
    jwtToken: undefined,
    mcpServers: [],
    mcpMarketplaceCatalog: { items: [] },
  };
  const Context = React.createContext(mockExtensionState);
  const ProviderAny: React.FC<{
    children: any;
    value?: Partial<typeof mockExtensionState>;
  }> = ({ children, value }) => {
    Object.assign(mockExtensionState, value ?? {});
    return (
      <Context.Provider value={mockExtensionState}>{children}</Context.Provider>
    );
  };
  return {
    useExtensionState: () => mockExtensionState,
    ExtensionStateContextProvider: ProviderAny,
  };
});

vi.mock("@thorapi/components/chat/TaskHeader", () => ({
  highlightText: (text: string) => text,
  default: () => null,
}));

vi.mock("@thorapi/components/common/MarkdownBlock", () => ({
  default: ({ markdown }: any) => <div>{markdown}</div>,
}));

vi.mock("@thorapi/components/chat/TaskFeedbackButtons", () => ({
  default: () => null,
}));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

describe("ChatRow Content - completion_result summary handling", () => {
  it("renders the initial task prompt inside the generated report when a thin summary exists", () => {
    const initialPrompt = "Write a unit test for this function";

    const message = {
      type: "say",
      say: "completion_result",
      ts: Date.now(),
      text: initialPrompt,
      summaryMarkdown: `# Task: ${initialPrompt}\n\nStatus: Completed ✅\n`,
      summaryTitle: initialPrompt,
      summaryCompletedAt: new Date().toISOString(),
    } as any;

    render(
      <ProviderAny
        value={{
          valorideMessages: [{ text: initialPrompt }] as any,
        }}
      >
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    // The initial prompt is represented inside the generated report, not as a
    // duplicated free-floating message above it.
    expect(screen.getByText(initialPrompt)).toBeTruthy();
    expect(screen.getByText(/What was built:/)).toBeTruthy();

    // The summary card title should be visible
    expect(
      screen.getByText(`Completion Report — ${initialPrompt}`),
    ).toBeTruthy();
  });

  it("renders the ask/completion_result task prompt inside the generated report when a thin summary exists", () => {
    const initialPrompt = "Write a unit test for this function";

    const message = {
      type: "ask",
      ask: "completion_result",
      ts: Date.now(),
      text: initialPrompt,
      summaryMarkdown: `# Task: ${initialPrompt}\n\nStatus: Completed ✅\n`,
      summaryTitle: initialPrompt,
      summaryCompletedAt: new Date().toISOString(),
    } as any;

    render(
      <ProviderAny
        value={{
          valorideMessages: [{ text: initialPrompt }] as any,
        }}
      >
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    // The initial prompt is represented inside the generated report, not as a
    // duplicated free-floating message above it.
    expect(screen.getByText(initialPrompt)).toBeTruthy();
    expect(screen.getByText(/What was built:/)).toBeTruthy();
  });

  it("does not duplicate result text outside the report when a summary exists", () => {
    const initialPrompt = "Implement feature X";
    const resultText =
      "Implement feature X: Here is the resulting test code...";

    const message = {
      type: "say",
      say: "completion_result",
      ts: Date.now(),
      text: resultText,
      summaryMarkdown: `# Task: ${initialPrompt}\n\nStatus: Completed ✅\n`,
      summaryTitle: initialPrompt,
      summaryCompletedAt: new Date().toISOString(),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    // The result text is represented inside the report, not rendered twice.
    expect(screen.getByText(resultText)).toBeTruthy();
    expect(screen.getByText(/What was built:/)).toBeTruthy();

    // The summary card title should also be visible
    expect(
      screen.getByText(`Completion Report — ${initialPrompt}`),
    ).toBeTruthy();
  });

  it("renders completion details inside the report even when they match the summary title", () => {
    const text = "Refactor the database layer";
    const message = {
      type: "say",
      say: "completion_result",
      ts: Date.now(),
      text,
      summaryMarkdown: `# Task: ${text}\n\n## 🔧 Implementation Details\n- Refactored models\n- Added tests`,
      summaryTitle: text,
      summaryCompletedAt: new Date().toISOString(),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText(/Refactored models/)).toBeTruthy();
    expect(screen.getByText(/Implementation Details/)).toBeTruthy();
    expect(screen.getByText(`Completion Report — ${text}`)).toBeTruthy();
  });

  it("shows the full completion report invariant instead of only the compact card title", () => {
    const title = "Fix the completion report";
    const message = {
      type: "say",
      say: "completion_result",
      ts: Date.now(),
      text: "Completed the completion report fix.",
      summaryMarkdown: [
        "# 🎯 Fix the completion report — COMPLETE",
        "",
        "## 📊 Executive Summary",
        "- **What was built:** Full report rendering",
        "- **Status:** ✅ SHIPPED",
        "",
        "## 🔧 Implementation Details",
        "- Updated ChatRow completion card",
        "",
        "## ✅ Quality Gates",
        "- Tests passing",
        "",
        "## 📈 Before/After Comparison",
        "| Metric | Before | After |",
        "|--------|--------|-------|",
        "| Completion report | ❌ Title-only | ✅ Full report |",
        "",
        "## 🚀 Ship Status",
        "**Production-ready:** Yes",
      ].join("\n"),
      summaryTitle: title,
      summaryCompletedAt: new Date().toISOString(),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText(`Completion Report — ${title}`)).toBeTruthy();
    expect(screen.getByText(/Executive Summary/)).toBeTruthy();
    expect(screen.getByText(/Implementation Details/)).toBeTruthy();
    expect(screen.getByText(/Quality Gates/)).toBeTruthy();
    expect(screen.getByText(/Before\/After Comparison/)).toBeTruthy();
    expect(screen.getByText(/Ship Status/)).toBeTruthy();
    expect(screen.getByText("Completion report")).toBeTruthy();
  });
});

describe("ChatRow Content - command and GrayMatter UX", () => {
  it("renders command rows as compact command previews without the old ValorIDE title", () => {
    const message = {
      type: "ask",
      ask: "command",
      ts: Date.now(),
      text: "npm test -- --runInBandREQ_APP",
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("Executing Command:")).toBeTruthy();
    expect(screen.getByText("npm test -- --runInBand")).toBeTruthy();
    expect(screen.queryByText(/ValorIDE executing command/i)).toBeNull();
  });

  it("renders GrayMatter context access with a green memory status", () => {
    const message = {
      type: "say",
      say: "graymatter_context",
      ts: Date.now(),
      text: JSON.stringify({
        citations: 2,
        message: "GrayMatter injected 2 remembered context entries.",
        status: "ready",
      }),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText(/GrayMatter memory checked/)).toBeTruthy();
    expect(
      screen.getByText(/GrayMatter injected 2 remembered context entries/),
    ).toBeTruthy();
    expect(screen.getByText("ready")).toBeTruthy();
  });

  it("shows captured command output inside the command dropdown", () => {
    const message = {
      type: "say",
      say: "command",
      ts: Date.now(),
      text: "npm test\nOutput:\nPASS src/core/task/index.test.ts",
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={{
            type: "say",
            say: "text",
            text: "done",
            ts: Date.now(),
          }}
          isLast={false}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("Command Output")).toBeTruthy();
    expect(
      screen.getByText(/PASS src\/core\/task\/index.test.ts/),
    ).toBeTruthy();
  });

  it("marks silent completed commands as completed with no output", () => {
    const message = {
      type: "say",
      say: "command",
      ts: Date.now(),
      text: "git status --short",
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={{
            type: "say",
            say: "text",
            text: "done",
            ts: Date.now(),
          }}
          isLast={false}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("Command completed with no output.")).toBeTruthy();
    expect(screen.queryByText("No output yet")).toBeNull();
  });
});

describe("ChatRow Content - follow-up questions", () => {
  it("renders Sage-style selectable option cards from question aliases", () => {
    const sendMessageFromChatRow = vi.fn();
    const message = {
      type: "ask",
      ask: "followup",
      ts: Date.now(),
      text: JSON.stringify({
        message: "Choose how ValorIDE should continue.",
        choices: [
          {
            command: "/new secure-intake",
            label: "Generate Secure Intake",
            description: "Create the app bundle and hand it to ValorIDE.",
            value: "Generate Secure Intake",
          },
        ],
      }),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
          sendMessageFromChatRow={sendMessageFromChatRow}
        />
      </ProviderAny>,
    );

    expect(
      screen.getByText("Choose how ValorIDE should continue."),
    ).toBeTruthy();
    expect(screen.getByText("/new secure-intake")).toBeTruthy();
    expect(screen.getByText("Generate Secure Intake")).toBeTruthy();

    fireEvent.click(screen.getByText("Generate Secure Intake"));

    expect(sendMessageFromChatRow).toHaveBeenCalledWith(
      "Generate Secure Intake",
      [],
    );
  });

  it("does not render a question shell when follow-up text is blank", () => {
    const message = {
      type: "ask",
      ask: "followup",
      ts: Date.now(),
      text: "   \n\t",
    } as any;

    const { container } = render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.queryByText("ValorIDE has a question:")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders option-only follow-ups as answerable prompts", () => {
    const message = {
      type: "ask",
      ask: "followup",
      ts: Date.now(),
      text: JSON.stringify({ options: ["Continue", "Stop"] }),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("ValorIDE has a question:")).toBeTruthy();
    expect(screen.getByText("Select an option to continue.")).toBeTruthy();
    expect(screen.getByText("Continue")).toBeTruthy();
    expect(screen.getByText("Stop")).toBeTruthy();
  });
});

describe("ChatRow Content - precision search & replace summary", () => {
  it("shows the PSR file and edit details when expanded", () => {
    const psrTool = {
      tool: "precisionSearchAndReplace",
      path: "src/components/Foo.tsx",
      content: JSON.stringify({
        edits: [
          {
            kind: "contextual",
            find: "console.log(old)",
            replace: "console.log(next)",
          },
          {
            kind: "ts-ast",
            intent: "renameProperty",
            from: "oldProp",
            to: "newProp",
          },
        ],
        options: { dryRun: true },
      }),
    };
    const message = {
      type: "say",
      say: "tool",
      ts: Date.now(),
      text: JSON.stringify(psrTool),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("File: src/components/Foo.tsx")).toBeTruthy();
    expect(
      screen.getByText('contextual: "console.log(old)" -> "console.log(next)"'),
    ).toBeTruthy();
    expect(
      screen.getByText('ts-ast renameProperty: "oldProp" -> "newProp"'),
    ).toBeTruthy();
  });
});

describe("ChatRow Content - command header", () => {
  it("renders the command inline with the executing label", () => {
    const message = {
      type: "say",
      say: "command",
      ts: Date.now(),
      text: "ls -la",
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("Executing Command:")).toBeTruthy();
    expect(screen.getByText("ls -la")).toBeTruthy();
    expect(screen.queryByText("ValorIDE executing command:")).toBeNull();
  });
});

describe("ChatRow Content - api request spinner handling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears the API request spinner when usage details are present even without cost", () => {
    const apiRequestMessage = {
      type: "say",
      say: "api_req_started",
      ts: Date.now(),
      text: JSON.stringify({
        request: "POST /v1/chat",
        tokensIn: 42,
        tokensOut: 18,
      }),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={apiRequestMessage}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={apiRequestMessage}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("API Request")).toBeTruthy();
    expect(screen.queryByText("API Request...")).toBeNull();
  });

  it("clears the spinner when usage values are provided as numeric strings", () => {
    const apiRequestMessage = {
      type: "say",
      say: "api_req_started",
      ts: Date.now(),
      text: JSON.stringify({
        request: "POST /v1/chat",
        tokensIn: "0",
        tokensOut: "12",
        cacheReads: "3",
      }),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={apiRequestMessage}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={apiRequestMessage}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("API Request")).toBeTruthy();
    expect(screen.queryByText("API Request...")).toBeNull();
  });

  it("clears the spinner once task completion is shown even without usage details", () => {
    const apiRequestMessage = {
      type: "say",
      say: "api_req_started",
      ts: Date.now(),
      text: JSON.stringify({
        request: "POST /v1/chat",
      }),
    } as any;

    const completionMessage = {
      type: "ask",
      ask: "completion_result",
      ts: Date.now() + 1,
      text: "",
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={apiRequestMessage}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={completionMessage}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("API Request")).toBeTruthy();
    expect(screen.queryByText("API Request...")).toBeNull();
    expect(screen.queryByLabelText("progress-indicator")).toBeNull();
  });

  it("times out a lingering API request spinner and shows a failure state", () => {
    vi.useFakeTimers();

    const apiRequestMessage = {
      type: "say",
      say: "api_req_started",
      ts: Date.now(),
      text: JSON.stringify({
        request: "POST /v1/chat",
      }),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={apiRequestMessage}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={apiRequestMessage}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    expect(screen.getByText("API Request...")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS);
    });

    expect(screen.getByText("API Request Failed")).toBeTruthy();
    expect(screen.getByText(/timed out/i)).toBeTruthy();
  });
});

describe("ChatRow Content - reasoning severity indicator", () => {
  it("shows warning color when reasoning is partial (low confidence)", () => {
    const message = {
      type: "say",
      say: "reasoning",
      ts: Date.now(),
      text: "Working on it",
      partial: true,
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    const icon = screen.getByTestId("reasoning-icon");
    expect(icon).toHaveAttribute(
      "color",
      "var(--vscode-notificationsWarningIcon-foreground, var(--vscode-charts-yellow))",
    );
  });

  it("shows warning color when task confidence is degraded even without partial content", () => {
    const message = {
      type: "say",
      say: "reasoning",
      ts: Date.now(),
      text: "Here is the plan",
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={false}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
          taskConfidence="warning"
        />
      </ProviderAny>,
    );

    const icon = screen.getByTestId("reasoning-icon");
    expect(icon).toHaveAttribute(
      "color",
      "var(--vscode-notificationsWarningIcon-foreground, var(--vscode-charts-yellow))",
    );
  });
});

describe("ChatRow Content - GrayMatter recovery", () => {
  it("shows a sign-in action when GrayMatter is unauthenticated without recovery actions", async () => {
    const { vscode } = await import("@thorapi/utils/vscode");
    vi.mocked(vscode.postMessage).mockClear();
    const message = {
      type: "say",
      say: "graymatter_context",
      ts: Date.now(),
      text: JSON.stringify({
        message:
          "GrayMatter memory context needs an active ValkyrAI session token before it can query memory.",
        status: "unauthenticated",
      }),
    } as any;

    render(
      <ProviderAny>
        <ChatRowContent
          message={message}
          isExpanded={true}
          onToggleExpand={() => {}}
          lastModifiedMessage={message}
          isLast={true}
          onHeightChange={() => {}}
        />
      </ProviderAny>,
    );

    const button = screen.getByRole("button", { name: "Sign in to ValkyrAI" });
    fireEvent.click(button);

    expect(vscode.postMessage).toHaveBeenCalledWith({
      type: "showAccountViewClicked",
      accountTab: "login",
    });
  });
});
