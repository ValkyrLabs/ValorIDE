import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { FaTimes } from "react-icons/fa";
import Fuse from "fuse.js";
import { memo, useEffect, useMemo, useRef, useState, } from "react";
import { useRemark } from "react-remark";
import { useMount } from "react-use";
import styled from "styled-components";
import { openRouterDefaultModelId } from "@shared/api";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { vscode } from "@/utils/vscode";
import { highlight } from "../history/HistoryView";
import { ModelInfoView, normalizeApiConfiguration } from "./ApiOptions";
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import ThinkingBudgetSlider from "./ThinkingBudgetSlider";
import FeaturedModelCard from "./FeaturedModelCard";
// Star icon for favorites
const StarIcon = ({ isFavorite, onClick, }) => {
    return (_jsx("div", { onClick: onClick, style: {
            cursor: "pointer",
            color: isFavorite
                ? "var(--vscode-terminal-ansiBlue)"
                : "var(--vscode-descriptionForeground)",
            marginLeft: "8px",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            userSelect: "none",
            WebkitUserSelect: "none",
        }, children: isFavorite ? "★" : "☆" }));
};
// Featured models for ValorIDE provider
const featuredModels = [
    {
        id: "anthropic/claude-3.7-sonnet",
        description: "Leading model for agentic coding",
        label: "Best",
    },
    {
        id: "google/gemini-2.5-pro-preview-03-25",
        description: "Large 1M context window, great value",
        label: "Trending",
    },
    {
        id: "openai/gpt-4.1",
        description: "1M context window, blazing fast",
        label: "New",
    },
];
const OpenRouterModelPicker = ({ isPopup, }) => {
    const { apiConfiguration, setApiConfiguration, openRouterModels } = useExtensionState();
    const [searchTerm, setSearchTerm] = useState(apiConfiguration?.openRouterModelId || openRouterDefaultModelId);
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const dropdownRef = useRef(null);
    const itemRefs = useRef([]);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const dropdownListRef = useRef(null);
    const handleModelChange = (newModelId) => {
        // could be setting invalid model id/undefined info but validation will catch it
        setApiConfiguration({
            ...apiConfiguration,
            ...{
                openRouterModelId: newModelId,
                openRouterModelInfo: openRouterModels[newModelId],
            },
        });
        setSearchTerm(newModelId);
    };
    const { selectedModelId, selectedModelInfo } = useMemo(() => {
        return normalizeApiConfiguration(apiConfiguration);
    }, [apiConfiguration]);
    useMount(() => {
        vscode.postMessage({ type: "refreshOpenRouterModels" });
    });
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current &&
                !dropdownRef.current.contains(event.target)) {
                setIsDropdownVisible(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);
    const modelIds = useMemo(() => {
        const unfilteredModelIds = Object.keys(openRouterModels).sort((a, b) => a.localeCompare(b));
        return apiConfiguration?.apiProvider === "valoride"
            ? unfilteredModelIds.filter((id) => !id.includes(":free"))
            : unfilteredModelIds;
    }, [openRouterModels, apiConfiguration?.apiProvider]);
    const searchableItems = useMemo(() => {
        return modelIds.map((id) => ({
            id,
            html: id,
        }));
    }, [modelIds]);
    const fuse = useMemo(() => {
        return new Fuse(searchableItems, {
            keys: ["html"], // highlight function will update this
            threshold: 0.6,
            shouldSort: true,
            isCaseSensitive: false,
            ignoreLocation: false,
            includeMatches: true,
            minMatchCharLength: 1,
        });
    }, [searchableItems]);
    const modelSearchResults = useMemo(() => {
        const favoritedModelIds = apiConfiguration?.favoritedModelIds || [];
        // IMPORTANT: highlightjs has a bug where if you use sort/localCompare - "// results.sort((a, b) => a.id.localeCompare(b.id)) ...sorting like this causes ids in objects to be reordered and mismatched"
        // First, get all favorited models
        const favoritedModels = searchableItems.filter((item) => favoritedModelIds.includes(item.id));
        // Then get search results for non-favorited models
        const searchResults = searchTerm
            ? highlight(fuse.search(searchTerm), "model-item-highlight").filter((item) => !favoritedModelIds.includes(item.id))
            : searchableItems.filter((item) => !favoritedModelIds.includes(item.id));
        // Combine favorited models with search results
        return [...favoritedModels, ...searchResults];
    }, [searchableItems, searchTerm, fuse, apiConfiguration?.favoritedModelIds]);
    const handleKeyDown = (event) => {
        if (!isDropdownVisible)
            return;
        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                setSelectedIndex((prev) => prev < modelSearchResults.length - 1 ? prev + 1 : prev);
                break;
            case "ArrowUp":
                event.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
                break;
            case "Enter":
                event.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < modelSearchResults.length) {
                    handleModelChange(modelSearchResults[selectedIndex].id);
                    setIsDropdownVisible(false);
                }
                break;
            case "Escape":
                setIsDropdownVisible(false);
                setSelectedIndex(-1);
                break;
        }
    };
    const hasInfo = useMemo(() => {
        try {
            return modelIds.some((id) => id.toLowerCase() === searchTerm.toLowerCase());
        }
        catch {
            return false;
        }
    }, [modelIds, searchTerm]);
    useEffect(() => {
        setSelectedIndex(-1);
        if (dropdownListRef.current) {
            dropdownListRef.current.scrollTop = 0;
        }
    }, [searchTerm]);
    useEffect(() => {
        if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [selectedIndex]);
    const showBudgetSlider = useMemo(() => {
        return (selectedModelId?.toLowerCase().includes("claude-3-7-sonnet") ||
            selectedModelId?.toLowerCase().includes("claude-3.7-sonnet") ||
            selectedModelId?.toLowerCase().includes("claude-3.7-sonnet:thinking"));
    }, [selectedModelId]);
    return (_jsxs("div", { style: { width: "100%" }, children: [_jsx("style", { children: `
				.model-item-highlight {
					background-color: var(--vscode-editor-findMatchHighlightBackground);
					color: inherit;
				}
				` }), _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsx("label", { htmlFor: "model-search", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model" }) }), apiConfiguration?.apiProvider === "valoride" && (_jsx("div", { style: { marginBottom: "6px", marginTop: 4 }, children: featuredModels.map((model) => (_jsx(FeaturedModelCard, { modelId: model.id, description: model.description, label: model.label, isSelected: selectedModelId === model.id, onClick: () => {
                                handleModelChange(model.id);
                                setIsDropdownVisible(false);
                            } }, model.id))) })), _jsxs(DropdownWrapper, { ref: dropdownRef, children: [_jsx(VSCodeTextField, { id: "model-search", placeholder: "Search and select a model...", value: searchTerm, onInput: (e) => {
                                    handleModelChange(e.target?.value?.toLowerCase());
                                    setIsDropdownVisible(true);
                                }, onFocus: () => setIsDropdownVisible(true), onKeyDown: handleKeyDown, style: {
                                    width: "100%",
                                    zIndex: OPENROUTER_MODEL_PICKER_Z_INDEX,
                                    position: "relative",
                                }, children: searchTerm && (_jsx("div", { className: "input-icon-button", "aria-label": "Clear search", onClick: () => {
                                        handleModelChange("");
                                        setIsDropdownVisible(true);
                                    }, slot: "end", style: {
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        height: "100%"
                                    }, children: _jsx(FaTimes, { style: { fontSize: "14px" } }) })) }), isDropdownVisible && (_jsx(DropdownList, { ref: dropdownListRef, children: modelSearchResults.map((item, index) => {
                                    const isFavorite = (apiConfiguration?.favoritedModelIds || []).includes(item.id);
                                    return (_jsx(DropdownItem, { ref: (el) => {
                                            itemRefs.current[index] = el;
                                        }, isSelected: index === selectedIndex, onMouseEnter: () => setSelectedIndex(index), onClick: () => {
                                            handleModelChange(item.id);
                                            setIsDropdownVisible(false);
                                        }, children: _jsxs("div", { style: {
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                            }, children: [_jsx("span", { dangerouslySetInnerHTML: { __html: item.html } }), _jsx(StarIcon, { isFavorite: isFavorite, onClick: (e) => {
                                                        e.stopPropagation();
                                                        vscode.postMessage({
                                                            type: "toggleFavoriteModel",
                                                            modelId: item.id,
                                                        });
                                                    } })] }) }, item.id));
                                }) }))] })] }), hasInfo ? (_jsxs(_Fragment, { children: [showBudgetSlider && (_jsx(ThinkingBudgetSlider, { apiConfiguration: apiConfiguration, setApiConfiguration: setApiConfiguration })), _jsx(ModelInfoView, { selectedModelId: selectedModelId, modelInfo: selectedModelInfo, isDescriptionExpanded: isDescriptionExpanded, setIsDescriptionExpanded: setIsDescriptionExpanded, isPopup: isPopup })] })) : (_jsx("p", { style: {
                    fontSize: "12px",
                    marginTop: 0,
                    color: "var(--vscode-descriptionForeground)",
                }, children: _jsxs(_Fragment, { children: ["The extension automatically fetches the latest list of models available on", " ", _jsx(VSCodeLink, { style: { display: "inline", fontSize: "inherit" }, href: "https://openrouter.ai/models", children: "OpenRouter." }), "If you're unsure which model to choose, ValorIDE works best with", " ", _jsx(VSCodeLink, { style: { display: "inline", fontSize: "inherit" }, onClick: () => handleModelChange("anthropic/claude-3.7-sonnet"), children: "anthropic/claude-3.7-sonnet." }), "You can also try searching \"free\" for no-cost options currently available."] }) }))] }));
};
export default OpenRouterModelPicker;
// Dropdown
const DropdownWrapper = styled.div `
  position: relative;
  width: 100%;
`;
export const OPENROUTER_MODEL_PICKER_Z_INDEX = 1_000;
const DropdownList = styled.div `
  position: absolute;
  top: calc(100% - 3px);
  left: 0;
  width: calc(100% - 2px);
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--vscode-dropdown-background);
  border: 1px solid var(--vscode-list-activeSelectionBackground);
  z-index: ${OPENROUTER_MODEL_PICKER_Z_INDEX - 1};
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
`;
const DropdownItem = styled.div `
  padding: 5px 10px;
  cursor: pointer;
  word-break: break-all;
  white-space: normal;

  background-color: ${({ isSelected }) => isSelected ? "var(--vscode-list-activeSelectionBackground)" : "inherit"};

  &:hover {
    background-color: var(--vscode-list-activeSelectionBackground);
  }
`;
// Markdown
const StyledMarkdown = styled.div `
  font-family:
    var(--vscode-font-family),
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    "Open Sans",
    "Helvetica Neue",
    sans-serif;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);

  p,
  li,
  ol,
  ul {
    line-height: 1.25;
    margin: 0;
  }

  ol,
  ul {
    padding-left: 1.5em;
    margin-left: 0;
  }

  p {
    white-space: pre-wrap;
  }

  a {
    text-decoration: none;
  }
  a {
    &:hover {
      text-decoration: underline;
    }
  }
`;
export const ModelDescriptionMarkdown = memo(({ markdown, key, isExpanded, setIsExpanded, isPopup, }) => {
    const [reactContent, setMarkdown] = useRemark();
    // const [isExpanded, setIsExpanded] = useState(false)
    const [showSeeMore, setShowSeeMore] = useState(false);
    const textContainerRef = useRef(null);
    const textRef = useRef(null);
    useEffect(() => {
        setMarkdown(markdown || "");
    }, [markdown, setMarkdown]);
    useEffect(() => {
        if (textRef.current && textContainerRef.current) {
            const { scrollHeight } = textRef.current;
            const { clientHeight } = textContainerRef.current;
            const isOverflowing = scrollHeight > clientHeight;
            setShowSeeMore(isOverflowing);
            // if (!isOverflowing) {
            // 	setIsExpanded(false)
            // }
        }
    }, [reactContent, setIsExpanded]);
    return (_jsx(StyledMarkdown, { style: { display: "inline-block", marginBottom: 0 }, children: _jsxs("div", { ref: textContainerRef, style: {
                overflowY: isExpanded ? "auto" : "hidden",
                position: "relative",
                wordBreak: "break-word",
                overflowWrap: "anywhere",
            }, children: [_jsx("div", { ref: textRef, style: {
                        display: "-webkit-box",
                        WebkitLineClamp: isExpanded ? "unset" : 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        // whiteSpace: "pre-wrap",
                        // wordBreak: "break-word",
                        // overflowWrap: "anywhere",
                    }, children: reactContent }), !isExpanded && showSeeMore && (_jsxs("div", { style: {
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        alignItems: "center",
                    }, children: [_jsx("div", { style: {
                                width: 30,
                                height: "1.2em",
                                background: "linear-gradient(to right, transparent, var(--vscode-sideBar-background))",
                            } }), _jsx(VSCodeLink, { style: {
                                // cursor: "pointer",
                                // color: "var(--vscode-textLink-foreground)",
                                fontSize: "inherit",
                                paddingRight: 0,
                                paddingLeft: 3,
                                backgroundColor: isPopup
                                    ? CODE_BLOCK_BG_COLOR
                                    : "var(--vscode-sideBar-background)",
                            }, onClick: () => setIsExpanded(true), children: "See more" })] }))] }) }, key));
});
//# sourceMappingURL=OpenRouterModelPicker.js.map