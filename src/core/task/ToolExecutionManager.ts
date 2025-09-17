import { execa } from "execa";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import { Logger } from "@services/logging/Logger";
import { OutputFilterService } from "@services/output-filter/OutputFilterService";
import { TerminalManager } from "@integrations/terminal/TerminalManager";
import { isInTestMode } from "../../services/test/TestMode";
import { formatResponse } from "@core/prompts/responses";
import { Anthropic } from "@anthropic-ai/sdk";

type ToolResponse =
  | string
  | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

export class ToolExecutionManager {
  constructor(
    private terminalManager: TerminalManager,
    private cwd: string,
    private ask: (type: string, text?: string) => Promise<any>,
    private say: (type: string, text?: string, images?: string[], partial?: boolean) => Promise<void>,
  ) {}

  /**
   * Executes a command directly in Node.js using execa
   * This is used in test mode to capture the full output without using the VS Code terminal
   * Commands are automatically terminated after 30 seconds using Promise.race
   */
  private async executeCommandInNode(command: string): Promise<[boolean, ToolResponse]> {
    try {
      // Create a child process
      const childProcess = execa(command, {
        shell: true,
        cwd: this.cwd,
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

  async executeCommandTool(command: string): Promise<[boolean, ToolResponse]> {
    Logger.info("IS_TEST: " + isInTestMode());

    // Check if we're in test mode
    if (isInTestMode()) {
      // In test mode, execute the command directly in Node
      Logger.info("Executing command in Node: " + command);
      return this.executeCommandInNode(command);
    }
    Logger.info("Executing command in VS code terminal: " + command);

    const terminalInfo = await this.terminalManager.getOrCreateTerminal(this.cwd);
    terminalInfo.terminal.show(); // weird visual bug when creating new terminals (even manually) where there's an empty space at the top.
    const process = this.terminalManager.runCommand(terminalInfo, command);

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
        const { response, text, images } = await this.ask("command_output", chunk);
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
        this.say("command_output", line);
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
      await this.say("shell_integration_warning");
    });

    await process;

    // Wait for a short delay to ensure all messages are sent to the webview
    // This delay allows time for non-awaited promises to be created and
    // for their associated messages to be sent to the webview, maintaining
    // the correct order of messages (although the webview is smart about
    // grouping command_output messages despite any gaps anyways)
    await setTimeoutPromise(50);

    // Filter the full output before using it
    const filteredOutput = OutputFilterService.filterCommandOutput(fullOutput, command);
    
    result = result.trim();

    if (userFeedback) {
      await this.say("user_feedback", userFeedback.text, userFeedback.images);
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
