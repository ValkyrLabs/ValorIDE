import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import { handleGrpcRequest } from "./grpc-handler";
import { handleFileServiceRequest } from "./file";
import { selectImages } from "@integrations/misc/process-images";
import { openImage } from "@integrations/misc/open-file";
import { fetchOpenGraphData, isImageUrl } from "@integrations/misc/link-preview";
import { searchWorkspaceFiles } from "@services/search/file-search";
import { BrowserSession } from "@services/browser/BrowserSession";
import { telemetryService } from "@services/telemetry/TelemetryService";
import { extractLocalZip } from "@utils/zipExtractor";
import { searchCommits } from "@utils/git";
import { getWorkspacePath } from "@utils/path";
import { fileExistsAtPath } from "@utils/fs";
import { cwd } from "../task";
import { WebviewMessage } from "@shared/WebviewMessage";
import { ChatSettings } from "@shared/ChatSettings";
import { ChatContent } from "@shared/ChatContent";
import { TelemetrySetting } from "@shared/TelemetrySetting";
import { ValorIDERulesToggles } from "@shared/valoride-rules";
import { 
  getAllExtensionState,
  updateApiConfiguration,
  updateGlobalState,
  updateWorkspaceState,
  getGlobalState,
  getWorkspaceState
} from "../storage/state";
import {
  createRuleFile,
  deleteRuleFile,
  refreshValorIDERulesToggles,
} from "../context/instructions/user-instructions/valoride-rules";
import { buildApiHandler } from "@api/index";
import { openMention } from "../mentions";

export class WebviewMessageHandler {
  constructor(
    private context: vscode.ExtensionContext,
    private postMessageToWebview: (message: any) => Promise<void>,
    private postStateToWebview: () => Promise<void>,
    private initTask: (task?: string, images?: string[], historyItem?: any) => Promise<void>,
    private cancelTask: () => Promise<void>,
    private togglePlanActModeWithChatSettings: (chatSettings: ChatSettings, chatContent?: ChatContent) => Promise<void>,
    private updateCustomInstructions: (instructions?: string) => Promise<void>,
    private updateTelemetrySetting: (setting: TelemetrySetting) => Promise<void>,
    private deleteAllTaskHistory: () => Promise<void>,
    private refreshTotalTasksSize: () => Promise<void>,
    private showTaskWithId: (id: string) => Promise<void>,
    private deleteTaskWithId: (id: string) => Promise<void>,
    private exportTaskWithId: (id: string) => Promise<void>,
    private resetState: () => Promise<void>,
    private fetchUserCreditsData: () => Promise<void>,
    private handleAccountLogin: () => Promise<void>,
    private handleSignOut: () => Promise<void>,
    private setUserInfo: (info?: any) => Promise<void>,
    private handleDidShowAnnouncement: () => Promise<void>,
    private getOllamaModels: (baseUrl?: string) => Promise<string[]>,
    private getLmStudioModels: (baseUrl?: string) => Promise<string[]>,
    private getVsCodeLmModels: () => Promise<any[]>,
    private refreshOpenRouterModels: () => Promise<any>,
    private refreshRequestyModels: () => Promise<any>,
    private getOpenAiModels: (baseUrl?: string, apiKey?: string) => Promise<string[]>,
    private toggleFavoriteModel: (modelId: string) => Promise<boolean>,
    private fetchMcpMarketplace: (forceRefresh?: boolean) => Promise<void>,
    private downloadMcp: (mcpId: string) => Promise<void>,
    private silentlyRefreshMcpMarketplace: () => Promise<void>,
    private fetchOpenGraphData: (url: string) => Promise<void>,
    private checkIsImageUrl: (url: string) => Promise<void>,
    private getThorapiFolderStructure: (folderPath: string) => Promise<any[]>,
    private controllerInstance: any, // Pass the controller instance for functions that need it
    private task?: any,
    private mcpHub?: any
  ) {}

