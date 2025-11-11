import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { cwd } from "../../core/task";
import { searchWorkspaceFiles } from "../../services/search/file-search";
/**
 * ToolRelayService enables remote control by relaying tool commands over websocket.
 * When ValorIDE executes a tool locally, it can also send that command to remote instances.
 * When it receives a tool command from a remote instance, it executes it locally.
 */
export class ToolRelayService {
    communicationService;
    controller;
    pendingCommands = new Map();
    commandTimeout = 30000; // 30 seconds
    constructor(communicationService, controller) {
        this.communicationService = communicationService;
        this.controller = controller;
        this.setupMessageHandlers();
        this.startTimeoutCleanup();
    }
    setupMessageHandlers() {
        this.communicationService.on("message", (message) => {
            try {
                const payload = JSON.parse(message.payload || "{}");
                if (payload.type === "tool_command") {
                    this.handleIncomingToolCommand(payload);
                }
                else if (payload.type === "tool_result") {
                    this.handleIncomingToolResult(payload);
                }
            }
            catch (error) {
                console.error("ToolRelayService: Error parsing message payload", error);
            }
        });
    }
    /**
     * Send a tool command to remote ValorIDE instances
     */
    async sendToolCommand(toolName, parameters) {
        if (!this.communicationService.ready) {
            throw new Error("Communication service not ready");
        }
        const commandId = this.generateCommandId();
        const command = {
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
        return new Promise((resolve, reject) => {
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
    async handleIncomingToolCommand(command) {
        console.log(`ToolRelayService: Executing remote tool command: ${command.toolName}`);
        try {
            let result;
            // Execute the tool command using the controller's existing methods
            switch (command.toolName) {
                case "read_file":
                    result = await this.executeReadFile(command.parameters);
                    break;
                case "write_to_file":
                    result = await this.executeWriteToFile(command.parameters);
                    break;
                case "replace_in_file":
                    result = await this.executeReplaceInFile(command.parameters);
                    break;
                case "execute_command":
                    result = await this.executeCommand(command.parameters);
                    break;
                case "list_files":
                    result = await this.executeListFiles(command.parameters);
                    break;
                case "search_files":
                    result = await this.executeSearchFiles(command.parameters);
                    break;
                case "list_code_definition_names":
                    result = await this.executeListCodeDefinitionNames(command.parameters);
                    break;
                case "browser_action":
                    result = await this.executeBrowserAction(command.parameters);
                    break;
                default:
                    throw new Error(`Unknown tool command: ${command.toolName}`);
            }
            // Send successful result back
            this.sendToolResult(command.commandId, true, result);
        }
        catch (error) {
            console.error(`ToolRelayService: Error executing ${command.toolName}:`, error);
            // Send error result back
            this.sendToolResult(command.commandId, false, undefined, error.message);
        }
    }
    /**
     * Handle incoming tool result from remote ValorIDE instance
     */
    handleIncomingToolResult(result) {
        const pending = this.pendingCommands.get(result.commandId);
        if (pending) {
            this.pendingCommands.delete(result.commandId);
            if (result.success) {
                pending.resolve(result.result);
            }
            else {
                pending.reject(new Error(result.error || "Unknown error"));
            }
        }
    }
    /**
     * Send a tool result back to the sender
     */
    sendToolResult(commandId, success, result, error) {
        const toolResult = {
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
    async executeReadFile(params) {
        const filePath = path.resolve(cwd, params.path);
        // Check if path is a directory
        try {
            const stats = await fs.stat(filePath);
            if (stats.isDirectory()) {
                throw new Error(`The path '${params.path}' is a directory. Use list_files tool to view directory contents instead of read_file.`);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${params.path}`);
            }
            throw error;
        }
        return await fs.readFile(filePath, "utf8");
    }
    async executeWriteToFile(params) {
        const filePath = path.resolve(cwd, params.path);
        // Create directories if needed
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, params.content, "utf8");
    }
    async executeReplaceInFile(params) {
        // This would integrate with the existing replace_in_file implementation
        // For now, we'll implement a simplified version
        const filePath = path.resolve(cwd, params.path);
        const content = await fs.readFile(filePath, "utf8");
        // Parse and apply the diff (this is a simplified implementation)
        // In reality, you'd want to use the existing diff parsing logic
        const modifiedContent = this.applyDiff(content, params.diff);
        await fs.writeFile(filePath, modifiedContent, "utf8");
    }
    async executeCommand(params) {
        return new Promise((resolve, reject) => {
            exec(params.command, { cwd }, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed: ${error.message}\nstderr: ${stderr}`));
                }
                else {
                    resolve(stdout || stderr || "Command executed successfully");
                }
            });
        });
    }
    async executeListFiles(params) {
        const dirPath = path.resolve(cwd, params.path);
        if (params.recursive) {
            return await this.listFilesRecursive(dirPath);
        }
        else {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });
            return entries.map((entry) => entry.name);
        }
    }
    async executeSearchFiles(params) {
        // This would integrate with existing search functionality
        return await searchWorkspaceFiles(params.regex, params.path, 100);
    }
    async executeListCodeDefinitionNames(params) {
        // This would integrate with existing code definition listing functionality
        // For now, return a placeholder
        return { message: "Code definitions listing not yet implemented in remote execution" };
    }
    async executeBrowserAction(params) {
        // This would integrate with existing browser automation
        // For now, return a placeholder
        return { message: "Browser actions not yet implemented in remote execution" };
    }
    // Helper methods
    getSenderId() {
        // Access the senderId through type assertion since it's private
        try {
            return this.communicationService.senderId || "unknown";
        }
        catch {
            return "unknown";
        }
    }
    applyDiff(content, diff) {
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
    parseDiffBlocks(diff) {
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
    async listFilesRecursive(dirPath) {
        const files = [];
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                const subFiles = await this.listFilesRecursive(fullPath);
                files.push(...subFiles.map(f => path.join(entry.name, f)));
            }
            else {
                files.push(entry.name);
            }
        }
        return files;
    }
    generateCommandId() {
        return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }
    startTimeoutCleanup() {
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
//# sourceMappingURL=ToolRelayService.js.map