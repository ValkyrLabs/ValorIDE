import React from "react";
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

  it("renders the guided creator funnel entry instead of a static external link", () => {
    render(<McpSubmitCard />);

    expect(
      screen.getByRole("heading", { name: "Publish MCP server" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Manifest and tool schema ready"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pricing, support, and docs captured"),
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

  it("dispatches local server discovery with creator funnel telemetry", () => {
    render(<McpSubmitCard />);

    fireEvent.click(
      screen.getByRole("button", { name: /Detect local servers/ }),
    );

    expect(vscode.postMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "displayVSCodeInfo",
        telemetryEvent: "mcp_submit_started",
      }),
    );
    expect(vscode.postMessage).toHaveBeenNthCalledWith(2, {
      type: "fetchLatestMcpServersFromHub",
    });
  });

  it("routes draft creation to the marketplace submit path with ValorIDE source", () => {
    dispatchMcpSubmitAction(mcpSubmitActions[2]);

    expect(vscode.postMessage).toHaveBeenLastCalledWith({
      type: "openInBrowser",
      url: "https://valkyrlabs.com/mcp/marketplace/submit?source=valoride",
    });
  });
});
