import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import pWaitFor from "p-wait-for";
import { listFiles } from "@services/glob/list-files";
import { formatResponse } from "@core/prompts/responses";
import { parseMentions } from "@core/mentions";
import { parseSlashCommands } from "@core/slash-commands";
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher";
import { FileContextTracker } from "@core/context/context-tracking/FileContextTracker";
import { ValorIDEIgnoreController } from "@core/ignore/ValorIDEIgnoreController";
import { TerminalManager } from "@integrations/terminal/TerminalManager";
import { getContextWindowInfo } from "@core/context/context-management/context-window-utils";
import { ApiHandler } from "@api/index";
import { arePathsEqual } from "@utils/path";
import { findLast } from "@shared/array";
import { combineApiRequests } from "@shared/combineApiRequests";
import { combineCommandSequences } from "@shared/combineCommandSequences";
import { ValorIDEMessage } from "@shared/ExtensionMessage";
import { ChatSettings } from "@shared/ChatSettings";
import { Anthropic } from "@anthropic-ai/sdk";

type UserContent = Array<Anthropic.ContentBlockParam>;

export class EnvironmentService {
  constructor(
    private cwd: string,
    private valorideIgnoreController: ValorIDEIgnoreController,
    private terminalManager: TerminalManager,
    private fileContextTracker: FileContextTracker,
    private urlContentFetcher: UrlContentFetcher
  ) {}

  async loadContext(
    userContent: UserContent,
    includeFileDetails: boolean = false,
  ): Promise<[UserContent, string]> {
    return await Promise.all([
      // This is a temporary solution to dynamically load context mentions from tool results. It checks for the presence of tags that indicate that the tool was rejected and feedback was provided (see formatToolDeniedFeedback, attemptCompletion, executeCommand, and consecutiveMistakeCount >= 3) or "<answer>" (see askFollowupQuestion), we place all user generated content in these tags so they can effectively be used as markers for when we should parse mentions). However if we allow multiple tools responses in the future, we will need to parse mentions specifically within the user content tags.
      // (Note: this caused the @/ import alias bug where file contents were being parsed as well, since v2 converted tool results to text blocks)
      Promise.all(
        userContent.map(async (block) => {
          if (block.type === "text") {
            // We need to ensure any user generated content is wrapped in one of these tags so that we know to parse mentions
            // FIXME: Only parse text in between these tags instead of the entire text block which may contain other tool results. This is part of a larger issue where we shouldn't be using regex to parse mentions in the first place (ie for cases where file paths have spaces)
            if (
              block.text.includes("<feedback>") ||
              block.text.includes("<answer>") ||
              block.text.includes("<task>") ||
              block.text.includes("<user_message>")
            ) {
              let parsedText = await parseMentions(
                block.text,
                this.cwd,
                this.urlContentFetcher,
                this.fileContextTracker,
              );

              // when parsing slash commands, we still want to allow the user to provide their desired context
              parsedText = parseSlashCommands(parsedText);

              return {
                ...block,
                text: parsedText,
              };
            }
          }
          return block;
        }),
      ),
      this.getEnvironmentDetails(includeFileDetails),
    ]);
  }

