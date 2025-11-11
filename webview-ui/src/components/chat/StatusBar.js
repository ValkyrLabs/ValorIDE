import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { FaSpinner, FaPlug, FaRobot } from "react-icons/fa";
import StatusBadge from "@/components/common/StatusBadge";
const StatusBar = ({ wsConnected, wsInstanceCount, isConnectingMothership, onConnectMothership, peerCount, p2pOpen, isConnectingPeers, multipleInstances, onConnectPeers, onRobotIconClick, communicationService, jwtToken, netBalance }) => {
    const svc = communicationService;
    const ready = !!svc.ready;
    const hasError = !!svc.error;
    const connecting = !ready && !hasError;
    const telecomValue = ready
        ? "Online"
        : hasError
            ? "Error"
            : connecting
                ? "Connecting"
                : "Offline";
    const telecomKind = ready
        ? "ok"
        : hasError
            ? "error"
            : "warn";
    const RobotIconComponent = () => (_jsx("div", { style: {
            cursor: "pointer",
            color: "#61dafb",
            fontSize: "24px",
            marginLeft: "10px",
            alignSelf: "center",
        }, title: "Click to ping other ValorIDE instances", onClick: onRobotIconClick, children: _jsx(FaRobot, {}) }));
    return (_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [isConnectingMothership && (_jsx(FaSpinner, { style: {
                            animation: "spin 1s linear infinite",
                            color: "#61dafb",
                        } })), _jsx(StatusBadge, { label: "Socket", value: wsConnected ? `${wsInstanceCount}/${wsInstanceCount + 1}` : "Disconnected", kind: wsConnected ? 'ok' : 'warn', title: wsConnected ? `Connected to mothership with ${wsInstanceCount} other instances` : "Not connected to websocket mothership", style: isConnectingMothership
                            ? {
                                border: "1px solid #61dafb",
                                boxShadow: "0 0 8px #61dafb",
                            }
                            : undefined }), _jsx(VSCodeButton, { appearance: "icon", onClick: onConnectMothership, title: isConnectingMothership ? "Connecting…" : "Reconnect to websocket mothership", children: isConnectingMothership ? (_jsx(FaSpinner, { style: { animation: "spin 1s linear infinite" } })) : (_jsx(FaPlug, {})) }), multipleInstances && _jsx(RobotIconComponent, {})] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [connecting && (_jsx(FaSpinner, { style: {
                            animation: "spin 1s linear infinite",
                            color: "#61dafb",
                        } })), true && (_jsx(StatusBadge, { label: "Balance", value: `$${netBalance.toFixed(2)}`, kind: netBalance > 0 ? 'ok' : 'error', title: "Current balance minus this session's live API cost" }))] })] }));
};
export default StatusBar;
//# sourceMappingURL=StatusBar.js.map