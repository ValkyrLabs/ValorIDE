import { BaseToolHandler, ToolExecutionResult, ToolResponse } from "./BaseToolHandler";
import { AssistantMessageContent } from "@core/assistant-message";
import { formatResponse } from "@core/prompts/responses";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { showSystemNotification } from "@integrations/notifications";
import { fixModelHtmlEscaping } from "@utils/string";
import { execa } from "execa";
import { combineCommandSequences, COMMAND_REQ_APP_STRING } from "@shared/combineCommandSequences";
import { OutputFilterService } from "@services/output-filter/OutputFilterService";
import { isInTestMode } from "@services/test/TestMode";
import { Logger } from "@services/logging/Logger";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";

export class CommandToolHandler extends BaseToolHandler {
  async execute(block: AssistantMessageContent, partial: boolean): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use" || block.name !== "execute_command") {
      return { shouldContinue: false };
    }

    Logger.info(
      `[CommandToolHandler] Received execute_command tool partial=${partial} params=${JSON.stringify(
        block.params,
      )}`,
    );

    let command: string | undefined = block.params.command;
    const requiresApprovalRaw: string | undefined = block.params.requires_approval;
    const requiresApprovalPerLLM = requiresApprovalRaw?.toLowerCase() === "true";

    try {
      if (partial) {
        if (this.context.shouldAutoApproveTool(block.name)) {
          // Can't partially stream a say since it depends on requiresApproval parameter
        } else {
          await this.context.ask(
            "command",
            this.removeClosingTag("command", command, partial),
            partial,
          ).catch(() => {});
        }
        return { shouldContinue: false };
      } else {
        if (!command) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("execute_command", "command")
          };
        }
        if (!requiresApprovalRaw) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("execute_command", "requires_approval")
          };
        }
        this.context.consecutiveMistakeCount = 0;

        // gemini models tend to use unescaped html entities in commands
        if (this.context.api.getModel().id.includes("gemini")) {
          command = fixModelHtmlEscaping(command);
        }

        const ignoredFileAttemptedToAccess = this.context.valorideIgnoreController.validateCommand(command);
        if (ignoredFileAttemptedToAccess) {
          await this.context.say("valorideignore_error", ignoredFileAttemptedToAccess);
          return {
            shouldContinue: true,
            toolResponse: formatResponse.toolError(formatResponse.valorideIgnoreError(ignoredFileAttemptedToAccess))
          };
        }

        let didAutoApprove = false;
        let approvalFeedback: { text?: string; images?: string[] } | undefined;

        // If the model says this command is safe and auto approval for safe commands is true, execute the command
        // If the model says the command is risky, but *BOTH* auto approve settings are true, execute the command
        const autoApproveResult = this.context.shouldAutoApproveTool(block.name);
        const [autoApproveSafe, autoApproveAll] = Array.isArray(autoApproveResult)
          ? autoApproveResult
          : [autoApproveResult, false];

        if (
          (!requiresApprovalPerLLM && autoApproveSafe) ||
          (requiresApprovalPerLLM && autoApproveSafe && autoApproveAll)
        ) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "command");
          await this.context.say("command", command, undefined, false);
          this.context.consecutiveAutoApprovedRequestsCount++;
          didAutoApprove = true;
        } else {
          if (this.context.autoApprovalSettings.enabled && this.context.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
              subtitle: "Approval Required",
              message: `$ ${command}`
            });
          }
          
          const { response, text, images } = await this.context.ask(
            "command",
            command + (this.context.shouldAutoApproveTool(block.name) && requiresApprovalPerLLM ? COMMAND_REQ_APP_STRING : ""),
            false
          );
          const normalizedText = text?.trim().toLowerCase();
          const approved =
            response === "yesButtonClicked" ||
            (response === "messageResponse" &&
              (normalizedText === "yes" || normalizedText === "approve"));
          const hasFeedback = !!text || !!images?.length;
          approvalFeedback = hasFeedback ? { text, images } : undefined;

          if (!approved) {
            return {
              shouldContinue: true,
              userRejected: true,
              toolResponse: formatResponse.toolDenied(),
              feedback: approvalFeedback
            };
          }
        }

        let timeoutId: NodeJS.Timeout | undefined;
        if (didAutoApprove && this.context.autoApprovalSettings.enableNotifications) {
          // if the command was auto-approved, and it's long running we need to notify the user after some time has passed without proceeding
          timeoutId = setTimeout(() => {
            showSystemNotification({
              subtitle: "Command is still running",
              message: "An auto-approved command has been running for 30s, and may need your attention.",
            });
          }, 30_000);
        }

        const [userRejected, result] = await this.executeCommand(command);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Re-populate file paths in case the command modified the workspace
        this.context.workspaceTracker.populateFilePaths();

        await this.context.saveCheckpoint();
        this.context.markTaskDirSizeStale();

        Logger.info(
          `[CommandToolHandler] Command completed userRejected=${userRejected} resultPreview=${typeof result === "string" ? result.slice(0, 120) : "[non-string]"}`,
        );

        return {
          shouldContinue: true,
          toolResponse: result,
          userRejected,
          feedback: approvalFeedback,
          didAlreadyUseTool: true
        };
      }
    } catch (error) {
      Logger.error(
        `[CommandToolHandler] Error executing command: ${(error as Error).message}`,
        error as Error,
      );
      return {
        shouldContinue: true,
        toolResponse: await this.handleError("executing command", error as Error)
      };
    }
  }

  /**
   * Executes a command directly in Node.js using execa
   * This is used in test mode to capture the full output without using the VS Code terminal
   */
  private async executeCommandInNode(command: string): Promise<[boolean, ToolResponse]> {
    try {
      // Create a child process
      const childProcess = execa(command, {
        shell: true,
        cwd: this.context.cwd,
        reject: false,
        all: true, // Merge stdout and stderr
      });

      // Set up variables to collect output
      let output = "";

      // Collect output in real-time
      if (childProcess.all) {
        childProcess.all.on("data", (data) => {
          output += data.toString();
        });
      }

      // Create a timeout promise that rejects after 30 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          if (childProcess.pid) {
            childProcess.kill("SIGKILL"); // Use SIGKILL for more forceful termination
          }
          reject(new Error("Command timeout after 30s"));
        }, 30000);
      });

      // Race between command completion and timeout
      const result = await Promise.race([childProcess, timeoutPromise]).catch(
        (error) => {
          // If we get here due to timeout, return a partial result with timeout flag
          Logger.info(`Command timed out after 30s: ${command}`);
          return {
            stdout: "",
            stderr: "",
            exitCode: 124, // Standard timeout exit code
            timedOut: true,
          };
        },
      );

      // Check if timeout occurred
      const wasTerminated = result.timedOut === true;

      // Use collected output or result output
      if (!output) {
        output = result.stdout || result.stderr || "";
      }

      // Add termination message if the command was terminated
      if (wasTerminated) {
        output +=
          "\nCommand was taking a while to run so it was auto terminated after 30s";
      }

      // Filter the output to reduce verbosity
      const filteredOutput = OutputFilterService.filterCommandOutput(output, command);

      Logger.info(`Command executed in Node: ${command}\nOutput:\n${filteredOutput}`);

      // Format the result similar to terminal output
      return [
        false,
        `Command executed${wasTerminated ? " (terminated after 30s)" : ""} with exit code ${
          result.exitCode
        }.${filteredOutput.length > 0 ? `\nOutput:\n${filteredOutput}` : ""}`,
      ];
    } catch (error) {
      // Handle any errors that might occur
      const errorMessage = error instanceof Error ? error.message : String(error);
      return [false, `Error executing command: ${errorMessage}`];
    }
  }

  private async executeCommand(command: string): Promise<[boolean, ToolResponse]> {
    Logger.info("IS_TEST: " + isInTestMode());

    // Check if we're in test mode
    if (isInTestMode()) {
      // In test mode, execute the command directly in Node
      Logger.info("Executing command in Node: " + command);
      return this.executeCommandInNode(command);
    }
    Logger.info("Executing command in VS code terminal: " + command);

    const terminalInfo = await this.context.terminalManager.getOrCreateTerminal(this.context.cwd);
    terminalInfo.terminal.show(); // weird visual bug when creating new terminals
    const process = this.context.terminalManager.runCommand(terminalInfo, command);

    let userFeedback: { text?: string; images?: string[] } | undefined;
    let didContinue = false;

    // Chunked terminal output buffering
    const CHUNK_LINE_COUNT = 20;
    const CHUNK_BYTE_SIZE = 2048; // 2KB
    const CHUNK_DEBOUNCE_MS = 100;

    let outputBuffer: string[] = [];
    let outputBufferSize: number = 0;
    let chunkTimer: NodeJS.Timeout | null = null;
    let chunkEnroute = false;

    const flushBuffer = async (force = false) => {
      if (chunkEnroute || outputBuffer.length === 0) {
        if (force && !chunkEnroute && outputBuffer.length > 0) {
          // If force is true and no chunkEnroute, flush anyway
        } else {
          return;
        }
      }
      const chunk = outputBuffer.join("\n");
      outputBuffer = [];
      outputBufferSize = 0;
      chunkEnroute = true;
      try {
        const { response, text, images } = await this.context.ask("command_output", chunk);
        if (response === "yesButtonClicked") {
          // proceed while running
        } else {
          userFeedback = { text, images };
        }
        didContinue = true;
        process.continue();
      } catch {
        // ask promise was ignored
      } finally {
        chunkEnroute = false;
        // If more output accumulated while chunkEnroute, flush again
        if (outputBuffer.length > 0) {
          await flushBuffer();
        }
      }
    };

    const scheduleFlush = () => {
      if (chunkTimer) {
        clearTimeout(chunkTimer);
      }
      chunkTimer = setTimeout(() => flushBuffer(), CHUNK_DEBOUNCE_MS);
    };

    let result = "";
    let fullOutput = ""; // Keep track of full output for filtering

    process.on("line", (line) => {
      result += line + "\n";
      fullOutput += line + "\n";

      if (!didContinue) {
        outputBuffer.push(line);
        outputBufferSize += Buffer.byteLength(line, "utf8");
        // Flush if buffer is large enough
        if (
          outputBuffer.length >= CHUNK_LINE_COUNT ||
          outputBufferSize >= CHUNK_BYTE_SIZE
        ) {
          flushBuffer();
        } else {
          scheduleFlush();
        }
      } else {
        this.context.say("command_output", line);
      }
    });

    let completed = false;
    process.once("completed", async () => {
      completed = true;
      // Flush any remaining buffered output
      if (!didContinue && outputBuffer.length > 0) {
        if (chunkTimer) {
          clearTimeout(chunkTimer);
          chunkTimer = null;
        }
        await flushBuffer(true);
      }
    });

    process.once("no_shell_integration", async () => {
      await this.context.say("shell_integration_warning");
    });

    await process;

    // Wait for a short delay to ensure all messages are sent to the webview
    await setTimeoutPromise(50);

    // Filter the full output before using it
    const filteredOutput = OutputFilterService.filterCommandOutput(fullOutput, command);

    result = result.trim();

    if (userFeedback) {
      return [
        true,
        formatResponse.toolResult(
          `Command is still running in the user's terminal.${
            filteredOutput.length > 0 ? `\nHere's the output so far:\n${filteredOutput}` : ""
          }\n\nThe user provided the following feedback:\n<feedback>\n${userFeedback.text}\n</feedback>`,
          userFeedback.images,
        ),
      ];
    }

    if (completed) {
      return [
        false,
        `Command executed.${filteredOutput.length > 0 ? `\nOutput:\n${filteredOutput}` : ""}`,
      ];
    } else {
      return [
        false,
        `Command is still running in the user's terminal.${
          filteredOutput.length > 0 ? `\nHere's the output so far:\n${filteredOutput}` : ""
        }\n\nYou will be updated on the terminal status and new output in the future.`,
      ];
    }
  }
}
