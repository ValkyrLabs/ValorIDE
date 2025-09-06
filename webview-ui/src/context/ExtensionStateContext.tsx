import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useEvent } from "react-use";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings";
import {
  ExtensionMessage,
  ExtensionState,
  DEFAULT_PLATFORM,
} from "@shared/ExtensionMessage";

import {
  ApiConfiguration,
  ModelInfo,
  openRouterDefaultModelId,
  openRouterDefaultModelInfo,
  requestyDefaultModelId,
  requestyDefaultModelInfo,
} from "../../../src/shared/api";
import { findLastIndex } from "@shared/array";
import { McpMarketplaceCatalog, McpServer } from "../../../src/shared/mcp";
import { convertTextMateToHljs } from "../utils/textMateToHljs";
import { vscode } from "../utils/vscode";
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings";
import { DEFAULT_CHAT_SETTINGS } from "@shared/ChatSettings";
import { TelemetrySetting } from "@shared/TelemetrySetting";
import { Principal } from "@/thor/model";
import { Application } from "@/thor/model/Application";

interface ExtensionStateContextType extends ExtensionState {
  didHydrateState: boolean;
  showWelcome: boolean;
  theme: Record<string, string> | undefined;
  openRouterModels: Record<string, ModelInfo>;
  openAiModels: string[];
  requestyModels: Record<string, ModelInfo>;
  mcpServers: McpServer[];
  mcpMarketplaceCatalog: McpMarketplaceCatalog;
  filePaths: string[];
  totalTasksSize: number | null;
  setApiConfiguration: (config: ApiConfiguration) => void;
  setCustomInstructions: (value?: string) => void;

  setShowAnnouncement: (value: boolean) => void;
  setPlanActSeparateModelsSetting: (value: boolean) => void;
  setTelemetrySetting: (value: TelemetrySetting) => void;
  setMcpServers: (value: McpServer[]) => void;
  userInfo?: Principal;
  isLoggedIn?: boolean;

  jwtToken?: string;
  authenticatedPrincipal?: Principal;

  // Applications state
  applications: Application[];
  applicationsLoading: boolean;
  applicationsError: any;

  // MCP loading and error states
  mcpServersLoading: boolean;
  mcpServersError: any;
  mcpMarketplaceCatalogLoading: boolean;
  mcpMarketplaceCatalogError: any;
  refetchMcpData: () => void;
}

const ExtensionStateContext = createContext<
  ExtensionStateContextType | undefined
>(undefined);

