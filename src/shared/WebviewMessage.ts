import { ApiConfiguration } from "./api";
import { AutoApprovalSettings } from "./AutoApprovalSettings";
import { BrowserSettings } from "./BrowserSettings";
import { ChatSettings } from "./ChatSettings";
import { ValorIDEAdvancedSettings } from "./AdvancedSettings";

import { ChatContent } from "./ChatContent";
import { TelemetrySetting } from "./TelemetrySetting";
import { McpViewTab } from "./mcp";

export interface WebviewMessage {
  type:
    | "addRemoteServer"
    | "apiConfiguration"
    | "webviewDidLaunch"
    | "newTask"
    | "condense"
    | "askResponse"
    | "didShowAnnouncement"
    | "selectImages"
    | "exportCurrentTask"
    | "showTaskWithId"
    | "deleteTaskWithId"
    | "exportTaskWithId"
    | "resetState"
    | "requestOllamaModels"
    | "requestLmStudioModels"
    | "openImage"
    | "openInBrowser"
    | "createRuleFile"
    | "openMention"
    | "showChatView"
    | "refreshOpenRouterModels"
    | "refreshRequestyModels"
    | "refreshOpenAiModels"
    | "refreshValorIDERules"
    | "openMcpSettings"
    | "restartMcpServer"
    | "deleteMcpServer"
    | "autoApprovalSettings"
    | "advancedSettings"
    | "browserSettings"
    | "browserRelaunchResult"
    | "togglePlanActMode"
    | "taskCompletionViewChanges"
    | "openExtensionSettings"
    | "requestVsCodeLmModels"
    | "toggleToolAutoApprove"
    | "getLatestState"
    | "accountLoginClicked"
    | "accountLogoutClicked"
    | "showAccountViewClicked"
    | "authStateChanged"
    | "authCallback"
    | "fetchMcpMarketplace"
    | "downloadMcp"
    | "silentlyRefreshMcpMarketplace"
    | "searchCommits"
    | "showMcpView"
    | "fetchLatestMcpServersFromHub"
    | "telemetrySetting"
    | "openSettings"
    | "fetchOpenGraphData"
    | "checkIsImageUrl"
    | "invoke"
    | "updateSettings"
    | "clearAllTaskHistory"
    | "fetchUserCreditsData"
    | "optionsResponse"
    | "requestTotalTasksSize"
    | "relaunchChromeDebugMode"
    | "taskFeedback"
    | "requestSetBudgetLimit"
    | "requestSetApiThrottle"
    | "getDetectedChromePath"
    | "detectedChromePath"
    | "scrollToSettings"
    | "getRelativePaths" // Handles single and multiple URI resolution
    | "searchFiles"
    | "toggleFavoriteModel"
    | "grpc_request"
    | "toggleValorIDERule"
    | "deleteValorIDERule"
    | "displayVSCodeInfo"
    | "displayVSCodeWarning"
    | "displayVSCodeError"
    | "accountLoginSuccess"
    | "streamToThorapi"
    | "openFileExplorerTab"
    | "getThorapiFolderContents"
    | "promptAddGeneratedToProject"
    | "addGeneratedToProject"
    | "startServer"
    | "uploadOpenAPISpec"
    | "openFile";

  // | "relaunchChromeDebugMode"
  text?: string;
  uris?: string[]; // Used for getRelativePaths
  disabled?: boolean;
  askResponse?: ValorIDEAskResponse;
  apiConfiguration?: ApiConfiguration;
  images?: string[];
  bool?: boolean;
  number?: number;
  autoApprovalSettings?: AutoApprovalSettings;
  advancedSettings?: ValorIDEAdvancedSettings;
  browserSettings?: BrowserSettings;
  chatSettings?: ChatSettings;
  chatContent?: ChatContent;
  mcpId?: string;
  timeout?: number;
  tab?: McpViewTab;
  // For toggleToolAutoApprove
  serverName?: string;
  serverUrl?: string;
  toolNames?: string[];
  autoApprove?: boolean;

  // For auth
  user?: { id: string; name: string } | null; // Replace with the actual structure of Principal
  customToken?: string;
  // For openInBrowser
  url?: string;
  planActSeparateModelsSetting?: boolean;
  telemetrySetting?: TelemetrySetting;
  customInstructionsSetting?: string;
  // For task feedback
  feedbackType?: TaskFeedbackType;
  mentionsRequestId?: string;
  query?: string;
  // For toggleFavoriteModel
  modelId?: string;
  grpc_request?: {
    service: string;
    method: string;
    message: any; // JSON serialized protobuf message
    request_id: string; // For correlating requests and responses
  };
  // For valoride rules
  isGlobal?: boolean;
  rulePath?: string;
  enabled?: boolean;
  filename?: string;

  offset?: number;
  // For streamToThorapi
  blobData?: string; // Base64 encoded blob data
  applicationId?: string;
  applicationName?: string; // User-friendly name for folder creation
  // For addGeneratedToProject
  folderName?: string; // Folder name for project integration
  // For startServer
  serverType?: "spring-boot" | "nestjs" | "typescript"; // Server type for starting services
  // For uploadOpenAPISpec
  fileContent?: string;
  fileSize?: number;
}

export type ValorIDEAskResponse =
  | "yesButtonClicked"
  | "noButtonClicked"
  | "messageResponse";

export type ValorIDECheckpointRestore =
  | "task"
  | "workspace"
  | "taskAndWorkspace";

export type TaskFeedbackType = "thumbs_up" | "thumbs_down";