  async getEnvironmentDetails(
    includeFileDetails: boolean = false,
    didEditFile: boolean = false,
    valorideMessages: ValorIDEMessage[] = [],
    api?: ApiHandler,
    chatSettings?: ChatSettings
  ): Promise<string> {
    let details = "";

    // It could be useful for valoride to know if the user went from one or no file to another between messages, so we always include this context
    details += "\n\n# VSCode Visible Files";
    const visibleFilePaths = vscode.window.visibleTextEditors
      ?.map((editor) => editor.document?.uri?.fsPath)
      .filter(Boolean)
      .map((absolutePath) => path.relative(this.cwd, absolutePath));

    // Filter paths through valorideIgnoreController
    const allowedVisibleFiles = this.valorideIgnoreController
      .filterPaths(visibleFilePaths)
      .map((p) => p.toPosix())
      .join("\n");

    if (allowedVisibleFiles) {
      details += `\n${allowedVisibleFiles}`;
    } else {
      details += "\n(No visible files)";
    }

    details += "\n\n# VSCode Open Tabs";
    const openTabPaths = vscode.window.tabGroups.all
      .flatMap((group) => group.tabs)
      .map((tab) => (tab.input as vscode.TabInputText)?.uri?.fsPath)
      .filter(Boolean)
      .map((absolutePath) => path.relative(this.cwd, absolutePath));

    // Filter paths through valorideIgnoreController
    const allowedOpenTabs = this.valorideIgnoreController
      .filterPaths(openTabPaths)
      .map((p) => p.toPosix())
      .join("\n");

    if (allowedOpenTabs) {
      details += `\n${allowedOpenTabs}`;
    } else {
      details += "\n(No open tabs)";
    }

    const busyTerminals = this.terminalManager.getTerminals(true);
    const inactiveTerminals = this.terminalManager.getTerminals(false);

    if (busyTerminals.length > 0 && didEditFile) {
      await setTimeoutPromise(300); // delay after saving file to let terminals catch up
    }

    if (busyTerminals.length > 0) {
      // wait for terminals to cool down
      await pWaitFor(
        () =>
          busyTerminals.every((t) => !this.terminalManager.isProcessHot(t.id)),
        {
          interval: 100,
          timeout: 15_000,
        },
      ).catch(() => {});
    }

    // waiting for updated diagnostics lets terminal output be the most up-to-date possible
    let terminalDetails = "";
    if (busyTerminals.length > 0) {
      // terminals are cool, let's retrieve their output
      terminalDetails += "\n\n# Actively Running Terminals";
      for (const busyTerminal of busyTerminals) {
        terminalDetails += `\n## Original command: \`${busyTerminal.lastCommand}\``;
        const newOutput = this.terminalManager.getUnretrievedOutput(
          busyTerminal.id,
        );
        if (newOutput) {
          terminalDetails += `\n### New Output\n${newOutput}`;
        }
      }
    }
    // only show inactive terminals if there's output to show
    if (inactiveTerminals.length > 0) {
      const inactiveTerminalOutputs = new Map<number, string>();
      for (const inactiveTerminal of inactiveTerminals) {
        const newOutput = this.terminalManager.getUnretrievedOutput(
          inactiveTerminal.id,
        );
        if (newOutput) {
          inactiveTerminalOutputs.set(inactiveTerminal.id, newOutput);
        }
      }
      if (inactiveTerminalOutputs.size > 0) {
        terminalDetails += "\n\n# Inactive Terminals";
        for (const [terminalId, newOutput] of inactiveTerminalOutputs) {
          const inactiveTerminal = inactiveTerminals.find(
            (t) => t.id === terminalId,
          );
          if (inactiveTerminal) {
            terminalDetails += `\n## ${inactiveTerminal.lastCommand}`;
            terminalDetails += `\n### New Output\n${newOutput}`;
          }
        }
      }
    }

    if (terminalDetails) {
      details += terminalDetails;
    }

    // Add recently modified files section
    const recentlyModifiedFiles =
      this.fileContextTracker.getAndClearRecentlyModifiedFiles();
    if (recentlyModifiedFiles.length > 0) {
      details +=
        "\n\n# Recently Modified Files\nThese files have been modified since you last accessed them (file was just edited so you may need to re-read it before editing):";
      for (const filePath of recentlyModifiedFiles) {
        details += `\n${filePath}`;
      }
    }

    // Add current time information with timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    });
    const timeZone = formatter.resolvedOptions().timeZone;
    const timeZoneOffset = -now.getTimezoneOffset() / 60; // Convert to hours and invert sign to match conventional notation
    const timeZoneOffsetStr = `${timeZoneOffset >= 0 ? "+" : ""}${timeZoneOffset}:00`;
    details += `\n\n# Current Time\n${formatter.format(now)} (${timeZone}, UTC${timeZoneOffsetStr})`;

    if (includeFileDetails) {
      details += `\n\n# Current Working Directory (${this.cwd.toPosix()}) Files\n`;
      const isDesktop = arePathsEqual(this.cwd, path.join(os.homedir(), "Desktop"));
      if (isDesktop) {
        // don't want to immediately access desktop since it would show permission popup
        details +=
          "(Desktop files not shown automatically. Use list_files to explore if needed.)";
      } else {
        const [files, didHitLimit] = await listFiles(this.cwd, true, 200);
        const result = formatResponse.formatFilesList(
          this.cwd,
          files,
          didHitLimit,
          this.valorideIgnoreController,
        );
        details += result;
      }
    }

    // Add context window usage information
    if (api && valorideMessages.length > 0) {
      const { contextWindow } = getContextWindowInfo(api);

      // Get the token count from the most recent API request to accurately reflect context management
      const getTotalTokensFromApiReqMessage = (msg: ValorIDEMessage) => {
        if (!msg.text) {
          return 0;
        }
        try {
          const { tokensIn, tokensOut, cacheWrites, cacheReads } = JSON.parse(
            msg.text,
          );
          return (
            (tokensIn || 0) +
            (tokensOut || 0) +
            (cacheWrites || 0) +
            (cacheReads || 0)
          );
        } catch (e) {
          return 0;
        }
      };

      const modifiedMessages = combineApiRequests(
        combineCommandSequences(valorideMessages.slice(1)),
      );
      const lastApiReqMessage = findLast(modifiedMessages, (msg) => {
        if (msg.say !== "api_req_started") {
          return false;
        }
        return getTotalTokensFromApiReqMessage(msg) > 0;
      });

      const lastApiReqTotalTokens = lastApiReqMessage
        ? getTotalTokensFromApiReqMessage(lastApiReqMessage)
        : 0;
      const usagePercentage = Math.round(
        (lastApiReqTotalTokens / contextWindow) * 100,
      );

      details += "\n\n# Context Window Usage";
      details += `\n${lastApiReqTotalTokens.toLocaleString()} / ${(contextWindow / 1000).toLocaleString()}K tokens used (${usagePercentage}%)`;
    }

    details += "\n\n# Current Mode";
    if (chatSettings?.mode === "plan") {
      details += "\nPLAN MODE\n" + formatResponse.planModeInstructions();
    } else {
      details += "\nACT MODE";
    }

    return `<environment_details>\n${details.trim()}\n</environment_details>`;
  }
}
