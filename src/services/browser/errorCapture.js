/**
 * BrowserErrorCapture — Console error capture + auto-fix suggestions
 *
 * Captures console errors from headless browser automation and provides
 * intelligent remediation suggestions based on error patterns.
 *
 * @see .valoride/memorybank/VALOR_PRD_2025.md § FR-3
 */
export class BrowserErrorCapture {
  logger;
  capturedErrors = [];
  errorPatterns = new Map();
  constructor(logger) {
    this.logger = logger;
    this.initializeErrorPatterns();
  }
  /**
   * Initialize error pattern recognition
   */
  initializeErrorPatterns() {
    // CORS errors
    this.errorPatterns.set(/CORS|Cross-Origin|cross-origin/i, {
      errorType: "CORS_ERROR",
      category: "cors",
      suggestions: [
        "Update SecurityConfig.java with proper @CrossOrigin annotations",
        "Add Access-Control-Allow-Origin header to API responses",
        "Edit CORS policy in backend API gateway",
        "Run PSR tool to fix CORS configuration",
      ],
      severity: "high",
    });
    // Missing dependency
    this.errorPatterns.set(
      /Cannot find module|MODULE_NOT_FOUND|not installed/i,
      {
        errorType: "MISSING_DEPENDENCY",
        category: "missing-dependency",
        suggestions: [
          "Run: npm install [missing-package]",
          "Run: yarn add [missing-package]",
          "Check package.json for correct dependencies",
          "Clear node_modules and reinstall: rm -rf node_modules && npm install",
        ],
        severity: "high",
      },
    );
    // API connection errors
    this.errorPatterns.set(
      /Failed to fetch|Network error|Connection refused|ECONNREFUSED/i,
      {
        errorType: "API_CONNECTION_ERROR",
        category: "api-error",
        suggestions: [
          "Verify backend API is running",
          "Check API endpoint URL in configuration",
          "Verify network connectivity",
          "Check firewall rules and port access",
        ],
        severity: "high",
      },
    );
    // Null reference errors
    this.errorPatterns.set(
      /Cannot read propert|Cannot read properties|undefined is not|null is not/i,
      {
        errorType: "NULL_REFERENCE",
        category: "runtime",
        suggestions: [
          "Add null-check guard clauses in component",
          "Use optional chaining (?.) operator",
          "Add default values for props and state",
          "Use PSR tool to add null checks",
        ],
        severity: "high",
      },
    );
    // Type errors
    this.errorPatterns.set(
      /is not a function|is not a type|Type .* is not assignable/i,
      {
        errorType: "TYPE_ERROR",
        category: "runtime",
        suggestions: [
          "Check TypeScript types match expected interface",
          "Verify function/method signatures",
          "Use type guards or assertions where needed",
          "Run: tsc --noEmit to check for type issues",
        ],
        severity: "medium",
      },
    );
    // Network timeouts
    this.errorPatterns.set(/timeout|timed out|request timeout/i, {
      errorType: "TIMEOUT",
      category: "network",
      suggestions: [
        "Increase timeout threshold in configuration",
        "Optimize backend query performance",
        "Check database connection speed",
        "Verify network latency",
      ],
      severity: "medium",
    });
  }
  /**
   * Capture console error
   */
  captureError(error) {
    this.capturedErrors.push(error);
    this.logger.appendLine(
      `[BrowserErrorCapture] ${error.severity.toUpperCase()}: ${error.message}`,
    );
    if (error.stack) {
      this.logger.appendLine(`Stack: ${error.stack}`);
    }
  }
  /**
   * Analyze error and suggest fixes
   */
  analyzeError(error) {
    for (const [pattern, analysis] of this.errorPatterns) {
      if (pattern.test(error.message)) {
        this.logger.appendLine(
          `[BrowserErrorCapture] Matched error pattern: ${analysis.errorType}`,
        );
        return analysis;
      }
    }
    // Default analysis if no pattern matches
    return {
      errorType: "UNKNOWN_ERROR",
      category: "unknown",
      suggestions: [
        "Check browser console for error details",
        "Enable debug logging in application",
        "Review recent code changes",
        "Check backend logs for related errors",
      ],
      severity: "medium",
    };
  }
  /**
   * Generate error report
   */
  generateReport() {
    let report = "# Browser Error Capture Report\n\n";
    report += `Captured ${this.capturedErrors.length} errors\n\n`;
    const grouped = this.groupErrorsBySeverity();
    for (const [severity, errors] of Object.entries(grouped)) {
      report += `## ${severity.toUpperCase()} (${errors.length})\n\n`;
      for (const error of errors) {
        const analysis = this.analyzeError(error);
        report += `### ${analysis.errorType}\n`;
        report += `Message: ${error.message}\n`;
        report += `Severity: ${analysis.severity}\n`;
        report += `Category: ${analysis.category}\n`;
        report += `Suggestions:\n`;
        for (const suggestion of analysis.suggestions) {
          report += `- ${suggestion}\n`;
        }
        report += "\n";
      }
    }
    return report;
  }
  /**
   * Group errors by severity
   */
  groupErrorsBySeverity() {
    const grouped = {
      fatal: [],
      error: [],
      warning: [],
      info: [],
    };
    for (const error of this.capturedErrors) {
      grouped[error.severity]?.push(error);
    }
    return grouped;
  }
  /**
   * Export errors as JSON
   */
  exportAsJSON() {
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalErrors: this.capturedErrors.length,
        errors: this.capturedErrors,
        report: this.generateReport(),
      },
      null,
      2,
    );
  }
  /**
   * Clear captured errors
   */
  clearErrors() {
    this.capturedErrors = [];
    this.logger.appendLine("[BrowserErrorCapture] Errors cleared");
  }
  /**
   * Get all captured errors
   */
  getErrors() {
    return [...this.capturedErrors];
  }
}
let browserErrorCapture = null;
/**
 * Initialize global BrowserErrorCapture
 */
export function initializeBrowserErrorCapture(workspaceRoot, logger) {
  browserErrorCapture = new BrowserErrorCapture(logger);
  logger.appendLine("[BrowserErrorCapture] Initialized successfully");
  return browserErrorCapture;
}
/**
 * Get global BrowserErrorCapture
 */
export function getBrowserErrorCapture() {
  if (!browserErrorCapture) {
    throw new Error("BrowserErrorCapture not initialized");
  }
  return browserErrorCapture;
}
//# sourceMappingURL=errorCapture.js.map
