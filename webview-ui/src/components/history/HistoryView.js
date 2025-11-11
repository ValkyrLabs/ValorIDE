import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeButton, VSCodeTextField, VSCodeRadioGroup, VSCodeRadio, } from "@vscode/webview-ui-toolkit/react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { vscode } from "@/utils/vscode";
import { Virtuoso } from "react-virtuoso";
import { memo, useMemo, useState, useEffect, useCallback } from "react";
import Fuse from "fuse.js";
import { formatLargeNumber } from "@/utils/format";
import { formatSize } from "@/utils/format";
import { useEvent } from "react-use";
import DangerButton from "@/components/common/DangerButton";
import { FaSearch, FaTimes, FaTrash, FaArrowUp, FaArrowDown, FaDatabase, FaArrowRight } from "react-icons/fa";
import StatusBadge from "@/components/common/StatusBadge";
import OfflineBanner from "@/components/common/OfflineBanner";
import SystemAlerts from "@/components/SystemAlerts";
import { useCommunicationService } from "@/context/CommunicationServiceContext";
const HistoryView = ({ onDone }) => {
    const { taskHistory, totalTasksSize } = useExtensionState();
    const [searchQuery, setSearchQuery] = useState("");
    const [sortOption, setSortOption] = useState("newest");
    const [lastNonRelevantSort, setLastNonRelevantSort] = useState("newest");
    const [deleteAllDisabled, setDeleteAllDisabled] = useState(false);
    const handleMessage = useCallback((event) => {
        if (event.data.type === "relinquishControl") {
            setDeleteAllDisabled(false);
        }
    }, []);
    useEvent("message", handleMessage);
    // Request total tasks size when component mounts
    useEffect(() => {
        vscode.postMessage({ type: "requestTotalTasksSize" });
    }, []);
    useEffect(() => {
        if (searchQuery && sortOption !== "mostRelevant" && !lastNonRelevantSort) {
            setLastNonRelevantSort(sortOption);
            setSortOption("mostRelevant");
        }
        else if (!searchQuery &&
            sortOption === "mostRelevant" &&
            lastNonRelevantSort) {
            setSortOption(lastNonRelevantSort);
            setLastNonRelevantSort(null);
        }
    }, [searchQuery, sortOption, lastNonRelevantSort]);
    const handleHistorySelect = useCallback((id) => {
        vscode.postMessage({ type: "showTaskWithId", text: id });
        onDone();
    }, [onDone]);
    const handleDeleteHistoryItem = useCallback((id) => {
        vscode.postMessage({ type: "deleteTaskWithId", text: id });
    }, []);
    const formatDate = useCallback((timestamp) => {
        const date = new Date(timestamp);
        return date
            ?.toLocaleString("en-US", {
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
            .replace(", ", " ")
            .replace(" at", ",")
            .toUpperCase();
    }, []);
    const presentableTasks = useMemo(() => {
        return taskHistory.filter((item) => item.ts && item.task);
    }, [taskHistory]);
    const fuse = useMemo(() => {
        return new Fuse(presentableTasks, {
            keys: ["task"],
            threshold: 0.6,
            shouldSort: true,
            isCaseSensitive: false,
            ignoreLocation: false,
            includeMatches: true,
            minMatchCharLength: 1,
        });
    }, [presentableTasks]);
    const taskHistorySearchResults = useMemo(() => {
        const results = searchQuery
            ? highlight(fuse.search(searchQuery))
            : presentableTasks;
        results.sort((a, b) => {
            switch (sortOption) {
                case "oldest":
                    return a.ts - b.ts;
                case "mostExpensive":
                    return (b.totalCost || 0) - (a.totalCost || 0);
                case "mostTokens":
                    return ((b.tokensIn || 0) +
                        (b.tokensOut || 0) +
                        (b.cacheWrites || 0) +
                        (b.cacheReads || 0) -
                        ((a.tokensIn || 0) +
                            (a.tokensOut || 0) +
                            (a.cacheWrites || 0) +
                            (a.cacheReads || 0)));
                case "mostRelevant":
                    // NOTE: you must never sort directly on object since it will cause members to be reordered
                    return searchQuery ? 0 : b.ts - a.ts; // Keep fuse order if searching, otherwise sort by newest
                case "newest":
                default:
                    return b.ts - a.ts;
            }
        });
        return results;
    }, [presentableTasks, searchQuery, fuse, sortOption]);
    const communicationService = useCommunicationService();
    const ready = !!communicationService?.ready;
    const hasError = !!communicationService?.error;
    const value = ready ? "Online" : hasError ? "Error" : "Offline";
    const kind = ready ? "ok" : hasError ? "error" : "warn";
    return (_jsxs(_Fragment, { children: [_jsx(SystemAlerts, {}), _jsxs("div", { style: {
                    borderRadius: "10px",
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }, children: [_jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 17px 10px 20px",
                        }, children: [_jsx("h3", { style: {
                                    color: "var(--vscode-foreground)",
                                    margin: 0,
                                }, children: "History" }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx(StatusBadge, { label: "P2P", value: value, kind: kind, title: hasError ? String(communicationService.error) : undefined }), _jsx(VSCodeButton, { onClick: onDone, children: "Done" })] })] }), _jsx(OfflineBanner, { style: { marginTop: 0, marginLeft: 20, marginRight: 17 } }), _jsx("div", { style: { padding: "5px 17px 6px 17px" }, children: _jsxs("div", { style: {
                                display: "flex",
                                flexDirection: "column",
                                gap: "6px",
                            }, children: [_jsxs(VSCodeTextField, { style: { width: "100%" }, placeholder: "Fuzzy search history...", value: searchQuery, onInput: (e) => {
                                        const newValue = e.target?.value;
                                        setSearchQuery(newValue);
                                        if (newValue && !searchQuery && sortOption !== "mostRelevant") {
                                            setLastNonRelevantSort(sortOption);
                                            setSortOption("mostRelevant");
                                        }
                                    }, children: [_jsx("div", { slot: "start", style: {
                                                fontSize: 13,
                                                marginTop: 2.5,
                                                opacity: 0.8,
                                            }, children: _jsx(FaSearch, {}) }), searchQuery && (_jsx("div", { className: "input-icon-button", "aria-label": "Clear search", onClick: () => setSearchQuery(""), slot: "end", style: {
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                height: "100%",
                                            }, children: _jsx(FaTimes, {}) }))] }), _jsxs(VSCodeRadioGroup, { style: { display: "flex", flexWrap: "wrap" }, value: sortOption, onChange: (e) => setSortOption(e.target.value), children: [_jsx(VSCodeRadio, { value: "newest", children: "Newest" }), _jsx(VSCodeRadio, { value: "oldest", children: "Oldest" }), _jsx(VSCodeRadio, { value: "mostExpensive", children: "Most Expensive" }), _jsx(VSCodeRadio, { value: "mostTokens", children: "Most Tokens" }), _jsx(VSCodeRadio, { value: "mostRelevant", disabled: !searchQuery, style: { opacity: searchQuery ? 1 : 0.5 }, children: "Most Relevant" })] })] }) }), _jsx("div", { style: { flexGrow: 1, overflowY: "auto", margin: 0 }, children: _jsx(Virtuoso, { style: {
                                flexGrow: 1,
                                overflowY: "scroll",
                            }, data: taskHistorySearchResults, itemContent: (index, item) => (_jsx("div", { className: "history-item", style: {
                                    cursor: "pointer",
                                    borderBottom: index < taskHistory.length - 1
                                        ? "1px solid var(--vscode-panel-border)"
                                        : "none",
                                }, onClick: () => handleHistorySelect(item.id), children: _jsxs("div", { style: {
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "8px",
                                        padding: "12px 20px",
                                        position: "relative",
                                    }, children: [_jsxs("div", { style: {
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }, children: [_jsx("span", { style: {
                                                        color: "var(--vscode-descriptionForeground)",
                                                        fontWeight: 500,
                                                        fontSize: "0.85em",
                                                        textTransform: "uppercase",
                                                    }, children: formatDate(item.ts) }), _jsx(VSCodeButton, { appearance: "icon", onClick: (e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteHistoryItem(item.id);
                                                    }, className: "delete-button", style: { padding: "0px 0px" }, children: _jsxs("div", { style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            gap: "3px",
                                                            fontSize: "11px",
                                                            // fontWeight: "bold",
                                                        }, children: [_jsx(FaTrash, {}), formatSize(item.size)] }) })] }), _jsx("div", { style: {
                                                fontSize: "var(--vscode-font-size)",
                                                color: "var(--vscode-foreground)",
                                                display: "-webkit-box",
                                                WebkitLineClamp: 3,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                                whiteSpace: "pre-wrap",
                                                wordBreak: "break-word",
                                                overflowWrap: "anywhere",
                                            }, dangerouslySetInnerHTML: {
                                                __html: item.task,
                                            } }), _jsxs("div", { style: {
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "4px",
                                            }, children: [_jsxs("div", { style: {
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                    }, children: [_jsxs("div", { style: {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                                flexWrap: "wrap",
                                                            }, children: [_jsx("span", { style: {
                                                                        fontWeight: 500,
                                                                        color: "var(--vscode-descriptionForeground)",
                                                                    }, children: "Tokens:" }), _jsxs("span", { style: {
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "3px",
                                                                        color: "var(--vscode-descriptionForeground)",
                                                                    }, children: [_jsx(FaArrowUp, { style: {
                                                                                fontSize: "12px",
                                                                                fontWeight: "bold",
                                                                                marginBottom: "-2px",
                                                                            } }), formatLargeNumber(item.tokensIn || 0)] }), _jsxs("span", { style: {
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "3px",
                                                                        color: "var(--vscode-descriptionForeground)",
                                                                    }, children: [_jsx(FaArrowDown, { style: {
                                                                                fontSize: "12px",
                                                                                fontWeight: "bold",
                                                                                marginBottom: "-2px",
                                                                            } }), formatLargeNumber(item.tokensOut || 0)] })] }), !item.totalCost && _jsx(ExportButton, { itemId: item.id })] }), !!item.cacheWrites && (_jsxs("div", { style: {
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                        flexWrap: "wrap",
                                                    }, children: [_jsx("span", { style: {
                                                                fontWeight: 500,
                                                                color: "var(--vscode-descriptionForeground)",
                                                            }, children: "Cache:" }), _jsxs("span", { style: {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "3px",
                                                                color: "var(--vscode-descriptionForeground)",
                                                            }, children: [_jsx(FaDatabase, { style: {
                                                                        fontSize: "12px",
                                                                        fontWeight: "bold",
                                                                        marginBottom: "-1px",
                                                                    } }), "+", formatLargeNumber(item.cacheWrites || 0)] }), _jsxs("span", { style: {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "3px",
                                                                color: "var(--vscode-descriptionForeground)",
                                                            }, children: [_jsx(FaArrowRight, { style: {
                                                                        fontSize: "12px",
                                                                        fontWeight: "bold",
                                                                        marginBottom: 0,
                                                                    } }), formatLargeNumber(item.cacheReads || 0)] })] })), !!item.totalCost && (_jsxs("div", { style: {
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "center",
                                                        marginTop: -2,
                                                    }, children: [_jsxs("div", { style: {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "4px",
                                                            }, children: [_jsx("span", { style: {
                                                                        fontWeight: 500,
                                                                        color: "var(--vscode-descriptionForeground)",
                                                                    }, children: "API Cost:" }), _jsxs("span", { style: {
                                                                        color: "var(--vscode-descriptionForeground)",
                                                                    }, children: ["$", item.totalCost?.toFixed(4)] })] }), _jsx(ExportButton, { itemId: item.id })] }))] })] }) }, item.id)) }) }), _jsx("div", { style: {
                            padding: "10px 10px",
                            borderTop: "1px solid var(--vscode-panel-border)",
                        }, children: _jsxs(DangerButton, { style: { width: "100%" }, disabled: deleteAllDisabled || taskHistory.length === 0, onClick: () => {
                                setDeleteAllDisabled(true);
                                vscode.postMessage({ type: "clearAllTaskHistory" });
                            }, children: ["Delete All History", totalTasksSize !== null ? ` (${formatSize(totalTasksSize)})` : ""] }) })] })] }));
};
const ExportButton = ({ itemId }) => (_jsx(VSCodeButton, { className: "export-button", appearance: "icon", onClick: (e) => {
        e.preventDefault();
        e.stopPropagation();
        vscode.postMessage({ type: "exportTaskWithId", text: itemId });
    }, children: _jsx("div", { style: { fontSize: "11px", fontWeight: 500, opacity: 1 }, children: "EXPORT" }) }));
