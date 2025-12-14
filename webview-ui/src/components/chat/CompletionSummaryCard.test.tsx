import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { CompletionSummaryCard } from "./ChatRow";

vi.mock("@thorapi/context/ExtensionStateContext", () => {
    const React = require("react");
    const mockState = { valorideMessages: [] as any };
    const Context = React.createContext(mockState);
    return {
        useExtensionState: () => mockState,
        ExtensionStateContextProvider: ({ children }: { children: any }) => (
            <Context.Provider value={mockState}>{children}</Context.Provider>
        ),
    };
});
const MockExtensionStateProvider = ({ children }: { children: any }) => {
    const React = require("react");
    const mockState = { valorideMessages: [] as any };
    const Context = React.createContext(mockState);
    return <Context.Provider value={mockState}>{children}</Context.Provider>;
};

vi.mock("../common/MarkdownBlock", () => ({
    __esModule: true,
    default: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}));

describe("CompletionSummaryCard", () => {
    it("strips the leading '# Task: ' heading from summary markdown", () => {
        const markdown = `# Task: Implement feature X\n\n## Result\nThe feature was implemented.`;
        render(
            <MockExtensionStateProvider>
                <CompletionSummaryCard markdown={markdown} title={"Implement feature X"} />
            </MockExtensionStateProvider>,
        );
        // The first heading should be removed from the body markdown
        expect(screen.queryByText("# Task: Implement feature X")).not.toBeInTheDocument();
        // The result content should still be rendered
        expect(screen.getByText(/feature was implemented/i)).toBeInTheDocument();
    });
});
