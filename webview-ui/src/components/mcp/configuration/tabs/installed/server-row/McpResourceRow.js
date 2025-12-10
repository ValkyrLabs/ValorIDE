import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VscSymbolFile } from "react-icons/vsc";
const McpResourceRow = ({ item }) => {
    const hasUri = "uri" in item;
    const uri = hasUri ? item.uri : item.uriTemplate;
    return (_jsxs("div", { style: {
            padding: "3px 0",
        }, children: [_jsxs("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "4px",
                }, children: [_jsx(VscSymbolFile, { style: { marginRight: "6px" } }), _jsx("span", { style: { fontWeight: 500, wordBreak: "break-all" }, children: uri })] }), _jsx("div", { style: {
                    fontSize: "12px",
                    opacity: 0.8,
                    margin: "4px 0",
                }, children: item.name && item.description
                    ? `${item.name}: ${item.description}`
                    : !item.name && item.description
                        ? item.description
                        : !item.description && item.name
                            ? item.name
                            : "No description" }), _jsxs("div", { style: {
                    fontSize: "12px",
                }, children: [_jsx("span", { style: { opacity: 0.8 }, children: "Returns " }), _jsx("code", { style: {
                            color: "var(--vscode-textPreformat-foreground)",
                            background: "var(--vscode-textPreformat-background)",
                            padding: "1px 4px",
                            borderRadius: "3px",
                        }, children: item.mimeType || "Unknown" })] })] }, uri));
};
export default McpResourceRow;
//# sourceMappingURL=McpResourceRow.js.map