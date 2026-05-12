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
import { VscRefresh, VscChevronDown } from "react-icons/vsc";
import { FaStar, FaLock, FaGlobe } from "react-icons/fa";
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
  const [isOpen, setIsOpen] = useState(false);
  const hasFetchedOnceRef = useRef(false);
  const isMountedRef = useRef(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Partition into public (no user-specific tag) vs user-specific
  const { publicDetails, userDetails, filteredDetails } = useMemo(() => {
    const all = taskIntent
      ? llmDetails.filter(
        (d) =>
          d.tags?.includes(taskIntent) ||
          d.tags?.includes("all") ||
          !d.tags?.length,
      )
      : llmDetails;

    const userDetails = all.filter(
      (d) => d.tags?.includes("user") || d.tags?.includes("private"),
    );
    const publicDetails = all.filter(
      (d) => !d.tags?.includes("user") && !d.tags?.includes("private"),
    );
    return { publicDetails, userDetails, filteredDetails: all };
  }, [llmDetails, taskIntent]);

  const selectedDetail = filteredDetails.find((d) => d.id === selectedId);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setIsOpen(false);
    const selection = filteredDetails.find((d) => d.id === id);
    if (selection) {
      onSelectionChange?.(selection);
    }
  };

  const isDisabled = disabled || isLoading || !!error;

  const renderItem = (llm: LlmDetailsSummary) => {
    const isSelected = llm.id === selectedId;
    const isUser = llm.tags?.includes("user") || llm.tags?.includes("private");
    return (
      <div
        key={llm.id}
        role="menuitem"
        aria-current={isSelected ? "true" : undefined}
        tabIndex={isDisabled ? -1 : 0}
        onClick={() => !isDisabled && handleSelect(llm.id)}
        onKeyDown={(e) => { if (!isDisabled && (e.key === "Enter" || e.key === " ")) handleSelect(llm.id); }}
        style={{
          padding: "7px 10px",
          cursor: isDisabled ? "default" : "pointer",
          background: isSelected
            ? "var(--vscode-list-activeSelectionBackground)"
            : "transparent",
          color: isSelected
            ? "var(--vscode-list-activeSelectionForeground)"
            : "var(--vscode-foreground)",
          borderLeft: `3px solid ${isSelected ? "var(--vscode-focusBorder)" : "transparent"}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          userSelect: "none",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => {
          if (!isSelected && !isDisabled) {
            (e.currentTarget as HTMLDivElement).style.background =
              "var(--vscode-list-hoverBackground)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            (e.currentTarget as HTMLDivElement).style.background = "transparent";
          }
        }}
      >
        <span style={{ opacity: 0.6, flexShrink: 0 }}>
          {isUser ? <FaLock size={10} /> : <FaGlobe size={10} />}
        </span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {llm.name}
        </span>
        {llm.ratingScore != null && (
          <span style={{ opacity: 0.7, display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <FaStar size={9} color="#cca700" />
            {llm.ratingScore.toFixed(1)}
          </span>
        )}
        <span
          style={{
            fontSize: 10,
            opacity: 0.6,
            background: "var(--vscode-badge-background)",
            color: "var(--vscode-badge-foreground)",
            padding: "1px 4px",
            borderRadius: 3,
            flexShrink: 0,
          }}
        >
          {llm.promptType ?? "SYSTEM"}
        </span>
      </div>
    );
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !isDisabled && setIsOpen((o) => !o)}
        onKeyDown={(e) => { if (!isDisabled && (e.key === "Enter" || e.key === " ")) setIsOpen((o) => !o); }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid var(--vscode-panel-border)",
          borderRadius: 4,
          padding: "5px 8px",
          cursor: isDisabled ? "default" : "pointer",
          background: "var(--vscode-dropdown-background)",
          color: "var(--vscode-dropdown-foreground)",
          fontSize: 12,
          minHeight: 28,
          opacity: isDisabled ? 0.6 : 1,
        }}
      >
        {isLoading ? (
          <VSCodeProgressRing style={{ width: 14, height: 14 }} />
        ) : (
          <>
            {selectedDetail ? (
              <>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedDetail.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    opacity: 0.7,
                    background: "var(--vscode-badge-background)",
                    color: "var(--vscode-badge-foreground)",
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  {selectedDetail.promptType ?? "SYSTEM"}
                </span>
              </>
            ) : (
              <span style={{ opacity: 0.6, flex: 1 }}>
                {error ? "Failed to load — retry below" : "-- Choose a prompt --"}
              </span>
            )}
          </>
        )}
        <VSCodeButton
          appearance="icon"
          title="Refresh available prompts"
          onClick={(e: any) => { e.stopPropagation(); fetchLlmDetails(); }}
          disabled={disabled || isLoading}
          style={{ marginLeft: "auto" }}
        >
          {isLoading ? <VSCodeProgressRing style={{ width: 12, height: 12 }} /> : <VscRefresh />}
        </VSCodeButton>
        <VscChevronDown
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            opacity: 0.7,
            flexShrink: 0,
          }}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && !isLoading && !error && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 0,
            right: 0,
            zIndex: 1000,
            border: "1px solid var(--vscode-panel-border)",
            borderRadius: 4,
            background: "var(--vscode-dropdown-background)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {userDetails.length > 0 && (
            <>
              <div
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  opacity: 0.6,
                  color: "var(--vscode-foreground)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  borderBottom: "1px solid var(--vscode-panel-border)",
                }}
              >
                <FaLock size={9} /> My Prompts
              </div>
              {userDetails.map(renderItem)}
            </>
          )}
          {publicDetails.length > 0 && (
            <>
              <div
                style={{
                  padding: "4px 10px",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  opacity: 0.6,
                  color: "var(--vscode-foreground)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  borderTop: userDetails.length > 0 ? "1px solid var(--vscode-panel-border)" : undefined,
                  borderBottom: "1px solid var(--vscode-panel-border)",
                }}
              >
                <FaGlobe size={9} /> Public Prompts
              </div>
              {publicDetails.map(renderItem)}
            </>
          )}
          {filteredDetails.length === 0 && (
            <div style={{ padding: "12px 10px", opacity: 0.5, fontSize: 12, textAlign: "center" }}>
              No prompts available
            </div>
          )}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "var(--vscode-inputValidation-errorForeground, #f48771)",
            background: "var(--vscode-inputValidation-errorBackground, #5a1d1d)",
            border: "1px solid var(--vscode-inputValidation-errorBorder, #f48771)",
            borderRadius: 3,
            padding: "4px 8px",
          }}
        >
          Failed to load prompts. {error}
        </div>
      )}

      {/* Selected prompt preview */}
      {selectedDetail && (
        <div
          style={{
            marginTop: 6,
            padding: "6px 10px",
            background: "var(--vscode-editor-background)",
            border: "1px solid var(--vscode-panel-border)",
            borderRadius: 4,
            fontSize: 11,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{selectedDetail.name}</div>
          {selectedDetail.description && (
            <div style={{ opacity: 0.7, marginBottom: 4, lineHeight: 1.4 }}>
              {selectedDetail.description}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <StatusBadge
              label="Mode"
              value={selectedDetail.promptType ?? "SYSTEM"}
              kind={selectedDetail.promptType === "SYSTEM" ? "warn" : "ok"}
            />
            {selectedDetail.ratingScore != null && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, opacity: 0.8 }}>
                <FaStar size={10} color="#cca700" />
                {selectedDetail.ratingScore.toFixed(1)}/5
              </span>
            )}
            {selectedDetail.tags?.filter((t) => t !== "user" && t !== "private" && t !== "all").map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 10,
                  background: "var(--vscode-badge-background)",
                  color: "var(--vscode-badge-foreground)",
                  padding: "1px 5px",
                  borderRadius: 3,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          {selectedDetail.initialPrompt && (
            <pre
              style={{
                marginTop: 6,
                padding: "4px 6px",
                fontSize: 10,
                background: "var(--vscode-textBlockQuote-background, rgba(0,0,0,0.2))",
                borderRadius: 3,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                opacity: 0.8,
                maxHeight: 80,
                overflow: "hidden",
              }}
            >
              {selectedDetail.initialPrompt.slice(0, 200)}
              {selectedDetail.initialPrompt.length > 200 ? "…" : ""}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

export default LLMDetailsSelector;
