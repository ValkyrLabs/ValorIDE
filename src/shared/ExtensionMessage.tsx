// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'

import { GitCommit } from "../utils/git";
import { ApiConfiguration, ModelInfo } from "./api";
import { AutoApprovalSettings } from "./AutoApprovalSettings";
import { BrowserSettings } from "./BrowserSettings";
import { ValorIDEAdvancedSettings } from "./AdvancedSettings";
import { ChatSettings } from "./ChatSettings";
import { HistoryItem } from "./HistoryItem";
import {
  McpServer,
  McpMarketplaceCatalog,
  McpDownloadResponse,
  McpViewTab,
} from "./mcp";
import { TelemetrySetting } from "./TelemetrySetting";
import type {
  BalanceResponse,
  UsageTransaction,
  PaymentTransaction,
} from "./ValorIDEAccount";
import { ValorIDERulesToggles } from "./valoride-rules";

export interface RemoteCommand {
  id: string;
  type: string;
  payload: any;
  sourceInstanceId: string;
  targetInstanceId?: string;
}

// webview will hold state
export interface ExtensionMessage {
  type:
    | "action"
    | "state"
    | "selectedImages"
    | "ollamaModels"
    | "lmStudioModels"
    | "theme"
    | "workspaceUpdated"
    | "invoke"
    | "partialMessage"
    | "openRouterModels"
    | "openAiModels"
    | "requestyModels"
    | "mcpServers"
    | "relinquishControl"
    | "vsCodeLmModels"
    | "requestVsCodeLmModels"
    | "authCallback"
    | "mcpMarketplaceCatalog"
    | "mcpDownloadDetails"
    | "commitSearchResults"
    | "openGraphData"
    | "isImageUrlResult"
    | "didUpdateSettings"
    | "addRemoteServerResult"
    | "userCreditsBalance"
    | "userCreditsUsage"
    | "userCreditsPayments"
    | "totalTasksSize"
    | "addToInput"
    | "browserConnectionResult"
    | "detectedChromePath"
    | "scrollToSettings"
    | "browserRelaunchResult"
    | "relativePathsResponse" // Handles single and multiple path responses
    | "fileSearchResults"
    | "grpc_response" // New type for gRPC responses
    | "loginSuccess"
    | "streamToThorapiResult"
    | "openFileExplorerResult"
    | "workspaceFiles"
    | "contentData"
    | "LIST_APPLICATION_SUCCESS"
    | "remoteCommand";
  text?: string;
  path?: string; // Used for openFileExplorerResult
  paths?: (string | null)[]; // Used for relativePathsResponse
  action?:
    | "chatButtonClicked"
    | "mcpButtonClicked"
    | "settingsButtonClicked"
    | "historyButtonClicked"
    | "didBecomeVisible"
    | "accountLoginClicked"
    | "accountLogoutClicked"
    | "accountButtonClicked"
    | "focusChatInput"
    | "generatedFilesButtonClicked"
    | "serverConsoleButtonClicked";

  invoke?: Invoke;
  state?: ExtensionState;
  images?: string[];
  ollamaModels?: string[];
  lmStudioModels?: string[];
  vsCodeLmModels?: {
    vendor?: string;
    family?: string;
    version?: string;
    id?: string;
  }[];
  filePaths?: string[];
  partialMessage?: ValorIDEMessage;
  openRouterModels?: Record<string, ModelInfo>;
  openAiModels?: string[];
  requestyModels?: Record<string, ModelInfo>;
  mcpServers?: McpServer[];
  customToken?: string;
  token?: string; // JWT token for authentication
  authenticatedPrincipal?: string; // JSON string of authenticated principal
  mcpMarketplaceCatalog?: McpMarketplaceCatalog;
  error?: string;
  mcpDownloadDetails?: McpDownloadResponse;
  commits?: GitCommit[];
  openGraphData?: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    siteName?: string;
    type?: string;
  };
  url?: string;
  isImage?: boolean;
  userCreditsBalance?: BalanceResponse;
  userCreditsUsage?: UsageTransaction[];
  userCreditsPayments?: PaymentTransaction[];
  totalTasksSize?: number | null;
  success?: boolean;
  endpoint?: string;
  isBundled?: boolean;
  isConnected?: boolean;
  isRemote?: boolean;
  host?: string;
  mentionsRequestId?: string;
  results?: Array<{
    path: string;
    type: "file" | "folder";
    label?: string;
  }>;
  addRemoteServerResult?: {
    success: boolean;
    serverName: string;
    error?: string;
  };
  tab?: McpViewTab;
  grpc_response?: {
    message?: any; // JSON serialized protobuf message
    request_id: string; // Same ID as the request
    error?: string; // Optional error message
  };
  streamToThorapiResult?: {
    success: boolean;
    applicationId?: string;
    error?: string;
    filePath?: string;
    filename?: string;
    extractedPath?: string;
    readmePath?: string;
    step?: string;
    message?: string;
  };
  files?: Array<{
    name: string;
    path: string;
    type: "file" | "directory";
    children?: Array<{
      name: string;
      path: string;
      type: "file" | "directory";
    }>;
  }>;
  contentData?: any; // Data from the ContentData endpoint
  command?: RemoteCommand; // Remote command from mothership
}

