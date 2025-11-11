import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeBadge, VSCodeProgressRing, } from "@vscode/webview-ui-toolkit/react";
import deepEqual from "fast-deep-equal";
import { memo, useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { useEvent, useSize } from "react-use";
import styled from "styled-components";
import { FaExclamationTriangle, FaExclamationCircle, FaTerminal, FaServer, FaCheck, FaQuestion, FaChevronDown, FaChevronUp, FaChevronRight, FaEdit, FaSignOutAlt, FaFileCode, FaExternalLinkAlt, FaFolderOpen, FaSearch, FaFile, FaBook, FaArrowRight, FaPlus, FaExclamationTriangle as FaWarning, FaBrain, FaCarCrash, FaMagic, FaFileUpload } from "react-icons/fa";
import { VscError, VscCheck } from "react-icons/vsc";
import { COMPLETION_RESULT_CHANGES_FLAG } from "@shared/ExtensionMessage";
import { COMMAND_OUTPUT_STRING, COMMAND_REQ_APP_STRING, } from "@shared/combineCommandSequences";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { findMatchingResourceOrTemplate, getMcpServerDisplayName, } from "@/utils/mcp";
import { vscode } from "@/utils/vscode";
import { FileServiceClient } from "@/services/grpc-client";
import { CheckmarkControl } from "@/components/common/CheckmarkControl";
import { CheckpointControls, } from "../common/CheckpointControls";
import CodeAccordian, { cleanPathPrefix } from "../common/CodeAccordian";
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import MarkdownBlock from "@/components/common/MarkdownBlock";
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow";
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay";
import CreditLimitError from "@/components/chat/CreditLimitError";
import { OptionsButtons } from "@/components/chat/OptionsButtons";
import SuccessButton from "@/components/common/SuccessButton";
import TaskFeedbackButtons from "@/components/chat/TaskFeedbackButtons";
import NewTaskPreview from "./NewTaskPreview";
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow";
import UserMessage from "./UserMessage";
const statusColorMap = {
    added: "var(--vscode-charts-green)",
    modified: "var(--vscode-charts-blue)",
    deleted: "var(--vscode-charts-red)",
    renamed: "#c586c0",
    copied: "#d7ba7d",
    typechange: "#d7ba7d",
};
const statusShortLabel = {
    added: "A",
    modified: "M",
    deleted: "D",
    renamed: "R",
    copied: "C",
    typechange: "T",
};
const ChangesSummaryContainer = styled.div `
  margin-top: 12px;
  border-radius: 10px;
  border: 1px solid var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.08));
  background: color-mix(
    in srgb,
    var(--vscode-editorWidget-background) 82%,
    transparent
  );
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const ChangesSummaryHeader = styled.div `
  display: flex;
  align-items: center;
  gap: 10px;
`;
const ChangesSummaryTitle = styled.span `
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
  flex: 1;
  min-width: 0;
`;
const ChangesSummaryTotals = styled.div `
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
`;
const SummaryMetric = styled.span `
  color: ${({ variant }) => variant === "added"
    ? "var(--vscode-charts-green)"
    : "var(--vscode-charts-red)"};
`;
const ChangesSummaryActionButton = styled.button `
  background: none;
  border: none;
  color: var(--vscode-editorLink-activeForeground, var(--vscode-textLink-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, currentColor 12%, transparent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
const ChangesSummaryList = styled.div `
  display: flex;
  flex-direction: column;
  gap: 6px;
`;
const ChangesSummaryRow = styled.button `
  all: unset;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  border: 1px solid var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.07));
  padding: 8px 10px;
  cursor: pointer;
  gap: 10px;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--vscode-editorWidget-background) 55%, transparent);
    border-color: color-mix(in srgb, currentColor 20%, transparent);
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;
const RowLeft = styled.div `
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;
const StatusBadge = styled.span `
  font-size: 10px;
  font-weight: 700;
  padding: 4px 6px;
  border-radius: 6px;
  background: ${({ status }) => colorMix(statusColorMap[status] ?? "var(--vscode-foreground)", 0.15)};
  color: ${({ status }) => statusColorMap[status] ?? "var(--vscode-foreground)"};
  text-transform: uppercase;
`;
const FileName = styled.span `
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;
const RowRight = styled.div `
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
`;
const RowSecondaryText = styled.span `
  display: block;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-top: 2px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
const RowTextWrapper = styled.div `
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
`;
const CompletionChangesSummary = ({ summary, disabled, onOpenAllChanges, onOpenFileDiff, }) => {
    if (!summary || summary.totalFiles === 0) {
        return null;
    }
    const totalFilesLabel = summary.totalFiles === 1
        ? "1 file"
        : `${summary.totalFiles} files`;
    return (_jsxs(ChangesSummaryContainer, { children: [_jsxs(ChangesSummaryHeader, { children: [_jsx(ChangesSummaryTitle, { children: "Changes Summary" }), _jsxs(ChangesSummaryTotals, { children: [_jsxs(SummaryMetric, { variant: "added", children: ["+", summary.totalInsertions] }), _jsxs(SummaryMetric, { variant: "removed", children: ["-", summary.totalDeletions] }), _jsx("span", { children: totalFilesLabel })] }), _jsx(ChangesSummaryActionButton, { type: "button", disabled: disabled, onClick: () => {
                            if (!disabled) {
                                onOpenAllChanges();
                            }
                        }, title: "Open all changes", "aria-label": "Open all changes", children: _jsx(FaExternalLinkAlt, { size: 12 }) })] }), _jsx(ChangesSummaryList, { children: summary.files.map((file, index) => {
                    const isDisabled = disabled || !!file.isBinary;
                    const secondaryText = file.isBinary
                        ? "Binary file"
                        : file.previousRelativePath
                            ? `Renamed from ${file.previousRelativePath}`
                            : undefined;
                    const statusLabel = statusShortLabel[file.status] ??
                        file.status?.slice(0, 1).toUpperCase();
                    return (_jsxs(ChangesSummaryRow, { type: "button", disabled: isDisabled, onClick: () => {
                            if (!isDisabled) {
                                onOpenFileDiff(file.relativePath);
                            }
                        }, title: file.isBinary
                            ? "Binary files cannot be previewed in the diff viewer"
                            : undefined, children: [_jsxs(RowLeft, { children: [_jsx(StatusBadge, { status: file.status, children: statusLabel }), _jsxs(RowTextWrapper, { children: [_jsx(FileName, { children: file.relativePath }), secondaryText && (_jsx(RowSecondaryText, { children: secondaryText }))] })] }), _jsxs(RowRight, { children: [!file.isBinary && (_jsxs(_Fragment, { children: [_jsxs(SummaryMetric, { variant: "added", children: ["+", file.insertions] }), _jsxs(SummaryMetric, { variant: "removed", children: ["-", file.deletions] })] })), _jsx(FaChevronRight, { size: 12 })] })] }, `${file.relativePath}-${index}`));
                }) })] }));
};
const colorMix = (hexColor, alpha) => {
    return `color-mix(in srgb, ${hexColor} ${alpha * 100}%, transparent)`;
};
const ChatRowContainer = styled.div `
  padding: 10px 6px 10px 15px;
  position: relative;

  &:hover ${CheckpointControls} {
    opacity: 1;
  }
`;
export const ProgressIndicator = () => (_jsx("div", { style: {
        width: "16px",
        height: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    }, children: _jsx("div", { style: { transform: "scale(0.55)", transformOrigin: "center" }, children: _jsx(VSCodeProgressRing, {}) }) }));
const Markdown = memo(({ markdown }) => {
    return (_jsx("div", { style: {
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            marginBottom: -15,
            marginTop: -15,
        }, children: _jsx(MarkdownBlock, { markdown: markdown }) }));
});
const ChatRow = memo((props) => {
    const { isLast, onHeightChange, message, lastModifiedMessage, inputValue, setInputValue, } = props;
    // Store the previous height to compare with the current height
    // This allows us to detect changes without causing re-renders
    const prevHeightRef = useRef(0);
    const [chatrow, { height }] = useSize(_jsx(ChatRowContainer, { children: _jsx(ChatRowContent, { ...props }) }));
    useEffect(() => {
        // used for partials command output etc.
        // NOTE: it's important we don't distinguish between partial or complete here since our scroll effects in chatview need to handle height change during partial -> complete
        const isInitialRender = prevHeightRef.current === 0; // prevents scrolling when new element is added since we already scroll for that
        // height starts off at Infinity
        if (isLast &&
            height !== 0 &&
            height !== Infinity &&
            height !== prevHeightRef.current) {
            if (!isInitialRender) {
                onHeightChange(height > prevHeightRef.current);
            }
            prevHeightRef.current = height;
        }
    }, [height, isLast, onHeightChange, message]);
    // we cannot return null as virtuoso does not support it so we use a separate visibleMessages array to filter out messages that should not be rendered
    return chatrow;
}, 
// memo does shallow comparison of props, so we need to do deep comparison of arrays/objects whose properties might change
deepEqual);
export default ChatRow;
export const ChatRowContent = ({ message, isExpanded, onToggleExpand, lastModifiedMessage, isLast, inputValue, setInputValue, sendMessageFromChatRow, }) => {
    const { mcpServers, mcpMarketplaceCatalog } = useExtensionState();
    const [seeNewChangesDisabled, setSeeNewChangesDisabled] = useState(false);
    const [cost, apiReqCancelReason, apiReqStreamingFailedMessage] = useMemo(() => {
        if (message.text != null && message.say === "api_req_started") {
            const info = JSON.parse(message.text);
            return [info.cost, info.cancelReason, info.streamingFailedMessage];
        }
        return [undefined, undefined, undefined];
    }, [message.text, message.say]);
    // when resuming task last won't be api_req_failed but a resume_task message so api_req_started will show loading spinner. that's why we just remove the last api_req_started that failed without streaming anything
    const apiRequestFailedMessage = isLast && lastModifiedMessage?.ask === "api_req_failed" // if request is retried then the latest message is a api_req_retried
        ? lastModifiedMessage?.text
        : undefined;
    const isCommandExecuting = isLast &&
        (lastModifiedMessage?.ask === "command" ||
            lastModifiedMessage?.say === "command") &&
        lastModifiedMessage?.text?.includes(COMMAND_OUTPUT_STRING);
    const isMcpServerResponding = isLast && lastModifiedMessage?.say === "mcp_server_request_started";
    const type = message.type === "ask" ? message.ask : message.say;
    const normalColor = "var(--vscode-foreground)";
    const errorColor = "var(--vscode-errorForeground)";
    const successColor = "var(--vscode-charts-green)";
    const cancelledColor = "var(--vscode-descriptionForeground)";
    const handleMessage = useCallback((event) => {
        const message = event.data;
        switch (message.type) {
            case "relinquishControl": {
                setSeeNewChangesDisabled(false);
                break;
            }
        }
    }, []);
    useEvent("message", handleMessage);
    const seeNewChangesSinceLastCompletion = message.ask === "completion_result" ||
        message.say === "completion_result";
    const handleOpenAllChanges = useCallback(() => {
        if (seeNewChangesDisabled) {
            return;
        }
        setSeeNewChangesDisabled(true);
        vscode.postMessage({
            type: "taskCompletionViewChanges",
            number: message.ts,
            seeNewChangesSinceLastTaskCompletion: seeNewChangesSinceLastCompletion,
        });
    }, [
        message.ts,
        seeNewChangesDisabled,
        seeNewChangesSinceLastCompletion,
    ]);
    const handleOpenFileDiff = useCallback((relativePath) => {
        if (seeNewChangesDisabled || !relativePath) {
            return;
        }
        setSeeNewChangesDisabled(true);
        vscode.postMessage({
            type: "taskCompletionOpenFileDiff",
            number: message.ts,
            relativePath,
            seeNewChangesSinceLastTaskCompletion: seeNewChangesSinceLastCompletion,
        });
    }, [
        message.ts,
        seeNewChangesDisabled,
        seeNewChangesSinceLastCompletion,
    ]);
    const [icon, title] = useMemo(() => {
        switch (type) {
            case "error":
                return [
                    _jsx(FaExclamationCircle, { style: {
                            color: errorColor,
                            marginBottom: "-1.5px",
                        } }),
                    _jsx("span", { style: { color: errorColor, fontWeight: "bold" }, children: "Error" }),
                ];
            case "mistake_limit_reached":
                return [
                    _jsx(FaExclamationCircle, { style: {
                            color: errorColor,
                            marginBottom: "-1.5px",
                        } }),
                    _jsx("span", { style: { color: errorColor, fontWeight: "bold" }, children: "ValorIDE is having trouble..." }),
                ];
            case "auto_approval_max_req_reached":
                return [
                    _jsx(FaExclamationTriangle, { style: {
                            color: errorColor,
                            marginBottom: "-1.5px",
                        } }),
                    _jsx("span", { style: { color: errorColor, fontWeight: "bold" }, children: "Maximum Requests Reached" }),
                ];
            case "command":
                return [
                    isCommandExecuting ? (_jsx(ProgressIndicator, {})) : (_jsx(FaTerminal, { style: {
                            color: normalColor,
                            marginBottom: "-1.5px",
                        } })),
                    _jsx("span", { style: { color: normalColor, fontWeight: "bold" }, children: "ValorIDE wants to execute this command:" }),
                ];
            case "use_mcp_server":
                const mcpServerUse = JSON.parse(message.text || "{}");
                return [
                    isMcpServerResponding ? (_jsx(ProgressIndicator, {})) : (_jsx(FaServer, { style: {
                            color: normalColor,
                            marginBottom: "-1.5px",
                        } })),
                    _jsxs("span", { style: {
                            color: normalColor,
                            fontWeight: "bold",
                            wordBreak: "break-word",
                        }, children: ["ValorIDE wants to", " ", mcpServerUse.type === "use_mcp_tool"
                                ? "use a tool"
                                : "access a resource", " ", "on the", " ", _jsx("code", { style: { wordBreak: "break-all" }, children: getMcpServerDisplayName(mcpServerUse.serverName, mcpMarketplaceCatalog) }), " ", "MCP server:"] }),
                ];
            case "completion_result":
                return [
                    _jsx(FaCheck, { style: {
                            color: successColor,
                            marginBottom: "-1.5px",
                        } }),
                    _jsx("span", { style: { color: successColor, fontWeight: "bold" }, children: "Task Completed" }),
                ];
            case "api_req_started":
                const getIconSpan = (IconComponent, color) => (_jsx("div", { style: {
                        width: 16,
                        height: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }, children: _jsx(IconComponent, { style: {
                            color,
                            fontSize: 16,
                            marginBottom: "-1.5px",
                        } }) }));
                return [
                    apiReqCancelReason != null ? (apiReqCancelReason === "user_cancelled" ? (getIconSpan(VscError, cancelledColor)) : (getIconSpan(VscError, errorColor))) : cost != null ? (getIconSpan(VscCheck, successColor)) : apiRequestFailedMessage ? (getIconSpan(VscError, errorColor)) : (_jsx(ProgressIndicator, {})),
                    (() => {
                        if (apiReqCancelReason != null) {
                            return apiReqCancelReason === "user_cancelled" ? (_jsx("span", { style: { color: normalColor, fontWeight: "bold" }, children: "API Request Cancelled" })) : (_jsx("span", { style: { color: errorColor, fontWeight: "bold" }, children: "API Streaming Failed" }));
                        }
                        if (cost != null) {
                            return (_jsx("span", { style: { color: normalColor, fontWeight: "bold" }, children: "API Request" }));
                        }
                        if (apiRequestFailedMessage) {
                            return (_jsx("span", { style: { color: errorColor, fontWeight: "bold" }, children: "API Request Failed" }));
                        }
                        return (_jsx("span", { style: { color: normalColor, fontWeight: "bold" }, children: "API Request..." }));
                    })(),
                ];
            case "followup":
                return [
                    _jsx(FaQuestion, { style: {
                            color: normalColor,
                            marginBottom: "-1.5px",
                        } }),
                    _jsx("span", { style: { color: normalColor, fontWeight: "bold" }, children: "ValorIDE has a question:" }),
                ];
            default:
                return [null, null];
        }
    }, [
        type,
        cost,
        apiRequestFailedMessage,
        isCommandExecuting,
        apiReqCancelReason,
        isMcpServerResponding,
        message.text,
    ]);
    const headerStyle = {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
    };
    const pStyle = {
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
    };
    const tool = useMemo(() => {
        if (message.ask === "tool" || message.say === "tool") {
            try {
                return JSON.parse(message.text || "{}");
            }
            catch (error) {
                console.warn("Failed to parse tool payload", error, message.text);
                return null;
            }
        }
        return null;
    }, [message.ask, message.say, message.text]);
    if (tool) {
        const colorMap = {
            red: "var(--vscode-errorForeground)",
            yellow: "var(--vscode-editorWarning-foreground)",
            green: "var(--vscode-charts-green)",
        };
        const toolIcon = (IconComponent, color, rotation, title) => (_jsx(IconComponent, { style: {
                color: color
                    ? colorMap[color] || color
                    : "var(--vscode-foreground)",
                marginBottom: "-1.5px",
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
            }, title: title }));
        switch (tool.tool) {
            case "editedExistingFile":
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaEdit), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This file is outside of your workspace"), _jsx("span", { style: { fontWeight: "bold" }, children: "ValorIDE wants to edit this file:" })] }), _jsx(CodeAccordian
                        // isLoading={message.partial}
                        , { 
                            // isLoading={message.partial}
                            code: tool.content, path: tool.path, isExpanded: isExpanded, onToggleExpand: onToggleExpand })] }));
            case "newFileCreated":
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaPlus), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This file is outside of your workspace"), _jsx("span", { style: { fontWeight: "bold" }, children: "ValorIDE wants to create a new file:" })] }), _jsx(CodeAccordian, { isLoading: message.partial, code: tool.content, path: tool.path, isExpanded: isExpanded, onToggleExpand: onToggleExpand })] }));
            case "precisionSearchAndReplace": {
                let prettyContent = tool.content ?? "{}";
                let parsedContent;
                try {
                    parsedContent = tool.content ? JSON.parse(tool.content) : undefined;
                    if (parsedContent) {
                        prettyContent = JSON.stringify(parsedContent, null, 2);
                    }
                }
                catch (error) {
                    // If parsing fails, fall back to raw content
                }
                let editSummary;
                if (Array.isArray(parsedContent?.edits) && parsedContent.edits.length > 0) {
                    const counts = parsedContent.edits.reduce((acc, edit) => {
                        const kind = typeof edit?.kind === "string" ? edit.kind : "contextual";
                        acc[kind] = (acc[kind] ?? 0) + 1;
                        return acc;
                    }, {});
                    editSummary = Object.entries(counts)
                        .map(([kind, count]) => `${kind}×${count}`)
                        .join(", ");
                }
                const summaryParts = [];
                if (editSummary) {
                    summaryParts.push(`Edits: ${editSummary}`);
                }
                if (parsedContent?.options && Object.keys(parsedContent.options).length > 0) {
                    summaryParts.push("Options provided");
                }
                const summary = summaryParts.join(" • ");
                const titleText = message.type === "ask"
                    ? "ValorIDE wants to run precision search & replace on this file:"
                    : "ValorIDE ran precision search & replace on this file:";
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaMagic), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This file is outside of your workspace"), _jsx("span", { style: { fontWeight: "bold" }, children: titleText })] }), summary && (_jsx("div", { style: {
                                marginBottom: "8px",
                                fontSize: "12px",
                                color: "var(--vscode-descriptionForeground)",
                            }, children: summary })), _jsx(CodeAccordian, { code: prettyContent, path: tool.path ?? "", language: "json", isExpanded: isExpanded, onToggleExpand: onToggleExpand })] }));
            }
            case "readFile":
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaFileCode), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This file is outside of your workspace"), _jsx("span", { style: { fontWeight: "bold" }, children: "ValorIDE wants to read this file:" })] }), _jsx("div", { style: {
                                borderRadius: 3,
                                backgroundColor: CODE_BLOCK_BG_COLOR,
                                overflow: "hidden",
                                border: "1px solid var(--vscode-editorGroup-border)",
                            }, children: _jsxs("div", { style: {
                                    color: "var(--vscode-descriptionForeground)",
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "9px 10px",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    WebkitUserSelect: "none",
                                    MozUserSelect: "none",
                                    msUserSelect: "none",
                                }, onClick: () => {
                                    FileServiceClient.openFile({ value: tool.content }).catch((err) => console.error("Failed to open file:", err));
                                }, children: [tool.path?.startsWith(".") && _jsx("span", { children: "." }), _jsx("span", { style: {
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            marginRight: "8px",
                                            direction: "rtl",
                                            textAlign: "left",
                                        }, children: cleanPathPrefix(tool.path ?? "") + "\u200E" }), _jsx("div", { style: { flexGrow: 1 } }), _jsx(FaExternalLinkAlt, { style: {
                                            fontSize: 13.5,
                                            margin: "1px 0",
                                        } })] }) })] }));
            case "listFilesTopLevel":
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaFolderOpen), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This is outside of your workspace"), _jsx("span", { style: { fontWeight: "bold" }, children: message.type === "ask"
                                        ? "ValorIDE wants to view the top level files in this directory:"
                                        : "ValorIDE viewed the top level files in this directory:" })] }), _jsx(CodeAccordian, { code: tool.content, path: tool.path, language: "shell-session", isExpanded: isExpanded, onToggleExpand: onToggleExpand })] }));
            case "listFilesRecursive":
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaFolderOpen), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This is outside of your workspace"), _jsx("span", { style: { fontWeight: "bold" }, children: message.type === "ask"
                                        ? "ValorIDE wants to recursively view all files in this directory:"
                                        : "ValorIDE recursively viewed all files in this directory:" })] }), _jsx(CodeAccordian, { code: tool.content, path: tool.path, language: "shell-session", isExpanded: isExpanded, onToggleExpand: onToggleExpand })] }));
            case "listCodeDefinitionNames":
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaFileCode), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This is outside of your workspace"), _jsx("span", { style: { fontWeight: "bold" }, children: message.type === "ask"
                                        ? "ValorIDE wants to view source code definition names used in this directory:"
                                        : "ValorIDE viewed source code definition names used in this directory:" })] }), _jsx(CodeAccordian, { code: tool.content, path: tool.path, isExpanded: isExpanded, onToggleExpand: onToggleExpand })] }));
            case "searchFiles":
                return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [toolIcon(FaSearch), tool.operationIsLocatedInWorkspace === false &&
                                    toolIcon(FaSignOutAlt, "yellow", -90, "This is outside of your workspace"), _jsxs("span", { style: { fontWeight: "bold" }, children: ["ValorIDE wants to search this directory for", " ", _jsx("code", { children: tool.regex }), ":"] })] }), _jsx(CodeAccordian, { code: tool.content, path: tool.path + (tool.filePattern ? `/(${tool.filePattern})` : ""), language: "plaintext", isExpanded: isExpanded, onToggleExpand: onToggleExpand })] }));
            default:
                return null;
        }
    }
    if (message.ask === "command" || message.say === "command") {
        const splitMessage = (text) => {
            const outputIndex = text.indexOf(COMMAND_OUTPUT_STRING);
            if (outputIndex === -1) {
                return { command: text, output: "" };
            }
            return {
                command: text.slice(0, outputIndex).trim(),
                output: text
                    .slice(outputIndex + COMMAND_OUTPUT_STRING.length)
                    .trim()
                    .split("")
                    .map((char) => {
                    switch (char) {
                        case "\t":
                            return "→   ";
                        case "\b":
                            return "⌫";
                        case "\f":
                            return "⏏";
                        case "\v":
                            return "⇳";
                        default:
                            return char;
                    }
                })
                    .join(""),
            };
        };
        const { command: rawCommand, output } = splitMessage(message.text || "");
        const requestsApproval = rawCommand.endsWith(COMMAND_REQ_APP_STRING);
        const command = requestsApproval
            ? rawCommand.slice(0, -COMMAND_REQ_APP_STRING.length)
            : rawCommand;
        return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [icon, title] }), _jsxs("div", { style: {
                        borderRadius: 3,
                        border: "1px solid var(--vscode-editorGroup-border)",
                        overflow: "hidden",
                        backgroundColor: CODE_BLOCK_BG_COLOR,
                    }, children: [_jsx(CodeBlock, { source: `${"```"}shell\n${command}\n${"```"}`, forceWrap: true }), output.length > 0 && (_jsxs("div", { style: { width: "100%" }, children: [_jsxs("div", { onClick: onToggleExpand, style: {
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        width: "100%",
                                        justifyContent: "flex-start",
                                        cursor: "pointer",
                                        padding: `2px 8px ${isExpanded ? 0 : 8}px 8px`,
                                    }, children: [isExpanded ? _jsx(FaChevronDown, {}) : _jsx(FaChevronRight, {}), _jsx("span", { style: { fontSize: "0.8em" }, children: "Command Output" })] }), isExpanded && (_jsx(CodeBlock, { source: `${"```"}shell\n${output}\n${"```"}` }))] }))] }), requestsApproval && (_jsxs("div", { style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 8,
                        fontSize: "12px",
                        color: "var(--vscode-editorWarning-foreground)",
                    }, children: [_jsx(FaWarning, {}), _jsx("span", { children: "The model has determined this command requires explicit approval." })] }))] }));
    }
    if (message.ask === "use_mcp_server" || message.say === "use_mcp_server") {
        const useMcpServer = JSON.parse(message.text || "{}");
        const server = mcpServers.find((server) => server.name === useMcpServer.serverName);
        return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [icon, title] }), _jsxs("div", { style: {
                        background: "var(--vscode-textCodeBlock-background)",
                        borderRadius: "3px",
                        padding: "8px 10px",
                        marginTop: "8px",
                    }, children: [useMcpServer.type === "access_mcp_resource" && (_jsx(McpResourceRow, { item: {
                                ...(findMatchingResourceOrTemplate(useMcpServer.uri || "", server?.resources, server?.resourceTemplates) || {
                                    name: "",
                                    mimeType: "",
                                    description: "",
                                }),
                                uri: useMcpServer.uri || "",
                            } })), useMcpServer.type === "use_mcp_tool" && (_jsxs(_Fragment, { children: [_jsx("div", { onClick: (e) => e.stopPropagation(), children: _jsx(McpToolRow, { tool: {
                                            name: useMcpServer.toolName || "",
                                            description: server?.tools?.find((tool) => tool.name === useMcpServer.toolName)?.description || "",
                                            autoApprove: server?.tools?.find((tool) => tool.name === useMcpServer.toolName)?.autoApprove || false,
                                        }, serverName: useMcpServer.serverName }) }), useMcpServer.arguments && useMcpServer.arguments !== "{}" && (_jsxs("div", { style: { marginTop: "8px" }, children: [_jsx("div", { style: {
                                                marginBottom: "4px",
                                                opacity: 0.8,
                                                fontSize: "12px",
                                                textTransform: "uppercase",
                                            }, children: "Arguments" }), _jsx(CodeAccordian, { code: useMcpServer.arguments, language: "json", isExpanded: true, onToggleExpand: onToggleExpand })] }))] }))] })] }));
    }
    switch (message.type) {
        case "say":
            switch (message.say) {
                case "api_req_started":
                    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                    ...headerStyle,
                                    marginBottom: (cost == null && apiRequestFailedMessage) ||
                                        apiReqStreamingFailedMessage
                                        ? 10
                                        : 0,
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                    userSelect: "none",
                                    WebkitUserSelect: "none",
                                    MozUserSelect: "none",
                                    msUserSelect: "none",
                                }, onClick: onToggleExpand, children: [_jsxs("div", { style: {
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                        }, children: [icon, title, _jsxs(VSCodeBadge, { style: {
                                                    opacity: cost != null && cost > 0 ? 1 : 0,
                                                }, children: ["$", Number(cost || 0)?.toFixed(4)] })] }), isExpanded ? _jsx(FaChevronUp, {}) : _jsx(FaChevronDown, {})] }), ((cost == null && apiRequestFailedMessage) ||
                                apiReqStreamingFailedMessage) && (_jsx(_Fragment, { children: (() => {
                                    // Try to parse the error message as JSON for credit limit error
                                    const errorData = parseErrorText(apiRequestFailedMessage);
                                    if (errorData) {
                                        if (errorData.code === "insufficient_credits" &&
                                            typeof errorData.current_balance === "number" &&
                                            typeof errorData.total_spent === "number" &&
                                            typeof errorData.total_promotions === "number" &&
                                            typeof errorData.message === "string") {
                                            return (_jsx(CreditLimitError, { currentBalance: errorData.current_balance, totalSpent: errorData.total_spent, totalPromotions: errorData.total_promotions, message: errorData.message }));
                                        }
                                    }
                                    // Default error display
                                    return (_jsxs("p", { style: {
                                            ...pStyle,
                                            color: "var(--vscode-errorForeground)",
                                        }, children: [apiRequestFailedMessage ||
                                                apiReqStreamingFailedMessage, apiRequestFailedMessage
                                                ?.toLowerCase()
                                                .includes("powershell") && (_jsxs(_Fragment, { children: [_jsx("br", {}), _jsx("br", {}), "It seems like you're having Windows PowerShell issues, please see this", " ", _jsx("a", { href: "https://github.com/valkyrlabs/valoride/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22", style: {
                                                            color: "inherit",
                                                            textDecoration: "underline",
                                                        }, children: "troubleshooting guide" }), "."] }))] }));
                                })() })), isExpanded && (_jsx("div", { style: { marginTop: "10px" }, children: _jsx(CodeAccordian, { code: JSON.parse(message.text || "{}").request, language: "markdown", isExpanded: true, onToggleExpand: onToggleExpand }) }))] }));
                case "api_req_finished":
                    return null; // we should never see this message type
                case "mcp_server_response":
                    return _jsx(McpResponseDisplay, { responseText: message.text || "" });
                case "text":
                    return (_jsx("div", { children: _jsx(Markdown, { markdown: message.text }) }));
                case "reasoning":
                    return (_jsx(_Fragment, { children: message.text && (_jsx("div", { onClick: onToggleExpand, style: {
                                // marginBottom: 15,
                                cursor: "pointer",
                                color: "var(--vscode-descriptionForeground)",
                                fontStyle: "italic",
                                overflow: "hidden",
                            }, children: isExpanded ? (_jsxs("div", { style: { marginTop: -3 }, children: [_jsxs("span", { style: {
                                            fontWeight: "bold",
                                            display: "block",
                                            marginBottom: "4px",
                                        }, children: [_jsx(FaBrain, { className: "chatTextArea", color: "red", size: 32 }), " Thinking"] }), message.text] })) : (_jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [_jsx("span", { style: { fontWeight: "bold", marginRight: "4px" }, children: "Thinking:" }), _jsx("span", { style: {
                                            whiteSpace: "nowrap",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            direction: "rtl",
                                            textAlign: "left",
                                            flex: 1,
                                        }, children: message.text + "\u200E" }), _jsx(FaArrowRight, {})] })) })) }));
                case "user_feedback":
                    return (_jsx(UserMessage, { text: message.text, images: message.images, messageTs: message.ts, sendMessageFromChatRow: sendMessageFromChatRow }));
                case "user_feedback_diff":
                    const tool = JSON.parse(message.text || "{}");
                    return (_jsx("div", { style: {
                            marginTop: -10,
                            width: "100%",
                        }, children: _jsx(CodeAccordian, { diff: tool.diff, isFeedback: true, isExpanded: isExpanded, onToggleExpand: onToggleExpand }) }));
                case "error":
                    return (_jsxs(_Fragment, { children: [title && (_jsxs("div", { style: headerStyle, children: [icon, title] })), _jsx("p", { style: {
                                    ...pStyle,
                                    color: "var(--vscode-errorForeground)",
                                }, children: message.text })] }));
                case "diff_error":
                    return (_jsx(_Fragment, { children: _jsxs("div", { style: {
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "var(--vscode-textBlockQuote-background)",
                                padding: 8,
                                borderRadius: 3,
                                fontSize: 12,
                                color: "var(--vscode-foreground)",
                                opacity: 0.8,
                            }, children: [_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        marginBottom: 4,
                                    }, children: [_jsx(FaWarning, {}), _jsx("span", { style: { fontWeight: 500 }, children: "Diff Edit Mismatch" })] }), _jsx("div", { children: "The model used search patterns that don't match anything in the file. Retrying..." })] }) }));
                case "valorideignore_error":
                    return (_jsx(_Fragment, { children: _jsxs("div", { style: {
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "rgba(255, 191, 0, 0.1)",
                                padding: 8,
                                borderRadius: 3,
                                fontSize: 12,
                            }, children: [_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        marginBottom: 4,
                                    }, children: [_jsx(FaCarCrash, {}), _jsx("span", { style: {
                                                fontWeight: 500,
                                                color: "#FFA500",
                                            }, children: "Access Denied" })] }), _jsxs("div", { children: ["ValorIDE tried to access ", _jsx("code", { children: message.text }), " which is blocked by the ", _jsx("code", { children: ".valorideignore" }), "file."] })] }) }));
                case "checkpoint_created":
                    return (_jsx(_Fragment, { children: _jsx(CheckmarkControl, { messageTs: message.ts, isCheckpointCheckedOut: message.isCheckpointCheckedOut }) }));
                case "load_mcp_documentation":
                    return (_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            color: "var(--vscode-foreground)",
                            opacity: 0.7,
                            fontSize: 12,
                            padding: "4px 0",
                        }, children: [_jsx(FaBook, {}), "Loading MCP documentation"] }));
                case "completion_result":
                    const hasChanges = message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false;
                    const text = hasChanges
                        ? message.text?.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length)
                        : message.text;
                    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                    ...headerStyle,
                                    marginBottom: "10px",
                                }, children: [icon, title, _jsx(TaskFeedbackButtons, { messageTs: message.ts, isFromHistory: !isLast ||
                                            lastModifiedMessage?.ask === "resume_completed_task" ||
                                            lastModifiedMessage?.ask === "resume_task", style: {
                                            marginLeft: "auto",
                                        } })] }), _jsxs("div", { style: {
                                    color: "var(--vscode-charts-green)",
                                    paddingTop: 10,
                                }, children: [_jsx(Markdown, { markdown: text }), message.partial !== true &&
                                        hasChanges &&
                                        (message.changesSummary ? (_jsx(CompletionChangesSummary, { summary: message.changesSummary, disabled: seeNewChangesDisabled, onOpenAllChanges: handleOpenAllChanges, onOpenFileDiff: handleOpenFileDiff })) : (_jsx("div", { style: { marginTop: 17 }, children: _jsxs(SuccessButton, { disabled: seeNewChangesDisabled, onClick: handleOpenAllChanges, style: {
                                                    cursor: seeNewChangesDisabled ? "wait" : "pointer",
                                                    width: "100%",
                                                }, children: [_jsx(FaFileUpload, {}), "See new changes"] }) })))] })] }));
                case "shell_integration_warning":
                    return (_jsx(_Fragment, { children: _jsxs("div", { style: {
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "rgba(255, 191, 0, 0.1)",
                                padding: 8,
                                borderRadius: 3,
                                fontSize: 12,
                            }, children: [_jsxs("div", { style: {
                                        display: "flex",
                                        alignItems: "center",
                                        marginBottom: 4,
                                    }, children: [_jsx(FaWarning, {}), _jsx("span", { style: {
                                                fontWeight: 500,
                                                color: "#FFA500",
                                            }, children: "Shell Integration Unavailable" })] }), _jsxs("div", { children: ["ValorIDE won't be able to view the command's output. Please update VSCode (", _jsx("code", { children: "CMD/CTRL + Shift + P" }), " \u2192 \"Update\") and make sure you're using a supported shell: zsh, bash, fish, or PowerShell (", _jsx("code", { children: "CMD/CTRL + Shift + P" }), " \u2192 \"Terminal: Select Default Profile\").", " ", _jsx("a", { href: "https://github.com/valkyrlabs/valoride/wiki/Troubleshooting-%E2%80%90-Shell-Integration-Unavailable", style: {
                                                color: "inherit",
                                                textDecoration: "underline",
                                            }, children: "Still having trouble?" })] })] }) }));
                default:
                    return (_jsxs(_Fragment, { children: [title && (_jsxs("div", { style: headerStyle, children: [icon, title] })), _jsx("div", { style: { paddingTop: 10 }, children: _jsx(Markdown, { markdown: message.text }) })] }));
            }
        case "ask":
            switch (message.ask) {
                case "mistake_limit_reached":
                    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [icon, title] }), _jsx("p", { style: {
                                    ...pStyle,
                                    color: "var(--vscode-errorForeground)",
                                }, children: message.text })] }));
                case "auto_approval_max_req_reached":
                    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [icon, title] }), _jsx("p", { style: {
                                    ...pStyle,
                                    color: "var(--vscode-errorForeground)",
                                }, children: message.text })] }));
                case "completion_result":
                    if (message.text) {
                        const hasChanges = message.text.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false;
                        const text = hasChanges
                            ? message.text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length)
                            : message.text;
                        return (_jsxs("div", { children: [_jsxs("div", { style: {
                                        ...headerStyle,
                                        marginBottom: "10px",
                                    }, children: [icon, title, _jsx(TaskFeedbackButtons, { messageTs: message.ts, isFromHistory: !isLast ||
                                                lastModifiedMessage?.ask === "resume_completed_task" ||
                                                lastModifiedMessage?.ask === "resume_task", style: {
                                                marginLeft: "auto",
                                            } })] }), _jsxs("div", { style: {
                                        color: "var(--vscode-charts-green)",
                                        paddingTop: 10,
                                    }, children: [_jsx(Markdown, { markdown: text }), message.partial !== true &&
                                            hasChanges &&
                                            (message.changesSummary ? (_jsx(CompletionChangesSummary, { summary: message.changesSummary, disabled: seeNewChangesDisabled, onOpenAllChanges: handleOpenAllChanges, onOpenFileDiff: handleOpenFileDiff })) : (_jsx("div", { style: { marginTop: 15 }, children: _jsxs(SuccessButton, { appearance: "secondary", disabled: seeNewChangesDisabled, onClick: handleOpenAllChanges, children: [_jsx(FaFile, {}), "See new changes"] }) })))] })] }));
                    }
                    else {
                        return null; // Don't render anything when we get a completion_result ask without text
                    }
                case "followup":
                    let question;
                    let options;
                    let selected;
                    try {
                        const parsedMessage = JSON.parse(message.text || "{}");
                        question = parsedMessage.question;
                        options = parsedMessage.options;
                        selected = parsedMessage.selected;
                    }
                    catch (e) {
                        // legacy messages would pass question directly
                        question = message.text;
                    }
                    return (_jsxs(_Fragment, { children: [title && (_jsxs("div", { style: headerStyle, children: [icon, title] })), _jsxs("div", { style: { paddingTop: 10 }, children: [_jsx(Markdown, { markdown: question }), _jsx(OptionsButtons, { options: options, selected: selected, isActive: isLast && message.ask === "followup", inputValue: inputValue, onSelectOption: setInputValue })] })] }));
                case "new_task":
                    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [_jsx(FaFileUpload, {}), _jsx("span", { style: { color: normalColor, fontWeight: "bold" }, children: "ValorIDE wants to start a new task:" })] }), _jsx(NewTaskPreview, { context: message.text || "" })] }));
                case "condense":
                    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: headerStyle, children: [_jsx(FaFileUpload, {}), _jsx("span", { style: { color: normalColor, fontWeight: "bold" }, children: "ValorIDE wants to condense your conversation:" })] }), _jsx(NewTaskPreview, { context: message.text || "" })] }));
                case "plan_mode_respond": {
                    let response;
                    let options;
                    let selected;
                    try {
                        const parsedMessage = JSON.parse(message.text || "{}");
                        response = parsedMessage.response;
                        options = parsedMessage.options;
                        selected = parsedMessage.selected;
                    }
                    catch (e) {
                        // legacy messages would pass response directly
                        response = message.text;
                    }
                    return (_jsxs("div", { style: {}, children: [_jsx(Markdown, { markdown: response }), _jsx(OptionsButtons, { options: options, selected: selected, isActive: isLast && message.ask === "plan_mode_respond", inputValue: inputValue, onSelectOption: setInputValue })] }));
                }
                default:
                    return null;
            }
    }
};
function parseErrorText(text) {
    if (!text) {
        return undefined;
    }
    try {
        const startIndex = text.indexOf("{");
        const endIndex = text.lastIndexOf("}");
        if (startIndex !== -1 && endIndex !== -1) {
            const jsonStr = text.substring(startIndex, endIndex + 1);
            const errorObject = JSON.parse(jsonStr);
            return errorObject;
        }
    }
    catch (e) {
        // Not JSON or missing required fields
    }
}
//# sourceMappingURL=ChatRow.js.map