  async handleWebviewMessage(message: WebviewMessage) {
    switch (message.type) {
      case "openFile": {
        const relPath = (message as any).text;
        if (relPath) {
          const absPath = path.join(cwd, relPath);
          await handleFileServiceRequest(this.controllerInstance, "openFile", { value: absPath });
        }
        break;
      }
      case "addRemoteServer": {
        try {
          await this.mcpHub?.addRemoteServer(
            message.serverName!,
            message.serverUrl!,
          );
          await this.postMessageToWebview({
            type: "addRemoteServerResult",
            addRemoteServerResult: {
              success: true,
              serverName: message.serverName!,
            },
          });
        } catch (error) {
          await this.postMessageToWebview({
            type: "addRemoteServerResult",
            addRemoteServerResult: {
              success: false,
              serverName: message.serverName!,
              error: error.message,
            },
          });
        }
        break;
      }
      case "authStateChanged":
        await this.setUserInfo(
          message.user
            ? {
                username: message.user.name || null,
                email: null,
                avatarUrl: null,
              }
            : undefined,
        );
        await this.postStateToWebview();
        break;
      case "webviewDidLaunch":
        await this.handleWebviewDidLaunch();
        break;
      case "showChatView": {
        this.postMessageToWebview({
          type: "action",
          action: "chatButtonClicked",
        });
        break;
      }
      case "newTask":
        await this.initTask(message.text, message.images);
        break;
      case "condense":
        this.task?.handleWebviewAskResponse("yesButtonClicked");
        break;
      case "apiConfiguration":
        if (message.apiConfiguration) {
          await updateApiConfiguration(this.context, message.apiConfiguration);
          if (this.task) {
            this.task.api = buildApiHandler(message.apiConfiguration);
          }
        }
        await this.postStateToWebview();
        break;
      case "autoApprovalSettings":
        await this.handleAutoApprovalSettings(message);
        break;
      case "browserSettings":
        await this.handleBrowserSettings(message);
        break;
      case "togglePlanActMode":
        if (message.chatSettings) {
          await this.togglePlanActModeWithChatSettings(
            message.chatSettings,
            message.chatContent,
          );
        }
        break;
      case "optionsResponse":
        await this.postMessageToWebview({
          type: "invoke",
          invoke: "sendMessage",
          text: message.text,
        });
        break;
      case "relaunchChromeDebugMode":
        await this.handleRelaunchChromeDebugMode();
        break;
      case "askResponse":
        this.task?.handleWebviewAskResponse(
          message.askResponse!,
          message.text,
          message.images,
        );
        break;
      case "didShowAnnouncement":
        await this.handleDidShowAnnouncement();
        break;
      case "selectImages":
        await this.handleSelectImages();
        break;
      case "exportCurrentTask":
        const currentTaskId = this.task?.taskId;
        if (currentTaskId) {
          this.exportTaskWithId(currentTaskId);
        }
        break;
      case "showTaskWithId":
        this.showTaskWithId(message.text!);
        break;
      case "deleteTaskWithId":
        this.deleteTaskWithId(message.text!);
        break;
      case "exportTaskWithId":
        this.exportTaskWithId(message.text!);
        break;
      case "resetState":
        await this.resetState();
        break;
      case "requestOllamaModels":
        await this.handleRequestOllamaModels(message.text);
        break;
      case "requestLmStudioModels":
        await this.handleRequestLmStudioModels(message.text);
        break;
      case "requestVsCodeLmModels":
        await this.handleRequestVsCodeLmModels();
        break;
      case "refreshOpenRouterModels":
        await this.refreshOpenRouterModels();
        break;
      case "refreshRequestyModels":
        await this.refreshRequestyModels();
        break;
      case "refreshOpenAiModels":
        await this.handleRefreshOpenAiModels();
        break;
      case "refreshValorIDERules":
        await this.handleRefreshValorIDERules();
        break;
      case "openImage":
        openImage(message.text!);
        break;
      case "openInBrowser":
        if (message.url) {
          vscode.env.openExternal(vscode.Uri.parse(message.url));
        }
        break;
      case "fetchOpenGraphData":
        this.fetchOpenGraphData(message.text!);
        break;
      case "checkIsImageUrl":
        this.checkIsImageUrl(message.text!);
        break;
      case "createRuleFile":
        await this.handleCreateRuleFile(message);
        break;
      case "openMention":
        openMention(message.text);
        break;
      case "taskCompletionViewChanges": {
        if (message.number) {
          await this.task?.presentMultifileDiff(message.number, true);
        }
        break;
      }
      case "getLatestState":
        await this.postStateToWebview();
        break;
      case "accountLoginClicked": {
        await this.handleAccountLogin();
        break;
      }
      case "accountLogoutClicked": {
        await this.handleSignOut();
        break;
      }
      case "showAccountViewClicked": {
        await this.postMessageToWebview({
          type: "action",
          action: "accountButtonClicked",
        });
        break;
      }
      case "fetchUserCreditsData": {
        await this.fetchUserCreditsData();
        break;
      }
      case "showMcpView": {
        await this.postMessageToWebview({
          type: "action",
          action: "mcpButtonClicked",
          tab: message.tab || undefined,
        });
        break;
      }
      case "openMcpSettings": {
        await this.handleOpenMcpSettings();
        break;
      }
      case "fetchMcpMarketplace": {
        await this.fetchMcpMarketplace(message.bool);
        break;
      }
      case "downloadMcp": {
        if (message.mcpId) {
          await this.handleDownloadMcp(message.mcpId);
        }
        break;
      }
      case "silentlyRefreshMcpMarketplace": {
        await this.silentlyRefreshMcpMarketplace();
        break;
      }
      case "taskFeedback":
        if (message.feedbackType && this.task?.taskId) {
          telemetryService.captureTaskFeedback(
            this.task.taskId,
            message.feedbackType,
          );
        }
        break;
      case "toggleToolAutoApprove": {
        await this.handleToggleToolAutoApprove(message);
        break;
      }
      case "toggleValorIDERule": {
        await this.handleToggleValorIDERule(message);
        break;
      }
      case "deleteValorIDERule": {
        await this.handleDeleteValorIDERule(message);
        break;
      }
      case "requestTotalTasksSize": {
        this.refreshTotalTasksSize();
        break;
      }
      case "restartMcpServer": {
        try {
          await this.mcpHub?.restartConnection(message.text!);
        } catch (error) {
          console.error(
            `Failed to retry connection for ${message.text}:`,
            error,
          );
        }
        break;
      }
      case "deleteMcpServer": {
        if (message.serverName) {
          this.mcpHub?.deleteServer(message.serverName);
        }
        break;
      }
      case "fetchLatestMcpServersFromHub": {
        this.mcpHub?.sendLatestMcpServers();
        break;
      }
      case "searchCommits": {
        await this.handleSearchCommits(message.text || "");
        break;
      }
      case "openExtensionSettings": {
        const settingsFilter = message.text || "";
        await vscode.commands.executeCommand(
          "workbench.action.openSettings",
          `@ext:valkyrlabsinc.valoride-dev ${settingsFilter}`.trim(),
        );
        break;
      }
      case "invoke": {
        if (message.text) {
          await this.postMessageToWebview({
            type: "invoke",
            invoke: message.text as any,
          });
        }
        break;
      }
      case "openSettings": {
        await this.postMessageToWebview({
          type: "action",
          action: "settingsButtonClicked",
        });
        break;
      }
      case "scrollToSettings": {
        await this.postMessageToWebview({
          type: "scrollToSettings",
          text: message.text,
        });
        break;
      }
      case "telemetrySetting": {
        if (message.telemetrySetting) {
          await this.updateTelemetrySetting(message.telemetrySetting);
        }
        await this.postStateToWebview();
        break;
      }
      case "updateSettings": {
        await this.handleUpdateSettings(message);
        break;
      }
      case "clearAllTaskHistory": {
        await this.handleClearAllTaskHistory();
        break;
      }
      case "getDetectedChromePath": {
        await this.handleGetDetectedChromePath();
        break;
      }
      case "getRelativePaths": {
        await this.handleGetRelativePaths(message);
        break;
      }
      case "searchFiles": {
        await this.handleSearchFiles(message);
        break;
      }
      case "toggleFavoriteModel": {
        await this.handleToggleFavoriteModel(message);
        break;
      }
      case "grpc_request": {
        if (message.grpc_request) {
          await handleGrpcRequest(this.controllerInstance, message.grpc_request);
        }
        break;
      }
      case "getThorapiFolderContents": {
        await this.handleGetThorapiFolderContents(message);
        break;
      }
      case "streamToThorapi": {
        await this.handleStreamToThorapi(message);
        break;
      }
    }
  }