export const ExtensionStateContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, setState] = useState<ExtensionState>({
    version: "",
    valorideMessages: [],
    taskHistory: [],
    shouldShowAnnouncement: false,
    autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
    browserSettings: DEFAULT_BROWSER_SETTINGS,
    chatSettings: DEFAULT_CHAT_SETTINGS,
    platform: DEFAULT_PLATFORM,
    telemetrySetting: "unset",
    vscMachineId: "",
    planActSeparateModelsSetting: true,
    globalValorIDERulesToggles: {},
    localValorIDERulesToggles: {},
  });
  const [didHydrateState, setDidHydrateState] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [theme, setTheme] = useState<Record<string, string>>();
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [openRouterModels, setOpenRouterModels] = useState<
    Record<string, ModelInfo>
  >({
    [openRouterDefaultModelId]: openRouterDefaultModelInfo,
  });
  const [totalTasksSize, setTotalTasksSize] = useState<number | null>(null);

  const [openAiModels, setOpenAiModels] = useState<string[]>([]);
  const [requestyModels, setRequestyModels] = useState<
    Record<string, ModelInfo>
  >({
    [requestyDefaultModelId]: requestyDefaultModelInfo,
  });

  // Local state for MCP data - using message-based system instead of RTK Query
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] =
    useState<McpMarketplaceCatalog>({ items: [] });
  const [mcpServersLoading, setMcpServersLoading] = useState(false);
  const [mcpServersError, setMcpServersError] = useState<any>(null);
  const [mcpMarketplaceCatalogLoading, setMcpMarketplaceCatalogLoading] =
    useState(false);
  const [mcpMarketplaceCatalogError, setMcpMarketplaceCatalogError] =
    useState<any>(null);

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<any>(null);

  // Authentication state - prioritize backend state over sessionStorage
  const [jwtToken, setJwtToken] = useState<string | undefined>();
  const [authenticatedPrincipal, setAuthenticatedPrincipal] = useState<
    Principal | undefined
  >();

  const handleMessage = useCallback((event: MessageEvent) => {
    const message: ExtensionMessage = event.data;

    // Prevent processing duplicate or invalid messages
    if (!message || !message.type) {
      return;
    }

    switch (message.type) {
      case "state": {
        setState((prevState) => {
          const incoming = message.state!;

          // Prevent unnecessary updates if state is the same
          if (JSON.stringify(prevState) === JSON.stringify(incoming)) {
            return prevState;
          }

          // Versioning logic for autoApprovalSettings
          const incomingVersion = incoming.autoApprovalSettings?.version ?? 1;
          const currentVersion = prevState.autoApprovalSettings?.version ?? 1;
          const shouldUpdateAutoApproval = incomingVersion > currentVersion;

          // Update authentication state from backend
          if (incoming.authenticatedPrincipal) {
            setAuthenticatedPrincipal(incoming.authenticatedPrincipal);
            // Sync with sessionStorage for ThorAPI requests
            sessionStorage.setItem(
              "authenticatedPrincipal",
              JSON.stringify(incoming.authenticatedPrincipal),
            );
          } else {
            // Clear authentication state if backend says user is not authenticated
            setAuthenticatedPrincipal(undefined);
            sessionStorage.removeItem("authenticatedPrincipal");
          }

          // Handle JWT token from backend state
          if (incoming.jwtToken) {
            setJwtToken(incoming.jwtToken);
            sessionStorage.setItem("jwtToken", incoming.jwtToken);
          } else if (incoming.isLoggedIn === false) {
            // Clear JWT token if backend says user is not logged in
            setJwtToken(undefined);
            sessionStorage.removeItem("jwtToken");
          }

          return {
            ...incoming,
            autoApprovalSettings: shouldUpdateAutoApproval
              ? incoming.autoApprovalSettings
              : prevState.autoApprovalSettings,
          };
        });
        const config = message.state?.apiConfiguration;
        const hasKey = config
          ? [
              config.apiKey,
              config.openRouterApiKey,
              config.awsRegion,
              config.vertexProjectId,
              config.openAiApiKey,
              config.ollamaModelId,
              config.lmStudioModelId,
              config.liteLlmApiKey,
              config.geminiApiKey,
              config.openAiNativeApiKey,
              config.deepSeekApiKey,
              config.requestyApiKey,
              config.togetherApiKey,
              config.qwenApiKey,
              config.doubaoApiKey,
              config.mistralApiKey,
              config.vsCodeLmModelSelector,
              config.valorideApiKey,
              config.asksageApiKey,
              config.xaiApiKey,
              config.sambanovaApiKey,
            ].some((key) => key !== undefined)
          : false;
        setShowWelcome(!hasKey);
        setDidHydrateState(true);
        break;
      }
      case "theme": {
        if (message.text) {
          setTheme(convertTextMateToHljs(JSON.parse(message.text)));
        }
        break;
      }
      case "workspaceUpdated": {
        setFilePaths(message.filePaths ?? []);
        break;
      }
      case "partialMessage": {
        const partialMessage = message.partialMessage!;
        setState((prevState) => {
          // worth noting it will never be possible for a more up-to-date message to be sent here or in normal messages post since the presentAssistantContent function uses lock
          const lastIndex = findLastIndex(
            prevState.valorideMessages,
            (msg) => msg.ts === partialMessage.ts,
          );
          if (lastIndex !== -1) {
            const newValorIDEMessages = [...prevState.valorideMessages];
            newValorIDEMessages[lastIndex] = partialMessage;
            return { ...prevState, valorideMessages: newValorIDEMessages };
          }
          return prevState;
        });
        break;
      }

      case "openRouterModels": {
        const updatedModels = message.openRouterModels ?? {};
        setOpenRouterModels({
          [openRouterDefaultModelId]: openRouterDefaultModelInfo, // in case the extension sent a model list without the default model
          ...updatedModels,
        });
        break;
      }
      case "openAiModels": {
        const updatedModels = message.openAiModels ?? [];
        setOpenAiModels(updatedModels);
        break;
      }
      case "requestyModels": {
        const updatedModels = message.requestyModels ?? {};
        setRequestyModels({
          [requestyDefaultModelId]: requestyDefaultModelInfo,
          ...updatedModels,
        });
        break;
      }
      case "mcpServers": {
        setMcpServers(message.mcpServers ?? []);
        setMcpServersLoading(false);
        setMcpServersError(null);
        break;
      }
      case "mcpMarketplaceCatalog": {
        if (message.mcpMarketplaceCatalog) {
          setMcpMarketplaceCatalog(message.mcpMarketplaceCatalog);
          setMcpMarketplaceCatalogLoading(false);
          setMcpMarketplaceCatalogError(null);
        }
        break;
      }
      case "totalTasksSize": {
        setTotalTasksSize(message.totalTasksSize ?? null);
        break;
      }
      case "loginSuccess": {
        // New message type for login success
        const token = (message as any).token;
        const authenticatedPrincipalStr = (message as any)
          .authenticatedPrincipal;

        // Store JWT token in sessionStorage for ThorAPI requests
        if (token) {
          sessionStorage.setItem("jwtToken", token);
          setJwtToken(token);
        }

        // Store authenticated principal in sessionStorage
        if (authenticatedPrincipalStr) {
          sessionStorage.setItem(
            "authenticatedPrincipal",
            authenticatedPrincipalStr,
          );
          const principal = JSON.parse(authenticatedPrincipalStr);
          setAuthenticatedPrincipal(principal);

          setState((prevState) => ({
            ...prevState,
            // Store the JWT token
            jwtToken: token,
            // Store the authenticated principal object
            authenticatedPrincipal: principal,
            // Also update userInfo for backward compatibility
            userInfo: principal,
            isLoggedIn: true,
          }));
        } else {
          setState((prevState) => ({
            ...prevState,
            // Store the JWT token
            jwtToken: token,
            isLoggedIn: true,
          }));
        }
        break;
      }
      case "LIST_APPLICATION_SUCCESS": {
        // Handle applications list from extension
        const apps = (message as any).payload;
        if (apps && Array.isArray(apps)) {
          setApplications(apps);
          setApplicationsLoading(false);
          setApplicationsError(null);
        }
        break;
      }
    }
  }, []);

  useEvent("message", handleMessage);

  useEffect(() => {
    vscode.postMessage({ type: "webviewDidLaunch" });

    // Initialize authentication state from sessionStorage as fallback
    // but prioritize backend state when it arrives
    const existingToken = sessionStorage.getItem("jwtToken");
    const existingPrincipal = sessionStorage.getItem("authenticatedPrincipal");

    if (existingToken) {
      setJwtToken(existingToken);
    }

    if (existingPrincipal) {
      try {
        const principal = JSON.parse(existingPrincipal);
        setAuthenticatedPrincipal(principal);
      } catch (error) {
        console.error("Failed to parse stored authenticated principal:", error);
        sessionStorage.removeItem("authenticatedPrincipal");
      }
    }
  }, []);

  const refetchMcpData = useCallback(() => {
    setMcpServersLoading(true);
    setMcpMarketplaceCatalogLoading(true);
    vscode.postMessage({ type: "fetchLatestMcpServersFromHub" });
  }, []);

  // Determine authentication status - prioritize backend state, fallback to local state
  const isAuthenticated =
    state.isLoggedIn ?? !!(jwtToken || authenticatedPrincipal);
  const currentUser =
    state.authenticatedPrincipal || authenticatedPrincipal || state.userInfo;
  const currentToken = state.jwtToken || jwtToken;

  const contextValue: ExtensionStateContextType = {
    ...state,
    didHydrateState,
    showWelcome,
    theme,
    openRouterModels,
    openAiModels,
    requestyModels,
    mcpServers,
    mcpMarketplaceCatalog,
    filePaths,
    totalTasksSize,
    globalValorIDERulesToggles: state.globalValorIDERulesToggles || {},
    localValorIDERulesToggles: state.localValorIDERulesToggles || {},
    // Use computed authentication state
    jwtToken: currentToken,
    authenticatedPrincipal: currentUser,
    userInfo: currentUser,
    isLoggedIn: isAuthenticated,
    // Applications state
    applications,
    applicationsLoading,
    applicationsError,
    setApiConfiguration: (value) =>
      setState((prevState) => ({
        ...prevState,
        apiConfiguration: value,
      })),
    setCustomInstructions: (value) =>
      setState((prevState) => ({
        ...prevState,
        customInstructions: value,
      })),
    setTelemetrySetting: (value) =>
      setState((prevState) => ({
        ...prevState,
        telemetrySetting: value,
      })),
    setPlanActSeparateModelsSetting: (value) =>
      setState((prevState) => ({
        ...prevState,
        planActSeparateModelsSetting: value,
      })),
    setShowAnnouncement: (value) =>
      setState((prevState) => ({
        ...prevState,
        shouldShowAnnouncement: value,
      })),
    setMcpServers: (mcpServers: McpServer[]) => setMcpServers(mcpServers),

    // MCP loading and error states
    mcpServersLoading,
    mcpServersError,
    mcpMarketplaceCatalogLoading,
    mcpMarketplaceCatalogError,
    refetchMcpData,
  };

  return (
    <ExtensionStateContext.Provider value={contextValue}>
      {children}
    </ExtensionStateContext.Provider>
  );
};

export const useExtensionState = () => {
  const context = useContext(ExtensionStateContext);
  if (context === undefined) {
    throw new Error(
      "useExtensionState must be used within an ExtensionStateContextProvider",
    );
  }
  return context;
};
