import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WelcomeView from "./WelcomeView";

const { postMessage } = vi.hoisted(() => ({ postMessage: vi.fn() }));
vi.mock("@thorapi/utils/vscode", () => ({ vscode: { postMessage } }));
vi.mock("@thorapi/context/ExtensionStateContext", () => ({ useExtensionState: () => ({ apiConfiguration: { apiProvider: "ollama", ollamaModelId: "local-fixture" } }) }));
vi.mock("@thorapi/components/settings/ApiOptions", () => ({ default: () => <div>Local model settings</div> }));
vi.mock("@vscode/webview-ui-toolkit/react", () => ({
  VSCodeButton: ({ children, appearance: _appearance, ...props }: any) => <button {...props}>{children}</button>,
  VSCodeLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

beforeEach(() => postMessage.mockReset());
describe("GrayMatter first-run setup", () => {
  it("offers hosted setup first and an explicit local path without signup", () => {
    render(<WelcomeView />);
    const hosted = screen.getByRole("button", { name: "Set up hosted GrayMatter" });
    fireEvent.click(hosted);
    expect(postMessage).toHaveBeenCalledWith({ type: "showAccountViewClicked", accountTab: "signup" });
    expect(screen.getByText(/No valkyrlabs.com signup is needed/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect Local GrayMatter Lite" }));
    expect(postMessage).toHaveBeenLastCalledWith({ type: "setupLocalGrayMatter" });
    expect(screen.getByRole("button", { name: /Setting up local memory/ })).toBeDisabled();
  });

  it("shows actionable failures, allows retry, and continues with a local model after verification", () => {
    render(<WelcomeView />);
    fireEvent.click(screen.getByRole("button", { name: "Connect Local GrayMatter Lite" }));
    fireEvent(window, new MessageEvent("message", { data: { type: "grayMatterSetupResult", success: false, text: "Run ./vaix doctor, then retry." } }));
    expect(screen.getByRole("alert")).toHaveTextContent("./vaix doctor");
    fireEvent.click(screen.getByRole("button", { name: "Connect Local GrayMatter Lite" }));
    fireEvent(window, new MessageEvent("message", { data: { type: "grayMatterSetupResult", success: true, text: "Local memory connected." } }));
    expect(screen.getByRole("status")).toHaveTextContent("Local memory connected.");
    fireEvent.click(screen.getByRole("button", { name: /Start Coding/ }));
    expect(postMessage).toHaveBeenLastCalledWith({ type: "apiConfiguration", apiConfiguration: { apiProvider: "ollama", ollamaModelId: "local-fixture" } });
  });
});