  private async handleWebviewDidLaunch() {
    this.postStateToWebview();
    // Additional webview launch logic would go here
  }

  private async handleAutoApprovalSettings(message: WebviewMessage) {
    if (message.autoApprovalSettings) {
      const currentSettings = (await getAllExtensionState(this.context))
        .autoApprovalSettings;
      const incomingVersion = message.autoApprovalSettings.version ?? 1;
      const currentVersion = currentSettings?.version ?? 1;
      if (incomingVersion > currentVersion) {
        await updateGlobalState(
          this.context,
          "autoApprovalSettings",
          message.autoApprovalSettings,
        );
        if (this.task) {
          this.task.autoApprovalSettings = message.autoApprovalSettings;
        }
        await this.postStateToWebview();
      }
    }
  }

  private async handleBrowserSettings(message: WebviewMessage) {
    if (message.browserSettings) {
      await updateGlobalState(
        this.context,
        "browserSettings",
        message.browserSettings,
      );
      if (this.task) {
        this.task.browserSettings = message.browserSettings;
        this.task.browserSession.browserSettings = message.browserSettings;
      }
      await this.postStateToWebview();
    }
  }

  private async handleRelaunchChromeDebugMode() {
    const { browserSettings } = await getAllExtensionState(this.context);
    const browserSession = new BrowserSession(this.context, browserSettings);
    await browserSession.relaunchChromeDebugMode(this.controllerInstance);
  }

