import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import { FaTimes } from "react-icons/fa";
import Fuse from "fuse.js";
import { memo, useEffect, useMemo, useRef, useState, } from "react";
import { useMount } from "react-use";
import styled from "styled-components";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { vscode } from "@/utils/vscode";
import { highlight } from "../history/HistoryView";
const DropdownWrapper = styled.div `
  position: relative;
  width: 100%;
`;
export const LLMDETAILS_MODEL_PICKER_Z_INDEX = 1_000;
const DropdownList = styled.div `
  position: absolute;
  top: calc(100% - 3px);
  left: 0;
  width: calc(100% - 2px);
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--vscode-panel-border);
  border-top: none;
  background-color: var(--vscode-dropdown-background);
  z-index: ${LLMDETAILS_MODEL_PICKER_Z_INDEX};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;
const DropdownItem = styled.div `
  padding: 6px 8px;
  cursor: pointer;
  background-color: ${(props) => props.isSelected ? "var(--vscode-list-activeSelectionBackground)" : "transparent"};
  color: ${(props) => props.isSelected ? "var(--vscode-list-activeSelectionForeground)" : "inherit"};
  border-left: 3px solid
    ${(props) => props.isSelected
    ? "var(--vscode-terminal-ansiBlue)"
    : "transparent"};
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    background-color: var(--vscode-list-hoverBackground);
  }
`;
const ModelHeader = styled.div `
  padding: 8px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--vscode-descriptionForeground);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;
