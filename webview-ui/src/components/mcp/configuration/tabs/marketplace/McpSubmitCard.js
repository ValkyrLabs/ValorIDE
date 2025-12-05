import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VscAdd } from "react-icons/vsc";
const McpSubmitCard = () => {
    return (_jsxs("div", { style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            padding: "15px",
            margin: "20px",
            backgroundColor: "var(--vscode-textBlockQuote-background)",
            borderRadius: "6px",
        }, children: [_jsx(VscAdd, { style: { fontSize: "18px" } }), _jsxs("div", { style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px",
                    textAlign: "center",
                    maxWidth: "480px",
                }, children: [_jsx("h3", { style: {
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--vscode-foreground)",
                        }, children: "Submit MCP Server" }), _jsxs("p", { style: {
                            fontSize: "13px",
                            margin: 0,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["Help others discover great MCP servers by submitting an issue to", " ", _jsx("a", { href: "https://github.com/valoride/mcp-marketplace", children: "github.com/valoride/mcp-marketplace" })] })] })] }));
};
export default McpSubmitCard;
//# sourceMappingURL=McpSubmitCard.js.map