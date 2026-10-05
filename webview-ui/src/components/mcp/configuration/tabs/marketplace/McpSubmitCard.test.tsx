import React from "react";
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import McpSubmitCard, {
  dispatchMcpSubmitAction,
  mcpSubmitActions,
} from "./McpSubmitCard";
import { vscode } from "@thorapi/utils/vscode";

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: { postMessage: vi.fn() },
}));

describe("McpSubmitCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers discovery, configuration review and a hosted listing draft", () => {
    render(<McpSubmitCard />);

    expect(
      screen.getByRole("heading", { name: "Publish MCP server" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Prepare the manifest and tool schema"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add pricing, support, and documentation"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Detect local servers/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create listing draft/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("https://valkyrlabs.com/mcp/marketplace"),
    ).not.toBeInTheDocument();
  });

  it("dispatches local discovery without claiming validation or submission", () => {
    render(<McpSubmitCard />);

    fireEvent.click(
      screen.getByRole("button", { name: /Detect local servers/ }),
    );

    expect(vscode.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: "fetchLatestMcpServersFromHub",
    });
  });

  it("opens the local configuration for review", () => {
    render(<McpSubmitCard />);
    fireEvent.click(
      screen.getByRole("button", { name: /Review MCP settings/ }),
    );
    expect(vscode.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: "openMcpSettings",
    });
  });

  it("routes draft creation to the marketplace submit path with ValorIDE source", () => {
    dispatchMcpSubmitAction(mcpSubmitActions[2]);

    expect(vscode.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: "openInBrowser",
      url: "https://valkyrlabs.com/mcp/marketplace/submit?source=valoride",
    });
  });
});