const FeaturedGrid = styled.div `
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
`;
const FeatureCard = styled.div `
  padding: 8px;
  border: 1px solid
    ${(props) => props.isSelected
    ? "var(--vscode-terminal-ansiBlue)"
    : "var(--vscode-panel-border)"};
  border-radius: 4px;
  background-color: ${(props) => props.isSelected
    ? "var(--vscode-terminal-ansiBlue)15"
    : "var(--vscode-editor-background)"};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--vscode-terminal-ansiBlue);
  }

  div:first-child {
    font-weight: 500;
    font-size: 12px;
    color: var(--vscode-foreground);
    margin-bottom: 2px;
  }

  div:last-child {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
  }
`;
const LlmDetailsModelPicker = ({ isPopup, }) => {
    const { apiConfiguration, setApiConfiguration } = useExtensionState();
    const [searchTerm, setSearchTerm] = useState(apiConfiguration?.llmDetailsModelId || "");
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const dropdownRef = useRef(null);
    const itemRefs = useRef([]);
    const [llmModels, setLlmModels] = useState({});
    // Fetch LLM models from backend (or from extension state if available)
    useMount(() => {
        vscode.postMessage({ type: "refreshOpenRouterModels" });
    });
    // Listen for LLM models updates from extension
    useEffect(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === "llmDetailsUpdated" && message.models) {
                setLlmModels(message.models.reduce((acc, model) => {
                    acc[model.id || model.name] = model;
                    return acc;
                }, {}));
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);
    const handleModelChange = (newModelId) => {
        const selectedModel = llmModels[newModelId];
        setApiConfiguration({
            ...apiConfiguration,
            ...(llmModels[newModelId] && {
                llmDetailsModelId: newModelId,
                llmDetailsModelInfo: selectedModel,
            }),
        });
        setSearchTerm(newModelId);
    };
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
        return Object.keys(llmModels)
            .filter((id) => id !== "valkyrai") // Hide ValorIDE option
            .sort((a, b) => a.localeCompare(b));
    }, [llmModels]);
    const searchableItems = useMemo(() => {
        return modelIds.map((id) => ({
            id,
            html: `${llmModels[id].name} (${llmModels[id].provider})`,
        }));
    }, [modelIds, llmModels]);
    const fuse = useMemo(() => {
        return new Fuse(searchableItems, {
            keys: ["html"],
            threshold: 0.6,
            shouldSort: true,
            isCaseSensitive: false,
            ignoreLocation: false,
            includeMatches: true,
            minMatchCharLength: 1,
        });
    }, [searchableItems]);
    const modelSearchResults = useMemo(() => {
        return searchTerm
            ? highlight(fuse.search(searchTerm), "model-item-highlight")
            : searchableItems;
    }, [searchableItems, searchTerm, fuse]);
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
    useEffect(() => {
        setSelectedIndex(-1);
    }, [searchTerm]);
    useEffect(() => {
        if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
            itemRefs.current[selectedIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [selectedIndex]);
    // Featured models to highlight
    const featuredModels = useMemo(() => {
        return [
            { id: "claude", label: "Recommended", icon: "⭐" },
            { id: "openai", label: "Fast", icon: "⚡" },
            { id: "gemini", label: "Capable", icon: "✨" },
        ].filter((m) => modelIds.some((id) => llmModels[id]?.provider === m.id));
    }, [modelIds, llmModels]);
    const currentSelection = searchTerm
        ? llmModels[searchTerm]
        : undefined;
    return (_jsxs("div", { style: { width: "100%" }, children: [_jsx("style", { children: `
          .model-item-highlight {
            background-color: var(--vscode-editor-findMatchHighlightBackground);
            color: inherit;
          }
        ` }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: [_jsx("label", { htmlFor: "llm-details-search", children: _jsx("span", { style: { fontWeight: 500 }, children: "Select ValkyrAI Coding Agent (LLM Model)" }) }), featuredModels.length > 0 && (_jsxs("div", { style: { marginBottom: "4px" }, children: [_jsx(ModelHeader, { children: "Featured Models" }), _jsx(FeaturedGrid, { children: modelIds
                                    .filter((id) => featuredModels.some((m) => llmModels[id].provider === m.id))
                                    .slice(0, 4)
                                    .map((id) => (_jsxs(FeatureCard, { isSelected: currentSelection?.id === id || searchTerm === id, onClick: () => {
                                        handleModelChange(id);
                                        setIsDropdownVisible(false);
                                    }, children: [_jsx("div", { children: llmModels[id].name }), _jsx("div", { children: llmModels[id].provider })] }, id))) })] })), _jsxs(DropdownWrapper, { ref: dropdownRef, children: [_jsx(VSCodeTextField, { id: "llm-details-search", placeholder: "Search models by name or provider...", value: searchTerm, onInput: (e) => {
                                    setSearchTerm(e.target?.value || "");
                                    setIsDropdownVisible(true);
                                }, onFocus: () => setIsDropdownVisible(true), onKeyDown: handleKeyDown, style: {
                                    width: "100%",
                                    zIndex: LLMDETAILS_MODEL_PICKER_Z_INDEX,
                                    position: "relative",
                                }, children: searchTerm && (_jsx("div", { className: "input-icon-button", "aria-label": "Clear search", onClick: () => {
                                        setSearchTerm("");
                                        setIsDropdownVisible(true);
                                    }, slot: "end", style: {
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        padding: "0 4px",
                                    }, children: _jsx(FaTimes, { size: 14 }) })) }), isDropdownVisible && modelSearchResults.length > 0 && (_jsx(DropdownList, { children: modelSearchResults.map((result, index) => (_jsx(DropdownItem, { ref: (el) => {
                                        if (el)
                                            itemRefs.current[index] = el;
                                    }, isSelected: selectedIndex === index, onClick: () => {
                                        handleModelChange(result.id);
                                        setIsDropdownVisible(false);
                                    }, onMouseEnter: () => setSelectedIndex(index), title: `${llmModels[result.id]?.name} (${llmModels[result.id]?.provider})`, children: _jsx("span", { dangerouslySetInnerHTML: {
                                            __html: result.html,
                                        } }) }, result.id))) })), isDropdownVisible && modelSearchResults.length === 0 && searchTerm && (_jsx(DropdownList, { children: _jsxs(DropdownItem, { style: {
                                        textAlign: "center",
                                        color: "var(--vscode-descriptionForeground)",
                                        cursor: "default",
                                        padding: "12px 8px",
                                    }, children: ["No models found matching \"", searchTerm, "\""] }) }))] }), currentSelection && (_jsxs("div", { style: {
                            padding: "8px",
                            backgroundColor: "var(--vscode-editor-background)",
                            border: "1px solid var(--vscode-panel-border)",
                            borderRadius: "4px",
                            fontSize: "11px",
                        }, children: [_jsxs("div", { children: [_jsx("strong", { children: currentSelection.name }), " (", currentSelection.provider, ")"] }), currentSelection.version && (_jsxs("div", { style: { color: "var(--vscode-descriptionForeground)" }, children: ["Version: ", currentSelection.version] })), currentSelection.notes && (_jsx("div", { style: { color: "var(--vscode-descriptionForeground)", marginTop: "4px" }, children: currentSelection.notes }))] }))] })] }));
};
export default memo(LlmDetailsModelPicker);
//# sourceMappingURL=LlmDetailsModelPicker.js.map