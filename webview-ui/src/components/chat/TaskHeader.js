import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useWindowSize } from "react-use";
import { mentionRegexGlobal } from "@shared/context-mentions";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { formatLargeNumber } from "@/utils/format";
import { formatSize } from "@/utils/format";
import { vscode } from "@/utils/vscode";
import Thumbnails from "@/components/common/Thumbnails";
import { normalizeApiConfiguration } from "@/components/settings/ApiOptions";
import { validateSlashCommand } from "@/utils/slash-commands";
import { FaArrowUp, FaArrowDown, FaDatabase, FaArrowRight, FaTrash, FaChevronDown, FaChevronRight, FaTimes, FaExclamationTriangle, FaCopy, FaCheck, FaDollarSign, FaClock } from "react-icons/fa";
import StatusBadge from "../common/StatusBadge";
const TaskHeader = ({ task, tokensIn, tokensOut, doesModelSupportPromptCache, cacheWrites, cacheReads, totalCost, lastApiReqTotalTokens, onClose, }) => {
    const { apiConfiguration, currentTaskItem, checkpointTrackerErrorMessage } = useExtensionState();
    const { chatSettings } = useExtensionState();
    const [isTaskExpanded, setIsTaskExpanded] = useState(false);
    const [isTextExpanded, setIsTextExpanded] = useState(false);
    const [copyToastVisible, setCopyToastVisible] = useState(false);
    const [showSeeMore, setShowSeeMore] = useState(false);
    const [copied, setCopied] = useState(false);
    const textContainerRef = useRef(null);
    const textRef = useRef(null);
    const { selectedModelInfo } = useMemo(() => normalizeApiConfiguration(apiConfiguration), [apiConfiguration]);
    const contextWindow = selectedModelInfo?.contextWindow;
    // Open task header when checkpoint tracker error message is set
    const prevErrorMessageRef = useRef(checkpointTrackerErrorMessage);
    useEffect(() => {
        if (checkpointTrackerErrorMessage !== prevErrorMessageRef.current) {
            setIsTaskExpanded(true);
            prevErrorMessageRef.current = checkpointTrackerErrorMessage;
        }
    }, [checkpointTrackerErrorMessage]);
    // Reset isTextExpanded when task is collapsed
    useEffect(() => {
        if (!isTaskExpanded) {
            setIsTextExpanded(false);
        }
    }, [isTaskExpanded]);
    // Track window size for responsive layout without manual listeners
    const { height: windowHeight, width: windowWidth } = useWindowSize();
    useEffect(() => {
        if (isTextExpanded && textContainerRef.current) {
            const maxHeight = windowHeight * (1 / 2);
            textContainerRef.current.style.maxHeight = `${maxHeight}px`;
        }
    }, [isTextExpanded, windowHeight]);
    useEffect(() => {
        if (isTaskExpanded && textRef.current && textContainerRef.current) {
            // Use requestAnimationFrame to ensure DOM is fully updated
            requestAnimationFrame(() => {
                // Check if refs are still valid
                if (textRef.current && textContainerRef.current) {
                    let textContainerHeight = textContainerRef.current.clientHeight;
                    if (!textContainerHeight) {
                        textContainerHeight =
                            textContainerRef.current.getBoundingClientRect().height;
                    }
                    const isOverflowing = textRef.current.scrollHeight > textContainerHeight;
                    setShowSeeMore(isOverflowing);
                }
            });
        }
    }, [task.text, windowWidth, isTaskExpanded]);
    const isCostAvailable = useMemo(() => {
        const openAiCompatHasPricing = apiConfiguration?.apiProvider === "openai" &&
            apiConfiguration?.openAiModelInfo?.inputPrice &&
            apiConfiguration?.openAiModelInfo?.outputPrice;
        if (openAiCompatHasPricing) {
            return true;
        }
        return (apiConfiguration?.apiProvider !== "vscode-lm" &&
            apiConfiguration?.apiProvider !== "ollama" &&
            apiConfiguration?.apiProvider !== "lmstudio" &&
            apiConfiguration?.apiProvider !== "gemini");
    }, [apiConfiguration?.apiProvider, apiConfiguration?.openAiModelInfo]);
    const shouldShowPromptCacheInfo = doesModelSupportPromptCache &&
        apiConfiguration?.apiProvider !== "openrouter" &&
        apiConfiguration?.apiProvider !== "valoride";
    const ContextWindowComponent = (_jsx(_Fragment, { children: isTaskExpanded && contextWindow && (_jsxs("div", { style: {
                display: "flex",
                flexDirection: windowWidth < 270 ? "column" : "row",
                gap: "4px",
            }, children: [_jsx("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0, // Prevents shrinking
                    }, children: _jsx("span", { style: { fontWeight: "bold" }, children: "Context Window:" }) }), _jsxs("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                        flex: 1,
                        whiteSpace: "nowrap",
                    }, children: [_jsx("span", { children: formatLargeNumber(lastApiReqTotalTokens || 0) }), _jsxs("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                                flex: 1,
                            }, children: [_jsx("div", { style: {
                                        flex: 1,
                                        height: "4px",
                                        borderRadius: "10px",
                                        overflow: "hidden",
                                    }, children: _jsx("div", { style: {
                                            width: `${((lastApiReqTotalTokens || 0) / contextWindow) * 100}%`,
                                            height: "100%",
                                            backgroundColor: "var(--vscode-badge-foreground)",
                                            borderRadius: "2px",
                                        } }) }), _jsx("span", { children: formatLargeNumber(contextWindow) })] })] })] })) }));
    const setBudgetLimit = () => {
        // Ask the extension to show an input box and persist the value
        vscode.postMessage({ type: "requestSetBudgetLimit" });
    };
    const setApiThrottle = () => {
        // Ask the extension to show an input box and persist the value
        vscode.postMessage({ type: "requestSetApiThrottle" });
    };
    return (_jsx("div", { style: { padding: "10px 13px 10px 13px" }, children: _jsxs("div", { style: {
                backgroundColor: "var(--vscode-sideBar-border)",
                borderRadius: "10px",
                padding: "9px 10px 9px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                position: "relative",
                zIndex: 1,
            }, children: [copyToastVisible && (_jsx("div", { style: {
                        position: "absolute",
                        top: 6,
                        right: 40,
                        background: "var(--vscode-badge-background)",
                        color: "var(--vscode-badge-foreground)",
                        border: "1px solid var(--vscode-badge-foreground)",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 12,
                        boxShadow: "0 0 6px rgba(0,0,0,0.2)",
                        pointerEvents: "none",
                    }, "aria-live": "polite", children: "Copied" })), _jsxs("div", { style: {
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }, children: [_jsxs("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                cursor: "pointer",
                                marginLeft: -2,
                                userSelect: "none",
                                WebkitUserSelect: "none",
                                MozUserSelect: "none",
                                msUserSelect: "none",
                                flexGrow: 1,
                                minWidth: 0, // This allows the div to shrink below its content size
                            }, onClick: () => setIsTaskExpanded(!isTaskExpanded), children: [_jsx("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        flexShrink: 0,
                                    }, children: isTaskExpanded ? _jsx(FaChevronDown, {}) : _jsx(FaChevronRight, {}) }), _jsxs("div", { style: {
                                        marginLeft: 6,
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        flexGrow: 1,
                                        minWidth: 0, // This allows the div to shrink below its content size
                                    }, children: [_jsxs("span", { style: { fontSize: 14, fontWeight: "bold" }, children: ["Task", !isTaskExpanded && ":"] }), !isTaskExpanded && (_jsx("span", { style: { marginLeft: 4 }, children: highlightText(task.text, false) }))] })] }), !isTaskExpanded && (_jsx(VSCodeButton, { appearance: "icon", title: copied ? "Copied" : "Copy task text", onClick: async (e) => {
                                e.stopPropagation();
                                try {
                                    await navigator.clipboard.writeText(task.text || "");
                                    setCopied(true);
                                    setCopyToastVisible(true);
                                    setTimeout(() => {
                                        setCopied(false);
                                        setCopyToastVisible(false);
                                    }, 1200);
                                }
                                catch { }
                            }, style: { marginLeft: 6, flexShrink: 0 }, children: copied ? _jsx(FaCheck, {}) : _jsx(FaCopy, {}) })), !isTaskExpanded && isCostAvailable && (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx(StatusBadge, { label: "Cost:", value: `$${totalCost?.toFixed(4)}`, title: "API Cost for this task", style: { fontSize: 14, padding: "2px 6px" } }), _jsx(VSCodeButton, { appearance: "icon", title: chatSettings?.budgetLimit != null
                                        ? `Budget limit: $${chatSettings.budgetLimit}`
                                        : "Set budget limit", onClick: (e) => {
                                        e.stopPropagation();
                                        setBudgetLimit();
                                    }, style: { marginLeft: 2 }, children: _jsx(FaDollarSign, {}) })] })), _jsx(VSCodeButton, { appearance: "icon", title: chatSettings?.apiThrottleMs != null
                                ? `Throttle: ${chatSettings.apiThrottleMs} ms`
                                : "Set API throttle", onClick: (e) => {
                                e.stopPropagation();
                                setApiThrottle();
                            }, style: { marginLeft: 2 }, children: _jsx(FaClock, {}) }), _jsx(VSCodeButton, { appearance: "icon", onClick: onClose, style: { marginLeft: 6, flexShrink: 0 }, children: _jsx(FaTimes, {}) })] }), isTaskExpanded && (_jsxs(_Fragment, { children: [_jsxs("div", { ref: textContainerRef, style: {
                                marginTop: -2,
                                fontSize: "var(--vscode-font-size)",
                                overflowY: isTextExpanded ? "auto" : "hidden",
                                wordBreak: "break-word",
                                overflowWrap: "anywhere",
                                position: "relative",
                            }, children: [_jsx("div", { ref: textRef, style: {
                                        display: "-webkit-box",
                                        WebkitLineClamp: isTextExpanded ? "unset" : 3,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-word",
                                        overflowWrap: "anywhere",
                                    }, children: highlightText(task.text, false) }), _jsx("div", { style: { position: "absolute", top: 0, right: 0 }, children: _jsx(VSCodeButton, { appearance: "icon", title: copied ? "Copied" : "Copy task text", onClick: async (e) => {
                                            e.stopPropagation();
                                            try {
                                                await navigator.clipboard.writeText(task.text || "");
                                                setCopied(true);
                                                setCopyToastVisible(true);
                                                setTimeout(() => {
                                                    setCopied(false);
                                                    setCopyToastVisible(false);
                                                }, 1200);
                                            }
                                            catch (err) {
                                                // no-op
                                            }
                                        }, children: copied ? _jsx(FaCheck, {}) : _jsx(FaCopy, {}) }) }), !isTextExpanded && showSeeMore && (_jsxs("div", { style: {
                                        position: "absolute",
                                        right: 0,
                                        bottom: 0,
                                        display: "flex",
                                        alignItems: "center",
                                    }, children: [_jsx("div", { style: {
                                                width: 30,
                                                height: "1.2em",
                                                background: "linear-gradient(to right, transparent, var(--vscode-badge-background))",
                                            } }), _jsx("div", { style: {
                                                cursor: "pointer",
                                                color: "var(--vscode-textLink-foreground)",
                                                paddingRight: 0,
                                                paddingLeft: 3,
                                                backgroundColor: "var(--vscode-badge-background)",
                                            }, onClick: () => setIsTextExpanded(!isTextExpanded), children: "See more" })] }))] }), isTextExpanded && showSeeMore && (_jsx("div", { style: {
                                cursor: "pointer",
                                color: "var(--vscode-textLink-foreground)",
                                marginLeft: "auto",
                                textAlign: "right",
                                paddingRight: 2,
                            }, onClick: () => setIsTextExpanded(!isTextExpanded), children: "See less" })), task.images && task.images.length > 0 && (_jsx(Thumbnails, { images: task.images })), _jsxs("div", { style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                            }, children: [_jsxs("div", { style: {
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        height: 17,
                                    }, children: [_jsxs("div", { style: {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                flexWrap: "wrap",
                                            }, children: [_jsx("span", { style: { fontWeight: "bold" }, children: "Tokens:" }), _jsxs("span", { style: {
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                    }, children: [_jsx(FaArrowUp, { style: {
                                                                fontSize: "12px",
                                                                fontWeight: "bold",
                                                                marginBottom: "-2px",
                                                            } }), formatLargeNumber(tokensIn || 0)] }), _jsxs("span", { style: {
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "3px",
                                                    }, children: [_jsx(FaArrowDown, { style: {
                                                                fontSize: "12px",
                                                                fontWeight: "bold",
                                                                marginBottom: "-2px",
                                                            } }), formatLargeNumber(tokensOut || 0)] })] }), !isCostAvailable && (_jsx(DeleteButton, { taskSize: formatSize(currentTaskItem?.size), taskId: currentTaskItem?.id }))] }), shouldShowPromptCacheInfo &&
                                    (cacheReads !== undefined ||
                                        cacheWrites !== undefined ||
                                        apiConfiguration?.apiProvider === "anthropic") && (_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        flexWrap: "wrap",
                                    }, children: [_jsx("span", { style: { fontWeight: "bold" }, children: "Cache:" }), _jsxs("span", { style: {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "3px",
                                            }, children: [_jsx(FaDatabase, { style: {
                                                        fontSize: "12px",
                                                        fontWeight: "bold",
                                                        marginBottom: "-1px",
                                                    } }), "+", formatLargeNumber(cacheWrites || 0)] }), _jsxs("span", { style: {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "3px",
                                            }, children: [_jsx(FaArrowRight, { style: {
                                                        fontSize: "12px",
                                                        fontWeight: "bold",
                                                        marginBottom: 0,
                                                    } }), formatLargeNumber(cacheReads || 0)] })] })), ContextWindowComponent, _jsx("div", { style: {
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        height: 17,
                                    }, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [isCostAvailable && (_jsxs("div", { style: {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                }, children: [_jsx("span", { style: { fontWeight: "bold" }, children: "API Cost:" }), _jsxs("span", { children: ["$", totalCost?.toFixed(4)] })] })), _jsx(VSCodeButton, { appearance: "icon", title: chatSettings?.budgetLimit != null
                                                    ? `Budget limit: $${chatSettings.budgetLimit}`
                                                    : "Set budget limit", onClick: setBudgetLimit, style: { marginLeft: 2 }, children: _jsx(FaDollarSign, {}) }), _jsx(VSCodeButton, { appearance: "icon", title: chatSettings?.apiThrottleMs != null
                                                    ? `Throttle: ${chatSettings.apiThrottleMs} ms`
                                                    : "Set API throttle", onClick: setApiThrottle, style: { marginLeft: 2 }, children: _jsx(FaClock, {}) }), _jsx(DeleteButton, { taskSize: formatSize(currentTaskItem?.size), taskId: currentTaskItem?.id })] }) }), checkpointTrackerErrorMessage && (_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        color: "var(--vscode-editorWarning-foreground)",
                                        fontSize: "11px",
                                    }, children: [_jsx(FaExclamationTriangle, {}), _jsxs("span", { children: [checkpointTrackerErrorMessage.replace(/disabling checkpoints\.$/, ""), checkpointTrackerErrorMessage.endsWith("disabling checkpoints.") && (_jsx(_Fragment, { children: _jsx("a", { onClick: () => {
                                                            vscode.postMessage({
                                                                type: "openExtensionSettings",
                                                                text: "enableCheckpoints",
                                                            });
                                                        }, style: {
                                                            color: "inherit",
                                                            textDecoration: "underline",
                                                            cursor: "pointer",
                                                        }, children: "disabling checkpoints." }) })), checkpointTrackerErrorMessage.includes("Git must be installed to use checkpoints.") && (_jsxs(_Fragment, { children: [" ", _jsx("a", { href: "https://github.com/valkyrlabs/valoride/wiki/Installing-Git-for-Checkpoints", style: {
                                                                color: "inherit",
                                                                textDecoration: "underline",
                                                            }, children: "See here for instructions." })] }))] })] }))] })] }))] }) }));
};
/**
 * Highlights slash-command in this text if it exists
 */
