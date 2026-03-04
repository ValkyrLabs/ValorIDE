import React from "react";
import { act, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChatRow, {
    ChatRowContent,
    CompletionSummaryCard,
    API_REQUEST_TIMEOUT_MS,
} from "../ChatRow";
import { ExtensionStateContextProvider } from "@thorapi/context/ExtensionStateContext";
const ProviderAny = ExtensionStateContextProvider as any;

vi.mock("@vscode/webview-ui-toolkit/react", () => {
    const component = (Tag: any = "div") => (props: any) => <Tag {...props} />;
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
    const React = require("react");
    const Context = React.createContext(mockExtensionState);
    const ProviderAny: React.FC<{
        children: any;
        value?: Partial<typeof mockExtensionState>;
    }> = ({ children, value }) => {
        Object.assign(mockExtensionState, value ?? {});
        return (
            <Context.Provider value={mockExtensionState}>
                {children}
            </Context.Provider>
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

describe("ChatRow Content - completion_result summary handling", () => {
    it("does not render initial task prompt as message text when a summary exists", () => {
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ProviderAny>,
        );

        // The initial prompt should not be shown as the message text
        expect(screen.queryByText(initialPrompt)).toBeNull();

        // The summary card title should be visible
        expect(screen.getByText(`Task Summary — ${initialPrompt}`)).toBeTruthy();
    });

    it("hides the initial task prompt for an ask/completion_result message when a summary exists", () => {
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ProviderAny>,
        );

        // The initial prompt should not be shown as the message text
        expect(screen.queryByText(initialPrompt)).toBeNull();
    });

    it("renders result text when it's not the initial prompt even if a summary exists", () => {
        const initialPrompt = "Implement feature X";
        const resultText = "Implement feature X: Here is the resulting test code...";

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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ProviderAny>,
        );

        // The result text should be visible
        expect(screen.getByText(resultText)).toBeTruthy();

        // The summary card title should also be visible
        expect(screen.getByText(`Task Summary — ${initialPrompt}`)).toBeTruthy();
    });

    it("still shows completion details even when they match the summary title (non-initial prompt)", () => {
        const text = "Refactor the database layer";
        const message = {
            type: "say",
            say: "completion_result",
            ts: Date.now(),
            text,
            summaryMarkdown: `# Task: ${text}\n\n- Refactored models\n- Added tests`,
            summaryTitle: text,
            summaryCompletedAt: new Date().toISOString(),
        } as any;

        render(
            <ProviderAny>
                <ChatRowContent
                    message={message}
                    isExpanded={true}
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ProviderAny>,
        );

        expect(screen.getByText(text)).toBeTruthy();
        expect(screen.getByText(`Task Summary — ${text}`)).toBeTruthy();
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ProviderAny>,
        );

        expect(screen.getByText("File: src/components/Foo.tsx")).toBeTruthy();
        expect(
            screen.getByText(
                'contextual: "console.log(old)" -> "console.log(next)"',
            ),
        ).toBeTruthy();
        expect(
            screen.getByText(
                'ts-ast renameProperty: "oldProp" -> "newProp"',
            ),
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ProviderAny>,
        );

        expect(
            screen.getByText("ValorIDE executing command: ls -la"),
        ).toBeTruthy();
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={apiRequestMessage}
                    isLast={true}
                    onHeightChange={() => { }}
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={apiRequestMessage}
                    isLast={true}
                    onHeightChange={() => { }}
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={completionMessage}
                    isLast={true}
                    onHeightChange={() => { }}
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={apiRequestMessage}
                    isLast={true}
                    onHeightChange={() => { }}
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
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
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
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