  private async handleSelectImages() {
    const images = await selectImages();
    await this.postMessageToWebview({
      type: "selectedImages",
      images,
    });
  }

  private async handleRequestOllamaModels(baseUrl?: string) {
    const ollamaModels = await this.getOllamaModels(baseUrl);
    this.postMessageToWebview({
      type: "ollamaModels",
      ollamaModels,
    });
  }

  private async handleRequestLmStudioModels(baseUrl?: string) {
    const lmStudioModels = await this.getLmStudioModels(baseUrl);
    this.postMessageToWebview({
      type: "lmStudioModels",
      lmStudioModels,
    });
  }

  private async handleRequestVsCodeLmModels() {
    const vsCodeLmModels = await this.getVsCodeLmModels();
    this.postMessageToWebview({ type: "vsCodeLmModels", vsCodeLmModels });
  }

  private async handleRefreshOpenAiModels() {
    const { apiConfiguration } = await getAllExtensionState(this.context);
    const openAiModels = await this.getOpenAiModels(
      apiConfiguration.openAiBaseUrl,
      apiConfiguration.openAiApiKey,
    );
    this.postMessageToWebview({ type: "openAiModels", openAiModels });
  }

  private async handleRefreshValorIDERules() {
    await refreshValorIDERulesToggles(this.context, cwd);
    await this.postStateToWebview();
  }

  private async handleCreateRuleFile(message: WebviewMessage) {
    if (
      typeof message.isGlobal !== "boolean" ||
      typeof message.filename !== "string" ||
      !message.filename
    ) {
      console.error("createRuleFile: Missing or invalid parameters", {
        isGlobal:
          typeof message.isGlobal === "boolean"
            ? message.isGlobal
            : `Invalid: ${typeof message.isGlobal}`,
        filename:
          typeof message.filename === "string"
            ? message.filename
            : `Invalid: ${typeof message.filename}`,
      });
      return;
    }
    const { filePath, fileExists } = await createRuleFile(
      message.isGlobal,
      message.filename,
      cwd,
    );
    if (fileExists && filePath) {
      vscode.window.showWarningMessage(
        `Rule file "${message.filename}" already exists.`,
      );
      await handleFileServiceRequest(this.controllerInstance, "openFile", { value: filePath });
      return;
    } else if (filePath && !fileExists) {
      await refreshValorIDERulesToggles(this.context, cwd);
      await this.postStateToWebview();
      await handleFileServiceRequest(this.controllerInstance, "openFile", { value: filePath });
      vscode.window.showInformationMessage(
        `Created new ${message.isGlobal ? "global" : "workspace"} rule file: ${message.filename}`,
      );
    } else {
      vscode.window.showErrorMessage(`Failed to create rule file.`);
    }
  }

  private async handleOpenMcpSettings() {
    const mcpSettingsFilePath = await this.mcpHub?.getMcpSettingsFilePath();
    if (mcpSettingsFilePath) {
      await handleFileServiceRequest(this.controllerInstance, "openFile", {
        value: mcpSettingsFilePath,
      });
    }
  }

  private async handleDownloadMcp(mcpId: string) {
    // Toggle to act mode if we are in plan mode
    const { chatSettings } = await getAllExtensionState(this.context);
    if (chatSettings.mode === "plan") {
      await this.togglePlanActModeWithChatSettings({ mode: "act" });
    }
    await this.downloadMcp(mcpId);
  }

  private async handleToggleToolAutoApprove(message: WebviewMessage) {
    try {
      await this.mcpHub?.toggleToolAutoApprove(
        message.serverName!,
        message.toolNames!,
        message.autoApprove!,
      );
    } catch (error) {
      if (message.toolNames?.length === 1) {
        console.error(
          `Failed to toggle auto-approve for server ${message.serverName} with tool ${message.toolNames[0]}:`,
          error,
        );
      } else {
        console.error(
          `Failed to toggle auto-approve tools for server ${message.serverName}:`,
          error,
        );
      }
    }
  }