export type Invoke =
  | "sendMessage"
  | "primaryButtonClick"
  | "secondaryButtonClick";

export type Platform =
  | "aix"
  | "darwin"
  | "freebsd"
  | "linux"
  | "openbsd"
  | "sunos"
  | "win32"
  | "unknown";

export const DEFAULT_PLATFORM = "unknown";

export interface UserInfo {
  username: string | null;
  email: string | null;
  avatarUrl?: string | null;
  password: string; // Make password optional
}

export interface ExtensionState {
  apiConfiguration?: ApiConfiguration;
  autoApprovalSettings: AutoApprovalSettings;
  browserSettings: BrowserSettings;
  advancedSettings?: ValorIDEAdvancedSettings;
  remoteBrowserHost?: string;
  chatSettings: ChatSettings;
  checkpointTrackerErrorMessage?: string;
  valorideMessages: ValorIDEMessage[];
  currentTaskItem?: HistoryItem;
  customInstructions?: string;
  mcpMarketplaceEnabled?: boolean;
  planActSeparateModelsSetting: boolean;
  platform: Platform;
  shouldShowAnnouncement: boolean;
  taskHistory: HistoryItem[];
  telemetrySetting: TelemetrySetting;
  uriScheme?: string;
  userInfo?: UserInfo;
  version: string;
  vscMachineId: string;
  globalValorIDERulesToggles: ValorIDERulesToggles;
  localValorIDERulesToggles: ValorIDERulesToggles;
  jwtToken?: string;
  authenticatedPrincipal?: any;
  isLoggedIn?: boolean;
}

export interface ValorIDEMessage {
  ts: number;
  type: "ask" | "say";
  ask?: ValorIDEAsk;
  say?: ValorIDESay;
  text?: string;
  reasoning?: string;
  images?: string[];
  partial?: boolean;
  lastCheckpointHash?: string;
  isCheckpointCheckedOut?: boolean;
  isOperationOutsideWorkspace?: boolean;
  conversationHistoryIndex?: number;
  conversationHistoryDeletedRange?: [number, number]; // for when conversation history is truncated for API requests
}

export type ValorIDEAsk =
  | "followup"
  | "plan_mode_respond"
  | "command"
  | "command_output"
  | "completion_result"
  | "tool"
  | "api_req_failed"
  | "resume_task"
  | "resume_completed_task"
  | "mistake_limit_reached"
  | "auto_approval_max_req_reached"
  | "browser_action_launch"
  | "use_mcp_server"
  | "new_task"
  | "condense";

export type ValorIDESay =
  | "task"
  | "error"
  | "api_req_started"
  | "api_req_finished"
  | "text"
  | "reasoning"
  | "completion_result"
  | "user_feedback"
  | "user_feedback_diff"
  | "api_req_retried"
  | "command"
  | "command_output"
  | "tool"
  | "shell_integration_warning"
  | "browser_action_launch"
  | "browser_action"
  | "browser_action_result"
  | "mcp_server_request_started"
  | "mcp_server_response"
  | "use_mcp_server"
  | "diff_error"
  | "deleted_api_reqs"
  | "valorideignore_error"
  | "checkpoint_created"
  | "load_mcp_documentation"
  | "p2p_chat_message";

export interface ValorIDESayTool {
  tool:
    | "editedExistingFile"
    | "newFileCreated"
    | "readFile"
    | "listFilesTopLevel"
    | "listFilesRecursive"
    | "listCodeDefinitionNames"
    | "searchFiles";
  path?: string;
  diff?: string;
  content?: string;
  regex?: string;
  filePattern?: string;
  operationIsLocatedInWorkspace?: boolean;
}

// must keep in sync with system prompt
export const browserActions = [
  "launch",
  "click",
  "type",
  "scroll_down",
  "scroll_up",
  "close",
] as const;
export type BrowserAction = (typeof browserActions)[number];

export interface ValorIDESayBrowserAction {
  action: BrowserAction;
  coordinate?: string;
  text?: string;
}

export type BrowserActionResult = {
  screenshot?: string;
  logs?: string;
  currentUrl?: string;
  currentMousePosition?: string;
};

export interface ValorIDEAskUseMcpServer {
  serverName: string;
  type: "use_mcp_tool" | "access_mcp_resource";
  toolName?: string;
  arguments?: string;
  uri?: string;
}

export interface ValorIDEPlanModeResponse {
  response: string;
  options?: string[];
  selected?: string;
}

export interface ValorIDEAskQuestion {
  question: string;
  options?: string[];
  selected?: string;
}

export interface ValorIDEAskNewTask {
  context: string;
}

export interface ValorIDEP2PChatMessage {
  fromHandle: string;
  toHandle?: string; // If undefined, it's a broadcast message
  message: string;
  timestamp: number;
  messageId: string;
}

export interface ValorIDEApiReqInfo {
  request?: string;
  tokensIn?: number;
  tokensOut?: number;
  cacheWrites?: number;
  cacheReads?: number;
  cost?: number;
  cancelReason?: ValorIDEApiReqCancelReason;
  streamingFailedMessage?: string;
}

export type ValorIDEApiReqCancelReason = "streaming_failed" | "user_cancelled";

export const COMPLETION_RESULT_CHANGES_FLAG = "HAS_CHANGES";
