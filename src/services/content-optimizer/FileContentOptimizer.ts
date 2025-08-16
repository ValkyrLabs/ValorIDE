import * as fs from "fs/promises";
import * as path from "path";
import { Logger } from "@services/logging/Logger";
import { parseSourceCodeForDefinitionsTopLevel } from "@services/tree-sitter";

export interface FileContentConfig {
  maxFileSize?: number;
  maxContentLength?: number;
  extractOnlyRelevant?: boolean;
  includeLineNumbers?: boolean;
}

export class FileContentOptimizer {
  private static readonly DEFAULT_MAX_FILE_SIZE = 1024 * 1024; // 1MB
  private static readonly DEFAULT_MAX_CONTENT_LENGTH = 10000; // 10k chars
  private static readonly LARGE_FILE_WARNING = "[File is large - showing relevant portions only]";

  /**
   * Optimizes file content before sending to API
   */
  static async optimizeFileContent(
    filePath: string,
    content: string,
    config: FileContentConfig = {}
  ): Promise<string> {
    const fileSize = Buffer.byteLength(content, 'utf8');
    const maxSize = config.maxFileSize || this.DEFAULT_MAX_FILE_SIZE;

    // For very large files, extract only relevant parts
    if (fileSize > maxSize && config.extractOnlyRelevant !== false) {
      return await this.extractRelevantContent(filePath, content, config);
    }

    // For moderately large files, truncate intelligently
    if (content.length > (config.maxContentLength || this.DEFAULT_MAX_CONTENT_LENGTH)) {
      return this.truncateIntelligently(content, config);
    }

    return content;
  }

  /**
   * Extracts only relevant parts of a file (e.g., function signatures, class definitions)
   */
  private static async extractRelevantContent(
    filePath: string,
    content: string,
    config: FileContentConfig
  ): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    
    // For source code files, use tree-sitter to extract structure
    if (this.isSourceCodeFile(ext)) {
      try {
        // Get code structure using tree-sitter
        const definitions = await parseSourceCodeForDefinitionsTopLevel(
          path.dirname(filePath),
          null // valorideIgnoreController not needed here
        );
        
        // Extract specific functions/classes if mentioned in context
        const relevantParts = this.extractRelevantCodeParts(content, definitions);
        
        if (relevantParts.length > 0) {
          return `${this.LARGE_FILE_WARNING}\n\n${relevantParts}`;
        }
      } catch (error) {
        Logger.error("Failed to parse source code", error);
      }
    }