  private async handleToggleValorIDERule(message: WebviewMessage) {
    const { isGlobal, rulePath, enabled } = message;
    if (
      rulePath &&
      typeof enabled === "boolean" &&
      typeof isGlobal === "boolean"
    ) {
      if (isGlobal) {
        const toggles =
          ((await getGlobalState(
            this.context,
            "globalValorIDERulesToggles",
          )) as ValorIDERulesToggles) || {};
        toggles[rulePath] = enabled;
        await updateGlobalState(
          this.context,
          "globalValorIDERulesToggles",
          toggles,
        );
      } else {
        const toggles =
          ((await getWorkspaceState(
            this.context,
            "localValorIDERulesToggles",
          )) as ValorIDERulesToggles) || {};
        toggles[rulePath] = enabled;
        await updateWorkspaceState(
          this.context,
          "localValorIDERulesToggles",
          toggles,
        );
      }
      await this.postStateToWebview();
    } else {
      console.error("toggleValorIDERule: Missing or invalid parameters", {
        rulePath,
        isGlobal:
          typeof isGlobal === "boolean"
            ? isGlobal
            : `Invalid: ${typeof isGlobal}`,
        enabled:
          typeof enabled === "boolean"
            ? enabled
            : `Invalid: ${typeof enabled}`,
      });
    }
  }

  private async handleDeleteValorIDERule(message: WebviewMessage) {
    const { isGlobal, rulePath } = message;
    if (rulePath && typeof isGlobal === "boolean") {
      const result = await deleteRuleFile(this.context, rulePath, isGlobal);
      if (result.success) {
        await refreshValorIDERulesToggles(this.context, cwd);
        await this.postStateToWebview();
      } else {
        console.error("Failed to delete rule file:", result.message);
      }
    } else {
      console.error("deleteValorIDERule: Missing or invalid parameters", {
        rulePath,
        isGlobal:
          typeof isGlobal === "boolean"
            ? isGlobal
            : `Invalid: ${typeof isGlobal}`,
      });
    }
  }

  private async handleSearchCommits(query: string) {
    const cwd = vscode.workspace.workspaceFolders
      ?.map((folder) => folder.uri.fsPath)
      .at(0);
    if (cwd) {
      try {
        const commits = await searchCommits(query, cwd);
        await this.postMessageToWebview({
          type: "commitSearchResults",
          commits,
        });
      } catch (error) {
        console.error(`Error searching commits: ${JSON.stringify(error)}`);
      }
    }
  }

  private async handleUpdateSettings(message: WebviewMessage) {
    // api config
    if (message.apiConfiguration) {
      await updateApiConfiguration(this.context, message.apiConfiguration);
      if (this.task) {
        this.task.api = buildApiHandler(message.apiConfiguration);
      }
    }

    // custom instructions
    await this.updateCustomInstructions(message.customInstructionsSetting);

    // telemetry setting
    if (message.telemetrySetting) {
      await this.updateTelemetrySetting(message.telemetrySetting);
    }

    // plan act setting
    await updateGlobalState(
      this.context,
      "planActSeparateModelsSetting",
      message.planActSeparateModelsSetting,
    );

    await this.postStateToWebview();
    await this.postMessageToWebview({ type: "didUpdateSettings" });
  }

  private async handleClearAllTaskHistory() {
    await this.deleteAllTaskHistory();
    await this.postStateToWebview();
    this.refreshTotalTasksSize();
    this.postMessageToWebview({ type: "relinquishControl" });
  }

  private async handleGetDetectedChromePath() {
    try {
      const { browserSettings } = await getAllExtensionState(this.context);
      const browserSession = new BrowserSession(this.context, browserSettings);
      const { path, isBundled } = await browserSession.getDetectedChromePath();
      await this.postMessageToWebview({
        type: "detectedChromePath",
        text: path,
        isBundled,
      });
    } catch (error) {
      console.error("Error getting detected Chrome path:", error);
    }
  }

