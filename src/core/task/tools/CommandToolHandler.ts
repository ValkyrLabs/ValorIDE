import {
  BaseToolHandler,
  ToolExecutionResult,
  ToolExecutionOutcome,
  ToolResponse,
} from "./BaseToolHandler";
import { AssistantMessageContent } from "@core/assistant-message";
import { formatResponse } from "@core/prompts/responses";

import { showSystemNotification } from "@integrations/notifications";
import { normalizeModelCommand } from "@utils/string";
import { execa } from "execa";
import {
  combineCommandSequences,
  COMMAND_REQ_APP_STRING,
} from "@shared/combineCommandSequences";
import { OutputFilterService } from "@services/output-filter/OutputFilterService";
import { isInTestMode } from "@services/test/TestMode";
import { Logger } from "@services/logging/Logger";
import { resolveCommandRequiresApproval } from "./commandApproval";

export class CommandToolHandler extends BaseToolHandler {
  async execute(
    block: AssistantMessageContent,
    partial: boolean,
  ): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use" || block.name !== "execute_command") {
      return { shouldContinue: false };
    }

    if (!partial)
      Logger.info(
        `[CommandToolHandler] Received execute_command tool partial=${partial} params=${JSON.stringify(
          block.params,
        )}`,
      );

    let command: string | undefined =
      block.params.command === undefined
        ? undefined
        : normalizeModelCommand(block.params.command);
    const requiresApprovalRaw: string | undefined =
      block.params.requires_approval;
    const requiresApprovalPerLLM = resolveCommandRequiresApproval(
      requiresApprovalRaw,
      command,
    );

    try {
      if (partial) {
        if (this.context.shouldAutoApproveTool(block.name)) {
          // Can't partially stream a say since it depends on requiresApproval parameter
        } else {
          await this.context
            .ask(
              "command",
              this.removeClosingTag("command", command, partial),
              partial,
            )
            .catch(() => {});
        }
        return { shouldContinue: false };
      } else {
        if (!command) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            outcome: "blocked",
            toolResponse: await this.context.sayAndCreateMissingParamError(
              "execute_command",
              "command",
            ),
          };
        }
        this.context.consecutiveMistakeCount = 0;

        const ignoredFileAttemptedToAccess =
          this.context.valorideIgnoreController.validateCommand(command);
        if (ignoredFileAttemptedToAccess) {
          await this.context.say(
            "valorideignore_error",
            ignoredFileAttemptedToAccess,
          );
          return {
            shouldContinue: true,
            outcome: "blocked",
            toolResponse: formatResponse.toolError(
              formatResponse.valorideIgnoreError(ignoredFileAttemptedToAccess),
            ),
          };
        }

        let didAutoApprove = false;
        let approvalFeedback: { text?: string; images?: string[] } | undefined;

        // If the model says this command is safe and auto approval for safe commands is true, execute the command
        // If the model says the command is risky, but *BOTH* auto approve settings are true, execute the command
        const autoApproveResult = this.context.shouldAutoApproveTool(
          block.name,
        );
        const [autoApproveSafe, autoApproveAll] = Array.isArray(
          autoApproveResult,
        )
          ? autoApproveResult
          : [autoApproveResult, false];

        const localDecision = this.context.shouldAutoApproveCommand?.(
          command,
          requiresApprovalPerLLM,
        );
        if (
          localDecision ??
          ((!requiresApprovalPerLLM && autoApproveSafe) ||
            (requiresApprovalPerLLM && autoApproveSafe && autoApproveAll))
        ) {
          this.context.removeLastPartialMessageIfExistsWithType(
            "ask",
            "command",
          );
          await this.context.say("command", command, undefined, false);
          didAutoApprove = true;
        } else {
          if (
            this.context.autoApprovalSettings.enabled &&
            this.context.autoApprovalSettings.enableNotifications
          ) {
            showSystemNotification({
              subtitle: "Approval Required",
              message: `$ ${command}`,
            });
          }

          const { response, text, images } = await this.context.ask(
            "command",
            command +
              (this.context.shouldAutoApproveTool(block.name) &&
              requiresApprovalPerLLM
                ? COMMAND_REQ_APP_STRING
                : ""),
            false,
          );
          const normalizedText = text?.trim().toLowerCase();
          const approved =
            response === "yesButtonClicked" ||
            (response === "messageResponse" &&
              (normalizedText === "yes" || normalizedText === "approve"));
          this.context.recordCommandApproval?.(command, approved);
          const hasFeedback = !!text || !!images?.length;
          approvalFeedback = hasFeedback ? { text, images } : undefined;

          if (!approved) {
            return {
              shouldContinue: true,
              outcome: "rejected",
              userRejected: true,
              toolResponse: formatResponse.toolDenied(),
              feedback: approvalFeedback,
            };
          }
        }

        let timeoutId: NodeJS.Timeout | undefined;
        if (
          didAutoApprove &&
          this.context.autoApprovalSettings.enableNotifications
        ) {
          // if the command was auto-approved, and it's long running we need to notify the user after some time has passed without proceeding
          timeoutId = setTimeout(() => {
            showSystemNotification({
              subtitle: "Command is still running",
              message:
                "An auto-approved command has been running for 30s, and may need your attention.",
            });
          }, 30_000);
        }

        const beforeDispatch = (charge = true) => {
          if (
            this.context.isTaskActive?.() === false ||
            (this.context.getChatMode && this.context.getChatMode() !== "act")
          )
            return false;
          if (didAutoApprove) {
            const currentDecision = this.context.shouldAutoApproveCommand?.(
              command!,
              requiresApprovalPerLLM,
            );
            const current = this.context.shouldAutoApproveTool(block.name);
            const [safe, all] = Array.isArray(current)
              ? current
              : [current, false];
            if (
              !(
                currentDecision ??
                ((!requiresApprovalPerLLM && safe) ||
                  (requiresApprovalPerLLM && safe && all))
              )
            )
              return false;
            // Charge only an operation that still has authority immediately before dispatch.
            if (charge) this.context.consecutiveAutoApprovedRequestsCount++;
          }
          return true;
        };
        let executionResult: [boolean, ToolResponse, ToolExecutionOutcome];
        try {
          executionResult = await this.executeCommand(command, beforeDispatch);
        } finally {
          clearTimeout(timeoutId);
        }
        const [userRejected, result, outcome] = executionResult;

        this.context.recordCommandOutcome?.(command, outcome);

        // Re-populate file paths in case the command modified the workspace
        this.context.workspaceTracker.populateFilePaths();

        if (!userRejected && (outcome === "succeeded" || outcome === "failed")) {
          this.context.recordCommandEvidence?.(command, result);
        }

        await this.context.saveCheckpoint();

        Logger.info(
          `[CommandToolHandler] Command completed userRejected=${userRejected} resultPreview=${typeof result === "string" ? result.slice(0, 120) : "[non-string]"}`,
        );

        return {
          outcome,
          shouldContinue: true,
          toolResponse: result,
          userRejected,
          feedback: approvalFeedback,
          didAlreadyUseTool: true,
        };
      }
    } catch (error) {
      Logger.error(
        `[CommandToolHandler] Error executing command: ${(error as Error).message}`,
        error as Error,
      );
      return {
        outcome: "failed",
        shouldContinue: true,
        toolResponse: await this.handleError(
          "executing command",
          error as Error,
        ),
      };
    }
  }

  /**
   * Executes a command directly in Node.js using execa
   * This is used in test mode to capture the full output without using the VS Code terminal
   */
  private async executeCommandInNode(
    command: string,
  ): Promise<[boolean, ToolResponse, ToolExecutionOutcome]> {
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
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (childProcess.pid) {
            childProcess.kill("SIGKILL"); // Use SIGKILL for more forceful termination
          }
          reject(new Error("Command timeout after 30s"));
        }, 30000);
      });

      // Race between command completion and timeout
      const result = await Promise.race([childProcess, timeoutPromise])
        .finally(() => clearTimeout(timeoutId))
        .catch((error) => {
          // If we get here due to timeout, return a partial result with timeout flag
          Logger.info(`Command timed out after 30s: ${command}`);
          return {
            stdout: "",
            stderr: "",
            exitCode: 124, // Standard timeout exit code
            timedOut: true,
          };
        });

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
      const filteredOutput = OutputFilterService.filterCommandOutput(
        output,
        command,
      );

      Logger.info(
        `Command executed in Node: ${command}\nOutput:\n${filteredOutput}`,
      );

      // Format the result similar to terminal output
      return [
        false,
        `Command executed${wasTerminated ? " (terminated after 30s)" : ""} with exit code ${
          result.exitCode
        }.${filteredOutput.length > 0 ? `\nOutput:\n${filteredOutput}` : ""}`,
        wasTerminated ? "failed" : commandExitOutcome(result.exitCode),
      ];
    } catch (error) {
      // Handle any errors that might occur
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return [false, `Error executing command: ${errorMessage}`, "failed"];
    }
  }

  private commandDispatchBlocked(): [
    boolean,
    ToolResponse,
    ToolExecutionOutcome,
  ] {
    return [
      false,
      "Command was not executed because the task or local approval changed. Review the current command and settings before retrying.",
      "blocked",
    ];
  }

  private async executeCommand(
    command: string,
    beforeDispatch: (charge?: boolean) => boolean,
  ): Promise<[boolean, ToolResponse, ToolExecutionOutcome]> {
    if (isInTestMode()) {
      if (!beforeDispatch()) return this.commandDispatchBlocked();
      return this.executeCommandInNode(command);
    }
    const terminalInfo = await this.context.terminalManager.getOrCreateTerminal(
      this.context.cwd,
    );
    if (!beforeDispatch(false)) return this.commandDispatchBlocked();
    terminalInfo.terminal.show();
    const process = this.context.terminalManager.runCommand(
      terminalInfo,
      command,
      { beforeDispatch },
    );
    const limit = 512 * 1024;
    let fullOutput = "";
    let truncated = false;
    let completed = false;
    let outputBuffer = "";
    let chunkTimer: ReturnType<typeof setTimeout> | undefined;
    let pendingFlush: Promise<void> | undefined;

    const flush = (): Promise<void> => {
      clearTimeout(chunkTimer);
      chunkTimer = undefined;
      if (pendingFlush) return pendingFlush;
      if (!outputBuffer) return Promise.resolve();
      const chunk = outputBuffer;
      outputBuffer = "";
      // Output is informational, not a new command approval. A completed quick
      // command must not wait for an extra two-second approval timeout.
      let timer: ReturnType<typeof setTimeout> | undefined;
      pendingFlush = Promise.race([
        this.context.say("command_output", chunk),
        new Promise<undefined>((resolve) => {
          timer = setTimeout(() => resolve(undefined), 1000);
        }),
      ])
        .then(
          () => undefined,
          () => undefined,
        )
        .finally(() => {
          clearTimeout(timer);
          pendingFlush = undefined;
        });
      return pendingFlush;
    };
    const onLine = (line: string) => {
      const text = (line ?? "") + "\n";
      if (fullOutput.length + text.length > limit) truncated = true;
      fullOutput = (fullOutput + text).slice(-limit);
      outputBuffer += text;
      if (outputBuffer.length > 32 * 1024)
        outputBuffer =
          "[Earlier display output omitted]\n" + outputBuffer.slice(-32 * 1024);
      if (!chunkTimer)
        chunkTimer = setTimeout(() => {
          void flush();
        }, 100);
    };
    const onCompleted = () => {
      completed = true;
    };
    const onUnavailable = () => {
      void this.context.say("shell_integration_warning").catch(() => {});
    };
    process.on("line", onLine);
    process.once("completed", onCompleted);
    process.once("no_shell_integration", onUnavailable);
    try {
      try {
        await process;
      } catch (error) {
        if (process.getState?.() !== "unknown") throw error;
        // Lost output capture does not prove the command failed or had no effects.
        Logger.info(`Command output tracking unavailable: ${String(error)}`);
      }
      await flush();
      if (outputBuffer) await flush();
    } finally {
      clearTimeout(chunkTimer);
      process.removeListener("line", onLine);
      process.removeListener("completed", onCompleted);
      process.removeListener("no_shell_integration", onUnavailable);
    }
    const filteredOutput =
      (truncated
        ? "[Earlier command output truncated; retained latest output]\n"
        : "") + OutputFilterService.filterCommandOutput(fullOutput, command);
    const exitCode = process.getExitCode();
    const state = process.getState?.();
    const outcome: ToolExecutionOutcome =
      state === "blocked"
        ? "blocked"
        : completed
          ? commandExitOutcome(exitCode)
          : state === "unknown" || state === "cancelled"
            ? "unknown"
            : "pending";
    const message =
      state === "blocked"
        ? "Command was not executed because the task or local approval changed. Review the current command and settings before retrying."
        : state === "cancelled"
          ? "Command waiting was cancelled. An already started command may still be running in the terminal. Inspect it before retrying."
          : state === "unknown"
            ? "Command was sent once, but terminal output tracking is unavailable. It may still be running. Inspect the terminal before retrying."
            : completed
              ? Number.isInteger(exitCode)
                ? `Command completed with exit code ${exitCode}.`
                : "Command completed, but its exit status is unavailable."
              : "Command is still running in the user's terminal. Do not repeat it; inspect its status and output first.";
    return [
      false,
      `${message}${filteredOutput ? `\nOutput:\n${filteredOutput}` : ""}`,
      outcome,
    ];
  }
}

const commandExitOutcome = (
  exitCode: number | undefined,
): ToolExecutionOutcome =>
  exitCode === 0
    ? "succeeded"
    : Number.isInteger(exitCode)
      ? "failed"
      : "unknown";
