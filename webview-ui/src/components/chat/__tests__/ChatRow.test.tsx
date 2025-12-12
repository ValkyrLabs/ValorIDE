import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChatRow, { ChatRowContent, CompletionSummaryCard } from "../ChatRow";
import { ExtensionStateContextProvider } from "@thorapi/context/ExtensionStateContext";

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
    useTheme: () => ({ themeType: "light" }),
    VSCodeBadge: (props: any) => <span {...props} />,
    VSCodeProgressRing: () => <div />,
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
            <ExtensionStateContextProvider>
                <ChatRowContent
                    message={message}
                    isExpanded={true}
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ExtensionStateContextProvider>,
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
            <ExtensionStateContextProvider>
                <ChatRowContent
                    message={message}
                    isExpanded={true}
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ExtensionStateContextProvider>,
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
            <ExtensionStateContextProvider>
                <ChatRowContent
                    message={message}
                    isExpanded={true}
                    onToggleExpand={() => { }}
                    lastModifiedMessage={message}
                    isLast={true}
                    onHeightChange={() => { }}
                />
            </ExtensionStateContextProvider>,
        );

        // The result text should be visible
        expect(screen.getByText(resultText)).toBeTruthy();

        // The summary card title should also be visible
        expect(screen.getByText(`Task Summary — ${initialPrompt}`)).toBeTruthy();
    });
});
