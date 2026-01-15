export class OutputFilterService {
  static DEFAULT_MAX_OUTPUT_LENGTH = 5000;
  static TRUNCATION_MESSAGE =
    "\n[Output truncated - showing relevant portions and end of output]";
  /**
   * Filters Maven output to extract only relevant information.
   * - Always shows [ERROR], [WARNING], and lines with "BUILD FAILURE"/"BUILD SUCCESS".
   * - By default, collapses [INFO] lines except for the last 5 and any with "BUILD".
   * - If verbosityLevel is 'verbose', shows all lines.
   * - Skips generated file compilation unless errors are present.
   * - Adds a summary if lines were collapsed.
   */
  static filterMavenOutput(output, config = {}) {
    if (!output) return output;
    // Filter out generated file compilation unless errors present
    output = this.filterGeneratedFilesFromSummary(output);
    // Handle legacy config or check verbosity level
    const isVerbose =
      ("enableVerboseFiltering" in config && config.enableVerboseFiltering) ||
      ("verbosityLevel" in config && config.verbosityLevel === "verbose");
    // If verbose, show all output (except progress/download lines)
    if (isVerbose) {
      let filtered = output;
      filtered = filtered.replace(/^(Download(ing|ed)|Progress).*$/gm, "");
      filtered = filtered.replace(/^\d+\/\d+ [kKmM]?B.*$/gm, "");
      filtered = filtered.replace(/^\s*[\r\n]+/gm, "\n");
      return this.truncateOutput(filtered, config.maxOutputLength);
    }
    const lines = output.split("\n");
    const importantLines = [];
    const infoLines = [];
    for (const line of lines) {
      // Always show errors and warnings
      if (
        line.includes("[ERROR]") ||
        line.includes("[WARNING]") ||
        /BUILD (FAILURE|SUCCESS)/.test(line)
      ) {
        importantLines.push(line);
        // not storing build status since it was unused
        continue;
      }
      // Remove download/progress lines
      if (
        /^(Download(ing|ed)|Progress)/.test(line) ||
        /^\d+\/\d+ [kKmM]?B/.test(line)
      ) {
        continue;
      }
      // Collect [INFO] lines for possible summarization
      if (line.includes("[INFO]")) {
        infoLines.push(line);
        continue;
      }
      // Show any other non-empty lines
      if (line.trim() !== "") {
        importantLines.push(line);
      }
    }
    // Show last 5 [INFO] lines (for context), and any with "BUILD"
    const infoToShow = infoLines.filter((l) => /BUILD/.test(l));
    const lastInfo = infoLines.slice(-5);
    for (const l of lastInfo) {
      if (!infoToShow.includes(l)) infoToShow.push(l);
    }
    // Remove duplicates, preserve order
    const seen = new Set();
    const infoFinal = infoToShow.filter((l) => {
      if (seen.has(l)) return false;
      seen.add(l);
      return true;
    });
    let filtered = "";
    if (importantLines.length === 0 && infoFinal.length === 0) {
      // fallback: show last 10 lines
      filtered = lines.slice(-10).join("\n");
    } else {
      filtered = [...importantLines, ...infoFinal].join("\n");
      if (infoLines.length > infoFinal.length) {
        filtered += `\n[${infoLines.length - infoFinal.length} Maven [INFO] lines hidden for brevity]`;
      }
    }
    // Extract only "Caused by" exceptions from stack traces if enabled
    if (config.enableStackTraceFiltering !== false) {
      filtered = this.extractCausedByExceptions(filtered);
    }
    // Remove empty lines created by filtering
    filtered = filtered.replace(/^\s*[\r\n]+/gm, "\n");
    // Apply length limit
    return this.truncateOutput(filtered, config.maxOutputLength);
  }
  /**
   * Filters npm/yarn output to reduce verbosity
   */
  static filterNpmOutput(output, config = {}) {
    if (!output) return output;
    let filtered = output;
    // Remove progress bars and spinners
    filtered = filtered.replace(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏].*$/gm, "");
    // Remove verbose npm timing info
    filtered = filtered.replace(/^npm timing.*$/gm, "");
    // Remove audit details unless there are vulnerabilities
    if (!filtered.includes("found") || filtered.includes("found 0")) {
      filtered = filtered.replace(/^npm audit.*$/gm, "");
    }
    // Remove empty lines
    filtered = filtered.replace(/^\s*[\r\n]+/gm, "\n");
    return this.truncateOutput(filtered, config.maxOutputLength);
  }
  /**
   * Filters Python/pip output
   */
  static filterPythonOutput(output, config = {}) {
    if (!output) return output;
    let filtered = output;
    // Remove pip download progress
    filtered = filtered.replace(/^\s*\|[█▌▏\s]+\|.*$/gm, "");
    // Remove "Collecting" lines unless they fail
    const lines = filtered.split("\n");
    const filteredLines = lines.filter((line, index) => {
      if (line.startsWith("Collecting") || line.startsWith("Downloading")) {
        // Check if next few lines contain an error
        const nextFewLines = lines.slice(index + 1, index + 5).join(" ");
        return (
          nextFewLines.toLowerCase().includes("error") ||
          nextFewLines.toLowerCase().includes("failed")
        );
      }
      return true;
    });
    filtered = filteredLines.join("\n");
    return this.truncateOutput(filtered, config.maxOutputLength);
  }
  /**
   * Generic output filter for any command
   */
  static filterCommandOutput(output, command, config = {}) {
    if (!output) return output;
    // Detect the type of command and apply specific filters
    if (command.includes("mvn") || command.includes("maven")) {
      return this.filterMavenOutput(output, config);
    } else if (
      command.includes("npm") ||
      command.includes("yarn") ||
      command.includes("pnpm")
    ) {
      return this.filterNpmOutput(output, config);
    } else if (command.includes("pip") || command.includes("python")) {
      return this.filterPythonOutput(output, config);
    }
    // Generic filtering for unknown commands
    return this.filterGenericOutput(output, config);
  }
  /**
   * Generic output filtering
   */
  static filterGenericOutput(output, config = {}) {
    let filtered = output;
    // Remove ANSI escape codes
    // eslint-disable-next-line no-control-regex
    filtered = filtered.replace(/\x1b\[[0-9;]*m/g, "");
    // Remove excessive whitespace
    filtered = filtered.replace(/^\s*[\r\n]+/gm, "\n");
    // If output is very repetitive, summarize it
    filtered = this.summarizeRepetitiveOutput(filtered);
    return this.truncateOutput(filtered, config.maxOutputLength);
  }
  /**
   * Extracts only "Caused by" exceptions from Java stack traces
   */
  static extractCausedByExceptions(output) {
    const lines = output.split("\n");
    const relevantLines = [];
    let inStackTrace = false;
    let captureNext = 0;
    for (const line of lines) {
      // Detect start of exception
      if (line.includes("Exception") || line.includes("Error")) {
        inStackTrace = true;
        relevantLines.push(line);
        captureNext = 2; // Capture next 2 lines for context
        continue;
      }
      // Capture "Caused by" lines
      if (line.trim().startsWith("Caused by:")) {
        relevantLines.push(line);
        captureNext = 3; // Capture more context for root cause
        continue;
      }
      // Capture context lines
      if (captureNext > 0) {
        relevantLines.push(line);
        captureNext--;
        continue;
      }
      // Skip stack trace details
      if (inStackTrace && line.trim().startsWith("at ")) {
        continue;
      }
      // End of stack trace
      if (inStackTrace && line.trim() === "") {
        inStackTrace = false;
        continue;
      }
      // Normal output
      if (!inStackTrace) {
        relevantLines.push(line);
      }
    }
    return relevantLines.join("\n");
  }
  /**
   * Summarizes repetitive output patterns
   */
  static summarizeRepetitiveOutput(output) {
    const lines = output.split("\n");
    const lineCount = new Map();
    const result = [];
    let lastLine = "";
    let repeatCount = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      // Skip empty lines in counting
      if (!trimmedLine) {
        if (repeatCount > 1) {
          result.push(`[Previous line repeated ${repeatCount} times]`);
          repeatCount = 0;
        }
        result.push(line);
        lastLine = "";
        continue;
      }
      if (trimmedLine === lastLine) {
        repeatCount++;
      } else {
        if (repeatCount > 1) {
          result.push(`[Previous line repeated ${repeatCount} times]`);
        }
        result.push(line);
        lastLine = trimmedLine;
        repeatCount = 0;
      }
    }
    if (repeatCount > 1) {
      result.push(`[Previous line repeated ${repeatCount} times]`);
    }
    return result.join("\n");
  }
  /**
   * Truncates output if it exceeds the maximum length
   */
  static truncateOutput(output, maxLength) {
    const limit = maxLength || this.DEFAULT_MAX_OUTPUT_LENGTH;
    if (output.length <= limit) {
      return output;
    }
    // Try to truncate at a sensible point (end of line)
    const truncatePoint = output.lastIndexOf("\n", limit);
    const actualTruncatePoint =
      truncatePoint > limit * 0.8 ? truncatePoint : limit;
    return output.substring(actualTruncatePoint) + this.TRUNCATION_MESSAGE;
  }
  /**
   * Filters generated file compilation from output unless there are actual errors
   */
  static filterGeneratedFilesFromSummary(output) {
    const lines = output.split("\n");
    const hasErrors = lines.some(
      (l) =>
        l.includes("[ERROR]") ||
        l.includes("Compilation failure") ||
        /BUILD (FAILURE)/.test(l)
    );
    // If there are errors, show everything
    if (hasErrors) {
      return output;
    }
    // Filter out generated file paths from the summary
    const filteredLines = lines.filter(
      (line) =>
        !/\/generated\//i.test(line) &&
        !/\/thorapi\//i.test(line) &&
        !/Building jar:/.test(line) &&
        !line.includes("valkyrai/generated") &&
        !line.includes("thorapi/generated")
    );
    return filteredLines.join("\n");
  }
  /**
   * Extracts error summary from output
   */
  static extractErrorSummary(output) {
    const errorPatterns = [
      /error:\s*(.+)/i,
      /failed:\s*(.+)/i,
      /exception:\s*(.+)/i,
      /caused by:\s*(.+)/i,
    ];
    for (const pattern of errorPatterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }
}
//# sourceMappingURL=OutputFilterService.js.map