    // For other files, extract based on patterns
    return this.extractByPatterns(content, config);
  }

  /**
   * Checks if file is a source code file
   */
  private static isSourceCodeFile(ext: string): boolean {
    const sourceExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.cs', '.rb', '.go', '.rs', '.php', '.swift', '.kt', '.scala'
    ];
    return sourceExtensions.includes(ext);
  }

  /**
   * Extracts relevant code parts based on definitions
   */
  private static extractRelevantCodeParts(content: string, definitions: string): string {
    const lines = content.split('\n');
    const relevantLines: string[] = [];
    const definitionLines = definitions.split('\n');
    
    // Extract function/class definitions with some context
    for (const def of definitionLines) {
      if (def.includes('function') || def.includes('class') || def.includes('interface')) {
        // Find the line in the original content
        const lineIndex = lines.findIndex(line => line.includes(def));
        if (lineIndex !== -1) {
          // Include some context around the definition
          const start = Math.max(0, lineIndex - 2);
          const end = Math.min(lines.length, lineIndex + 10);
          relevantLines.push(...lines.slice(start, end));
          relevantLines.push('...\n');
        }
      }
    }

    return relevantLines.join('\n');
  }

  /**
   * Extracts content based on patterns (errors, TODOs, etc.)
   */
  private static extractByPatterns(content: string, config: FileContentConfig): string {
    const lines = content.split('\n');
    const relevantLines: string[] = [];
    const patterns = [
      /error|exception|failed/i,
      /todo|fixme|hack|bug/i,
      /warning|deprecated/i,
      /import|require|include/i, // Dependencies
      /class\s+\w+|function\s+\w+|def\s+\w+/i, // Definitions
    ];

    lines.forEach((line, index) => {
      if (patterns.some(pattern => pattern.test(line))) {
        // Include some context
        const start = Math.max(0, index - 1);
        const end = Math.min(lines.length, index + 2);
        const contextLines = lines.slice(start, end);
        
        if (config.includeLineNumbers) {
          contextLines.forEach((l, i) => {
            relevantLines.push(`${start + i + 1}: ${l}`);
          });
        } else {
          relevantLines.push(...contextLines);
        }
        relevantLines.push('---');
      }
    });

    return `${this.LARGE_FILE_WARNING}\n\n${relevantLines.join('\n')}`;
  }

  /**
   * Truncates content intelligently at logical boundaries
   */
  private static truncateIntelligently(content: string, config: FileContentConfig): string {
    const maxLength = config.maxContentLength || this.DEFAULT_MAX_CONTENT_LENGTH;
    
    if (content.length <= maxLength) {
      return content;
    }

    // Try to truncate at a logical boundary
    const truncatePoint = this.findLogicalTruncatePoint(content, maxLength);
    
    return content.substring(0, truncatePoint) + '\n\n[Content truncated...]';
  }

  /**
   * Finds a logical point to truncate (end of function, class, or paragraph)
   */
  private static findLogicalTruncatePoint(content: string, maxLength: number): number {
    // Look for logical boundaries near the max length
    const searchStart = Math.max(0, maxLength - 500);
    const searchEnd = Math.min(content.length, maxLength + 500);
    const searchContent = content.substring(searchStart, searchEnd);

    // Patterns that indicate logical boundaries
    const boundaries = [
      /\n\s*}\s*\n/g,        // End of code block
      /\n\s*\)\s*\n/g,       // End of function call
      /\n\s*\n/g,            // Paragraph break
      /\n---+\n/g,           // Markdown separator
      /\n\s*\/\/ ---+/g,     // Comment separator
    ];

    let bestBoundary = maxLength;
    let bestDistance = Infinity;

    for (const pattern of boundaries) {
      let match;
      while ((match = pattern.exec(searchContent)) !== null) {
        const absolutePos = searchStart + match.index;
        const distance = Math.abs(absolutePos - maxLength);
        
        if (distance < bestDistance && absolutePos <= maxLength) {
          bestDistance = distance;
          bestBoundary = absolutePos + match[0].length;
        }
      }
    }

    return bestBoundary;
  }

  /**
   * Checks if a file should be read in full or optimized
   */
  static async shouldOptimizeFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size > this.DEFAULT_MAX_FILE_SIZE;
    } catch {
      return false;
    }
  }

  /**
   * Gets a summary of file content without reading the entire file
   */
  static async getFileSummary(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath);
      const sizeInKB = Math.round(stats.size / 1024);
      
      let summary = `File: ${path.basename(filePath)}\n`;
      summary += `Size: ${sizeInKB}KB\n`;
      summary += `Type: ${ext || 'unknown'}\n`;
      summary += `Modified: ${stats.mtime.toISOString()}\n`;

      // For very large files, just return the summary
      if (stats.size > this.DEFAULT_MAX_FILE_SIZE * 5) {
        summary += '\n[File too large to read - consider using search_files to find specific content]';
        return summary;
      }

      // For source files, try to get structure
      if (this.isSourceCodeFile(ext)) {
        try {
          const definitions = await parseSourceCodeForDefinitionsTopLevel(
            path.dirname(filePath),
            null
          );
          if (definitions) {
            summary += '\nStructure:\n' + definitions;
          }
        } catch {
          // Ignore errors
        }
      }

      return summary;
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}
