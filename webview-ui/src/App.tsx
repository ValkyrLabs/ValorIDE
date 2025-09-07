import { useCallback, useEffect, useState } from "react";
import { useEvent } from "react-use";
import { ExtensionMessage } from "@shared/ExtensionMessage";
import ChatView from "./components/chat/ChatView";
import { ChatErrorBoundary } from "./components/chat/ChatErrorBoundary";
import HistoryView from "./components/history/HistoryView";
import SettingsView from "./components/settings/SettingsView";
import WelcomeView from "./components/welcome/WelcomeView";
import AccountView from "./components/account/AccountView";
import FileExplorer from "./components/FileExplorer/FileExplorer";
import ApplicationProgress from "./components/ApplicationProgress/ApplicationProgress";
import SplitPane, {
  SplitPaneLeft,
  SplitPaneRight,
  Divider,
} from "./components/SplitPane";
import {
  ExtensionStateContextProvider,
  useExtensionState,
} from "./context/ExtensionStateContext";

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
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [mcpTab, setMcpTab] = useState<McpViewTab | undefined>(undefined);
  // Always show file explorer by default
  const [showFileExplorer, setShowFileExplorer] = useState(true);
  const [showApplicationProgress, setShowApplicationProgress] = useState(false);
  const [currentApplicationId, setCurrentApplicationId] = useState<
    string | undefined
  >(undefined);

  const handleMessage = useCallback((e: MessageEvent) => {
    const message: ExtensionMessage = e.data;
    switch (message.type) {
      case "action":
        switch (message.action!) {
          case "settingsButtonClicked":
            setShowSettings(true);
            setShowHistory(false);
            setShowMcp(false);
            setShowAccount(false);
            setShowGeneratedFiles(false);
            setShowApplicationProgress(false);
            // Keep file explorer visible
            break;
          case "historyButtonClicked":
            setShowSettings(false);
            setShowHistory(true);
            setShowMcp(false);
            setShowAccount(false);
            setShowGeneratedFiles(false);
            setShowApplicationProgress(false);
            // Keep file explorer visible
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
            setShowApplicationProgress(false);
            // Keep file explorer visible
            break;
          case "accountButtonClicked":
            setShowSettings(false);
            setShowHistory(false);
            setShowMcp(false);
            setShowAccount(true);
            setShowGeneratedFiles(false);
            setShowApplicationProgress(false);
            // Keep file explorer visible
            break;
          case "chatButtonClicked":
            setShowSettings(false);
            setShowHistory(false);
            setShowMcp(false);
            setShowAccount(false);
            setShowGeneratedFiles(false);
            setShowApplicationProgress(false);
            // Keep file explorer visible
            break;
          case "generatedFilesButtonClicked":
            setShowSettings(false);
            setShowHistory(false);
            setShowMcp(false);
            setShowAccount(false);
            setShowGeneratedFiles(true);
            setShowApplicationProgress(false);
            // Keep file explorer visible
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
    }
  }, []);

  useEvent("message", handleMessage);

  // useEffect(() => {
  //  if (telemetrySetting === "enabled") {
  //   posthog.identify(vscMachineId)
  //   posthog.opt_in_capturing()
  //  } else {
  //   posthog.opt_out_capturing()
  //  }
  // }, [telemetrySetting, vscMachineId])

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
    showSettings || showHistory || showMcp || showAccount || showGeneratedFiles;

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
      <AppContent />
    </ExtensionStateContextProvider>
  );
};

const GeneratedFilesView = () => {
  return <div>Generated Files View</div>;
};

export default App;
