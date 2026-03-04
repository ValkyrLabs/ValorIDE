import * as Sentry from "@sentry/browser";
import * as vscode from "vscode";

import * as pkg from "../../../package.json";

let telemetryLevel = vscode.workspace
  .getConfiguration("telemetry")
  .get<string>("telemetryLevel", "all");
let isTelemetryEnabled = ["all", "error"].includes(telemetryLevel);

vscode.workspace.onDidChangeConfiguration(() => {
  telemetryLevel = vscode.workspace
    .getConfiguration("telemetry")
    .get<string>("telemetryLevel", "all");
  isTelemetryEnabled = ["all", "error"].includes(telemetryLevel);
  ErrorService.toggleEnabled(isTelemetryEnabled);
  if (isTelemetryEnabled) {
    ErrorService.setLevel(telemetryLevel as "error" | "all");
  }
});

export class ErrorService {
  private static serviceEnabled: boolean;
  private static serviceLevel: string;

  static initialize() {
    // Initialize sentry

  }

  static toggleEnabled(state: boolean) {
    if (state === false) {
      ErrorService.serviceEnabled = false;
      return;
    }
    // If we are trying to enable the service, check that we are allowed to.
    if (isTelemetryEnabled) {
      ErrorService.serviceEnabled = true;
    }
  }

  static setLevel(level: "error" | "all") {
    switch (telemetryLevel) {
      case "error": {
        if (level === "error") {
          ErrorService.serviceLevel = level;
        }
        break;
      }
      default: {
        ErrorService.serviceLevel = level;
      }
    }
  }

  static logException(error: Error): void {
    // Don't log if telemetry is off

    // Log the error to Sentry
    Sentry.captureException(error);
  }

  static logMessage(
    message: string,
    level: "error" | "warning" | "log" | "debug" | "info" = "log",
  ): void {
    // Don't log if telemetry is off

    if (ErrorService.serviceLevel === "error" && level === "error") {
      // Log the message if allowed
      Sentry.captureMessage(message, { level });
      return;
    }
    // Log the message if allowed
    Sentry.captureMessage(message, { level });
  }

  static isEnabled(): boolean {
    return ErrorService.serviceEnabled;
  }
}
