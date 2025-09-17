import { BaseToolHandler, ToolExecutionResult, ToolResponse } from "./BaseToolHandler";
import { AssistantMessageContent } from "@core/assistant-message";
import { constructNewFileContent } from "@core/assistant-message/diff";
import { extractTextFromFile } from "@integrations/misc/extract-text";
import { listFiles } from "@services/glob/list-files";
import { regexSearchFiles } from "@services/ripgrep";
import { parseSourceCodeForDefinitionsTopLevel } from "@services/tree-sitter";
import { formatResponse } from "@core/prompts/responses";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { getReadablePath, isLocatedInWorkspace } from "@utils/path";
import { fileExistsAtPath } from "@utils/fs";
import { fixModelHtmlEscaping, removeInvalidChars } from "@utils/string";
import { ValorIDESayTool } from "@shared/ExtensionMessage";
import { showSystemNotification } from "@integrations/notifications";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import * as path from "path";

export class FileToolHandler extends BaseToolHandler {
  async execute(block: AssistantMessageContent, partial: boolean): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use") {
      return { shouldContinue: false };
    }

    switch (block.name) {
      case "write_to_file":
      case "replace_in_file":
        return this.handleFileWrite(block, partial);
      case "read_file":
        return this.handleFileRead(block, partial);
      case "list_files":
        return this.handleListFiles(block, partial);
      case "list_code_definition_names":
        return this.handleListCodeDefinitions(block, partial);
      case "search_files":
        return this.handleSearchFiles(block, partial);
      default:
        return { shouldContinue: false };
    }
  }

  private async handleFileWrite(block: AssistantMessageContent, partial: boolean): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use") {
      return { shouldContinue: false };
    }

    const relPath: string | undefined = block.params.path;
    let content: string | undefined = block.params.content; // for write_to_file
    let diff: string | undefined = block.params.diff; // for replace_in_file
    
    if (!relPath || (!content && !diff)) {
      return { shouldContinue: false }; // wait for more data
    }

    const accessAllowed = this.context.valorideIgnoreController.validateAccess(relPath);
    if (!accessAllowed) {
      await this.context.say("valorideignore_error", relPath);
      return {
        shouldContinue: true,
        toolResponse: formatResponse.toolError(formatResponse.valorideIgnoreError(relPath))
      };
    }

    // Check if file exists using cached map or fs.access
    let fileExists: boolean;
    if (this.context.diffViewProvider.editType !== undefined) {
      fileExists = this.context.diffViewProvider.editType === "modify";
    } else {
      const absolutePath = path.resolve(this.context.cwd, relPath);
      fileExists = await fileExistsAtPath(absolutePath);
      this.context.diffViewProvider.editType = fileExists ? "modify" : "create";
    }

    try {
      // Construct newContent from diff
      let newContent: string;
      if (diff) {
        if (!this.context.api.getModel().id.includes("valoride")) {
          // deepseek models tend to use unescaped html entities in diffs
          diff = fixModelHtmlEscaping(diff);
          diff = removeInvalidChars(diff);
        }

        // open the editor if not done already
        if (!this.context.diffViewProvider.isEditing) {
          await this.context.diffViewProvider.open(relPath);
        }

        try {
          newContent = await constructNewFileContent(
            diff,
            this.context.diffViewProvider.originalContent || "",
            !partial,
          );
        } catch (error) {
          await this.context.say("diff_error", relPath);

          // Extract error type from error message if possible, or use a generic type
          const errorType =
            error instanceof Error && error.message.includes("does not match anything")
              ? "search_not_found"
              : "other_diff_error";

          // Add telemetry for diff edit failure
          telemetryService.captureDiffEditFailure(this.context.taskId, errorType);

          const toolResponse = formatResponse.toolError(
            `${(error as Error)?.message}\n\n` +
            formatResponse.diffError(relPath, this.context.diffViewProvider.originalContent)
          );
          
          await this.context.diffViewProvider.revertChanges();
          await this.context.diffViewProvider.reset();
          return { shouldContinue: true, toolResponse };
        }
      } else if (content) {
        newContent = content;

        // pre-processing newContent for cases where weaker models might add artifacts
        if (newContent.startsWith("```")) {
          newContent = newContent.split("\n").slice(1).join("\n").trim();
        }
        if (newContent.endsWith("```")) {
          newContent = newContent.split("\n").slice(0, -1).join("\n").trim();
        }

        if (!this.context.api.getModel().id.includes("valoride")) {
          newContent = fixModelHtmlEscaping(newContent);
          newContent = removeInvalidChars(newContent);
        }
      } else {
        return { shouldContinue: false }; // can't happen, since we already checked for content/diff above
      }

      newContent = newContent.trimEnd(); // remove any trailing newlines

      const sharedMessageProps: ValorIDESayTool = {
        tool: fileExists ? "editedExistingFile" : "newFileCreated",
        path: getReadablePath(this.context.cwd, this.removeClosingTag("path", relPath, partial)),
        content: diff || content,
        operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
      };

      if (partial) {
        // update gui message
        const partialMessage = JSON.stringify(sharedMessageProps);

        if (this.context.shouldAutoApproveToolWithPath(block.name, relPath)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", partialMessage, undefined, partial);
        } else {
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          await this.context.ask("tool", partialMessage, partial).catch(() => {});
        }
        // update editor
        if (!this.context.diffViewProvider.isEditing) {
          await this.context.diffViewProvider.open(relPath);
        }
        // editor is open, stream content in
        await this.context.diffViewProvider.update(newContent, false);
        return { shouldContinue: false };
      } else {
        if (!relPath) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError(block.name, "path")
          };
        }
        if (block.name === "replace_in_file" && !diff) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("replace_in_file", "diff")
          };
        }
        if (block.name === "write_to_file" && !content) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("write_to_file", "content")
          };
        }

        this.context.consecutiveMistakeCount = 0;

        // Handle the complete file operation
        if (!this.context.diffViewProvider.isEditing) {
          const partialMessage = JSON.stringify(sharedMessageProps);
          await this.context.ask("tool", partialMessage, true).catch(() => {}); // sending true for partial even though it's not
          await this.context.diffViewProvider.open(relPath);
        }
        await this.context.diffViewProvider.update(newContent, true);
        await setTimeoutPromise(300); // wait for diff view to update
        this.context.diffViewProvider.scrollToFirstDiff();

        const completeMessage = JSON.stringify({
          ...sharedMessageProps,
          content: diff || content,
          operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, relPath)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", completeMessage, undefined, false);
          this.context.consecutiveAutoApprovedRequestsCount++;
          telemetryService.captureToolUsage(this.context.taskId, block.name, true, true);

          // artificial delay to let the diagnostics catch up to the changes
          await setTimeoutPromise(3_500);
        } else {
          // If auto-approval is enabled but this tool wasn't auto-approved, send notification
          if (this.context.autoApprovalSettings.enabled && this.context.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
              subtitle: "Approval Required",
              message: `ValorIDE wants to ${fileExists ? "edit" : "create"} ${path.basename(relPath)}`
            });
          }
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");

          const { response, text, images } = await this.context.ask("tool", completeMessage, false);
          if (response !== "yesButtonClicked") {
            // User either sent a message or pressed reject button
            const fileDeniedNote = fileExists
              ? "The file was not updated, and maintains its original contents."
              : "The file was not created.";
            
            if (text || images?.length) {
              await this.context.say("user_feedback", text, images);
            }
            
            telemetryService.captureToolUsage(this.context.taskId, block.name, false, false);
            await this.context.diffViewProvider.revertChanges();
            return {
              shouldContinue: true,
              toolResponse: `The user denied this operation. ${fileDeniedNote}`,
              userRejected: true
            };
          } else {
            // User hit the approve button, and may have provided feedback
            if (text || images?.length) {
              await this.context.say("user_feedback", text, images);
            }
            telemetryService.captureToolUsage(this.context.taskId, block.name, false, true);
          }
        }

        // Mark the file as edited by ValorIDE to prevent false "recently modified" warnings
        this.context.fileContextTracker.markFileAsEditedByValorIDE(relPath);

        const { newProblemsMessage, userEdits, autoFormattingEdits, finalContent } =
          await this.context.diffViewProvider.saveChanges();
        this.context.didEditFile = true; // used to determine if we should wait for busy terminal to update

        // Track file edit operation
        await this.context.fileContextTracker.trackFileContext(relPath, "valoride_edited");

        let toolResponse: ToolResponse;
        if (userEdits) {
          // Track file edit operation
          await this.context.fileContextTracker.trackFileContext(relPath, "user_edited");

          await this.context.say(
            "user_feedback_diff",
            JSON.stringify({
              tool: fileExists ? "editedExistingFile" : "newFileCreated",
              path: getReadablePath(this.context.cwd, relPath),
              diff: userEdits,
            } satisfies ValorIDESayTool)
          );
          toolResponse = formatResponse.fileEditWithUserChanges(
            relPath,
            userEdits,
            autoFormattingEdits,
            finalContent,
            newProblemsMessage
          );
        } else {
          toolResponse = formatResponse.fileEditWithoutUserChanges(
            relPath,
            autoFormattingEdits,
            finalContent,
            newProblemsMessage
          );
        }

        if (!fileExists) {
          this.context.workspaceTracker.populateFilePaths();
        }

        await this.context.diffViewProvider.reset();
        await this.context.saveCheckpoint();

        return { shouldContinue: true, toolResponse };
      }
    } catch (error) {
      await this.context.diffViewProvider.revertChanges();
      await this.context.diffViewProvider.reset();
      return {
        shouldContinue: true,
        toolResponse: await this.handleError("writing file", error as Error)
      };
    }
  }

  private async handleFileRead(block: AssistantMessageContent, partial: boolean): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use") {
      return { shouldContinue: false };
    }

    const relPath: string | undefined = block.params.path;
    const sharedMessageProps: ValorIDESayTool = {
      tool: "readFile",
      path: getReadablePath(this.context.cwd, this.removeClosingTag("path", relPath, partial)),
    };

    try {
      if (partial) {
        const partialMessage = JSON.stringify({
          ...sharedMessageProps,
          content: undefined,
          operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", partialMessage, undefined, partial);
        } else {
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          await this.context.ask("tool", partialMessage, partial).catch(() => {});
        }
        return { shouldContinue: false };
      } else {
        if (!relPath) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("read_file", "path")
          };
        }

        const accessAllowed = this.context.valorideIgnoreController.validateAccess(relPath);
        if (!accessAllowed) {
          await this.context.say("valorideignore_error", relPath);
          return {
            shouldContinue: true,
            toolResponse: formatResponse.toolError(formatResponse.valorideIgnoreError(relPath))
          };
        }

        this.context.consecutiveMistakeCount = 0;
        const absolutePath = path.resolve(this.context.cwd, relPath);
        const completeMessage = JSON.stringify({
          ...sharedMessageProps,
          content: absolutePath,
          operationIsLocatedInWorkspace: isLocatedInWorkspace(relPath),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", completeMessage, undefined, false);
          this.context.consecutiveAutoApprovedRequestsCount++;
          telemetryService.captureToolUsage(this.context.taskId, block.name, true, true);
        } else {
          if (this.context.autoApprovalSettings.enabled && this.context.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
              subtitle: "Approval Required",
              message: `ValorIDE wants to read ${path.basename(absolutePath)}`
            });
          }
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          const didApprove = await this.askApproval("tool", completeMessage);
          if (!didApprove) {
            telemetryService.captureToolUsage(this.context.taskId, block.name, false, false);
            return { shouldContinue: true, userRejected: true };
          }
          telemetryService.captureToolUsage(this.context.taskId, block.name, false, true);
        }

        // now execute the tool like normal
        const content = await extractTextFromFile(absolutePath);

        // Track file read operation
        await this.context.fileContextTracker.trackFileContext(relPath, "read_tool");

        return { shouldContinue: true, toolResponse: content };
      }
    } catch (error) {
      return {
        shouldContinue: true,
        toolResponse: await this.handleError("reading file", error as Error)
      };
    }
  }

  private async handleListFiles(block: AssistantMessageContent, partial: boolean): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use") {
      return { shouldContinue: false };
    }

    const relDirPath: string | undefined = block.params.path;
    const recursiveRaw: string | undefined = block.params.recursive;
    const recursive = recursiveRaw?.toLowerCase() === "true";
    const sharedMessageProps: ValorIDESayTool = {
      tool: !recursive ? "listFilesTopLevel" : "listFilesRecursive",
      path: getReadablePath(this.context.cwd, this.removeClosingTag("path", relDirPath, partial)),
    };

    try {
      if (partial) {
        const partialMessage = JSON.stringify({
          ...sharedMessageProps,
          content: "",
          operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", partialMessage, undefined, partial);
        } else {
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          await this.context.ask("tool", partialMessage, partial).catch(() => {});
        }
        return { shouldContinue: false };
      } else {
        if (!relDirPath) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("list_files", "path")
          };
        }
        this.context.consecutiveMistakeCount = 0;

        const absolutePath = path.resolve(this.context.cwd, relDirPath);
        const [files, didHitLimit] = await listFiles(absolutePath, recursive, 200);
        const result = formatResponse.formatFilesList(
          absolutePath,
          files,
          didHitLimit,
          this.context.valorideIgnoreController
        );

        const completeMessage = JSON.stringify({
          ...sharedMessageProps,
          content: result,
          operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", completeMessage, undefined, false);
          this.context.consecutiveAutoApprovedRequestsCount++;
          telemetryService.captureToolUsage(this.context.taskId, block.name, true, true);
        } else {
          if (this.context.autoApprovalSettings.enabled && this.context.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
              subtitle: "Approval Required",
              message: `ValorIDE wants to view directory ${path.basename(absolutePath)}/`
            });
          }
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          const didApprove = await this.askApproval("tool", completeMessage);
          if (!didApprove) {
            telemetryService.captureToolUsage(this.context.taskId, block.name, false, false);
            return { shouldContinue: true, userRejected: true };
          }
          telemetryService.captureToolUsage(this.context.taskId, block.name, false, true);
        }

        return { shouldContinue: true, toolResponse: result };
      }
    } catch (error) {
      return {
        shouldContinue: true,
        toolResponse: await this.handleError("listing files", error as Error)
      };
    }
  }

  private async handleListCodeDefinitions(block: AssistantMessageContent, partial: boolean): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use") {
      return { shouldContinue: false };
    }

    const relDirPath: string | undefined = block.params.path;
    const sharedMessageProps: ValorIDESayTool = {
      tool: "listCodeDefinitionNames",
      path: getReadablePath(this.context.cwd, this.removeClosingTag("path", relDirPath, partial)),
    };

    try {
      if (partial) {
        const partialMessage = JSON.stringify({
          ...sharedMessageProps,
          content: "",
          operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", partialMessage, undefined, partial);
        } else {
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          await this.context.ask("tool", partialMessage, partial).catch(() => {});
        }
        return { shouldContinue: false };
      } else {
        if (!relDirPath) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("list_code_definition_names", "path")
          };
        }

        this.context.consecutiveMistakeCount = 0;

        const absolutePath = path.resolve(this.context.cwd, relDirPath);
        const result = await parseSourceCodeForDefinitionsTopLevel(
          absolutePath,
          this.context.valorideIgnoreController
        );

        const completeMessage = JSON.stringify({
          ...sharedMessageProps,
          content: result,
          operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", completeMessage, undefined, false);
          this.context.consecutiveAutoApprovedRequestsCount++;
          telemetryService.captureToolUsage(this.context.taskId, block.name, true, true);
        } else {
          if (this.context.autoApprovalSettings.enabled && this.context.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
              subtitle: "Approval Required",
              message: `ValorIDE wants to view source code definitions in ${path.basename(absolutePath)}/`
            });
          }
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          const didApprove = await this.askApproval("tool", completeMessage);
          if (!didApprove) {
            telemetryService.captureToolUsage(this.context.taskId, block.name, false, false);
            return { shouldContinue: true, userRejected: true };
          }
          telemetryService.captureToolUsage(this.context.taskId, block.name, false, true);
        }

        return { shouldContinue: true, toolResponse: result };
      }
    } catch (error) {
      return {
        shouldContinue: true,
        toolResponse: await this.handleError("parsing source code definitions", error as Error)
      };
    }
  }

  private async handleSearchFiles(block: AssistantMessageContent, partial: boolean): Promise<ToolExecutionResult> {
    if (block.type !== "tool_use") {
      return { shouldContinue: false };
    }

    const relDirPath: string | undefined = block.params.path;
    const regex: string | undefined = block.params.regex;
    const filePattern: string | undefined = block.params.file_pattern;
    const sharedMessageProps: ValorIDESayTool = {
      tool: "searchFiles",
      path: getReadablePath(this.context.cwd, this.removeClosingTag("path", relDirPath, partial)),
      regex: this.removeClosingTag("regex", regex, partial),
      filePattern: this.removeClosingTag("file_pattern", filePattern, partial),
    };

    try {
      if (partial) {
        const partialMessage = JSON.stringify({
          ...sharedMessageProps,
          content: "",
          operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", partialMessage, undefined, partial);
        } else {
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          await this.context.ask("tool", partialMessage, partial).catch(() => {});
        }
        return { shouldContinue: false };
      } else {
        if (!relDirPath) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("search_files", "path")
          };
        }
        if (!regex) {
          this.context.consecutiveMistakeCount++;
          return {
            shouldContinue: true,
            toolResponse: await this.context.sayAndCreateMissingParamError("search_files", "regex")
          };
        }
        this.context.consecutiveMistakeCount = 0;

        const absolutePath = path.resolve(this.context.cwd, relDirPath);
        const results = await regexSearchFiles(
          this.context.cwd,
          absolutePath,
          regex,
          filePattern,
          this.context.valorideIgnoreController
        );

        const completeMessage = JSON.stringify({
          ...sharedMessageProps,
          content: results,
          operationIsLocatedInWorkspace: isLocatedInWorkspace(block.params.path),
        } satisfies ValorIDESayTool);

        if (this.context.shouldAutoApproveToolWithPath(block.name, block.params.path)) {
          this.context.removeLastPartialMessageIfExistsWithType("ask", "tool");
          await this.context.say("tool", completeMessage, undefined, false);
          this.context.consecutiveAutoApprovedRequestsCount++;
          telemetryService.captureToolUsage(this.context.taskId, block.name, true, true);
        } else {
          if (this.context.autoApprovalSettings.enabled && this.context.autoApprovalSettings.enableNotifications) {
            showSystemNotification({
              subtitle: "Approval Required",
              message: `ValorIDE wants to search files in ${path.basename(absolutePath)}/`
            });
          }
          this.context.removeLastPartialMessageIfExistsWithType("say", "tool");
          const didApprove = await this.askApproval("tool", completeMessage);
          if (!didApprove) {
            telemetryService.captureToolUsage(this.context.taskId, block.name, false, false);
            return { shouldContinue: true, userRejected: true };
          }
          telemetryService.captureToolUsage(this.context.taskId, block.name, false, true);
        }

        return { shouldContinue: true, toolResponse: results };
      }
    } catch (error) {
      return {
        shouldContinue: true,
        toolResponse: await this.handleError("searching files", error as Error)
      };
    }
  }
}
