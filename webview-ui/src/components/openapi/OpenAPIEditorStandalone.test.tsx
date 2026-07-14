import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OpenAPIEditorStandalone from "./OpenAPIEditorStandalone";

const mockPostMessage = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: { postMessage: (...args: unknown[]) => mockPostMessage(...args) },
}));

vi.mock("./OpenAPIVisualEditor", () => ({
  default: ({ onChange }: { onChange: (spec: unknown) => void }) => (
    <button
      type="button"
      onClick={() =>
        onChange({
          openapi: "3.0.3",
          info: { title: "Edited", version: "2.0.0" },
          paths: {},
        })
      }
    >
      Edit schema
    </button>
  ),
}));

describe("OpenAPIEditorStandalone", () => {
  beforeEach(() => {
    mockPostMessage.mockReset();
    (window as any).__valorideBlueprint = {
      applicationId: "app-1",
      applicationName: "Sample App",
      deploymentUrl:
        "https://valkyrlabs.com/dashboard?open=deployment&applicationId=app-1",
    };
  });

  it("loads, edits, and saves the application-scoped canonical Blueprint", async () => {
    render(<OpenAPIEditorStandalone />);

    expect(mockPostMessage).toHaveBeenCalledWith({ type: "blueprintLoad" });
    fireEvent(
      window,
      new MessageEvent("message", {
        data: {
          type: "blueprintLoaded",
          document: {
            filename: "sample-app.yaml",
            etag: "etag-1",
            specification: {
              openapi: "3.0.3",
              info: { title: "Sample App", version: "1.0.0" },
              paths: {},
            },
          },
        },
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit schema" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockPostMessage).toHaveBeenCalledWith({
        type: "blueprintSave",
        specification: {
          openapi: "3.0.3",
          info: { title: "Edited", version: "2.0.0" },
          paths: {},
        },
        filename: "sample-app.yaml",
        expectedEtag: "etag-1",
        regenerate: false,
      }),
    );
  });

  it("opens direct deployment management from the Blueprint toolbar", () => {
    render(<OpenAPIEditorStandalone />);
    fireEvent(
      window,
      new MessageEvent("message", {
        data: {
          type: "blueprintLoaded",
          document: {
            filename: "sample-app.yaml",
            etag: "etag-1",
            specification: {
              openapi: "3.0.3",
              info: { title: "Sample App", version: "1.0.0" },
              paths: {},
            },
          },
        },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Deploy" }));
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "blueprintOpenDeployment",
    });
  });
});
