import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * MemoryBankLoader — Auto-loads .valoride/memorybank/ on VSCode activation
 * Provides context persistence across tasks and sessions
 */

export interface MemoryBankContext {
  projectContext: Record<string, any>;
  activeContext: Record<string, any>;
  techContext: Record<string, any>;
  systemPatterns: Record<string, any>;
  progress: Record<string, any>;
}

export class MemoryBankLoader {
  private memoryBankDir: string;
  private workspaceRoot: string;
  private logger: vscode.OutputChannel;
  private memoryBank: MemoryBankContext | null = null;

  constructor(workspaceRoot: string, logger: vscode.OutputChannel) {
    this.workspaceRoot = workspaceRoot;
    this.memoryBankDir = path.join(workspaceRoot, ".valoride", "memorybank");
    this.logger = logger;
  }

  /**
   * Initialize memory bank loader — load all markdown files
   */
  async initialize(): Promise<void> {
    this.logger.appendLine("[MemoryBankLoader] Initializing...");

    try {
      if (!fs.existsSync(this.memoryBankDir)) {
        this.logger.appendLine(
          `[MemoryBankLoader] Memory bank directory not found at ${this.memoryBankDir}`,
        );
        return;
      }

      const context: MemoryBankContext = {
        projectContext: await this.loadMarkdown("projectContext.md"),
        activeContext: await this.loadMarkdown("activeContext.md"),
        techContext: await this.loadMarkdown("techContext.md"),
        systemPatterns: await this.loadMarkdown("systemPatterns.md"),
        progress: await this.loadMarkdown("progress.md"),
      };

      this.memoryBank = context;
      this.logger.appendLine("[MemoryBankLoader] ✅ Initialization complete");
      this.logState();
    } catch (error) {
      this.logger.appendLine(
        `[MemoryBankLoader] ❌ Initialization failed: ${error}`,
      );
    }
  }

  /**
   * Load markdown file and parse header metadata
   */
  private async loadMarkdown(filename: string): Promise<Record<string, any>> {
    const filePath = path.join(this.memoryBankDir, filename);

    if (!fs.existsSync(filePath)) {
      this.logger.appendLine(`[MemoryBankLoader] File not found: ${filePath}`);
      return {};
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // Parse header metadata (lines starting with # or **)
    const metadata: Record<string, any> = {
      filename,
      fileSize: fs.statSync(filePath).size,
      lastModified: fs.statSync(filePath).mtime,
      content,
    };

    // Extract first few lines as summary
    metadata.summary = lines
      .slice(0, 10)
      .filter((line) => line.trim() && !line.startsWith("#"))
      .join(" ")
      .substring(0, 200);

    return metadata;
  }

  /**
   * Get memory bank context
   */
  getMemoryBank(): MemoryBankContext | null {
    return this.memoryBank;
  }

  /**
   * Get specific context section
   */
  getContextSection(key: keyof MemoryBankContext): Record<string, any> | null {
    if (!this.memoryBank) {
      return null;
    }
    return this.memoryBank[key];
  }

  /**
   * Check if memory bank exists
   */
  memoryBankExists(): boolean {
    return fs.existsSync(this.memoryBankDir);
  }

  /**
   * Log current state
   */
  logState(): void {
    if (!this.memoryBank) {
      this.logger.appendLine("[MemoryBankLoader] Memory bank not loaded");
      return;
    }

    this.logger.appendLine("[MemoryBankLoader] Current state:");
    this.logger.appendLine(
      `  - projectContext: ${this.memoryBank.projectContext.content ? "✅" : "❌"}`,
    );
    this.logger.appendLine(
      `  - activeContext: ${this.memoryBank.activeContext.content ? "✅" : "❌"}`,
    );
    this.logger.appendLine(
      `  - techContext: ${this.memoryBank.techContext.content ? "✅" : "❌"}`,
    );
    this.logger.appendLine(
      `  - systemPatterns: ${this.memoryBank.systemPatterns.content ? "✅" : "❌"}`,
    );
    this.logger.appendLine(
      `  - progress: ${this.memoryBank.progress.content ? "✅" : "❌"}`,
    );
  }

  /**
   * Update active context (append task completion status)
   */
  async updateActiveContext(taskLog: string): Promise<void> {
    const filePath = path.join(this.memoryBankDir, "activeContext.md");

    if (!fs.existsSync(filePath)) {
      this.logger.appendLine(`[MemoryBankLoader] activeContext.md not found`);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const updated = content + `\n\n## Task Update\n${taskLog}\n`;
      fs.writeFileSync(filePath, updated, "utf-8");
      this.logger.appendLine(`[MemoryBankLoader] ✅ Updated activeContext.md`);
    } catch (error) {
      this.logger.appendLine(
        `[MemoryBankLoader] ❌ Failed to update activeContext.md: ${error}`,
      );
    }
  }

  /**
   * Update progress file (append milestone status)
   */
  async updateProgress(milestoneLog: string): Promise<void> {
    const filePath = path.join(this.memoryBankDir, "progress.md");

    if (!fs.existsSync(filePath)) {
      this.logger.appendLine(`[MemoryBankLoader] progress.md not found`);
      return;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const updated = content + `\n\n## Milestone Update\n${milestoneLog}\n`;
      fs.writeFileSync(filePath, updated, "utf-8");
      this.logger.appendLine(`[MemoryBankLoader] ✅ Updated progress.md`);
    } catch (error) {
      this.logger.appendLine(
        `[MemoryBankLoader] ❌ Failed to update progress.md: ${error}`,
      );
    }
  }

  /**
   * Get memory bank directory path
   */
  getMemoryBankDir(): string {
    return this.memoryBankDir;
  }
}

export let memoryBankLoader: MemoryBankLoader | null = null;

/**
 * Initialize global memory bank loader instance
 */
export async function initializeMemoryBankLoader(
  workspaceRoot: string,
  logger: vscode.OutputChannel,
): Promise<void> {
  memoryBankLoader = new MemoryBankLoader(workspaceRoot, logger);
  await memoryBankLoader.initialize();
}

/**
 * Get global memory bank loader instance
 */
export function getMemoryBankLoader(): MemoryBankLoader {
  if (!memoryBankLoader) {
    throw new Error("MemoryBankLoader not initialized");
  }
  return memoryBankLoader;
}
