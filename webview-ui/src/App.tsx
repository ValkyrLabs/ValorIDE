import { useCallback, useEffect, useState } from "react";
import { useEvent } from "react-use";
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
import StartupDebit from "./components/usage-tracking/StartupDebit";
import useValorIDEMothership from "./hooks/useValorIDEMothership";

import { vscode } from "./utils/vscode";
import McpView from "./components/mcp/configuration/McpConfigurationView";
import { McpViewTab } from "@shared/mcp";

const AppContent = () => {
  const {
    didHydrateState,
    showWelcome,
    shouldShowAnnouncement,
    telemetrySetting,
    vscMachineId,
  } = useExtensionState();
  const [showSettings, setShowSettings] = useState(false);
  const hideSettings = useCallback(() => setShowSettings(false), []);
  const [showHistory, setShowHistory] = useState(false);
  const [showMcp, setShowMcp] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showGeneratedFiles, setShowGeneratedFiles] = useState(false);
  const [showServerConsole, setShowServerConsole] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [mcpTab, setMcpTab] = useState<McpViewTab | undefined>(undefined);
  // Always show file explorer by default
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showApplicationProgress, setShowApplicationProgress] = useState(false);
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

  console.log(`🚀 ValorIDE Mothership Status: Connected=${mothershipConnected}, InstanceId=${instanceId}`);

  const handleMessage = useCallback((e: MessageEvent) => {
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
          case "serverConsoleButtonClicked":
            setShowSettings(false);
            setShowHistory(false);
            setShowMcp(false);
            setShowAccount(false);
            setShowGeneratedFiles(false);
            setShowServerConsole(true);
            setShowApplicationProgress(false);
            break;
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
          type: 'tool_use',
          metadata: {
            action: 'invoke',
            timestamp: Date.now(),
          },
        });
        break;

      case "partialMessage":
        // Track partial messages (streaming)
        sendChatAction({
          type: 'api_data',
          metadata: {
            action: 'partial_message',
            timestamp: Date.now(),
          },
        });
        break;

      default:
        // Track any other message types as generic activity
        sendChatAction({
          type: 'api_data',
          metadata: {
            messageType: message.type,
            timestamp: Date.now(),
          },
        });
        break;
    }
  }, [trackTaskStart, sendChatAction]);

  useEvent("message", handleMessage);

  useEffect(() => {
    if (shouldShowAnnouncement) {
      setShowAnnouncement(true);
      vscode.postMessage({ type: "didShowAnnouncement" });
    }
  }, [shouldShowAnnouncement]);

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

  if (!didHydrateState) {
    return null;
  }

  const isMainViewHidden =
    showSettings || showHistory || showMcp || showAccount || showGeneratedFiles || showServerConsole;

  return (
    <>
      {showWelcome ? (
        <WelcomeView />
      ) : (
        <>
          {showSettings && <SettingsView onDone={hideSettings} />}
          {showHistory && <HistoryView onDone={() => setShowHistory(false)} />}
          {showMcp && (
            <McpView initialTab={mcpTab} onDone={() => setShowMcp(false)} />
          )}
          {showAccount && <AccountView onDone={() => setShowAccount(false)} />}
          {showGeneratedFiles && <GeneratedFilesView />}
          {showServerConsole && <ServerConsole />}

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
            <ChatErrorBoundary errorTitle="Chat failed to render" errorBody="Please reload the view or check connection settings." height="100%">
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
