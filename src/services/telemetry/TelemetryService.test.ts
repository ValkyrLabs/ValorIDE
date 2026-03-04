const posthogCapture = jest.fn();
const posthogOptIn = jest.fn();
const posthogOptOut = jest.fn();
const posthogShutdown = jest.fn();

jest.mock("posthog-node", () => ({
  PostHog: jest.fn(() => ({
    capture: posthogCapture,
    optIn: posthogOptIn,
    optOut: posthogOptOut,
    shutdown: posthogShutdown,
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

    expect(posthogOptIn).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });
});
