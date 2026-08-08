import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationProgress from "./ApplicationProgress";

const mockPostMessage = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: { postMessage: (...args: unknown[]) => mockPostMessage(...args) },
}));

vi.mock("@thorapi/context/ExtensionStateContext", () => ({
  useExtensionState: () => ({ valorideMessages: [] }),
}));

describe("ApplicationProgress", () => {
  beforeEach(() => mockPostMessage.mockReset());

  it("opens the prepared project workspace and generated documentation", async () => {
    render(
      <ApplicationProgress applicationId="app-1" applicationName="Sample" />,
    );
    fireEvent(
      window,
      new MessageEvent("message", {
        data: {
          type: "streamToThorapiResult",
          streamToThorapiResult: {
            success: true,
            step: "completed",
            applicationId: "app-1",
            extractedPath: "/workspace/thorapi/v1.Sample",
            projectWorkspacePath:
              "/workspace/thorapi/v1.Sample/.valoride/project.code-workspace",
            readmePath: "/workspace/thorapi/v1.Sample/README.md",
          },
        },
      }),
    );

    const openProject = await screen.findByRole("button", {
      name: "Open Project",
    });
    fireEvent.click(openProject);
    fireEvent.click(screen.getByRole("button", { name: "View Documentation" }));

    await waitFor(() => {
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: "openGeneratedProject",
        text: "/workspace/thorapi/v1.Sample/.valoride/project.code-workspace",
      });
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: "openGeneratedFile",
        text: "/workspace/thorapi/v1.Sample/README.md",
      });
    });
  });
});
