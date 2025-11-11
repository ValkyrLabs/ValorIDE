import { jsx as _jsx } from "react/jsx-runtime";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
export const McpToolPalette = ({ server, onToolClick }) => {
    if (!server || !server.tools || server.tools.length === 0) {
        return _jsx("div", { style: { opacity: 0.7, fontSize: 13 }, children: "No tools available for this server." });
    }
    return (_jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }, children: server.tools.map(tool => (_jsx(VSCodeButton, { appearance: "secondary", style: { minWidth: 120 }, onClick: () => onToolClick(tool), children: tool.name }, tool.name))) }));
};
export default McpToolPalette;
//# sourceMappingURL=McpToolPalette.js.map