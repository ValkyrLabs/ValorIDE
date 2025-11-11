import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useState, } from "react";
import { useEvent } from "react-use";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings";
import { DEFAULT_PLATFORM, } from "@shared/ExtensionMessage";
import { openRouterDefaultModelId, openRouterDefaultModelInfo, requestyDefaultModelId, requestyDefaultModelInfo, } from "../../../src/shared/api";
import { findLastIndex } from "@shared/array";
import { convertTextMateToHljs } from "../utils/textMateToHljs";
import { vscode } from "../utils/vscode";
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings";
import { DEFAULT_CHAT_SETTINGS } from "@shared/ChatSettings";
import { clearStoredJwtToken, clearStoredPrincipal, hydrateStoredCredentials, storeJwtToken, writeStoredPrincipal, } from "@/utils/accessControl";
const ExtensionStateContext = createContext(undefined);
const normalizePrincipal = (value) => {
    if (!value || typeof value !== "object") {
        return undefined;
    }
    const candidate = value;
    return {
        ...candidate,
        username: typeof candidate.username === "string" ? candidate.username : "",
        password: typeof candidate.password === "string" ? candidate.password : "",
        email: typeof candidate.email === "string" ? candidate.email : "",
        roleList: Array.isArray(candidate.roleList) ? candidate.roleList : [],
    };
};
export const ExtensionStateContextProvider = ({ children }) => {
    const [state, setState] = useState({
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
    const [theme, setTheme] = useState();
    const [filePaths, setFilePaths] = useState([]);
    const [openRouterModels, setOpenRouterModels] = useState({
        [openRouterDefaultModelId]: openRouterDefaultModelInfo,
    });
    const [totalTasksSize, setTotalTasksSize] = useState(null);
    const [openAiModels, setOpenAiModels] = useState([]);
    const [requestyModels, setRequestyModels] = useState({
        [requestyDefaultModelId]: requestyDefaultModelInfo,
    });
    // Local state for MCP data - using message-based system instead of RTK Query
    const [mcpServers, setMcpServers] = useState([]);
    const [mcpMarketplaceCatalog, setMcpMarketplaceCatalog] = useState({ items: [] });
    const [mcpServersLoading, setMcpServersLoading] = useState(false);
    const [mcpServersError, setMcpServersError] = useState(null);
    const [mcpMarketplaceCatalogLoading, setMcpMarketplaceCatalogLoading] = useState(false);
    const [mcpMarketplaceCatalogError, setMcpMarketplaceCatalogError] = useState(null);
    // Applications state
    const [applications, setApplications] = useState([]);
    const [applicationsLoading, setApplicationsLoading] = useState(false);
    const [applicationsError, setApplicationsError] = useState(null);
    // Authentication state - prioritize backend state over sessionStorage
    const [jwtToken, setJwtToken] = useState();
    const [authenticatedUser, setAuthenticatedUser] = useState();
    const handleMessage = useCallback((event) => {
        const message = event.data;
        // Prevent processing duplicate or invalid messages
        if (!message || !message.type) {
            return;
        }
        switch (message.type) {
            case "state": {
                const incoming = message.state;
                // 1) Update auth-related local state + sessionStorage OUTSIDE of the setState updater
                try {
                    if (incoming.authenticatedPrincipal) {
                        const principalRaw = typeof incoming.authenticatedPrincipal === "string"
                            ? JSON.parse(incoming.authenticatedPrincipal)
                            : incoming.authenticatedPrincipal;
                        const principal = normalizePrincipal(principalRaw);
                        setAuthenticatedUser(principal);
                        if (principal) {
                            writeStoredPrincipal(principal);
                        }
                        else {
                            clearStoredPrincipal("extension-state");
                        }
                    }
                    else {
                        setAuthenticatedUser(undefined);
                        clearStoredPrincipal("extension-state");
                    }
                    if (incoming.jwtToken) {
                        setJwtToken(incoming.jwtToken);
                        storeJwtToken(incoming.jwtToken, "extension-state");
                    }
                    else if (incoming.isLoggedIn === false) {
                        setJwtToken(undefined);
                        clearStoredJwtToken("extension-state");
                        clearStoredPrincipal("extension-state");
                    }
                }
                catch {
                    // Ignore storage errors in webview sandbox
                }
                const normalizedState = {
                    ...incoming,
                    taskHistory: Array.isArray(incoming.taskHistory)
                        ? incoming.taskHistory
                        : [],
                    valorideMessages: Array.isArray(incoming.valorideMessages)
                        ? incoming.valorideMessages
                        : [],
                };
                // 2) Update the main extension state via a PURE updater (no side-effects here)
                setState((prevState) => {
                    // Prevent unnecessary updates if state is the same
                    if (JSON.stringify(prevState) === JSON.stringify(normalizedState)) {
                        return prevState;
                    }
                    // Versioning logic for autoApprovalSettings
                    const incomingVersion = normalizedState.autoApprovalSettings?.version ?? 1;
                    const currentVersion = prevState.autoApprovalSettings?.version ?? 1;
                    const shouldUpdateAutoApproval = incomingVersion > currentVersion;
                    return {
                        ...normalizedState,
                        autoApprovalSettings: shouldUpdateAutoApproval
                            ? normalizedState.autoApprovalSettings
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
                const partialMessage = message.partialMessage;
                setState((prevState) => {
                    // worth noting it will never be possible for a more up-to-date message to be sent here or in normal messages post since the presentAssistantContent function uses lock
                    const lastIndex = findLastIndex(prevState.valorideMessages, (msg) => msg.ts === partialMessage.ts);
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
                const token = message.token;
                const authenticatedPrincipalStr = message
                    .authenticatedPrincipal;
                // Store JWT token in sessionStorage for ThorAPI requests
                if (token) {
                    storeJwtToken(token, "extension-loginSuccess");
                    setJwtToken(token);
                }
                // Store authenticated user in sessionStorage
                if (authenticatedPrincipalStr) {
                    let parsed;
                    try {
                        parsed = JSON.parse(authenticatedPrincipalStr);
                    }
                    catch {
                        parsed = authenticatedPrincipalStr;
                    }
                    const user = normalizePrincipal(parsed);
                    if (user) {
                        writeStoredPrincipal(user);
                    }
                    else {
                        clearStoredPrincipal("extension-loginSuccess");
                    }
                    setAuthenticatedUser(user);
                    setState((prevState) => ({
                        ...prevState,
                        // Store the JWT token
                        jwtToken: token,
                        // Also update userInfo for backward compatibility
                        userInfo: user ?? prevState.userInfo,
                        isLoggedIn: true,
                    }));
                }
                else {
                    clearStoredPrincipal("extension-loginSuccess");
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
                const apps = message.payload;
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
    // On initial mount, if JWT exists in localStorage but not sessionStorage, mirror & notify so bridges can connect
    useEffect(() => {
        const { token, principal } = hydrateStoredCredentials("extension-init");
        if (token) {
            setJwtToken((prev) => prev ?? token);
        }
        if (principal) {
            setAuthenticatedUser((prev) => prev ?? normalizePrincipal(principal));
        }
    }, []);
    useEffect(() => {
        vscode.postMessage({ type: "webviewDidLaunch" });
        // Initialize authentication state from sessionStorage as fallback
        // but prioritize backend state when it arrives
        const existingToken = sessionStorage.getItem("jwtToken");
        const existingUser = sessionStorage.getItem("authenticatedUser");
        if (existingToken) {
            setJwtToken(existingToken);
        }
        if (existingUser) {
            try {
                const user = JSON.parse(existingUser);
                setAuthenticatedUser(normalizePrincipal(user));
            }
            catch (error) {
                console.error("Failed to parse stored authenticated user:", error);
                sessionStorage.removeItem("authenticatedUser");
            }
        }
    }, []);
    const refetchMcpData = useCallback(() => {
        setMcpServersLoading(true);
        setMcpMarketplaceCatalogLoading(true);
        vscode.postMessage({ type: "fetchLatestMcpServersFromHub" });
    }, []);
    // Determine authentication status - prioritize backend state, fallback to local state
    const isAuthenticated = state.isLoggedIn ?? !!(jwtToken || authenticatedUser);
    const normalizedAuthenticatedUser = normalizePrincipal(authenticatedUser);
    const normalizedStateUser = normalizePrincipal(state.userInfo);
    const currentUser = normalizedAuthenticatedUser ?? normalizedStateUser;
    const currentToken = state.jwtToken || jwtToken;
    const contextValue = {
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
        authenticatedUser: normalizedAuthenticatedUser,
        userInfo: currentUser,
        isLoggedIn: isAuthenticated,
        // Applications state
        applications,
        applicationsLoading,
        applicationsError,
        setApiConfiguration: (value) => setState((prevState) => ({
            ...prevState,
            apiConfiguration: value,
        })),
        setCustomInstructions: (value) => setState((prevState) => ({
            ...prevState,
            customInstructions: value,
        })),
        setTelemetrySetting: (value) => setState((prevState) => ({
            ...prevState,
            telemetrySetting: value,
        })),
        setPlanActSeparateModelsSetting: (value) => setState((prevState) => ({
            ...prevState,
            planActSeparateModelsSetting: value,
        })),
        setShowAnnouncement: (value) => setState((prevState) => ({
            ...prevState,
            shouldShowAnnouncement: value,
        })),
        setMcpServers: (mcpServers) => setMcpServers(mcpServers),
        // MCP loading and error states
        mcpServersLoading,
        mcpServersError,
        mcpMarketplaceCatalogLoading,
        mcpMarketplaceCatalogError,
        refetchMcpData,
    };
    return (_jsx(ExtensionStateContext.Provider, { value: contextValue, children: children }));
};
export const useExtensionState = () => {
    const context = useContext(ExtensionStateContext);
    if (context === undefined) {
        throw new Error("useExtensionState must be used within an ExtensionStateContextProvider");
    }
    return context;
};
//# sourceMappingURL=ExtensionStateContext.js.map