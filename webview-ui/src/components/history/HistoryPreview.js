import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { vscode } from "@/utils/vscode";
import { memo } from "react";
import { formatLargeNumber } from "@/utils/format";
import { FaComments, FaDollarSign, FaHistory } from "react-icons/fa";
const HistoryPreview = ({ showHistoryView }) => {
    const { taskHistory } = useExtensionState();
    const handleHistorySelect = (id) => {
        vscode.postMessage({ type: "showTaskWithId", text: id });
    };
    const formatDate = (timestamp) => {
        const now = new Date();
        const date = new Date(timestamp);
        // Normalize to midnight for day comparisons
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        // Format just the time portion
        const timeStr = date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        if (date >= today) {
            return `TODAY AT: ${timeStr}`;
        }
        if (date >= yesterday && date < today) {
            return `YESTERDAY AT: ${timeStr}`;
        }
        // Fallback: full formatted date
        return date
            .toLocaleString("en-US", {
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
            .replace(", ", " ")
            .toUpperCase();
    };
    return (_jsxs("div", { style: { flexShrink: 0 }, children: [_jsx("style", { children: `
					.history-preview-item {
						background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 65%, transparent);
						border-radius: 4px;
						position: relative;
						overflow: hidden;
						opacity: 0.8;
						cursor: pointer;
						margin-bottom: 12px;
					}
					.history-preview-item:hover {
						background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 100%, transparent);
						opacity: 1;
						pointer-events: auto;
					}
				` }), _jsxs("div", { style: {
                    color: "var(--vscode-descriptionForeground)",
                    margin: "10px 20px 10px 20px",
                    display: "flex",
                    alignItems: "center",
                }, children: [_jsx(FaComments, { style: {
                            marginRight: "4px",
                            transform: "scale(0.9)",
                        } }), _jsx("span", { style: {
                            fontWeight: 500,
                            fontSize: "0.85em",
                            textTransform: "uppercase",
                        }, children: "Recent Tasks" })] }), _jsxs("div", { style: { borderRadius: "10px", padding: "0px 20px 0 20px" }, children: [taskHistory
                        .filter((item) => item.ts && item.task)
                        .slice(0, 3)
                        .map((item) => (_jsx("div", { style: { maxHeight: "50px" }, className: "history-preview-item", onClick: () => handleHistorySelect(item.id), children: _jsxs("div", { style: { padding: "12px" }, children: [_jsxs("div", { style: {
                                        fontSize: "var(--vscode-font-size)",
                                        color: "var(--vscode-descriptionForeground)",
                                        marginBottom: "8px",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        overflowWrap: "anywhere",
                                    }, children: [_jsx("span", { style: {
                                                color: "var(--vscode-foreground)",
                                                fontWeight: 500,
                                                fontSize: "0.85em",
                                                textTransform: "uppercase",
                                            }, children: formatDate(item.ts) }), " • ", item.task] }), _jsxs("div", { style: {
                                        fontSize: "0.85em",
                                        color: "var(--vscode-descriptionForeground)",
                                    }, children: [_jsxs("span", { children: ["Tokens: \u2191", formatLargeNumber(item.tokensIn || 0), " \u2193", formatLargeNumber(item.tokensOut || 0)] }), !!item.cacheWrites && (_jsxs(_Fragment, { children: [" • ", _jsxs("span", { children: ["Cache: +", formatLargeNumber(item.cacheWrites || 0), " \u2192", " ", formatLargeNumber(item.cacheReads || 0)] })] })), !!item.totalCost && (_jsxs(_Fragment, { children: [" • ", _jsxs("span", { children: [_jsx(FaDollarSign, {}), "API Cost: $", item.totalCost?.toFixed(4)] })] }))] })] }) }, item.id))), _jsx("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }, children: _jsx(VSCodeButton, { onClick: () => showHistoryView(), style: {
                                opacity: 0.9,
                            }, children: _jsxs("div", { style: {
                                    fontSize: "var(--vscode-font-size)",
                                    color: "var(--vscode-descriptionForeground)",
                                }, children: [_jsx(FaHistory, {}), " View all history"] }) }) })] })] }));
};
export default memo(HistoryPreview);
//# sourceMappingURL=HistoryPreview.js.map