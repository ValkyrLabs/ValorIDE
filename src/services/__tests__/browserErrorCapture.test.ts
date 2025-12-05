/**
 * BrowserErrorCapture Test Suite
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as vscode from "vscode";
import { BrowserErrorCapture } from "../browser/errorCapture";

describe("BrowserErrorCapture", () => {
  let capture: BrowserErrorCapture;
  let mockLogger: vscode.OutputChannel;

  beforeEach(() => {
    mockLogger = {
      append: vi.fn(),
      appendLine: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
      name: "test",
      replace: vi.fn(),
    } as any;
    capture = new BrowserErrorCapture(mockLogger);
  });

  it("should capture error", () => {
    capture.captureError({
      severity: "error",
      message: "Test error",
      timestamp: Date.now(),
    });
    expect(capture.getErrors()).toHaveLength(1);
  });

  it("should analyze CORS errors", () => {
    const analysis = capture.analyzeError({
      severity: "error",
      message: "CORS policy error",
      timestamp: Date.now(),
    });
    expect(analysis.category).toBe("cors");
  });

  it("should analyze missing dependency", () => {
    const analysis = capture.analyzeError({
      severity: "error",
      message: "Cannot find module lodash",
      timestamp: Date.now(),
    });
    expect(analysis.category).toBe("missing-dependency");
  });

  it("should generate report", () => {
    capture.captureError({
      severity: "error",
      message: "Test",
      timestamp: Date.now(),
    });
    const report = capture.generateReport();
    expect(report).toContain("Browser Error Capture Report");
  });

  it("should export JSON", () => {
    capture.captureError({
      severity: "error",
      message: "Test",
      timestamp: Date.now(),
    });
    const json = capture.exportAsJSON();
    const parsed = JSON.parse(json);
    expect(parsed.totalErrors).toBe(1);
  });

  it("should clear errors", () => {
    capture.captureError({
      severity: "error",
      message: "Test",
      timestamp: Date.now(),
    });
    capture.clearErrors();
    expect(capture.getErrors()).toHaveLength(0);
  });
});