// https://gist.github.com/evenfrost/1ba123656ded32fb7a0cd4651efd4db0
export const highlight = (fuseSearchResult, highlightClassName = "history-item-highlight") => {
    const set = (obj, path, value) => {
        const pathValue = path.split(".");
        let i;
        for (i = 0; i < pathValue.length - 1; i++) {
            obj = obj[pathValue[i]];
        }
        obj[pathValue[i]] = value;
    };
    // Function to merge overlapping regions
    const mergeRegions = (regions) => {
        if (regions.length === 0)
            return regions;
        // Sort regions by start index
        regions.sort((a, b) => a[0] - b[0]);
        const merged = [regions[0]];
        for (let i = 1; i < regions.length; i++) {
            const last = merged[merged.length - 1];
            const current = regions[i];
            if (current[0] <= last[1] + 1) {
                // Overlapping or adjacent regions
                last[1] = Math.max(last[1], current[1]);
            }
            else {
                merged.push(current);
            }
        }
        return merged;
    };
    const generateHighlightedText = (inputText, regions = []) => {
        if (regions.length === 0) {
            return inputText;
        }
        // Sort and merge overlapping regions
        const mergedRegions = mergeRegions(regions);
        let content = "";
        let nextUnhighlightedRegionStartingIndex = 0;
        mergedRegions.forEach((region) => {
            const start = region[0];
            const end = region[1];
            const lastRegionNextIndex = end + 1;
            content += [
                inputText.substring(nextUnhighlightedRegionStartingIndex, start),
                `<span class="${highlightClassName}">`,
                inputText.substring(start, lastRegionNextIndex),
                "</span>",
            ].join("");
            nextUnhighlightedRegionStartingIndex = lastRegionNextIndex;
        });
        content += inputText.substring(nextUnhighlightedRegionStartingIndex);
        return content;
    };
    return fuseSearchResult
        .filter(({ matches }) => matches && matches.length)
        .map(({ item, matches }) => {
        const highlightedItem = { ...item };
        matches?.forEach((match) => {
            if (match.key && typeof match.value === "string" && match.indices) {
                // Merge overlapping regions before generating highlighted text
                const mergedIndices = mergeRegions([...match.indices]);
                set(highlightedItem, match.key, generateHighlightedText(match.value, mergedIndices));
            }
        });
        return highlightedItem;
    });
};
export default memo(HistoryView);
//# sourceMappingURL=HistoryView.js.map