const mockPosthogCapture = jest.fn();
const mockPosthogOptIn = jest.fn();
const mockPosthogOptOut = jest.fn();
const mockPosthogShutdown = jest.fn();

jest.mock("posthog-node", () => ({
  PostHog: jest.fn(() => ({
    capture: mockPosthogCapture,
    optIn: mockPosthogOptIn,
    optOut: mockPosthogOptOut,
    shutdown: mockPosthogShutdown,
  })),
}));

import * as vscode from "vscode";

describe("TelemetryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn().mockReturnValue("all"),
    });
  });

  it("does not send PostHog events even when telemetry is enabled", async () => {
    const { telemetryService } = await import("./TelemetryService");
    telemetryService.updateTelemetryState(true);

    telemetryService.captureTaskCreated("task-1", "openai");

    expect(mockPosthogOptIn).not.toHaveBeenCalled();
    expect(mockPosthogCapture).not.toHaveBeenCalled();
  });
});
