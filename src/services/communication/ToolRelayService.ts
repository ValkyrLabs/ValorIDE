import { CommunicationService } from "./CommunicationService";
import { Controller } from "../../core/controller";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { cwd } from "../../core/task";
import { searchWorkspaceFiles } from "../../services/search/file-search";

export interface ToolCommand {
  type: "tool_command";
  toolName: string;
  parameters: Record<string, any>;
  commandId: string;
  timestamp: number;
  senderId: string;
}

export interface ToolResult {
  type: "tool_result";
  commandId: string;
  success: boolean;
  result?: any;
  error?: string;
  timestamp: number;
  senderId: string;
}

/**
 * ToolRelayService enables remote control by relaying tool commands over websocket.
 * When ValorIDE executes a tool locally, it can also send that command to remote instances.
 * When it receives a tool command from a remote instance, it executes it locally.
 */
export class ToolRelayService {
  private pendingCommands = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }>();
  
  private commandTimeout = 30000; // 30 seconds
  
  constructor(
    private communicationService: CommunicationService,
    private controller: Controller
  ) {
    this.setupMessageHandlers();
    this.startTimeoutCleanup();
  }

  private setupMessageHandlers() {
    this.communicationService.on("message", (message: any) => {
      try {
        const payload = JSON.parse(message.payload || "{}");
        
        if (payload.type === "tool_command") {
          this.handleIncomingToolCommand(payload as ToolCommand);
        } else if (payload.type === "tool_result") {
          this.handleIncomingToolResult(payload as ToolResult);
        }
      } catch (error) {
        console.error("ToolRelayService: Error parsing message payload", error);
      }
    });
  }

  /**
   * Send a tool command to remote ValorIDE instances
   */
  async sendToolCommand(toolName: string, parameters: Record<string, any>): Promise<any> {
    if (!this.communicationService.ready) {
      throw new Error("Communication service not ready");
    }

    const commandId = this.generateCommandId();
    const command: ToolCommand = {
      type: "tool_command",
      toolName,
      parameters,
      commandId,
      timestamp: Date.now(),
      senderId: this.getSenderId()
    };

    // Send command over websocket
    this.communicationService.sendMessage("valoride:tool_command", command);

    // Return a promise that resolves when we get the result back
    return new Promise<any>((resolve, reject) => {
      this.pendingCommands.set(commandId, {
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Set up timeout
      setTimeout(() => {
        const pending = this.pendingCommands.get(commandId);
        if (pending) {
          this.pendingCommands.delete(commandId);
          pending.reject(new Error(`Tool command ${toolName} timed out`));
        }
      }, this.commandTimeout);
    });
  }

  /**
   * Handle incoming tool command from remote ValorIDE instance
   */
  private async handleIncomingToolCommand(command: ToolCommand) {
    console.log(`ToolRelayService: Executing remote tool command: ${command.toolName}`);
    
    try {
      let result: any;
      
      // Execute the tool command using the controller's existing methods
      switch (command.toolName) {
        case "read_file":
          result = await this.executeReadFile(command.parameters as { path: string });
          break;
        case "write_to_file":
          result = await this.executeWriteToFile(command.parameters as { path: string; content: string });
          break;
        case "replace_in_file":
          result = await this.executeReplaceInFile(command.parameters as { path: string; diff: string });
          break;
        case "execute_command":
          result = await this.executeCommand(command.parameters as { command: string; requires_approval?: boolean });
          break;
        case "list_files":
          result = await this.executeListFiles(command.parameters as { path: string; recursive?: boolean });
          break;
        case "search_files":
          result = await this.executeSearchFiles(command.parameters as { path: string; regex: string; file_pattern?: string });
          break;
        case "list_code_definition_names":
          result = await this.executeListCodeDefinitionNames(command.parameters as { path: string });
          break;
        case "browser_action":
          result = await this.executeBrowserAction(command.parameters);
          break;
        default:
          throw new Error(`Unknown tool command: ${command.toolName}`);
      }

      // Send successful result back
      this.sendToolResult(command.commandId, true, result);
      
    } catch (error: any) {
      console.error(`ToolRelayService: Error executing ${command.toolName}:`, error);
      // Send error result back
      this.sendToolResult(command.commandId, false, undefined, error.message);
    }
  }

  /**
   * Handle incoming tool result from remote ValorIDE instance
   */
  private handleIncomingToolResult(result: ToolResult) {
    const pending = this.pendingCommands.get(result.commandId);
    if (pending) {
      this.pendingCommands.delete(result.commandId);
      
      if (result.success) {
        pending.resolve(result.result);
      } else {
        pending.reject(new Error(result.error || "Unknown error"));
      }
    }
  }

  /**
   * Send a tool result back to the sender
   */
  private sendToolResult(commandId: string, success: boolean, result?: any, error?: string) {
    const toolResult: ToolResult = {
      type: "tool_result",
      commandId,
      success,
      result,
      error,
      timestamp: Date.now(),
      senderId: this.getSenderId()
    };

    this.communicationService.sendMessage("valoride:tool_result", toolResult);
  }

  // Tool execution methods that delegate to existing controller functionality

  private async executeReadFile(params: { path: string }): Promise<string> {
    const filePath = path.resolve(cwd, params.path);
    
    // Check if path is a directory
    try {
      const stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        throw new Error(
          `The path '${params.path}' is a directory. Use list_files tool to view directory contents instead of read_file.`
        );
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${params.path}`);
      }
      throw error;
    }
    
    return await fs.readFile(filePath, "utf8");
  }

  private async executeWriteToFile(params: { path: string; content: string }): Promise<void> {
    const filePath = path.resolve(cwd, params.path);
    
    // Create directories if needed
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.content, "utf8");
  }

  private async executeReplaceInFile(params: { path: string; diff: string }): Promise<void> {
    // This would integrate with the existing replace_in_file implementation
    // For now, we'll implement a simplified version
    const filePath = path.resolve(cwd, params.path);
    const content = await fs.readFile(filePath, "utf8");
    
    // Parse and apply the diff (this is a simplified implementation)
    // In reality, you'd want to use the existing diff parsing logic
    const modifiedContent = this.applyDiff(content, params.diff);
    await fs.writeFile(filePath, modifiedContent, "utf8");
  }

  private async executeCommand(params: { command: string; requires_approval?: boolean }): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(params.command, { cwd }, (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\nstderr: ${stderr}`));
        } else {
          resolve(stdout || stderr || "Command executed successfully");
        }
      });
    });
  }

  private async executeListFiles(params: { path: string; recursive?: boolean }): Promise<string[]> {
    const dirPath = path.resolve(cwd, params.path);
    
    if (params.recursive) {
      return await this.listFilesRecursive(dirPath);
    } else {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      return entries.map((entry: any) => entry.name);
    }
  }

  private async executeSearchFiles(params: { path: string; regex: string; file_pattern?: string }): Promise<any> {
    // This would integrate with existing search functionality
    return await searchWorkspaceFiles(params.regex, params.path, 100);
  }

  private async executeListCodeDefinitionNames(params: { path: string }): Promise<any> {
    // This would integrate with existing code definition listing functionality
    // For now, return a placeholder
    return { message: "Code definitions listing not yet implemented in remote execution" };
  }

  private async executeBrowserAction(params: any): Promise<any> {
    // This would integrate with existing browser automation
    // For now, return a placeholder
    return { message: "Browser actions not yet implemented in remote execution" };
  }

  // Helper methods

  private getSenderId(): string {
    // Access the senderId through type assertion since it's private
    try {
      return (this.communicationService as any).senderId || "unknown";
    } catch {
      return "unknown";
    }
  }

  private applyDiff(content: string, diff: string): string {
    // This is a simplified diff application - you'd want to use the existing
    // replace_in_file logic from the main codebase
    const lines = content.split('\n');
    const blocks = this.parseDiffBlocks(diff);
    
    for (const block of blocks) {
      const searchLines = block.search.split('\n');
      const replaceLines = block.replace.split('\n');
      
      // Find and replace (simplified - real implementation would be more robust)
      const searchStart = lines.findIndex(line => line.includes(searchLines[0]));
      if (searchStart !== -1) {
        lines.splice(searchStart, searchLines.length, ...replaceLines);
      }
    }
    
    return lines.join('\n');
  }

  private parseDiffBlocks(diff: string): Array<{ search: string; replace: string }> {
    // Parse SEARCH/REPLACE blocks - simplified implementation
    const blocks = [];
    const regex = /<<<<<<< SEARCH\n(.*?)\n=======\n(.*?)\n>>>>>>> REPLACE/gs;
    let match;
    
    while ((match = regex.exec(diff)) !== null) {
      blocks.push({
        search: match[1],
        replace: match[2]
      });
    }
    
    return blocks;
  }

  private async listFilesRecursive(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await this.listFilesRecursive(fullPath);
        files.push(...subFiles.map(f => path.join(entry.name, f)));
      } else {
        files.push(entry.name);
      }
    }
    
    return files;
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private startTimeoutCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [commandId, pending] of this.pendingCommands.entries()) {
        if (now - pending.timestamp > this.commandTimeout) {
          this.pendingCommands.delete(commandId);
          pending.reject(new Error("Command timed out"));
        }
      }
    }, 10000); // Clean up every 10 seconds
  }

  dispose() {
    this.pendingCommands.clear();
  }
}
