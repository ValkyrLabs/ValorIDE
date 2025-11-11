import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const StatusBadge = ({ label, value, kind = "idle", title, style }) => {
    const { bg, fg, border } = (() => {
        switch (kind) {
            case "ok":
                return {
                    bg: "var(--vscode-editor-background)",
                    fg: "var(--vscode-editor-foreground)",
                    border: "1px solid var(--vscode-inputValidation-warningBorder)"
                };
            case "warn":
                return {
                    bg: "var(--vscode-editor-background)",
                    fg: "var(--vscode-editor-foreground)",
                    border: "1px solid var(--vscode-inputValidation-warningBorder)"
                    /*
                    bg: "var(--vscode-inputValidation-warningBackground)",
                    fg: "var(--vscode-inputValidation-warningForeground)",
                    border: "var(--vscode-inputValidation-warningBorder)"
                    */
                };
            case "error":
                return {
                    bg: "var(--vscode-editor-background)",
                    fg: "var(--vscode-editor-foreground)",
                    border: "1px solid var(--vscode-inputValidation-warningBorder)"
                    /*
                    bg: "var(--vscode-inputValidation-errorBackground)",
                    fg: "var(--vscode-inputValidation-errorForeground)",
                    border: "var(--vscode-inputValidation-errorBorder)"
                    */
                };
            default:
                return {
                    bg: "var(--vscode-editor-background)",
                    fg: "var(--vscode-editor-foreground)",
                    border: "1px solid var(--vscode-inputValidation-warningBorder)"
                };
        }
    })();
    return (_jsxs("span", { title: title, style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            lineHeight: 1,
            padding: "4px 8px",
            borderRadius: 6,
            background: bg,
            color: fg,
            border: `1px solid ${border}`,
            ...style,
        }, children: [_jsx("span", { style: { opacity: 0.8 }, children: label }), value && (_jsx("span", { style: {
                    fontWeight: 600,
                }, children: value }))] }));
};
export default StatusBadge;
//# sourceMappingURL=StatusBadge.js.map