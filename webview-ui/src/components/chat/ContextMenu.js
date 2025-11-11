import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { ContextMenuOptionType, getContextMenuOptions, } from "@/utils/context-mentions";
import { cleanPathPrefix } from "@/components/common/CodeAccordian";
import { FaSpinner, FaFile, FaFolder, FaExclamationTriangle, FaTerminal, FaLink, FaGitAlt, FaInfoCircle, FaChevronRight, FaPlus } from "react-icons/fa";
const ContextMenu = ({ onSelect, searchQuery, onMouseDown, selectedIndex, setSelectedIndex, selectedType, queryItems, dynamicSearchResults = [], isLoading = false, }) => {
    const menuRef = useRef(null);
    // State to show delayed loading indicator
    const [showDelayedLoading, setShowDelayedLoading] = useState(false);
    const loadingTimeoutRef = useRef(null);
    const filteredOptions = useMemo(() => {
        const options = getContextMenuOptions(searchQuery, selectedType, queryItems, dynamicSearchResults);
        return options;
    }, [searchQuery, selectedType, queryItems, dynamicSearchResults]);
    // Effect to handle delayed loading indicator (show "Searching..." after 500ms of searching)
    useEffect(() => {
        if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
        }
        if (isLoading && searchQuery) {
            setShowDelayedLoading(false);
            loadingTimeoutRef.current = setTimeout(() => {
                if (isLoading) {
                    setShowDelayedLoading(true);
                }
            }, 500); // 500ms delay before showing "Searching..."
        }
        else {
            setShowDelayedLoading(false);
        }
        // Cleanup timeout on unmount or when dependencies change
        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }
        };
    }, [isLoading, searchQuery]);
    useEffect(() => {
        if (menuRef.current) {
            const selectedElement = menuRef.current.children[selectedIndex];
            if (selectedElement) {
                const menuRect = menuRef.current.getBoundingClientRect();
                const selectedRect = selectedElement.getBoundingClientRect();
                if (selectedRect.bottom > menuRect.bottom) {
                    menuRef.current.scrollTop += selectedRect.bottom - menuRect.bottom;
                }
                else if (selectedRect.top < menuRect.top) {
                    menuRef.current.scrollTop -= menuRect.top - selectedRect.top;
                }
            }
        }
    }, [selectedIndex]);
    const renderOptionContent = (option) => {
        switch (option.type) {
            case ContextMenuOptionType.Problems:
                return _jsx("span", { children: "Problems" });
            case ContextMenuOptionType.Terminal:
                return _jsx("span", { children: "Terminal" });
            case ContextMenuOptionType.URL:
                return _jsx("span", { children: "Paste URL to fetch contents" });
            case ContextMenuOptionType.NoResults:
                return _jsx("span", { children: "No results found" });
            case ContextMenuOptionType.Git:
                if (option.value) {
                    return (_jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 0 }, children: [_jsx("span", { style: { lineHeight: "1.2" }, children: option.label }), _jsx("span", { style: {
                                    fontSize: "0.85em",
                                    opacity: 0.7,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    lineHeight: "1.2",
                                }, children: option.description })] }));
                }
                else {
                    return _jsx("span", { children: "Git Commits" });
                }
            case ContextMenuOptionType.File:
            case ContextMenuOptionType.Folder:
                if (option.value) {
                    return (_jsxs(_Fragment, { children: [_jsx("span", { children: "/" }), option.value?.startsWith("/.") && _jsx("span", { children: "." }), _jsx("span", { style: {
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    direction: "rtl",
                                    textAlign: "left",
                                }, children: cleanPathPrefix(option.value || "") + "\u200E" })] }));
                }
                else {
                    return (_jsxs("span", { children: ["Add", " ", option.type === ContextMenuOptionType.File ? "File" : "Folder"] }));
                }
        }
    };
    const getIconForOption = (option) => {
        const iconStyle = {
            marginRight: "8px",
            flexShrink: 0,
            fontSize: "14px",
        };
        switch (option.type) {
            case ContextMenuOptionType.File:
                return _jsx(FaFile, { style: iconStyle });
            case ContextMenuOptionType.Folder:
                return _jsx(FaFolder, { style: iconStyle });
            case ContextMenuOptionType.Problems:
                return _jsx(FaExclamationTriangle, { style: iconStyle });
            case ContextMenuOptionType.Terminal:
                return _jsx(FaTerminal, { style: iconStyle });
            case ContextMenuOptionType.URL:
                return _jsx(FaLink, { style: iconStyle });
            case ContextMenuOptionType.Git:
                return _jsx(FaGitAlt, { style: iconStyle });
            case ContextMenuOptionType.NoResults:
                return _jsx(FaInfoCircle, { style: iconStyle });
            default:
                return _jsx(FaFile, { style: iconStyle });
        }
    };
    const isOptionSelectable = (option) => {
        return (option.type !== ContextMenuOptionType.NoResults &&
            option.type !== ContextMenuOptionType.URL);
    };
    return (_jsx("div", { style: {
            position: "absolute",
            bottom: "calc(100% - 10px)",
            left: 15,
            right: 15,
            overflowX: "hidden",
        }, onMouseDown: onMouseDown, children: _jsxs("div", { ref: menuRef, style: {
                backgroundColor: "var(--vscode-dropdown-background)",
                border: "1px solid var(--vscode-editorGroup-border)",
                borderRadius: "3px",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.25)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                maxHeight: "200px",
                overflowY: "auto",
            }, children: [showDelayedLoading && searchQuery && (_jsxs("div", { style: {
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        opacity: 0.7,
                    }, children: [_jsx(FaSpinner, {}), _jsx("span", { children: "Searching..." })] })), filteredOptions.map((option, index) => (_jsxs("div", { onClick: () => isOptionSelectable(option) && onSelect(option.type, option.value), style: {
                        padding: "8px 12px",
                        cursor: isOptionSelectable(option) ? "pointer" : "default",
                        color: index === selectedIndex && isOptionSelectable(option)
                            ? "var(--vscode-quickInputList-focusForeground)"
                            : "",
                        borderBottom: "1px solid var(--vscode-editorGroup-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        backgroundColor: index === selectedIndex && isOptionSelectable(option)
                            ? "var(--vscode-quickInputList-focusBackground)"
                            : "",
                    }, onMouseEnter: () => isOptionSelectable(option) && setSelectedIndex(index), children: [_jsxs("div", { style: {
                                display: "flex",
                                alignItems: "center",
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                            }, children: [getIconForOption(option), renderOptionContent(option)] }), (option.type === ContextMenuOptionType.File ||
                            option.type === ContextMenuOptionType.Folder ||
                            option.type === ContextMenuOptionType.Git) &&
                            !option.value && (_jsx(FaChevronRight, { style: {
                                fontSize: "14px",
                                flexShrink: 0,
                                marginLeft: 8,
                            } })), (option.type === ContextMenuOptionType.Problems ||
                            option.type === ContextMenuOptionType.Terminal ||
                            ((option.type === ContextMenuOptionType.File ||
                                option.type === ContextMenuOptionType.Folder ||
                                option.type === ContextMenuOptionType.Git) &&
                                option.value)) && (_jsx(FaPlus, { style: {
                                fontSize: "14px",
                                flexShrink: 0,
                                marginLeft: 8,
                            } }))] }, `${option.type}-${option.value || index}`)))] }) }));
};
export default ContextMenu;
//# sourceMappingURL=ContextMenu.js.map