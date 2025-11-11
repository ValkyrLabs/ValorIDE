import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { vscode } from "@/utils/vscode";
import { BrowserServiceClient } from "../../services/grpc-client";
import { FaCog, FaWifi, FaDesktop, FaInfoCircle } from "react-icons/fa";
export const BrowserSettingsMenu = () => {
    const { browserSettings } = useExtensionState();
    const containerRef = useRef(null);
    const [showInfoPopover, setShowInfoPopover] = useState(false);
    const [connectionInfo, setConnectionInfo] = useState({
        isConnected: false,
        isRemote: !!browserSettings.remoteBrowserEnabled,
        host: browserSettings.remoteBrowserHost,
    });
    const popoverRef = useRef(null);
    // Get actual connection info from the browser session using gRPC
    useEffect(() => {
        // Function to fetch connection info
        (async () => {
            try {
                console.log("[DEBUG] SENDING BROWSER CONNECTION INFO REQUEST");
                const info = await BrowserServiceClient.getBrowserConnectionInfo({});
                console.log("[DEBUG] GOT BROWSER REPLY:", info, typeof info);
                setConnectionInfo({
                    isConnected: info.isConnected,
                    isRemote: info.isRemote,
                    host: info.host,
                });
            }
            catch (error) {
                console.error("Error fetching browser connection info:", error);
            }
        })();
        // No need for message event listeners anymore!
    }, [browserSettings.remoteBrowserHost, browserSettings.remoteBrowserEnabled]);
    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current &&
                !popoverRef.current.contains(event.target) &&
                !event
                    .composedPath()
                    .some((el) => el.classList?.contains("browser-info-icon"))) {
                setShowInfoPopover(false);
            }
        };
        if (showInfoPopover) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showInfoPopover]);
    const openBrowserSettings = () => {
        // First open the settings panel
        vscode.postMessage({
            type: "openSettings",
        });
        // After a short delay, send a message to scroll to browser settings
        setTimeout(() => {
            vscode.postMessage({
                type: "scrollToSettings",
                text: "browser-settings-section",
            });
        }, 300); // Give the settings panel time to open
    };
    const toggleInfoPopover = () => {
        setShowInfoPopover(!showInfoPopover);
        // Request updated connection info when opening the popover using gRPC
        if (!showInfoPopover) {
            const fetchConnectionInfo = async () => {
                try {
                    const info = await BrowserServiceClient.getBrowserConnectionInfo({});
                    setConnectionInfo({
                        isConnected: info.isConnected,
                        isRemote: info.isRemote,
                        host: info.host,
                    });
                }
                catch (error) {
                    console.error("Error fetching browser connection info:", error);
                }
            };
            fetchConnectionInfo();
        }
    };
    // Determine icon based on connection state
    const getIcon = () => {
        if (connectionInfo.isRemote) {
            return _jsx(FaWifi, {});
        }
        else {
            return connectionInfo.isConnected ? _jsx(FaDesktop, {}) : _jsx(FaInfoCircle, {});
        }
    };
    // Determine icon color based on connection state
    const getIconColor = () => {
        if (connectionInfo.isRemote) {
            return connectionInfo.isConnected
                ? "var(--vscode-charts-blue)"
                : "var(--vscode-foreground)";
        }
        else if (connectionInfo.isConnected) {
            return "var(--vscode-charts-green)";
        }
        else {
            return "var(--vscode-foreground)";
        }
    };
    // Check connection status every second to keep icon in sync using gRPC
    useEffect(() => {
        // Function to fetch connection info
        const fetchConnectionInfo = async () => {
            try {
                const info = await BrowserServiceClient.getBrowserConnectionInfo({});
                setConnectionInfo({
                    isConnected: info.isConnected,
                    isRemote: info.isRemote,
                    host: info.host,
                });
            }
            catch (error) {
                console.error("Error fetching browser connection info:", error);
            }
        };
        // Request connection info immediately
        fetchConnectionInfo();
        // Set up interval to refresh every second
        const intervalId = setInterval(fetchConnectionInfo, 1000);
        return () => clearInterval(intervalId);
    }, []);
    return (_jsxs("div", { ref: containerRef, style: { position: "relative", marginTop: "-1px", display: "flex" }, children: [_jsx(VSCodeButton, { appearance: "icon", className: "browser-info-icon", onClick: toggleInfoPopover, title: "Browser connection info", style: { marginRight: "4px" }, children: _jsx("div", { style: {
                        fontSize: "14.5px",
                        color: getIconColor(),
                    }, children: getIcon() }) }), showInfoPopover && (_jsxs(InfoPopover, { ref: popoverRef, children: [_jsx("h4", { style: { margin: "0 0 8px 0" }, children: "Browser Connection" }), _jsxs(InfoRow, { children: [_jsx(InfoLabel, { children: "Status:" }), _jsx(InfoValue, { style: {
                                    color: connectionInfo.isConnected
                                        ? "var(--vscode-charts-green)"
                                        : "var(--vscode-errorForeground)",
                                }, children: connectionInfo.isConnected ? "Connected" : "Disconnected" })] }), connectionInfo.isConnected && (_jsxs(InfoRow, { children: [_jsx(InfoLabel, { children: "Type:" }), _jsx(InfoValue, { children: connectionInfo.isRemote ? "Remote" : "Local" })] })), connectionInfo.isConnected &&
                        connectionInfo.isRemote &&
                        connectionInfo.host && (_jsxs(InfoRow, { children: [_jsx(InfoLabel, { children: "Remote Host:" }), _jsx(InfoValue, { children: connectionInfo.host })] }))] })), _jsx(VSCodeButton, { appearance: "icon", onClick: openBrowserSettings, children: _jsx(FaCog, { style: { fontSize: "14.5px" } }) })] }));
};
const InfoPopover = styled.div `
  position: absolute;
  top: 30px;
  right: 0;
  background-color: var(--vscode-editorWidget-background);
  border: 1px solid var(--vscode-widget-border);
  border-radius: 4px;
  padding: 10px;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 60dvw;
  max-width: 250px;
`;
const InfoRow = styled.div `
  display: flex;
  margin-bottom: 4px;
  flex-wrap: wrap;
  white-space: nowrap;
`;
const InfoLabel = styled.div `
  flex: 0 0 90px;
  font-weight: 500;
`;
const InfoValue = styled.div `
  flex: 1;
  word-break: break-word;
`;
export default BrowserSettingsMenu;
//# sourceMappingURL=BrowserSettingsMenu.js.map