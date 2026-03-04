/**
 * LLMDetailsSelector — React UI for prompt selection
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { vscode } from "@thorapi/utils/vscode";
import { LlmDetailsSummary } from "@shared/llm";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { VscRefresh } from "react-icons/vsc";
import StatusBadge from "@thorapi/components/common/StatusBadge";

interface LLMDetailsSelectorProps {
  onSelectionChange?: (details: LlmDetailsSummary) => void;
  currentSelection?: string;
  taskIntent?: string;
  disabled?: boolean;
  isLoggedIn?: boolean;
}

export const LLMDetailsSelector: React.FC<LLMDetailsSelectorProps> = ({
  onSelectionChange,
  currentSelection,
  taskIntent,
  disabled = false,
  isLoggedIn,
}) => {
  const [selectedId, setSelectedId] = useState<string>(currentSelection || "");
  const [llmDetails, setLlmDetails] = useState<LlmDetailsSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
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
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "llmDetailsUpdated") {
        setIsLoading(false);
        if (Array.isArray(message.llmDetails)) {
          setLlmDetails(message.llmDetails as LlmDetailsSummary[]);
        } else if (message.error) {
          setError(message.error as string);
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

  const handleSelectionChange = (newId: string) => {
    setSelectedId(newId);
    const selection = filteredDetails.find((detail) => detail.id === newId);
    if (selection) {
      onSelectionChange?.(selection);
    }
  };

  return (
    <div className="llm-selector">
      <div
        className="llm-selector-header"
        style={{ display: "flex", alignItems: "center", gap: 8 }}
      >
        <label htmlFor="llm-dropdown" className="llm-selector-label">
          LLM Prompt Selection
        </label>
        <VSCodeButton
          appearance="icon"
          aria-label="Refresh prompts"
          title="Refresh available prompts"
          onClick={fetchLlmDetails}
          disabled={disabled || isLoading}
        >
          {isLoading ? <VSCodeProgressRing /> : <VscRefresh />}
        </VSCodeButton>
      </div>

      {error && (
        <div
          className="llm-selector-error"
          style={{
            marginBottom: 6,
            color: "var(--vscode-inputValidation-errorForeground)",
          }}
        >
          Failed to load prompts. {error}
        </div>
      )}

      <select
        id="llm-dropdown"
        className="llm-selector-dropdown"
        value={selectedId}
        onChange={(e) => handleSelectionChange(e.target.value)}
        disabled={disabled || isLoading || !!error}
      >
        <option value="">-- Choose a prompt --</option>
        {filteredDetails.map((llm) => (
          <option key={llm.id} value={llm.id}>
            {llm.name} ({(llm.ratingScore ?? 0).toFixed(1)}/5 ★) [
            {llm.promptType ?? "SYSTEM"}]
          </option>
        ))}
      </select>

      {isLoading && (
        <div className="llm-selector-loading" style={{ marginTop: 6 }}>
          <StatusBadge label="Status" value="Refreshing prompts…" kind="warn" />
        </div>
      )}

      {selectedId && filteredDetails.length > 0 && (
        <PromptPreview
          llmDetails={filteredDetails.find((l) => l.id === selectedId)}
        />
      )}
    </div>
  );
};

interface PromptPreviewProps {
  llmDetails?: LlmDetailsSummary;
}

const PromptPreview: React.FC<PromptPreviewProps> = ({ llmDetails }) => {
  if (!llmDetails) return null;

  return (
    <div className="prompt-preview">
      <div className="preview-header">
        <h4>{llmDetails.name}</h4>
        <span className="rating">
          ★ {(llmDetails.ratingScore ?? 0).toFixed(1)}/5
        </span>
      </div>

      <p className="description">{llmDetails.description}</p>

      {llmDetails.tags && llmDetails.tags.length > 0 && (
        <div className="tags">
          {llmDetails.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mode-indicator">
        Mode: <strong>{llmDetails.promptType ?? "SYSTEM"}</strong>
        {llmDetails.promptType === "SYSTEM" && (
          <span className="mode-desc"> (replaces system prompt)</span>
        )}
        {llmDetails.promptType === "APPEND" && (
          <span className="mode-desc"> (appends to system prompt)</span>
        )}
      </div>

      {llmDetails.initialPrompt && (
        <pre className="prompt-snippet">
          {llmDetails.initialPrompt.slice(0, 240)}
          {llmDetails.initialPrompt.length > 240 ? "…" : ""}
        </pre>
      )}
    </div>
  );
};

export default LLMDetailsSelector;
