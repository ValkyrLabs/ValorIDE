import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { VSCodeButton, VSCodeCheckbox, VSCodeDropdown, VSCodeOption, VSCodeTextField, } from "@vscode/webview-ui-toolkit/react";
import debounce from "debounce";
import { BROWSER_VIEWPORT_PRESETS } from "../../../../src/shared/BrowserSettings";
import { useExtensionState } from "../../context/ExtensionStateContext";
import { vscode } from "../../utils/vscode";
import styled from "styled-components";
import { FaCheck } from "react-icons/fa";
import { BrowserServiceClient } from "../../services/grpc-client";
const ConnectionStatusIndicator = ({ isChecking, isConnected, remoteBrowserEnabled, }) => {
    if (!remoteBrowserEnabled)
        return null;
    return (_jsx(StatusContainer, { children: isChecking ? (_jsxs(_Fragment, { children: [_jsx(Spinner, {}), _jsx(StatusText, { children: "Checking connection..." })] })) : isConnected === true ? (_jsxs(_Fragment, { children: [_jsx(FaCheck, {}), _jsx(StatusText, { style: { color: "var(--vscode-terminal-ansiGreen)" }, children: "Connected" })] })) : isConnected === false ? (_jsx(StatusText, { style: { color: "var(--vscode-errorForeground)" }, children: "Not connected" })) : null }));
};
export const BrowserSettingsSection = () => {
    const { browserSettings } = useExtensionState();
    const [isCheckingConnection, setIsCheckingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [relaunchResult, setRelaunchResult] = useState(null);
    const [debugMode, setDebugMode] = useState(false);
    const [isBundled, setIsBundled] = useState(false);
    const [detectedChromePath, setDetectedChromePath] = useState(null);
    // Listen for browser connection test results and relaunch results
    useEffect(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === "browserConnectionResult") {
                setConnectionStatus(message.success);
                setIsCheckingConnection(false);
            }
            else if (message.type === "browserRelaunchResult") {
                setRelaunchResult({
                    success: message.success,
                    message: message.text,
                });
                setDebugMode(false);
            }
            else if (message.type === "detectedChromePath") {
                setDetectedChromePath(message.text);
                setIsBundled(message.isBundled);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);
    // Auto-clear relaunch result message after 15 seconds
    useEffect(() => {
        if (relaunchResult) {
            const timer = setTimeout(() => {
                setRelaunchResult(null);
            }, 15000);
            // Clear timeout if component unmounts or relaunchResult changes
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [relaunchResult]);
    // Request detected Chrome path on mount
    useEffect(() => {
        vscode.postMessage({
            type: "getDetectedChromePath",
        });
    }, []);
    // Debounced connection check function
    const debouncedCheckConnection = useCallback(debounce(() => {
        if (browserSettings.remoteBrowserEnabled) {
            setIsCheckingConnection(true);
            setConnectionStatus(null);
            if (browserSettings.remoteBrowserHost) {
                // Use gRPC for testBrowserConnection
                BrowserServiceClient.testBrowserConnection({
                    value: browserSettings.remoteBrowserHost,
                })
                    .then((result) => {
                    setConnectionStatus(result.success);
                    setIsCheckingConnection(false);
                })
                    .catch((error) => {
                    console.error("Error testing browser connection:", error);
                    setConnectionStatus(false);
                    setIsCheckingConnection(false);
                });
            }
            else {
                BrowserServiceClient.discoverBrowser({})
                    .then((result) => {
                    setConnectionStatus(result.success);
                    setIsCheckingConnection(false);
                })
                    .catch((error) => {
                    console.error("Error discovering browser:", error);
                    setConnectionStatus(false);
                    setIsCheckingConnection(false);
                });
            }
        }
    }, 1000), [browserSettings.remoteBrowserEnabled, browserSettings.remoteBrowserHost]);
    // Check connection when component mounts or when remote settings change
    useEffect(() => {
        if (browserSettings.remoteBrowserEnabled) {
            debouncedCheckConnection();
        }
        else {
            setConnectionStatus(null);
        }
    }, [
        browserSettings.remoteBrowserEnabled,
        browserSettings.remoteBrowserHost,
        debouncedCheckConnection,
    ]);
    const handleViewportChange = (event) => {
        const target = event.target;
        const selectedSize = BROWSER_VIEWPORT_PRESETS[target.value];
        if (selectedSize) {
            vscode.postMessage({
                type: "browserSettings",
                browserSettings: {
                    ...browserSettings,
                    viewport: selectedSize,
                },
            });
        }
    };
    const updateRemoteBrowserEnabled = (enabled) => {
        // Also update browserSettings to ensure task settings are updated
        vscode.postMessage({
            type: "browserSettings",
            browserSettings: {
                ...browserSettings,
                remoteBrowserEnabled: enabled,
                // If disabling, also clear the host in browserSettings
                ...(enabled ? {} : { remoteBrowserHost: undefined }),
            },
        });
    };
    const updateRemoteBrowserHost = (host) => {
        // Also update browserSettings to ensure task settings are updated
        vscode.postMessage({
            type: "browserSettings",
            browserSettings: {
                ...browserSettings,
                remoteBrowserHost: host,
            },
        });
    };
    // Function to check connection once without changing UI state immediately
    const checkConnectionOnce = useCallback(() => {
        // Don't show the spinner for every check to avoid UI flicker
        // We'll rely on the response to update the connectionStatus
        if (browserSettings.remoteBrowserHost) {
            // Use gRPC for testBrowserConnection
            BrowserServiceClient.testBrowserConnection({
                value: browserSettings.remoteBrowserHost,
            })
                .then((result) => {
                setConnectionStatus(result.success);
            })
                .catch((error) => {
                console.error("Error testing browser connection:", error);
                setConnectionStatus(false);
            });
        }
        else {
            BrowserServiceClient.discoverBrowser({})
                .then((result) => {
                setConnectionStatus(result.success);
            })
                .catch((error) => {
                console.error("Error discovering browser:", error);
                setConnectionStatus(false);
            });
        }
    }, [browserSettings.remoteBrowserHost]);
    // Setup continuous polling for connection status when remote browser is enabled
    useEffect(() => {
        // Only poll if remote browser mode is enabled
        if (!browserSettings.remoteBrowserEnabled) {
            // Make sure we're not showing checking state when disabled
            setIsCheckingConnection(false);
            return undefined;
        }
        // Check immediately when enabled
        checkConnectionOnce();
        // Then check every second
        const pollInterval = setInterval(() => {
            checkConnectionOnce();
        }, 1000);
        // Cleanup the interval if the component unmounts or remote browser is disabled
        return () => clearInterval(pollInterval);
    }, [browserSettings.remoteBrowserEnabled, checkConnectionOnce]);
    const relaunchChromeDebugMode = () => {
        setDebugMode(true);
        setRelaunchResult(null);
        // The connection status will be automatically updated by our polling
        vscode.postMessage({
            type: "relaunchChromeDebugMode",
        });
    };
    // Determine if we should show the relaunch button
    const isRemoteEnabled = Boolean(browserSettings.remoteBrowserEnabled);
    const shouldShowRelaunchButton = isRemoteEnabled && connectionStatus === false;
    return (_jsxs("div", { id: "browser-settings-section", style: {
            marginBottom: 20,
            borderTop: "1px solid var(--vscode-panel-border)",
            paddingTop: 15,
        }, children: [_jsx("h3", { style: {
                    color: "var(--vscode-foreground)",
                    margin: "0 0 10px 0",
                    fontSize: "14px",
                }, children: "Browser Settings" }), _jsxs("div", { style: { marginBottom: 15 }, children: [_jsxs("div", { style: { marginBottom: 8 }, children: [_jsx("label", { style: { fontWeight: "500", display: "block", marginBottom: 5 }, children: "Viewport size" }), _jsx(VSCodeDropdown, { style: { width: "100%" }, value: Object.entries(BROWSER_VIEWPORT_PRESETS).find(([_, size]) => {
                                    const typedSize = size;
                                    return (typedSize.width === browserSettings.viewport.width &&
                                        typedSize.height === browserSettings.viewport.height);
                                })?.[0], onChange: (event) => handleViewportChange(event), children: Object.entries(BROWSER_VIEWPORT_PRESETS).map(([name]) => (_jsx(VSCodeOption, { value: name, children: name }, name))) })] }), _jsx("p", { style: {
                            fontSize: "12px",
                            color: "var(--vscode-descriptionForeground)",
                            margin: 0,
                        }, children: "Set the size of the browser viewport for screenshots and interactions." })] }), _jsxs("div", { style: { marginBottom: 0 }, children: [_jsxs("div", { style: {
                            marginBottom: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }, children: [_jsx(VSCodeCheckbox, { checked: browserSettings.remoteBrowserEnabled, onChange: (e) => updateRemoteBrowserEnabled(e.target.checked), children: "Use remote browser connection" }), _jsx(ConnectionStatusIndicator, { isChecking: isCheckingConnection, isConnected: connectionStatus, remoteBrowserEnabled: browserSettings.remoteBrowserEnabled })] }), _jsxs("p", { style: {
                            fontSize: "12px",
                            color: "var(--vscode-descriptionForeground)",
                            margin: "0 0 6px 0px",
                        }, children: ["Enable ValorIDE to use your Chrome", isBundled
                                ? "(not detected on your machine)"
                                : detectedChromePath
                                    ? ` (${detectedChromePath})`
                                    : "", ". This requires starting Chrome in debug mode", browserSettings.remoteBrowserEnabled ? (_jsxs(_Fragment, { children: [" ", "manually (", _jsx("code", { children: "--remote-debugging-port=9222" }), ") or using the button below. Enter the host address or leave it blank for automatic discovery."] })) : (".")] }), browserSettings.remoteBrowserEnabled && (_jsxs("div", { style: { marginLeft: 0 }, children: [_jsx(VSCodeTextField, { value: browserSettings.remoteBrowserHost || "", placeholder: "http://localhost:9222", style: { width: "100%", marginBottom: 8 }, onChange: (e) => updateRemoteBrowserHost(e.target.value || undefined) }), shouldShowRelaunchButton && (_jsx("div", { style: {
                                    display: "flex",
                                    gap: "10px",
                                    marginBottom: 8,
                                    justifyContent: "center",
                                }, children: _jsx(VSCodeButton, { style: { flex: 1 }, disabled: debugMode, onClick: relaunchChromeDebugMode, children: debugMode
                                        ? "Relaunching Browser..."
                                        : "Relaunch Browser with Debug Mode" }) })), relaunchResult && (_jsx("div", { style: {
                                    padding: "8px",
                                    marginBottom: "8px",
                                    backgroundColor: relaunchResult.success
                                        ? "rgba(0, 128, 0, 0.1)"
                                        : "rgba(255, 0, 0, 0.1)",
                                    color: relaunchResult.success
                                        ? "var(--vscode-terminal-ansiGreen)"
                                        : "var(--vscode-terminal-ansiRed)",
                                    borderRadius: "3px",
                                    fontSize: "11px",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                }, children: relaunchResult.message })), _jsx("p", { style: {
                                    fontSize: "12px",
                                    color: "var(--vscode-descriptionForeground)",
                                    margin: 0,
                                } })] }))] })] }));
};
const StatusContainer = styled.div `
  display: flex;
  align-items: center;
  margin-left: 12px;
  height: 20px;
`;
const StatusText = styled.span `
  font-size: 12px;
  margin-left: 4px;
`;
const CheckIcon = styled.i `
  color: var(--vscode-terminal-ansiGreen);
  font-size: 14px;
`;
const Spinner = styled.div `
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: var(--vscode-progressBar-background);
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
export default BrowserSettingsSection;
//# sourceMappingURL=BrowserSettingsSection.js.map