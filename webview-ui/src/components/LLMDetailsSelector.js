import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * LLMDetailsSelector — React UI for prompt selection
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { vscode } from "@/utils/vscode";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { VscRefresh } from "react-icons/vsc";
import StatusBadge from "@/components/common/StatusBadge";
export const LLMDetailsSelector = ({
  onSelectionChange,
  currentSelection,
  taskIntent,
  disabled = false,
  isLoggedIn,
}) => {
  const [selectedId, setSelectedId] = useState(currentSelection || "");
  const [llmDetails, setLlmDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState();
  const hasFetchedOnceRef = useRef(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    setSelectedId(currentSelection || "");
  }, [currentSelection]);
  const fetchLlmDetails = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }
    setIsLoading(true);
    setError(undefined);
    vscode.postMessage({ type: "refreshLLMDetails" });
  }, []);
  useEffect(() => {
    const handleMessage = (event) => {
      const message = event.data;
      if (message.type === "llmDetailsUpdated") {
        setIsLoading(false);
        if (Array.isArray(message.llmDetails)) {
          setLlmDetails(message.llmDetails);
        } else if (message.error) {
          setError(message.error);
        } else {
          setLlmDetails([]);
        }
      }
    };
    window.addEventListener("message", handleMessage);
    fetchLlmDetails();
    hasFetchedOnceRef.current = true;
    return () => window.removeEventListener("message", handleMessage);
  }, [fetchLlmDetails]);
  useEffect(() => {
    if (!hasFetchedOnceRef.current) {
      return;
    }
    if (isLoggedIn) {
      fetchLlmDetails();
    }
  }, [isLoggedIn, fetchLlmDetails]);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const filteredDetails = useMemo(() => {
    if (!taskIntent) return llmDetails;
    return llmDetails.filter(
      (detail) =>
        detail.tags?.includes(taskIntent) ||
        detail.tags?.includes("all") ||
        (!detail.tags?.length && !taskIntent),
    );
  }, [llmDetails, taskIntent]);
  const handleSelectionChange = (newId) => {
    setSelectedId(newId);
    const selection = filteredDetails.find((detail) => detail.id === newId);
    if (selection) {
      onSelectionChange?.(selection);
    }
  };
  return _jsxs("div", {
    className: "llm-selector",
    children: [
      _jsxs("div", {
        className: "llm-selector-header",
        style: { display: "flex", alignItems: "center", gap: 8 },
        children: [
          _jsx("label", {
            htmlFor: "llm-dropdown",
            className: "llm-selector-label",
            children: "LLM Prompt Selection",
          }),
          _jsx(VSCodeButton, {
            appearance: "icon",
            "aria-label": "Refresh prompts",
            title: "Refresh available prompts",
            onClick: fetchLlmDetails,
            disabled: disabled || isLoading,
            children: isLoading
              ? _jsx(VSCodeProgressRing, {})
              : _jsx(VscRefresh, {}),
          }),
        ],
      }),
      error &&
        _jsxs("div", {
          className: "llm-selector-error",
          style: {
            marginBottom: 6,
            color: "var(--vscode-inputValidation-errorForeground)",
          },
          children: ["Failed to load prompts. ", error],
        }),
      _jsxs("select", {
        id: "llm-dropdown",
        className: "llm-selector-dropdown",
        value: selectedId,
        onChange: (e) => handleSelectionChange(e.target.value),
        disabled: disabled || isLoading || !!error,
        children: [
          _jsx("option", { value: "", children: "-- Choose a prompt --" }),
          filteredDetails.map((llm) =>
            _jsxs(
              "option",
              {
                value: llm.id,
                children: [
                  llm.name,
                  " (",
                  (llm.ratingScore ?? 0).toFixed(1),
                  "/5 \u2605) [",
                  llm.promptType ?? "SYSTEM",
                  "]",
                ],
              },
              llm.id,
            ),
          ),
        ],
      }),
      isLoading &&
        _jsx("div", {
          className: "llm-selector-loading",
          style: { marginTop: 6 },
          children: _jsx(StatusBadge, {
            label: "Status",
            value: "Refreshing prompts\u2026",
            kind: "warn",
          }),
        }),
      selectedId &&
        filteredDetails.length > 0 &&
        _jsx(PromptPreview, {
          llmDetails: filteredDetails.find((l) => l.id === selectedId),
        }),
    ],
  });
};
const PromptPreview = ({ llmDetails }) => {
  if (!llmDetails) return null;
  return _jsxs("div", {
    className: "prompt-preview",
    children: [
      _jsxs("div", {
        className: "preview-header",
        children: [
          _jsx("h4", { children: llmDetails.name }),
          _jsxs("span", {
            className: "rating",
            children: [
              "\u2605 ",
              (llmDetails.ratingScore ?? 0).toFixed(1),
              "/5",
            ],
          }),
        ],
      }),
      _jsx("p", { className: "description", children: llmDetails.description }),
      llmDetails.tags &&
        llmDetails.tags.length > 0 &&
        _jsx("div", {
          className: "tags",
          children: llmDetails.tags.map((tag) =>
            _jsx("span", { className: "tag", children: tag }, tag),
          ),
        }),
      _jsxs("div", {
        className: "mode-indicator",
        children: [
          "Mode: ",
          _jsx("strong", { children: llmDetails.promptType ?? "SYSTEM" }),
          llmDetails.promptType === "SYSTEM" &&
            _jsx("span", {
              className: "mode-desc",
              children: " (replaces system prompt)",
            }),
          llmDetails.promptType === "APPEND" &&
            _jsx("span", {
              className: "mode-desc",
              children: " (appends to system prompt)",
            }),
        ],
      }),
      llmDetails.initialPrompt &&
        _jsxs("pre", {
          className: "prompt-snippet",
          children: [
            llmDetails.initialPrompt.slice(0, 240),
            llmDetails.initialPrompt.length > 240 ? "…" : "",
          ],
        }),
    ],
  });
};
export default LLMDetailsSelector;
//# sourceMappingURL=LLMDetailsSelector.js.map
