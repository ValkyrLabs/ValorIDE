import { useCallback, useEffect, useState, useLayoutEffect } from "react";
import { useEvent } from "react-use";
import { useDispatch, useSelector } from "react-redux";
import { ExtensionMessage } from "@shared/ExtensionMessage";
import ChatView from "./components/chat/ChatView";
import { ChatErrorBoundary } from "./components/chat/ChatErrorBoundary";
import HistoryView from "./components/history/HistoryView";
import SettingsView from "./components/settings/SettingsView";
import WelcomeView from "./components/welcome/WelcomeView";
import AccountView from "./components/account/AccountView";
import ApplicationProgress from "./components/ApplicationProgress/ApplicationProgress";
import ServerConsole from "./components/ServerConsole/index";
import SplitPane, {
  SplitPaneLeft,
  SplitPaneRight,
  Divider,
} from "./components/SplitPane";
import {
  ExtensionStateContextProvider,
  useExtensionState,
} from "./context/ExtensionStateContext";
import { MothershipProvider } from "./context/MothershipContext";
import { ChatMothershipProvider } from "./components/chat/ChatMothershipProvider";
import { UsageTrackingHandler } from "./components/usage-tracking/UsageTrackingHandler";
import { ContentDataHandler } from "./components/content-data/ContentDataHandler";
import StartupDebit from "./components/usage-tracking/StartupDebit";
import { registerExternalLinkInterceptor } from "./utils/linkInterceptor";
import useValorIDEMothership from "./hooks/useValorIDEMothership";
import LoadingSpinner from "./components/LoadingSpinner";

import { vscode } from "./utils/vscode";
import {
  readStoredPrincipal,
  hydrateStoredCredentials,
} from "./utils/accessControl";
import McpView from "./components/mcp/configuration/McpConfigurationView";
import { McpViewTab } from "@shared/mcp";
import { CREDIT_INTENT_EVENT, CreditIntent } from "./types/creditIntent";
import {
  clearAccountBalancePrompt,
  clearCreditIntent,
} from "./redux/slices/apiErrorsSlice";

const parseJsonRecord = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (!value) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return undefined;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
};

const hasSwarmTraceEvidence = (value: Record<string, unknown>): boolean =>
  [
    "receiptRef",
    "traceId",
    "contextPageRef",
    "skillOptReceiptRef",
    "workflowExecutionRef",
    "workflowDispatchJson",
  ].some((key) => typeof value[key] === "string" && value[key] !== "");

const coerceSwarmTraceCandidate = (
  value: unknown,
): Record<string, unknown> | undefined => {
  const record = parseJsonRecord(value);
  if (!record) return undefined;

  const nestedCandidates = [
    record.swarmCommandResponse,
    record.commandResponse,
    record.response,
    record.result,
    record.data,
    record.payload,
  ];
  if (hasSwarmTraceEvidence(record)) {
    return record;
  }

  for (const nested of nestedCandidates) {
    const candidate = coerceSwarmTraceCandidate(nested);
    if (candidate) return candidate;
  }

  return undefined;
};

const extractSwarmCommandInspectionPayload = (
  message: ExtensionMessage,
): Record<string, unknown> | undefined => {
  const directCandidate =
    coerceSwarmTraceCandidate(message.swarmCommandResponse) ||
    coerceSwarmTraceCandidate(message.payload) ||
    coerceSwarmTraceCandidate((message as any).response);
  if (directCandidate) {
    return directCandidate;
  }

  const command = message.command;
  if (!command) {
    return undefined;
  }

  const commandPayload = parseJsonRecord(command.payload) ?? command.payload;
  const commandCandidate = coerceSwarmTraceCandidate(commandPayload);
  if (!commandCandidate) {
    return undefined;
  }

  return {
    ...commandCandidate,
    commandId:
      commandCandidate.commandId ??
      (commandPayload as any)?.commandId ??
      command.id,
    targetInstanceId:
      commandCandidate.targetInstanceId ?? command.targetInstanceId,
  };
};

