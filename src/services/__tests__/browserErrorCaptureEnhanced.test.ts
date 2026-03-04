/**
 * BrowserErrorCapture Enhanced Test Suite
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as vscode from "vscode";
import { BrowserErrorCapture } from "../browser/errorCapture";

describe("BrowserErrorCapture - Enhanced", () => {
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

  it("should capture errors", () => {
    capture.captureError({
      severity: "error",
      message: "Test error",
      timestamp: Date.now(),
    });
    expect(capture.getErrors()).toHaveLength(1);
  });

  it("should recognize CORS errors", () => {
    const analysis = capture.analyzeError({
      severity: "error",
      message: "CORS policy error",
      timestamp: Date.now(),
    });
    expect(analysis.errorType).toBe("CORS_ERROR");
    expect(analysis.category).toBe("cors");
  });

  it("should recognize missing dependency errors", () => {
    const analysis = capture.analyzeError({
      severity: "error",
      message: "Cannot find module lodash",
      timestamp: Date.now(),
    });
    expect(analysis.errorType).toBe("MISSING_DEPENDENCY");
  });

  it("should provide fix suggestions", () => {
    const analysis = capture.analyzeError({
      severity: "error",
      message: "Cannot read property name of undefined",
      timestamp: Date.now(),
    });
    expect(analysis.suggestions.length).toBeGreaterThan(0);
  });

  it("should generate error report", () => {
    capture.captureError({
      severity: "error",
      message: "Test error",
      timestamp: Date.now(),
    });
    const report = capture.generateReport();
    expect(report).toContain("Browser Error Capture Report");
  });

  it("should export as JSON", () => {
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