  private async handleGetRelativePaths(message: WebviewMessage) {
    if (message.uris && message.uris.length > 0) {
      const resolvedPaths = await Promise.all(
        message.uris.map(async (uriString) => {
          try {
            const fileUri = vscode.Uri.parse(uriString, true);
            const relativePath = vscode.workspace.asRelativePath(
              fileUri,
              false,
            );

            if (path.isAbsolute(relativePath)) {
              console.warn(
                `Dropped file ${relativePath} is outside the workspace. Sending original path.`,
              );
              return fileUri.fsPath.replace(/\\/g, "/");
            } else {
              let finalPath = "/" + relativePath.replace(/\\/g, "/");
              try {
                const stat = await vscode.workspace.fs.stat(fileUri);
                if (stat.type === vscode.FileType.Directory) {
                  finalPath += "/";
                }
              } catch (statError) {
                console.error(
                  `Error stating file ${fileUri.fsPath}:`,
                  statError,
                );
              }
              return finalPath;
            }
          } catch (error) {
            console.error(
              `Error calculating relative path for ${uriString}:`,
              error,
            );
            return null;
          }
        }),
      );
      await this.postMessageToWebview({
        type: "relativePathsResponse",
        paths: resolvedPaths,
      });
    }
  }

  private async handleSearchFiles(message: WebviewMessage) {
    const workspacePath = getWorkspacePath();

    if (!workspacePath) {
      await this.postMessageToWebview({
        type: "fileSearchResults",
        results: [],
        mentionsRequestId: message.mentionsRequestId,
        error: "No workspace path available",
      });
      return;
    }
    try {
      const results = await searchWorkspaceFiles(
        message.query || "",
        workspacePath,
        20,
      );

      await this.postMessageToWebview({
        type: "fileSearchResults",
        results,
        mentionsRequestId: message.mentionsRequestId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.postMessageToWebview({
        type: "fileSearchResults",
        results: [],
        error: errorMessage,
        mentionsRequestId: message.mentionsRequestId,
      });
    }
  }

  private async handleToggleFavoriteModel(message: WebviewMessage) {
    if (message.modelId) {
      const isFavorited = await this.toggleFavoriteModel(message.modelId);
      
      // Capture telemetry for model favorite toggle
      telemetryService.captureModelFavoritesUsage(
        message.modelId,
        isFavorited,
      );

      await this.postStateToWebview();
    }
  }

  private async handleGetThorapiFolderContents(message: WebviewMessage) {
    try {
      const thorapiFolderPath = path.join(cwd, "thorapi");
      const files = await this.getThorapiFolderStructure(thorapiFolderPath);

      await this.postMessageToWebview({
        type: "workspaceFiles",
        files: files,
        mentionsRequestId: message.mentionsRequestId,
      });
    } catch (error) {
      console.error("Error getting thorapi folder contents:", error);
      await this.postMessageToWebview({
        type: "workspaceFiles",
        files: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to load thorapi folder contents",
        mentionsRequestId: message.mentionsRequestId,
      });
    }
  }

  private async handleStreamToThorapi(message: WebviewMessage) {
    try {
      const { blobData, applicationId, applicationName, filename } = message;
      if (!blobData || !applicationId) {
        throw new Error("Missing required data for streamToThorapi");
      }

      // Create thorapi directory if it doesn't exist
      const thorapiFolderPath = path.join(cwd, "thorapi");
      await fs.mkdir(thorapiFolderPath, { recursive: true });

      // Use provided filename or generate one
      const finalFilename =
        filename || `application-${applicationId}-${Date.now()}.zip`;
      const filePath = path.join(thorapiFolderPath, finalFilename);

      // Convert base64 back to binary and write file
      const binaryData = Buffer.from(blobData, "base64");
      await fs.writeFile(filePath, binaryData);

      // Extract if it's a zip file
      let extractedPath: string | undefined;
      if (finalFilename.endsWith(".zip")) {
        const folderName = applicationName || applicationId;
        await extractLocalZip(filePath, thorapiFolderPath, folderName);
        extractedPath = path.join(thorapiFolderPath, folderName);
        await fs.unlink(filePath);
      }

      await this.postMessageToWebview({
        type: "streamToThorapiResult",
        streamToThorapiResult: {
          success: true,
          applicationId,
          filePath,
          filename: finalFilename,
          extractedPath,
        },
      });
    } catch (error) {
      console.error("Error in streamToThorapi:", error);
      await this.postMessageToWebview({
        type: "streamToThorapiResult",
        streamToThorapiResult: {
          success: false,
          applicationId: message.applicationId,
          error:
            error instanceof Error
              ? error.message
              : "Failed to stream to thorapi",
        },
      });
    }
  }
}
