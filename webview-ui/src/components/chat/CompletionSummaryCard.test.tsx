import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import { CompletionSummaryCard } from "./ChatRow";

vi.mock("@thorapi/context/ExtensionStateContext", () => {
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
  const mockState = { valorideMessages: [] as any };
  const Context = React.createContext(mockState);
  return <Context.Provider value={mockState}>{children}</Context.Provider>;
};

vi.mock("../common/MarkdownBlock", () => ({
  __esModule: true,
  default: ({ markdown }: { markdown: string }) => <div>{markdown}</div>,
}));

describe("CompletionSummaryCard", () => {
  it("renders the full completion report markdown, including the leading heading", () => {
    const markdown = `# Task: Implement feature X\n\n## Result\nThe feature was implemented.`;
    render(
      <MockExtensionStateProvider>
        <CompletionSummaryCard
          markdown={markdown}
          title={"Implement feature X"}
        />
      </MockExtensionStateProvider>,
    );
    expect(
      screen.getByText(/Completion Report — Implement feature X/),
    ).toBeInTheDocument();
    expect(screen.getByText(/# Task: Implement feature X/)).toBeInTheDocument();
    expect(screen.getByText(/feature was implemented/i)).toBeInTheDocument();
  });

  it("preserves the rich task-complete heading and report sections", () => {
    const markdown = `# 🎯 Implement feature X — COMPLETED\n\n## 📊 Executive Summary\n- Shipped.`;
    render(
      <MockExtensionStateProvider>
        <CompletionSummaryCard
          markdown={markdown}
          title={"Implement feature X"}
        />
      </MockExtensionStateProvider>,
    );

    expect(
      screen.getByText(/🎯 Implement feature X — COMPLETED/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Executive Summary/)).toBeInTheDocument();
  });

  it("does not append generic next steps to the report", () => {
    render(
      <MockExtensionStateProvider>
        <CompletionSummaryCard
          markdown={
            "# 🎯 Feature X — COMPLETE\n\n## 🚀 Ship Status\n**Production-ready:** Yes"
          }
          title={"Feature X"}
        />
      </MockExtensionStateProvider>,
    );

    expect(screen.queryByText(/Next Steps/)).not.toBeInTheDocument();
  });

  it("uses the fallback report when the summary payload is only a thin heading", () => {
    render(
      <MockExtensionStateProvider>
        <CompletionSummaryCard
          markdown={"# Task"}
          fallbackMarkdown={
            "# 🎯 Feature X — COMPLETE\n\n## 📊 Executive Summary\n- Status: ✅ SHIPPED"
          }
          title={"Feature X"}
        />
      </MockExtensionStateProvider>,
    );

    expect(screen.getByText(/Completion Report — Feature X/)).toBeInTheDocument();
    expect(screen.getByText(/Executive Summary/)).toBeInTheDocument();
    expect(screen.getByText(/SHIPPED/)).toBeInTheDocument();
  });
});