const highlightSlashCommands = (text, withShadow = true) => {
    const match = text.match(/^\s*\/([a-zA-Z0-9_-]+)(\s*|$)/);
    if (!match) {
        return text;
    }
    const commandName = match[1];
    const validationResult = validateSlashCommand(commandName);
    if (!validationResult || validationResult !== "full") {
        return text;
    }
    const commandEndIndex = match[0].length;
    const beforeCommand = text.substring(0, text.indexOf("/"));
    const afterCommand = match[2] + text.substring(commandEndIndex);
    return [
        beforeCommand,
        _jsxs("span", { className: withShadow
                ? "mention-context-highlight-with-shadow"
                : "mention-context-highlight", children: ["/", commandName] }, "slashCommand"),
        afterCommand,
    ];
};
/**
 * Highlights & formats all mentions inside this text
 */
export const highlightMentions = (text, withShadow = true) => {
    const parts = text.split(mentionRegexGlobal);
    return parts.map((part, index) => {
        if (index % 2 === 0) {
            // This is regular text
            return part;
        }
        else {
            // This is a mention
            return (_jsxs("span", { className: withShadow
                    ? "mention-context-highlight-with-shadow"
                    : "mention-context-highlight", style: { cursor: "pointer" }, onClick: () => vscode.postMessage({ type: "openMention", text: part }), children: ["@", part] }, index));
        }
    });
};
/**
 * Handles parsing both mentions and slash-commands
 */