const AppContent = () => {
  const {
    didHydrateState,
    showWelcome,
    shouldShowAnnouncement,
    telemetrySetting,
    vscMachineId,
  } = useExtensionState();
  const dispatch = useDispatch();
  const showAccountBalance = useSelector(
    (state: any) => state?.apiErrors?.showAccountBalance,
  );
  const apiErrorCreditIntent = useSelector(
    (state: any) => state?.apiErrors?.creditIntent,
  );
  const [hasStoredAuth, setHasStoredAuth] = useState(false);

  // Check for stored credentials BEFORE rendering to prevent welcome flicker
  useLayoutEffect(() => {
    // Restore JWT & Principal from localStorage if they exist (for sticky auth)
    const { token, principal } = hydrateStoredCredentials("app-init");

    // Also check sessionStorage directly as backup
    const sessionToken = sessionStorage.getItem("jwtToken");
    const sessionPrincipal = readStoredPrincipal();

    // Auth is valid if we have BOTH token AND principal (credentials are complete)
    const hasAuth = (token || sessionToken) && (principal || sessionPrincipal);

    if (hasAuth) {
      setHasStoredAuth(true);
    }
  }, []);
  const [showSettings, setShowSettings] = useState(false);
  const hideSettings = useCallback(() => setShowSettings(false), []);
  const [showHistory, setShowHistory] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showGeneratedFiles, setShowGeneratedFiles] = useState(false);
  const [showServerConsole, setShowServerConsole] = useState(false);
  // Server Console is now rendered as a tab in the Account view
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [mcpTab, setMcpTab] = useState<McpViewTab | undefined>(undefined);
  const [serverConsoleNeedsAttention, setServerConsoleNeedsAttention] =
    useState(false);
  const [accountInitialActiveTab, setAccountInitialActiveTab] = useState<
    | "login"
    | "account"
    | "applications"
    | "appGeneration"
    | "contextPage"
    | "generatedFiles"
    | "receipts"
    | "userPreferences"
    | "serverConsole"
    | undefined
  >(undefined);
  const [
    accountInitialSwarmCommandResponse,
    setAccountInitialSwarmCommandResponse,
  ] = useState<Record<string, unknown> | undefined>(undefined);
  // Always show file explorer by default
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showApplicationProgress, setShowApplicationProgress] = useState(false);
  const [creditIntent, setCreditIntent] = useState<CreditIntent | undefined>(
    undefined,
  );
  const [currentApplicationId, setCurrentApplicationId] = useState<
    string | undefined
  >(undefined);

  // Use the Mothership integration hook
  const {
    isConnected: mothershipConnected,
    instanceId,
    trackChatMessage,
    trackToolUse,
    trackFileEdit,
    trackCommandExecute,
    trackTaskStart,
    trackTaskComplete,
    sendChatAction,
  } = useValorIDEMothership();

  console.log(
    `🚀 ValorIDE Mothership Status: Connected=${mothershipConnected}, InstanceId=${instanceId}`,
  );

  useEffect(() => {
    const cleanup = registerExternalLinkInterceptor();
    return cleanup;
  }, []);

  const handleMessage = useCallback(
    (e: MessageEvent) => {
      const message: ExtensionMessage = e.data;

      // Track different message types to mothership
      switch (message.type) {
        case "loginSuccess":
          // After successful login, show the Account view and keep File Explorer visible
          setShowSettings(false);
          setShowHistory(false);
          setShowMcp(false);
          setShowAccount(true);
          setShowGeneratedFiles(false);
          setShowApplicationProgress(false);
          setShowFileExplorer(true);

          // Track login success as a task start
          trackTaskStart("user-session", "User logged in successfully");
          break;

        case "action":
          switch (message.action!) {
            case "settingsButtonClicked":
              setShowSettings(true);
              setShowHistory(false);
              setShowMcp(false);
              setShowAccount(false);
              setShowGeneratedFiles(false);
              setShowServerConsole(false);
              setShowApplicationProgress(false);
              break;
            case "historyButtonClicked":
              setShowSettings(false);
              setShowHistory(true);
              setShowMcp(false);
              setShowAccount(false);
              setShowGeneratedFiles(false);
              setShowServerConsole(false);
              setShowApplicationProgress(false);
              break;
            case "mcpButtonClicked":
              setShowSettings(false);
              setShowHistory(false);
              if (message.tab) {
                setMcpTab(message.tab);
              }
              setShowMcp(true);
              setShowAccount(false);
              setShowGeneratedFiles(false);
              setShowServerConsole(false);
              setShowApplicationProgress(false);
              break;
            case "accountButtonClicked":
              setShowSettings(false);
              setShowHistory(false);
              setShowMcp(false);
              setShowAccount(true);
              setShowGeneratedFiles(false);
              setShowServerConsole(false);
              setShowApplicationProgress(false);
              // Opening Account should clear server console attention since tab is visible now
              setServerConsoleNeedsAttention(false);
              break;
            case "serverConsoleButtonClicked":
              // Legacy support: open Account view and select Server Console tab
              setShowSettings(false);
              setShowHistory(false);
              setShowMcp(false);
              setShowAccount(true);
              setShowGeneratedFiles(false);
              setShowServerConsole(false);
              setShowApplicationProgress(false);
              setServerConsoleNeedsAttention(false);
              setAccountInitialActiveTab("serverConsole");
              break;
            case "chatButtonClicked":
              setShowSettings(false);
              setShowHistory(false);
              setShowMcp(false);
              setShowAccount(false);
              setShowGeneratedFiles(false);
              setShowServerConsole(false);
              setShowApplicationProgress(false);
              break;
            case "generatedFilesButtonClicked":
              setShowSettings(false);
              setShowHistory(false);
              setShowMcp(false);
              setShowAccount(false);
              setShowGeneratedFiles(true);
              setShowServerConsole(false);
              setShowApplicationProgress(false);
              break;
            // serverConsoleButtonClicked moved to account tabs; keep legacy handling minimal
          }
          break;

        case "streamToThorapiResult":
          // Handle application generation progress
          if (message.streamToThorapiResult) {
            const result = message.streamToThorapiResult;
            if (result.applicationId) {
              setCurrentApplicationId(result.applicationId);
              setShowApplicationProgress(false);
              // File explorer is already visible, just ensure it stays visible
              setShowFileExplorer(true);
              // Hide other views but keep file explorer
              setShowSettings(false);
              setShowHistory(false);
              setShowMcp(false);
              setShowAccount(true);
              setShowGeneratedFiles(false);
            }
          }
          break;

        // Track other extension messages as generic actions
        case "invoke":
          // Track tool invocations
          sendChatAction({
            type: "tool_use",
            metadata: {
              action: "invoke",
              timestamp: Date.now(),
            },
          });
          break;

        case "partialMessage":
          // Track partial messages (streaming)
          sendChatAction({
            type: "api_data",
            metadata: {
              action: "partial_message",
              timestamp: Date.now(),
            },
          });
          break;

        case "serverConsoleNewMessage":
          // New server console-related message arrived; mark server console tab for attention.
          setServerConsoleNeedsAttention(true);

          break;

        case "swarm:command-response":
        case "swarm:remote-command":
        case "swarm:widget-command": {
          const swarmCommandResponse =
            extractSwarmCommandInspectionPayload(message);
          if (swarmCommandResponse) {
            setShowSettings(false);
            setShowHistory(false);
            setShowMcp(false);
            setShowAccount(true);
            setShowGeneratedFiles(false);
            setShowServerConsole(false);
            setShowApplicationProgress(false);
            setShowFileExplorer(true);
            setAccountInitialActiveTab("receipts");
            setAccountInitialSwarmCommandResponse(swarmCommandResponse);
            break;
          }

          sendChatAction({
            type: "api_data",
            metadata: {
              messageType: message.type,
              timestamp: Date.now(),
            },
          });
          break;
        }

        default:
          // Track any other message types as generic activity
          sendChatAction({
            type: "api_data",
            metadata: {
              messageType: message.type,
              timestamp: Date.now(),
            },
          });
          break;
      }
    },
    [trackTaskStart, sendChatAction],
  );

  useEvent("message", handleMessage);

  useEffect(() => {
    const handleCreditIntent = (event: Event) => {
      const customEvent = event as CustomEvent<CreditIntent>;
      if (!customEvent.detail) {
        return;
      }
      setCreditIntent(customEvent.detail);
      setShowSettings(false);
      setShowHistory(false);
      setShowMcp(false);
      setShowGeneratedFiles(false);
      setShowServerConsole(false);
      setShowApplicationProgress(false);
      setShowAccount(true);
      setAccountInitialActiveTab("account");
    };

    window.addEventListener(
      CREDIT_INTENT_EVENT,
      handleCreditIntent as EventListener,
    );
    return () =>
      window.removeEventListener(
        CREDIT_INTENT_EVENT,
        handleCreditIntent as EventListener,
      );
  }, []);

  useEffect(() => {
    if (shouldShowAnnouncement) {
      setShowAnnouncement(true);
      vscode.postMessage({ type: "didShowAnnouncement" });
    }
  }, [shouldShowAnnouncement]);

  useEffect(() => {
    if (!showAccountBalance) return;

    setShowSettings(false);
    setShowHistory(false);
    setShowMcp(false);
    setShowAccount(true);
    setShowGeneratedFiles(false);
    setShowServerConsole(false);
    setShowApplicationProgress(false);
    setShowFileExplorer(true);
    setAccountInitialActiveTab("account");
    if (apiErrorCreditIntent) {
      setCreditIntent(apiErrorCreditIntent);
    }

    dispatch(clearAccountBalancePrompt());
  }, [apiErrorCreditIntent, dispatch, showAccountBalance]);

  const handleFileSelect = useCallback((filePath: string) => {
    // Use openMention to open the selected file
    vscode.postMessage({
      type: "openMention",
      text: filePath,
    });
  }, []);

  const handleCloseApplicationProgress = useCallback(() => {
    setShowApplicationProgress(false);
    setCurrentApplicationId(undefined);
  }, []);

  // While state is hydrating, show loading only if we DON'T have stored auth
  // If we have stored auth, go straight to the app (don't show welcome)
  if (!didHydrateState && !hasStoredAuth) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100%",
        }}
      >
        <LoadingSpinner label="Loading ValorIDE…" size={72} />
      </div>
    );
  }

  const isMainViewHidden =
    showSettings ||
    showHistory ||
    showMcp ||
    showAccount ||
    showGeneratedFiles ||
    false;

  return (
    <>
      {showWelcome && !hasStoredAuth ? (
        <WelcomeView />
      ) : (
        <>
          {showSettings && <SettingsView onDone={hideSettings} />}
          {showHistory && <HistoryView onDone={() => setShowHistory(false)} />}
          {showMcp && (
            <McpView initialTab={mcpTab} onDone={() => setShowMcp(false)} />
          )}
          {showAccount && (
            <AccountView
              onDone={() => setShowAccount(false)}
              serverConsoleNeedsAttention={serverConsoleNeedsAttention}
              onClearServerConsoleNeedsAttention={() =>
                setServerConsoleNeedsAttention(false)
              }
              initialActiveTab={accountInitialActiveTab}
              onConsumeInitialActiveTab={() =>
                setAccountInitialActiveTab(undefined)
              }
              initialSwarmCommandResponse={accountInitialSwarmCommandResponse}
              onConsumeInitialSwarmCommandResponse={() =>
                setAccountInitialSwarmCommandResponse(undefined)
              }
              creditIntent={creditIntent}
              onClearCreditIntent={() => {
                setCreditIntent(undefined);
                dispatch(clearCreditIntent());
              }}
            />
          )}
          {showGeneratedFiles && <GeneratedFilesView />}
          {/* Server Console is now available in the Account view tabs */}

          {/* Application Progress Overlay - shows over the split pane */}
          {showApplicationProgress && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "var(--vscode-editor-background)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ApplicationProgress
                applicationId={currentApplicationId}
                onClose={handleCloseApplicationProgress}
              />
            </div>
          )}

          {/* Show chat view when not in other views */}
          {!isMainViewHidden && (
            <ChatErrorBoundary
              errorTitle="Chat failed to render"
              errorBody="Please reload the view or check connection settings."
              height="100%"
              context={{
                view: "ChatView",
                hasStoredAuth,
                showAnnouncement,
                showSettings,
                showHistory,
                showMcp,
                showAccount,
                showGeneratedFiles,
                showServerConsole,
                showApplicationProgress,
                currentApplicationId,
                vscMachineId,
              }}
            >
              <ChatView
                showHistoryView={() => {
                  setShowSettings(false);
                  setShowMcp(false);
                  setShowAccount(false);
                  setShowGeneratedFiles(false);
                  setShowApplicationProgress(false);
                  setShowHistory(true);
                }}
                isHidden={false}
                showAnnouncement={showAnnouncement}
                hideAnnouncement={() => {
                  setShowAnnouncement(false);
                }}
              />
            </ChatErrorBoundary>
          )}
        </>
      )}
    </>
  );
};

const App = () => {
  return (
    <ExtensionStateContextProvider>
      <MothershipProvider>
        <ChatMothershipProvider>
          {/* Process usage tracking messages invisibly */}
          <UsageTrackingHandler />
          {/* Process content data messages invisibly */}
          <ContentDataHandler />
          {/* Auto-debit for auto-login sessions */}
          <StartupDebit />
          <AppContent />
        </ChatMothershipProvider>
      </MothershipProvider>
    </ExtensionStateContextProvider>
  );
};

const GeneratedFilesView = () => {
  return <div>Generated Files View</div>;
};

export default App;