export const highlightText = (text, withShadow = true) => {
    if (!text) {
        return text;
    }
    const resultWithSlashHighlighting = highlightSlashCommands(text, withShadow);
    if (resultWithSlashHighlighting === text) {
        // no highlighting done
        return highlightMentions(resultWithSlashHighlighting, withShadow);
    }
    if (Array.isArray(resultWithSlashHighlighting) &&
        resultWithSlashHighlighting.length === 3) {
        const [beforeCommand, commandElement, afterCommand] = resultWithSlashHighlighting;
        return [
            beforeCommand,
            commandElement,
            ...highlightMentions(afterCommand, withShadow),
        ];
    }
    return [text];
};
const DeleteButton = ({ taskSize, taskId }) => (_jsx(VSCodeButton, { appearance: "icon", onClick: () => vscode.postMessage({ type: "deleteTaskWithId", text: taskId }), style: { padding: "0px 0px" }, children: _jsxs("div", { style: {
            display: "flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "10px",
            fontWeight: "bold",
            opacity: 0.6,
        }, children: [_jsx(FaTrash, {}), taskSize] }) }));
// const ExportButton = () => (
// 	<VSCodeButton
// 		appearance="icon"
// 		onClick={() => vscode.postMessage({ type: "exportCurrentTask" })}
// 		style={
// 			{
// 				// marginBottom: "-2px",
// 				// marginRight: "-2.5px",
// 			}
// 		}>
// 		<div style={{ fontSize: "10.5px", fontWeight: "bold", opacity: 0.6 }}>EXPORT</div>
// 	</VSCodeButton>
// )
export default memo(TaskHeader);
//# sourceMappingURL=TaskHeader.js.map