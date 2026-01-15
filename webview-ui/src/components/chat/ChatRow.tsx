import {
  VSCodeBadge,
  VSCodeProgressRing,
  VSCodeButton,
} from "@vscode/webview-ui-toolkit/react";
import deepEqual from "fast-deep-equal";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useEvent, useSize } from "react-use";
import styled from "styled-components";
import {
  FaExclamationTriangle,
  FaExclamationCircle,
  FaTerminal,
  FaServer,
  FaCheck,
  FaQuestion,
  FaChevronDown,
  FaChevronUp,
  FaChevronRight,
  FaEdit,
  FaSignOutAlt,
  FaFileCode,
  FaExternalLinkAlt,
  FaFolderOpen,
  FaSearch,
  FaFile,
  FaBook,
  FaBug,
  FaDatabase,
  FaArrowUp,
  FaArrowDown,
  FaArrowRight,
  FaTimes,
  FaPlus,
  FaExclamationTriangle as FaWarning,
  FaCheckCircle,
  FaTimes as FaClose,
  FaFileAlt,
  FaBrain,
  FaCarCrash,
  FaMagic,
  FaFileUpload,
} from "react-icons/fa";
import { VscError, VscCheck } from "react-icons/vsc";
import type {
  ValorIDEApiReqInfo,
  ValorIDEAskQuestion,
  ValorIDEAskUseMcpServer,
  ValorIDEMessage,
  ValorIDEPlanModeResponse,
  ValorIDESayTool,
  ValorIDEChangesSummary,
  ValorIDEFileChangeStatus,
  ValorIDEFileChangeSummary,
  ExtensionMessage,
} from "@shared/ExtensionMessage";
import { COMPLETION_RESULT_CHANGES_FLAG } from "@shared/ExtensionMessage";
import {
  COMMAND_OUTPUT_STRING,
  COMMAND_REQ_APP_STRING,
} from "@shared/combineCommandSequences";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import {
  findMatchingResourceOrTemplate,
  getMcpServerDisplayName,
} from "@thorapi/utils/mcp";
import { getLanguageFromPath } from "@thorapi/utils/getLanguageFromPath";
import { vscode } from "@thorapi/utils/vscode";
import { FileServiceClient } from "@thorapi/services/grpc-client";
import { CheckmarkControl } from "@thorapi/components/common/CheckmarkControl";
import {
  CheckpointControls,
  CheckpointOverlay,
} from "../common/CheckpointControls";
import CodeAccordian, { cleanPathPrefix } from "../common/CodeAccordian";
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "@thorapi/components/common/CodeBlock";
import MarkdownBlock from "@thorapi/components/common/MarkdownBlock";
import Thumbnails from "@thorapi/components/common/Thumbnails";
import McpToolRow from "@thorapi/components/mcp/configuration/tabs/installed/server-row/McpToolRow";
import McpResponseDisplay from "@thorapi/components/mcp/chat-display/McpResponseDisplay";
import CreditLimitError from "@thorapi/components/chat/CreditLimitError";
import { OptionsButtons } from "@thorapi/components/chat/OptionsButtons";
import { highlightText } from "./TaskHeader";
import SuccessButton from "@thorapi/components/common/SuccessButton";
import TaskFeedbackButtons from "@thorapi/components/chat/TaskFeedbackButtons";
import NewTaskPreview from "./NewTaskPreview";
import McpResourceRow from "@thorapi/components/mcp/configuration/tabs/installed/server-row/McpResourceRow";
import UserMessage from "./UserMessage";
import { type TaskConfidence } from "@thorapi/utils/taskPhase";

const statusColorMap: Record<ValorIDEFileChangeStatus, string> = {
  added: "var(--vscode-charts-green)",
  modified: "var(--vscode-charts-blue)",
  deleted: "var(--vscode-charts-red)",
  renamed: "#c586c0",
  copied: "#d7ba7d",
  typechange: "#d7ba7d",
};

const statusShortLabel: Record<ValorIDEFileChangeStatus, string> = {
  added: "A",
  modified: "M",
  deleted: "D",
  renamed: "R",
  copied: "C",
  typechange: "T",
};

const ChangesSummaryContainer = styled.div`
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

const ChangesSummaryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ChangesSummaryTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
  flex: 1;
  min-width: 0;
`;

const ChangesSummaryTotals = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
`;

const SummaryMetric = styled.span<{ variant: "added" | "removed" }>`
  color: ${({ variant }) =>
    variant === "added"
      ? "var(--vscode-charts-green)"
      : "var(--vscode-charts-red)"};
`;

const ChangesSummaryActionButton = styled.button`
  background: none;
  border: none;
  color: var(
    --vscode-editorLink-activeForeground,
    var(--vscode-textLink-foreground)
  );
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

const ChangesSummaryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ChangesSummaryRow = styled.button`
  all: unset;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  border: 1px solid var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.07));
  padding: 8px 10px;
  cursor: pointer;
  gap: 10px;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;

  &:hover:not(:disabled) {
    background: color-mix(
      in srgb,
      var(--vscode-editorWidget-background) 55%,
      transparent
    );
    border-color: color-mix(in srgb, currentColor 20%, transparent);
  }

  &:disabled {
    opacity: 0.55;
    cursor: default;
  }
`;

const RowLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`;

const StatusBadge = styled.span<{ status: ValorIDEFileChangeStatus }>`
  font-size: 10px;
  font-weight: 700;
  padding: 4px 6px;
  border-radius: 6px;
  background: ${({ status }) =>
    colorMix(statusColorMap[status] ?? "var(--vscode-foreground)", 0.15)};
  color: ${({ status }) =>
    statusColorMap[status] ?? "var(--vscode-foreground)"};
  text-transform: uppercase;
`;

const FileName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const RowRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
`;

const RowSecondaryText = styled.span`
  display: block;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-top: 2px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowTextWrapper = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
`;

interface CompletionChangesSummaryProps {
  summary: ValorIDEChangesSummary;
  disabled: boolean;
  onOpenAllChanges: () => void;
  onOpenFileDiff: (relativePath: string) => void;
  messageTs?: number;
}

const CompletionChangesSummary: React.FC<CompletionChangesSummaryProps> = ({
  summary,
  disabled,
  onOpenAllChanges,
  onOpenFileDiff,
  messageTs,
}) => {
  if (!summary || summary.totalFiles === 0) {
    return null;
  }

  const totalFilesLabel =
    summary.totalFiles === 1 ? "1 file" : `${summary.totalFiles} files`;

  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [previews, setPreviews] = useState<Record<string, { loading?: boolean; before?: string; after?: string; isBinary?: boolean; error?: string }>>({});

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data: any = event.data;
        if (data?.type === "taskCompletionFilePreview" && data.relativePath) {
          setPreviews((prev) => ({
            ...prev,
            [data.relativePath]: {
              loading: false,
              before: data.before,
              after: data.after,
              isBinary: data.isBinary,
            },
          }));
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler as any);
  }, []);

  const toggleFilePreview = (relativePath: string, isBinary?: boolean) => {
    const isExpanded = expandedFiles[relativePath];
    setExpandedFiles((prev) => ({ ...prev, [relativePath]: !isExpanded }));
    if (!isExpanded && !previews[relativePath]) {
      setPreviews((prev) => ({ ...prev, [relativePath]: { loading: true } }));
      if (messageTs) {
        vscode.postMessage({
          type: "taskCompletionPreviewFile",
          number: messageTs,
          relativePath,
          seeNewChangesSinceLastTaskCompletion: true,
        });
      }
    }
  };

  return (
    <ChangesSummaryContainer>
      <ChangesSummaryHeader>
        <ChangesSummaryTitle>Changes Summary</ChangesSummaryTitle>
        <ChangesSummaryTotals>
          <SummaryMetric variant="added">
            +{summary.totalInsertions}
          </SummaryMetric>
          <SummaryMetric variant="removed">
            -{summary.totalDeletions}
          </SummaryMetric>
          <span>{totalFilesLabel}</span>
        </ChangesSummaryTotals>
        <ChangesSummaryActionButton
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              onOpenAllChanges();
            }
          }}
          title="Open all changes"
          aria-label="Open all changes"
        >
          <FaExternalLinkAlt size={12} />
        </ChangesSummaryActionButton>
      </ChangesSummaryHeader>
      <ChangesSummaryList>
        {summary.files.map((file: ValorIDEFileChangeSummary, index) => {
          const isDisabled = disabled || !!file.isBinary;
          const secondaryText = file.isBinary
            ? "Binary file"
            : file.previousRelativePath
              ? `Renamed from ${file.previousRelativePath}`
              : undefined;
          const statusLabel =
            statusShortLabel[file.status] ??
            file.status?.slice(0, 1).toUpperCase();

          return (
            <>
              <ChangesSummaryRow
                key={`${file.relativePath}-${index}`}
                type="button"
                disabled={isDisabled}
                onClick={() => {
                  if (!isDisabled) {
                    toggleFilePreview(file.relativePath, file.isBinary);
                  }
                }}
                title={
                  file.isBinary
                    ? "Binary files cannot be previewed in the diff viewer"
                    : undefined
                }
              >
                <RowLeft>
                  <StatusBadge status={file.status}>{statusLabel}</StatusBadge>
                  <RowTextWrapper>
                    <FileName>{file.relativePath}</FileName>
                    {secondaryText && (
                      <RowSecondaryText>{secondaryText}</RowSecondaryText>
                    )}
                  </RowTextWrapper>
                </RowLeft>
                <RowRight>
                  {!file.isBinary && (
                    <>
                      <SummaryMetric variant="added">
                        +{file.insertions}
                      </SummaryMetric>
                      <SummaryMetric variant="removed">
                        -{file.deletions}
                      </SummaryMetric>
                    </>
                  )}
                  <FaChevronRight
                    size={12}
                    style={{ transform: expandedFiles[file.relativePath] ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 120ms" }}
                    onClick={(e) => {
                      // stop propagation to avoid toggling twice
                      e.stopPropagation();
                      toggleFilePreview(file.relativePath, file.isBinary);
                    }}
                  />
                </RowRight>
              </ChangesSummaryRow>
              {
                expandedFiles[file.relativePath] && (
                  <div style={{ padding: 12, paddingLeft: 44, paddingRight: 24, background: 'var(--vscode-editorWidget-background)', borderRadius: 6, marginTop: 6 }}>
                    {previews[file.relativePath]?.loading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ transform: 'scale(0.55)', transformOrigin: 'center' }}>
                          <VSCodeProgressRing />
                        </div>
                        Loading preview...
                      </div>
                    ) : previews[file.relativePath]?.isBinary ? (
                      <div>Binary file diff cannot be previewed here. Click Open in Diff to view.</div>
                    ) : (
                      <div>
                        {previews[file.relativePath]?.after && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginBottom: 6 }}>
                              <span>New</span>
                              <VSCodeButton
                                appearance="icon"
                                disabled={disabled}
                                aria-label="Open in Diff"
                                title="Open in Diff"
                                onClick={() => onOpenFileDiff(file.relativePath)}
                                style={{ padding: 4 }}
                              >
                                <FaExternalLinkAlt size={12} />
                              </VSCodeButton>
                            </div>
                            <CodeBlock source={`\`\`\`${getLanguageFromPath(file.relativePath) || ''}\n${(previews[file.relativePath]?.after || '').trim() || '// no preview available'}\n\`\`\``} />
                          </div>
                        )}
                        {previews[file.relativePath]?.before && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'var(--vscode-descriptionForeground)', marginBottom: 6 }}>
                              <span>Old</span>
                              <VSCodeButton
                                appearance="icon"
                                disabled={disabled}
                                aria-label="Open in Diff"
                                title="Open in Diff"
                                onClick={() => onOpenFileDiff(file.relativePath)}
                                style={{ padding: 4 }}
                              >
                                <FaExternalLinkAlt size={12} />
                              </VSCodeButton>
                            </div>
                            <CodeBlock source={`\`\`\`${getLanguageFromPath(file.relativePath) || ''}\n${(previews[file.relativePath]?.before || '').trim() || '// no preview available'}\n\`\`\``} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              }
            </>
          );
        })}
      </ChangesSummaryList>
    </ChangesSummaryContainer>
  );
};

const colorMix = (hexColor: string, alpha: number) => {
  return `color-mix(in srgb, ${hexColor} ${alpha * 100}%, transparent)`;
};

const ChatRowContainer = styled.div`
  padding: 10px 6px 10px 15px;
  position: relative;

  &:hover ${CheckpointControls} {
    opacity: 1;
  }
`;

interface ChatRowProps {
  message: ValorIDEMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
  lastModifiedMessage?: ValorIDEMessage;
  isLast: boolean;
  onHeightChange: (isTaller: boolean) => void;
  inputValue?: string;
  setInputValue?: (value: string) => void;
  sendMessageFromChatRow?: (text: string, images: string[]) => void;
  taskConfidence?: TaskConfidence;
}

type ChatRowContentProps = Omit<ChatRowProps, "onHeightChange"> & {
  onHeightChange?: (isTaller: boolean) => void;
};

export const API_REQUEST_TIMEOUT_MS = 10000;
const severityColors: Record<"info" | "warning" | "error", string> = {
  info:
    "var(--vscode-notificationsInfoIcon-foreground, var(--vscode-charts-blue))",
  warning:
    "var(--vscode-notificationsWarningIcon-foreground, var(--vscode-charts-yellow))",
  error:
    "var(--vscode-notificationsErrorIcon-foreground, var(--vscode-errorForeground))",
};

const severityRank: Record<"info" | "warning" | "error", number> = {
  info: 0,
  warning: 1,
  error: 2,
};

const parseCommandMessage = (text: string) => {
  const outputIndex = text.indexOf(COMMAND_OUTPUT_STRING);
  if (outputIndex === -1) {
    return { rawCommand: text.trim(), output: "", hadDelimiter: false };
  }
  const output = text
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
    .join("");
  return {
    rawCommand: text.slice(0, outputIndex).trim(),
    output,
    hadDelimiter: true,
  };
};

const mergeSeverity = (
  ...levels: Array<"info" | "warning" | "error" | undefined>
): "info" | "warning" | "error" => {
  return levels.reduce<"info" | "warning" | "error">((acc, level) => {
    if (!level) return acc;
    return severityRank[level] > severityRank[acc] ? level : acc;
  }, "info");
};

export const ProgressIndicator = ({ color }: { color?: string }) => (
  <div
    style={{
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: color ?? "var(--vscode-foreground)",
    }}
    aria-label="progress-indicator"
  >
    <div
      style={{
        transform: "scale(0.55)",
        transformOrigin: "center",
        color: color ?? "var(--vscode-foreground)",
      }}
    >
      <VSCodeProgressRing style={{ color }} />
    </div>
  </div>
);

const Markdown = memo(({ markdown }: { markdown?: string }) => {
  return (
    <div
      style={{
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        marginBottom: -15,
        marginTop: -15,
      }}
    >
      <MarkdownBlock markdown={markdown} />
    </div>
  );
});

export const CompletionSummaryCard = memo(
  ({
    markdown,
    title,
    completedAt,
    fallbackMarkdown,
  }: {
    markdown?: string;
    title?: string;
    completedAt?: string;
    fallbackMarkdown?: string;
  }) => {
    let completedLabel: string | undefined;
    if (completedAt) {
      const date = new Date(completedAt);
      completedLabel = Number.isNaN(date.getTime())
        ? undefined
        : `Completed ${date.toLocaleString()}`;
    }

    // Avoid duplicating the task title in the rendered markdown by stripping
    // the leading `# Task: {title}` heading if present. The card already shows
    // the title in its header, so rendering it again inside the markdown makes
    // the summary look like the initial task prompt, which is confusing.
    const stripTaskTitleHeading = (md?: string) => {
      if (!md) return md;
      return md.replace(/^# Task: .*\n?/, "");
    };

    const bodyMarkdown = stripTaskTitleHeading(markdown);
    const fallbackBody = stripTaskTitleHeading(fallbackMarkdown);
    const summarySection = bodyMarkdown?.trim() || fallbackBody?.trim() || "";
    const nextStepsSection = [
      "### Next Steps",
      "- Review the code changes in the diff viewer.",
      "- Run relevant tests/linters before merging.",
      "- Confirm any external configuration or deployment steps are updated.",
    ].join("\n");
    const narrativeMarkdown = [summarySection, nextStepsSection, bodyMarkdown]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    if (!narrativeMarkdown) {
      return null;
    }

    return (
      <div
        style={{
          marginTop: 12,
          borderRadius: 10,
          border:
            "1px solid var(--vscode-editorWidget-border, rgba(255,255,255,0.08))",
          background:
            "color-mix(in srgb, var(--vscode-editor-background) 90%, transparent)",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--vscode-foreground)",
          }}
        >
          <FaCheckCircle size={28} color="var(--vscode-charts-green)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              {title ? `Task Summary — ${title}` : "Task Summary"}
            </div>
            {completedLabel && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--vscode-descriptionForeground)",
                }}
              >
                {completedLabel}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 4 }}>
          <Markdown markdown={narrativeMarkdown} />
        </div>
      </div>
    );
  },
);

const ChatRow = memo(
  (props: ChatRowProps) => {
    const {
      isLast,
      onHeightChange,
      message,
      lastModifiedMessage,
      inputValue,
      setInputValue,
    } = props;
    // Store the previous height to compare with the current height
    // This allows us to detect changes without causing re-renders
    const prevHeightRef = useRef(0);

    const [chatrow, { height }] = useSize(
      <ChatRowContainer>
        <ChatRowContent {...props} />
      </ChatRowContainer>,
    );

    useEffect(() => {
      // used for partials command output etc.
      // NOTE: it's important we don't distinguish between partial or complete here since our scroll effects in chatview need to handle height change during partial -> complete
      const isInitialRender = prevHeightRef.current === 0; // prevents scrolling when new element is added since we already scroll for that
      // height starts off at Infinity
      if (
        isLast &&
        height !== 0 &&
        height !== Infinity &&
        height !== prevHeightRef.current
      ) {
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
  deepEqual,
);

export default ChatRow;

export const ChatRowContent = ({
  message,
  isExpanded,
  onToggleExpand,
  lastModifiedMessage,
  isLast,
  inputValue,
  setInputValue,
  sendMessageFromChatRow,
  taskConfidence,
}: ChatRowContentProps) => {
  const { mcpServers, mcpMarketplaceCatalog, valorideMessages } = useExtensionState();
  const [seeNewChangesDisabled, setSeeNewChangesDisabled] = useState(false);
  const [apiRequestTimedOut, setApiRequestTimedOut] = useState(false);

  const parsedApiReqInfo = useMemo(() => {
    if (message.text != null && message.say === "api_req_started") {
      const info = safeParseJSON<ValorIDEApiReqInfo>(message.text);
      if (!info) return undefined;
      const toNumber = (value: unknown) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
      };
      return {
        ...info,
        tokensIn: toNumber(info.tokensIn),
        tokensOut: toNumber(info.tokensOut),
        cacheWrites: toNumber(info.cacheWrites),
        cacheReads: toNumber(info.cacheReads),
        cost: toNumber(info.cost),
      };
    }
    return undefined;
  }, [message.say, message.text]);

  const [cost, apiReqCancelReason, apiReqStreamingFailedMessage] =
    useMemo(
      () => [
        parsedApiReqInfo?.cost,
        parsedApiReqInfo?.cancelReason,
        parsedApiReqInfo?.streamingFailedMessage,
      ],
      [parsedApiReqInfo],
    );

  const apiRequestUsageAvailable = useMemo(() => {
    if (message.say !== "api_req_started" || !parsedApiReqInfo) {
      return false;
    }
    return (
      typeof parsedApiReqInfo.cost === "number" ||
      typeof parsedApiReqInfo.tokensIn === "number" ||
      typeof parsedApiReqInfo.tokensOut === "number" ||
      typeof parsedApiReqInfo.cacheWrites === "number" ||
      typeof parsedApiReqInfo.cacheReads === "number"
    );
  }, [message.say, parsedApiReqInfo]);

  // when resuming task last won't be api_req_failed but a resume_task message so api_req_started will show loading spinner. that's why we just remove the last api_req_started that failed without streaming anything
  const apiRequestFailedMessage =
    isLast && lastModifiedMessage?.ask === "api_req_failed" // if request is retried then the latest message is a api_req_retried
      ? lastModifiedMessage?.text
      : undefined;

  const isTaskCompletionMessage =
    (lastModifiedMessage?.ask === "completion_result" ||
      lastModifiedMessage?.say === "completion_result") &&
    !lastModifiedMessage?.partial;

  const isCommandMessage =
    lastModifiedMessage?.ask === "command" ||
    lastModifiedMessage?.say === "command" ||
    lastModifiedMessage?.ask === "command_output" ||
    lastModifiedMessage?.say === "command_output";

  const isCommandExecuting =
    isLast &&
    isCommandMessage &&
    (lastModifiedMessage?.partial ||
      !lastModifiedMessage?.text?.includes(COMMAND_OUTPUT_STRING));

  const isMcpServerResponding =
    isLast && lastModifiedMessage?.say === "mcp_server_request_started";

  const type = message.type === "ask" ? message.ask : message.say;
  const commandDetails = useMemo(() => {
    if (
      message.ask === "command" ||
      message.say === "command" ||
      message.ask === "command_output" ||
      message.say === "command_output"
    ) {
      return parseCommandMessage(message.text || "");
    }
    return undefined;
  }, [message.ask, message.say, message.text]);
  const rawCommand = commandDetails?.rawCommand ?? "";
  const hadCommandDelimiter = commandDetails?.hadDelimiter ?? false;
  const commandOutput = commandDetails?.output ?? "";
  const isCommandOutputMessage =
    message.ask === "command_output" || message.say === "command_output";
  const isOutputOnly = isCommandOutputMessage && !hadCommandDelimiter;
  const requestsApproval = rawCommand.endsWith(COMMAND_REQ_APP_STRING);
  const command = requestsApproval
    ? rawCommand.slice(0, -COMMAND_REQ_APP_STRING.length)
    : rawCommand;
  const commandHeaderSuffix =
    !isOutputOnly && command ? ` ${command}` : "";
  const apiRequestTimeoutMessage = apiRequestTimedOut
    ? "API request timed out waiting for usage details."
    : undefined;
  const confidenceSeverity = useMemo<"info" | "warning">(
    () => (taskConfidence === "warning" ? "warning" : "info"),
    [taskConfidence],
  );
  const apiRequestSeverity = useMemo<"info" | "warning" | "error">(() => {
    let base: "info" | "warning" | "error" = "info";
    if (
      apiReqStreamingFailedMessage ||
      apiRequestFailedMessage ||
      apiRequestTimedOut
    ) {
      base = "error";
    } else if (apiReqCancelReason) {
      base = "warning";
    }
    return mergeSeverity(base, confidenceSeverity);
  }, [
    apiReqCancelReason,
    apiReqStreamingFailedMessage,
    apiRequestFailedMessage,
    apiRequestTimedOut,
    confidenceSeverity,
  ]);

  const normalColor = "var(--vscode-foreground)";
  const errorColor = "var(--vscode-errorForeground)";
  const successColor = "var(--vscode-charts-green)";
  const cancelledColor = "var(--vscode-descriptionForeground)";
  const reasoningSeverity = useMemo<"info" | "warning" | "error">(() => {
    let base: "info" | "warning" | "error" = "info";
    if (
      apiReqStreamingFailedMessage ||
      apiRequestFailedMessage ||
      apiRequestTimedOut
    ) {
      base = "error";
    } else if (apiReqCancelReason != null || message.partial) {
      base = "warning";
    }
    return mergeSeverity(base, confidenceSeverity);
  }, [
    apiReqCancelReason,
    apiReqStreamingFailedMessage,
    apiRequestFailedMessage,
    apiRequestTimedOut,
    message.partial,
    confidenceSeverity,
  ]);

  const handleMessage = useCallback((event: MessageEvent) => {
    const message: ExtensionMessage = event.data;
    switch (message.type) {
      case "relinquishControl": {
        setSeeNewChangesDisabled(false);
        break;
      }
    }
  }, []);

  useEvent("message", handleMessage);

  useEffect(() => {
    setApiRequestTimedOut(false);

    let timeoutId: number | undefined;
    const shouldTimeout =
      message.say === "api_req_started" &&
      isLast &&
      !isTaskCompletionMessage &&
      !apiRequestUsageAvailable &&
      apiReqCancelReason == null &&
      apiRequestFailedMessage == null &&
      apiReqStreamingFailedMessage == null;

    if (shouldTimeout) {
      timeoutId = window.setTimeout(
        () => setApiRequestTimedOut(true),
        API_REQUEST_TIMEOUT_MS,
      );
    }

    return () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [
    apiReqCancelReason,
    apiReqStreamingFailedMessage,
    apiRequestFailedMessage,
    apiRequestUsageAvailable,
    isTaskCompletionMessage,
    isLast,
    message.say,
    message.text,
  ]);

  const seeNewChangesSinceLastCompletion =
    message.ask === "completion_result" || message.say === "completion_result";

  const handleOpenAllChanges = useCallback(() => {
    if (seeNewChangesDisabled) {
      return null;
    }

    setSeeNewChangesDisabled(true);
    vscode.postMessage({
      type: "taskCompletionViewChanges",
      number: message.ts,
      seeNewChangesSinceLastTaskCompletion: seeNewChangesSinceLastCompletion,
    });
  }, [message.ts, seeNewChangesDisabled, seeNewChangesSinceLastCompletion]);

  const handleOpenFileDiff = useCallback(
    (relativePath: string) => {
      if (seeNewChangesDisabled || !relativePath) {
        return null;
      }

      setSeeNewChangesDisabled(true);
      vscode.postMessage({
        type: "taskCompletionOpenFileDiff",
        number: message.ts,
        relativePath,
        seeNewChangesSinceLastTaskCompletion: seeNewChangesSinceLastCompletion,
      });
    },
    [message.ts, seeNewChangesDisabled, seeNewChangesSinceLastCompletion],
  );

  const [icon, title] = useMemo(() => {
    switch (type) {
      case "error":
        return [
          <FaExclamationCircle
            style={{
              color: errorColor,
              marginBottom: "-1.5px",
            }}
          />,
          <span style={{ color: errorColor, fontWeight: "bold" }}>Error</span>,
        ];
      case "mistake_limit_reached":
        return [
          <FaExclamationCircle
            style={{
              color: errorColor,
              marginBottom: "-1.5px",
            }}
          />,
          <span style={{ color: errorColor, fontWeight: "bold" }}>
            ValorIDE is having trouble...
          </span>,
        ];
      case "auto_approval_max_req_reached":
        return [
          <FaExclamationTriangle
            style={{
              color: errorColor,
              marginBottom: "-1.5px",
            }}
          />,
          <span style={{ color: errorColor, fontWeight: "bold" }}>
            Maximum Requests Reached
          </span>,
        ];
      case "command":
      case "command_output":
        return [
          isCommandExecuting ? (
            <ProgressIndicator color={severityColors.info} />
          ) : (
            <FaTerminal
              style={{
                color: normalColor,
                marginBottom: "-1.5px",
              }}
            />
          ),
          <>
            <span style={{ color: normalColor, fontWeight: "bold" }}>
              ValorIDE executing command:
            </span>
            <p>{commandHeaderSuffix}</p>
          </>,
        ];
      case "use_mcp_server":
        const mcpServerUse =
          safeParseJSON<ValorIDEAskUseMcpServer>(message.text) ||
          ({} as ValorIDEAskUseMcpServer);
        return [
          isMcpServerResponding ? (
            <ProgressIndicator color={severityColors.info} />
          ) : (
            <FaServer
              style={{
                color: normalColor,
                marginBottom: "-1.5px",
              }}
            />
          ),
          <span
            style={{
              color: normalColor,
              fontWeight: "bold",
              wordBreak: "break-word",
            }}
          >
            ValorIDE executing{" "}
            {mcpServerUse.type === "use_mcp_tool"
              ? "use a tool"
              : "access a resource"}{" "}
            on the{" "}
            <code style={{ wordBreak: "break-all" }}>
              {getMcpServerDisplayName(
                mcpServerUse.serverName,
                mcpMarketplaceCatalog,
              )}
            </code>{" "}
            MCP server:
          </span>,
        ];
      case "completion_result":
        return [
          <FaCheck
            style={{
              color: successColor,
              marginBottom: "-1.5px",
            }}
          />,
          <span style={{ color: successColor, fontWeight: "bold" }}>
            Task Completed
          </span>,
        ];
      case "api_req_started":
        const getIconSpan = (
          IconComponent: React.ComponentType<any>,
          color: string,
        ) => (
          <div
            style={{
              width: 16,
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconComponent
              style={{
                color,
                fontSize: 16,
                marginBottom: "-1.5px",
              }}
            />
          </div>
        );
        const apiReqInfo = parsedApiReqInfo;
        const apiRequestFinished =
          isTaskCompletionMessage ||
          !isLast ||
          apiRequestUsageAvailable ||
          apiReqCancelReason != null ||
          apiRequestFailedMessage != null ||
          apiReqStreamingFailedMessage != null ||
          apiRequestTimedOut;
        const apiRequestErrored =
          apiReqCancelReason != null ||
          apiRequestFailedMessage != null ||
          apiReqStreamingFailedMessage != null ||
          apiRequestTimedOut;
        return [
          apiReqCancelReason != null ? (
            apiReqCancelReason === "user_cancelled" ? (
              getIconSpan(VscError, cancelledColor)
            ) : (
              getIconSpan(VscError, errorColor)
            )
          ) : apiRequestErrored ? (
            getIconSpan(VscError, errorColor)
          ) : apiRequestFinished ? (
            getIconSpan(VscCheck, successColor)
          ) : (
            <ProgressIndicator color={severityColors[apiRequestSeverity]} />
          ),
          (() => {
            if (apiReqCancelReason != null) {
              return apiReqCancelReason === "user_cancelled" ? (
                <span style={{ color: normalColor, fontWeight: "bold" }}>
                  API Request Cancelled
                </span>
              ) : (
                <span style={{ color: errorColor, fontWeight: "bold" }}>
                  API Streaming Failed
                </span>
              );
            }

            if (
              apiReqStreamingFailedMessage ||
              apiRequestFailedMessage ||
              apiRequestTimedOut
            ) {
              return (
                <span style={{ color: errorColor, fontWeight: "bold" }}>
                  API Request Failed
                </span>
              );
            }

            if (apiRequestUsageAvailable || cost != null || isTaskCompletionMessage) {
              return (
                <span style={{ color: normalColor, fontWeight: "bold" }}>
                  API Request
                </span>
              );
            }

            return (
              <span style={{ color: normalColor, fontWeight: "bold" }}>
                API Request...
              </span>
            );
          })(),
        ];
      case "followup":
        return [
          <FaQuestion
            style={{
              color: normalColor,
              marginBottom: "-1.5px",
            }}
          />,
          <span style={{ color: normalColor, fontWeight: "bold" }}>
            ValorIDE has a question:
          </span>,
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
    apiReqStreamingFailedMessage,
    isMcpServerResponding,
    apiRequestUsageAvailable,
    apiRequestTimedOut,
    isTaskCompletionMessage,
    message.text,
  ]);

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  };

  const pStyle: React.CSSProperties = {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  };

  const tool = useMemo(() => {
    if (message.ask === "tool" || message.say === "tool") {
      const t = safeParseJSON<ValorIDESayTool>(message.text);
      return t ?? null;
    }
    return null;
  }, [message.ask, message.say, message.text]);

  if (tool) {
    const colorMap = {
      red: "var(--vscode-errorForeground)",
      yellow: "var(--vscode-editorWarning-foreground)",
      green: "var(--vscode-charts-green)",
    };
    const toolIcon = (
      IconComponent: React.ComponentType<any>,
      color?: string,
      rotation?: number,
      title?: string,
    ) => (
      <IconComponent
        style={{
          color: color
            ? colorMap[color as keyof typeof colorMap] || color
            : "var(--vscode-foreground)",
          marginBottom: "-1.5px",
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
        }}
        title={title}
      />
    );

    switch (tool.tool) {
      case "editedExistingFile":
        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaEdit)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This file is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>ValorIDE editing:</span>
            </div>
            <CodeAccordian
              // isLoading={message.partial}
              code={tool.content}
              path={tool.path!}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </>
        );
      case "newFileCreated":
        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaPlus)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This file is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>
                ValorIDE creating a new file:
              </span>
            </div>
            <CodeAccordian
              isLoading={message.partial}
              code={tool.content!}
              path={tool.path!}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </>
        );
      case "precisionSearchAndReplace": {
        let prettyContent = tool.content ?? "{}";
        let parsedContent: any;

        try {
          parsedContent = tool.content
            ? safeParseJSON<Record<string, any>>(tool.content)
            : undefined;
          if (parsedContent) {
            prettyContent = JSON.stringify(parsedContent, null, 2);
          }
        } catch (error) {
          // If parsing fails, fall back to raw content
        }

        const formatSnippet = (value: unknown, maxLength = 64) => {
          if (typeof value !== "string") {
            return "";
          }
          const normalized = value.replace(/\s+/g, " ").trim();
          if (!normalized) {
            return "";
          }
          if (normalized.length <= maxLength) {
            return normalized;
          }
          return `${normalized.slice(0, maxLength - 3)}...`;
        };

        const formatPair = (fromValue: unknown, toValue: unknown) => {
          const from = formatSnippet(fromValue);
          const to = formatSnippet(toValue);
          if (from && to) {
            return `"${from}" -> "${to}"`;
          }
          if (from) {
            return `"${from}"`;
          }
          if (to) {
            return `"${to}"`;
          }
          return "";
        };

        const formatEditDetail = (edit: Record<string, any>) => {
          const kind =
            typeof edit?.kind === "string" ? edit.kind : "contextual";
          if (kind === "contextual") {
            const occurrence =
              edit.occurrence !== undefined
                ? ` (occurrence: ${edit.occurrence})`
                : "";
            const pair = formatPair(edit.find, edit.replace);
            return pair ? `contextual${occurrence}: ${pair}` : `contextual${occurrence}`;
          }
          if (kind === "ts-ast") {
            const intent =
              typeof edit.intent === "string" ? edit.intent : "edit";
            if (intent === "insertOptionalChaining") {
              const target = formatSnippet(edit.target);
              return target
                ? `ts-ast ${intent}: "${target}"`
                : `ts-ast ${intent}`;
            }
            const pair = formatPair(edit.from, edit.to);
            const fallback = formatSnippet(edit.fallback);
            const fallbackLabel = fallback ? ` (fallback: "${fallback}")` : "";
            return pair
              ? `ts-ast ${intent}: ${pair}${fallbackLabel}`
              : `ts-ast ${intent}`;
          }
          if (kind === "byte") {
            const pair = formatPair(edit.findHex, edit.replaceHex);
            return pair ? `byte: ${pair}` : "byte";
          }
          return typeof kind === "string" ? kind : "edit";
        };

        let editSummary: string | undefined;
        let editDetails: string[] = [];
        if (
          Array.isArray(parsedContent?.edits) &&
          parsedContent.edits.length > 0
        ) {
          const counts = parsedContent.edits.reduce(
            (acc: Record<string, number>, edit: { kind?: string }) => {
              const kind =
                typeof edit?.kind === "string" ? edit.kind : "contextual";
              acc[kind] = (acc[kind] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          editSummary = Object.entries(counts)
            .map(([kind, count]) => `${kind}×${count}`)
            .join(", ");
          editDetails = parsedContent.edits
            .map((edit: Record<string, any>) => formatEditDetail(edit))
            .filter((detail: string) => detail.length > 0);
        }

        const summaryParts: string[] = [];
        if (tool.path) {
          summaryParts.push(`File: ${tool.path}`);
        }
        if (editSummary) {
          summaryParts.push(`Edits: ${editSummary}`);
        }
        if (
          parsedContent?.options &&
          Object.keys(parsedContent.options).length > 0
        ) {
          summaryParts.push("Options provided");
        }

        const summary = summaryParts.join(" • ");
        const summaryItems =
          summaryParts.length > 0
            ? summaryParts
            : ["Precision search & replace details"];
        const statusLabel =
          (parsedContent?.result?.status as string | undefined) ??
          (parsedContent?.result?.outcome as string | undefined) ??
          (parsedContent?.result?.success === false
            ? "Failed"
            : parsedContent?.result?.success === true
              ? "Succeeded"
              : undefined) ??
          (message.type === "ask" ? "Pending approval" : "Completed");
        const statusLower = (statusLabel || "").toLowerCase();
        const statusColor = statusLower.includes("fail")
          ? "var(--vscode-errorForeground)"
          : "var(--vscode-charts-green)";
        const statusBg = statusLower.includes("fail")
          ? "color-mix(in srgb, var(--vscode-errorForeground) 10%, transparent)"
          : "color-mix(in srgb, var(--vscode-charts-green) 10%, transparent)";
        const titleText =
          message.type === "ask"
            ? "ValorIDE wants to run precision search & replace on this file:"
            : "ValorIDE ran precision search & replace on this file:";

        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaMagic)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This file is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>{titleText}</span>
            </div>
            {(summary || statusLabel) && (
              <div
                onClick={onToggleExpand}
                role="button"
                style={{
                  marginBottom: "8px",
                  fontSize: "12px",
                  color: "var(--vscode-descriptionForeground)",
                  border: "1px solid var(--vscode-editorWidget-border)",
                  borderRadius: 6,
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background:
                    "var(--vscode-editorWidget-background, var(--vscode-editor-background))",
                }}
              >
                {statusLabel && (
                  <span
                    style={{
                      padding: "4px 8px",
                      borderRadius: 999,
                      background: statusBg,
                      color: statusColor,
                      fontWeight: 600,
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {statusLabel}
                  </span>
                )}
                <span style={{ flex: 1 }}>
                  {summaryItems.map((part, index) => (
                    <React.Fragment key={`${part}-${index}`}>
                      {index > 0 && " • "}
                      <span>{part}</span>
                    </React.Fragment>
                  ))}
                  <span
                    style={{
                      marginLeft: 8,
                      color: "var(--vscode-textLink-foreground)",
                      fontWeight: 600,
                    }}
                  >
                    {isExpanded ? "Tap to collapse" : "Tap to open"}
                  </span>
                  {isExpanded && editDetails.length > 0 && (
                    <span
                      style={{
                        display: "block",
                        marginTop: 6,
                        fontSize: "11px",
                        color: "var(--vscode-descriptionForeground)",
                      }}
                    >
                      {editDetails.map((detail, index) => (
                        <span
                          key={`${detail}-${index}`}
                          style={{
                            display: "block",
                            marginTop: index === 0 ? 0 : 4,
                          }}
                        >
                          {detail}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                {isExpanded ? (
                  <FaChevronDown size={12} />
                ) : (
                  <FaChevronRight size={12} />
                )}
              </div>
            )}
            <CodeAccordian
              code={prettyContent}
              path={tool.path ?? ""}
              language="json"
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </>
        );
      }
      case "readFile":
        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaFileCode)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This file is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>
                ValorIDE reading this file:
              </span>
            </div>
            <div
              style={{
                borderRadius: 3,
                backgroundColor: CODE_BLOCK_BG_COLOR,
                overflow: "hidden",
                border: "1px solid var(--vscode-editorGroup-border)",
              }}
            >
              <div
                style={{
                  color: "var(--vscode-descriptionForeground)",
                  display: "flex",
                  alignItems: "center",
                  padding: "9px 10px",
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                }}
                onClick={() => {
                  FileServiceClient.openFile({ value: tool.content }).catch(
                    (err) => console.error("Failed to open file:", err),
                  );
                }}
              >
                {tool.path?.startsWith(".") && <span>.</span>}
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginRight: "8px",
                    direction: "rtl",
                    textAlign: "left",
                  }}
                >
                  {cleanPathPrefix(tool.path ?? "") + "\u200E"}
                </span>
                <div style={{ flexGrow: 1 }}></div>
                <FaExternalLinkAlt
                  style={{
                    fontSize: 13.5,
                    margin: "1px 0",
                  }}
                />
              </div>
            </div>
          </>
        );
      case "listFilesTopLevel":
        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaFolderOpen)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>
                {message.type === "ask"
                  ? "ValorIDE wants to view the top level files in this directory:"
                  : "ValorIDE viewed the top level files in this directory:"}
              </span>
            </div>
            <CodeAccordian
              code={tool.content!}
              path={tool.path!}
              language="shell-session"
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </>
        );
      case "listFilesRecursive":
        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaFolderOpen)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>
                {message.type === "ask"
                  ? "ValorIDE wants to recursively view all files in this directory:"
                  : "ValorIDE recursively viewed all files in this directory:"}
              </span>
            </div>
            <CodeAccordian
              code={tool.content!}
              path={tool.path!}
              language="shell-session"
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </>
        );
      case "listCodeDefinitionNames":
        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaFileCode)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>
                {message.type === "ask"
                  ? "ValorIDE wants to view source code definition names used in this directory:"
                  : "ValorIDE viewed source code definition names used in this directory:"}
              </span>
            </div>
            <CodeAccordian
              code={tool.content!}
              path={tool.path!}
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </>
        );
      case "searchFiles":
        return (
          <>
            <div style={headerStyle}>
              {toolIcon(FaSearch)}
              {tool.operationIsLocatedInWorkspace === false &&
                toolIcon(
                  FaSignOutAlt,
                  "yellow",
                  -90,
                  "This is outside of your workspace",
                )}
              <span style={{ fontWeight: "bold" }}>
                ValorIDE searching this directory for <code>{tool.regex}</code>:
              </span>
            </div>
            <CodeAccordian
              code={tool.content!}
              path={
                tool.path! + (tool.filePattern ? `/(${tool.filePattern})` : "")
              }
              language="plaintext"
              isExpanded={isExpanded}
              onToggleExpand={onToggleExpand}
            />
          </>
        );
      default:
        return null;
    }
  }

  if (
    message.ask === "command" ||
    message.say === "command" ||
    message.ask === "command_output" ||
    message.say === "command_output"
  ) {
    const resolvedOutput =
      isOutputOnly && command.length > 0 ? command : commandOutput;
    const normalizedOutput = resolvedOutput || "";
    const hasOutputContent = normalizedOutput.trim().length > 0;
    const outputPreview = (() => {
      const condensed = normalizedOutput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .slice(0, 2)
        .join(" · ");
      if (!condensed) return "";
      return condensed.length > 140
        ? `${condensed.slice(0, 137)}...`
        : condensed;
    })();
    const outputBody = hasOutputContent
      ? normalizedOutput
      : "[no command output captured yet]";
    const shouldRenderOutputSection =
      message.ask === "command" ||
      message.say === "command" ||
      hadCommandDelimiter ||
      isOutputOnly ||
      hasOutputContent;

    return (
      <>
        <div style={headerStyle}>
          {icon}
          {title}
        </div>
        <div
          style={{
            borderRadius: 3,
            border: "1px solid var(--vscode-editorGroup-border)",
            overflow: "hidden",
            backgroundColor: CODE_BLOCK_BG_COLOR,
          }}
        >
          <CodeBlock
            source={`${"```"}shell\n${command}\n${"```"}`}
            forceWrap={true}
          />
          {shouldRenderOutputSection && (
            <div style={{ width: "100%" }}>
              <div
                onClick={onToggleExpand}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  width: "100%",
                  justifyContent: "flex-start",
                  cursor: "pointer",
                  padding: `2px 8px ${isExpanded ? 0 : 8}px 8px`,
                }}
              >
                {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                <span
                  style={{
                    fontSize: "0.8em",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    {isOutputOnly ? "Command Output" : "Command Output"}
                  </span>
                  {!isExpanded && (
                    <span
                      style={{
                        color: "var(--vscode-descriptionForeground)",
                        fontSize: "0.8em",
                      }}
                    >
                      {outputPreview || "No output yet"}
                    </span>
                  )}
                </span>
              </div>
              {isExpanded && (
                <CodeBlock source={`${"```"}shell\n${outputBody}\n${"```"}`} />
              )}
            </div>
          )}
        </div>
        {requestsApproval && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 8,
              fontSize: "12px",
              color: "var(--vscode-editorWarning-foreground)",
            }}
          >
            <FaWarning />
            <span>
              The model has determined this command requires explicit approval.
            </span>
          </div>
        )}
      </>
    );
  }

  if (message.ask === "use_mcp_server" || message.say === "use_mcp_server") {
    const useMcpServer =
      safeParseJSON<ValorIDEAskUseMcpServer>(message.text) ||
      ({} as ValorIDEAskUseMcpServer);
    const server = mcpServers.find(
      (server) => server.name === useMcpServer.serverName,
    );
    return (
      <>
        <div style={headerStyle}>
          {icon}
          {title}
        </div>

        <div
          style={{
            background: "var(--vscode-textCodeBlock-background)",
            borderRadius: "3px",
            padding: "8px 10px",
            marginTop: "8px",
          }}
        >
          {useMcpServer.type === "access_mcp_resource" && (
            <McpResourceRow
              item={{
                ...(findMatchingResourceOrTemplate(
                  useMcpServer.uri || "",
                  server?.resources,
                  server?.resourceTemplates,
                ) || {
                  name: "",
                  mimeType: "",
                  description: "",
                }),
                uri: useMcpServer.uri || "",
              }}
            />
          )}

          {useMcpServer.type === "use_mcp_tool" && (
            <>
              <div onClick={(e) => e.stopPropagation()}>
                <McpToolRow
                  tool={{
                    name: useMcpServer.toolName || "",
                    description:
                      server?.tools?.find(
                        (tool) => tool.name === useMcpServer.toolName,
                      )?.description || "",
                    autoApprove:
                      server?.tools?.find(
                        (tool) => tool.name === useMcpServer.toolName,
                      )?.autoApprove || false,
                  }}
                  serverName={useMcpServer.serverName}
                />
              </div>
              {useMcpServer.arguments && useMcpServer.arguments !== "{}" && (
                <div style={{ marginTop: "8px" }}>
                  <div
                    style={{
                      marginBottom: "4px",
                      opacity: 0.8,
                      fontSize: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    Arguments
                  </div>
                  <CodeAccordian
                    code={useMcpServer.arguments}
                    language="json"
                    isExpanded={true}
                    onToggleExpand={onToggleExpand}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  switch (message.type) {
    case "say":
      switch (message.say) {
        case "api_req_started":
          // Parse API request info for rendering details (safeParseJSON returns undefined on bad data)
          const apiReqInfo = parsedApiReqInfo;
          const errorTextToShow =
            apiRequestFailedMessage ||
            apiReqStreamingFailedMessage ||
            apiRequestTimeoutMessage;
          const shouldShowApiError =
            (cost == null &&
              (apiRequestFailedMessage || apiRequestTimeoutMessage)) ||
            apiReqStreamingFailedMessage;
          return (
            <>
              <div
                style={{
                  ...headerStyle,
                  marginBottom: shouldShowApiError ? 10 : 0,
                  justifyContent: "space-between",
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                  MozUserSelect: "none",
                  msUserSelect: "none",
                }}
                onClick={onToggleExpand}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {icon}
                  {title}
                  {/* Need to render this every time since it affects height of row by 2px */}
                  <VSCodeBadge
                    style={{
                      opacity: cost != null && cost > 0 ? 1 : 0,
                    }}
                  >
                    ${Number(cost || 0)?.toFixed(4)}
                  </VSCodeBadge>
                </div>
                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
              </div>
              {shouldShowApiError && (
                <>
                  {(() => {
                    // Try to parse the error message as JSON for credit limit error
                    const errorData =
                      apiRequestTimeoutMessage == null
                        ? parseErrorText(apiRequestFailedMessage)
                        : null;
                    if (errorData) {
                      if (
                        errorData.code === "insufficient_credits" &&
                        typeof errorData.current_balance === "number" &&
                        typeof errorData.total_spent === "number" &&
                        typeof errorData.total_promotions === "number" &&
                        typeof errorData.message === "string"
                      ) {
                        return (
                          <CreditLimitError
                            currentBalance={errorData.current_balance}
                            totalSpent={errorData.total_spent}
                            totalPromotions={errorData.total_promotions}
                            message={errorData.message}
                          />
                        );
                      }
                    }

                    // Default error display
                    return (
                      <p
                        style={{
                          ...pStyle,
                          color: "var(--vscode-errorForeground)",
                        }}
                      >
                        {errorTextToShow}
                        {apiRequestFailedMessage
                          ?.toLowerCase()
                          .includes("powershell") && (
                            <>
                              <br />
                              <br />
                              It seems like you're having Windows PowerShell
                              issues, please see this{" "}
                              <a
                                href="https://github.com/valkyrlabs/valoride/wiki/TroubleShooting-%E2%80%90-%22PowerShell-is-not-recognized-as-an-internal-or-external-command%22"
                                style={{
                                  color: "inherit",
                                  textDecoration: "underline",
                                }}
                              >
                                troubleshooting guide
                              </a>
                              .
                            </>
                          )}
                      </p>
                    );
                  })()}
                </>
              )}

              {isExpanded && (
                <div style={{ marginTop: "10px", display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <CodeAccordian
                      code={
                        (apiReqInfo?.request as string) ||
                        "Request details unavailable."
                      }
                      language="markdown"
                      isExpanded={true}
                      onToggleExpand={onToggleExpand}
                    />
                  </div>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>
                      Usage
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                      <div>In: {apiReqInfo?.tokensIn ?? 0} tokens</div>
                      <div>Out: {apiReqInfo?.tokensOut ?? 0} tokens</div>
                      <div>Cache writes: {apiReqInfo?.cacheWrites ?? 0}</div>
                      <div>Cache reads: {apiReqInfo?.cacheReads ?? 0}</div>
                      <div>
                        Cost:{" "}
                        {cost != null
                          ? `$${cost.toFixed(4)}`
                          : apiReqInfo?.cost != null
                            ? `$${apiReqInfo.cost.toFixed(4)}`
                            : "—"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        case "api_req_finished":
          return null; // we should never see this message type
        case "mcp_server_response":
          return <McpResponseDisplay responseText={message.text || ""} />;
        case "text":
          return (
            <div>
              <Markdown markdown={message.text} />
            </div>
          );
        case "reasoning":
          if (!message.text) {
            return null;
          }
          return (
            <div
              onClick={onToggleExpand}
              style={{
                cursor: "pointer",
                background:
                  "color-mix(in srgb, var(--vscode-editorWidget-background) 75%, transparent)",
                border:
                  "1px solid var(--vscode-editorWidget-border, rgba(255, 255, 255, 0.08))",
                borderRadius: 8,
                padding: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: isExpanded ? 6 : 2,
                  color: "var(--vscode-foreground)",
                }}
              >
                <FaBrain
                  data-testid="reasoning-icon"
                  color={reasoningSeverity ? severityColors[reasoningSeverity] : undefined}
                />
                <span style={{ fontWeight: 700, fontSize: 12 }}>
                  {message.partial ? "Thinking..." : "Thoughts"}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: "var(--vscode-descriptionForeground)",
                  }}
                >
                  {isExpanded ? "Collapse" : "Tap to expand"}
                </span>
              </div>
              {isExpanded ? (
                <div
                  style={{
                    fontStyle: "italic",
                    lineHeight: 1.5,
                    color: "var(--vscode-foreground)",
                  }}
                >
                  {message.text}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: "var(--vscode-descriptionForeground)",
                    fontStyle: "italic",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      direction: "rtl",
                      textAlign: "left",
                      flex: 1,
                    }}
                  >
                    {message.text + "\u200E"}
                  </span>
                  <FaArrowRight />
                </div>
              )}
            </div>
          );
        case "user_feedback":
          return (
            <UserMessage
              text={message.text}
              images={message.images}
              messageTs={message.ts}
              sendMessageFromChatRow={sendMessageFromChatRow}
            />
          );
        case "user_feedback_diff": {
          const feedbackTool = safeParseJSON<ValorIDESayTool>(message.text);

          if (!feedbackTool || !feedbackTool.diff) return null;

          return (
            <div
              style={{
                marginTop: -10,
                width: "100%",
              }}
            >
              <CodeAccordian
                diff={feedbackTool.diff}
                isFeedback={true}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
              />
            </div>
          );
        }
        case "error":
          return (
            <>
              {title && (
                <div style={headerStyle}>
                  {icon}
                  {title}
                </div>
              )}
              <p
                style={{
                  ...pStyle,
                  color: "var(--vscode-errorForeground)",
                }}
              >
                {message.text}
              </p>
            </>
          );
        case "diff_error":
          return (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "var(--vscode-textBlockQuote-background)",
                  padding: 8,
                  borderRadius: 3,
                  fontSize: 12,
                  color: "var(--vscode-foreground)",
                  opacity: 0.8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <FaWarning />
                  <span style={{ fontWeight: 500 }}>Diff Edit Mismatch</span>
                </div>
                <div>
                  The model used search patterns that don't match anything in
                  the file. Retrying...
                </div>
              </div>
            </>
          );
        case "valorideignore_error":
          return (
            <>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: "rgba(255, 191, 0, 0.1)",
                  padding: 8,
                  borderRadius: 3,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <FaCarCrash />
                  <span
                    style={{
                      fontWeight: 500,
                      color: "#FFA500",
                    }}
                  >
                    Access Denied
                  </span>
                </div>
                <div>
                  ValorIDE tried to access <code>{message.text}</code> which is
                  blocked by the <code>.valorideignore</code>
                  file.
                </div>
              </div>
            </>
          );
        case "workspace_access_error":
          return (

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(255, 191, 0, 0.1)",
                padding: 8,
                borderRadius: 3,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <FaCarCrash />
                <span
                  style={{
                    fontWeight: 500,
                    color: "#FFA500",
                  }}
                >
                  Outside Workspace
                </span>
              </div>
              <div>
                ValorIDE can only operate inside the opened workspace. The
                file <code>{message.text}</code> lives elsewhere. Open the
                folder that contains it or share the contents manually if it
                should be accessible.
              </div>
            </div>

          );
        case "checkpoint_created":
          return (
            <>
              <CheckmarkControl
                messageTs={message.ts}
                isCheckpointCheckedOut={message.isCheckpointCheckedOut}
              />
            </>
          );
        case "load_mcp_documentation":
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                color: "var(--vscode-foreground)",
                opacity: 0.7,
                fontSize: 12,
                padding: "4px 0",
              }}
            >
              <FaBook />
              Loading MCP documentation
            </div>
          );
        case "completion_result":
          const hasChanges =
            message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false;
          const text = hasChanges
            ? message.text?.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length)
            : message.text;
          // Hide the message text if a generated summary exists and the text is
          // just the initial task prompt. This prevents duplicate rendering of
          // the prompt next to the built summary card while still showing rich
          // completion details when provided.
          const initialPromptText = valorideMessages?.[0]?.text;
          const shouldHideText = Boolean(
            initialPromptText && text?.trim() === initialPromptText.trim(),
          );
          return (
            <>
              <div
                style={{
                  ...headerStyle,
                  marginBottom: "10px",
                }}
              >
                {icon}
                {title}
                <TaskFeedbackButtons
                  messageTs={message.ts}
                  isFromHistory={
                    !isLast ||
                    lastModifiedMessage?.ask === "resume_completed_task" ||
                    lastModifiedMessage?.ask === "resume_task"
                  }
                  style={{
                    marginLeft: "auto",
                  }}
                />
              </div>
              <div
                style={{
                  color: "var(--vscode-charts-green)",
                  paddingTop: 10,
                }}
              >
                {text && !shouldHideText && <Markdown markdown={text} />}
                <CompletionSummaryCard
                  markdown={message.summaryMarkdown}
                  title={message.summaryTitle}
                  completedAt={message.summaryCompletedAt}
                  fallbackMarkdown={(() => {
                    const sections: string[] = [];
                    if (text && !shouldHideText) {
                      sections.push(text.trim());
                    }
                    if (message.changesSummary) {
                      const { totalInsertions, totalDeletions, files = [] } =
                        message.changesSummary;
                      const keyFiles = files
                        .slice(0, 3)
                        .map(
                          (f) =>
                            `- ${f.relativePath} (${f.status.toUpperCase()})`,
                        )
                        .join("\n");
                      sections.push(
                        [
                          "### Changes",
                          `- Files touched: ${files.length}`,
                          `- Insertions/Deletions: +${totalInsertions} / -${totalDeletions}`,
                          keyFiles ? `Key files:\n${keyFiles}` : undefined,
                        ]
                          .filter(Boolean)
                          .join("\n"),
                      );
                    }
                    return sections.filter(Boolean).join("\n\n");
                  })()}
                />
                {message.partial !== true &&
                  hasChanges &&
                  (message.changesSummary ? (
                    <CompletionChangesSummary
                      summary={message.changesSummary}
                      disabled={seeNewChangesDisabled}
                      onOpenAllChanges={handleOpenAllChanges}
                      onOpenFileDiff={handleOpenFileDiff}
                      messageTs={message.ts}
                    />
                  ) : (
                    <div style={{ marginTop: 17 }}>
                      <SuccessButton
                        disabled={seeNewChangesDisabled}
                        onClick={handleOpenAllChanges}
                        style={{
                          cursor: seeNewChangesDisabled ? "wait" : "pointer",
                          width: "100%",
                        }}
                      >
                        <FaFileUpload />
                        See new changes
                      </SuccessButton>
                    </div>
                  ))}
              </div>
            </>
          );
        case "shell_integration_warning":
          return (

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(255, 191, 0, 0.1)",
                padding: 8,
                borderRadius: 3,
                fontSize: 12,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <FaWarning />
                <span
                  style={{
                    fontWeight: 500,
                    color: "#FFA500",
                  }}
                >
                  Shell Integration Unavailable
                </span>
              </div>
              <div>
                ValorIDE won't be able to view the command's output. Please
                update VSCode (<code>CMD/CTRL + Shift + P</code> → "Update")
                and make sure you're using a supported shell: zsh, bash, fish,
                or PowerShell (<code>CMD/CTRL + Shift + P</code> → "Terminal:
                Select Default Profile").{" "}
                <a
                  href="https://valkyrlabs.com/v1/Products/ValorIDE/tools/cline-tools-guide"
                  style={{
                    color: "inherit",
                    textDecoration: "underline",
                  }}
                >
                  Still having trouble?
                </a>
              </div>
            </div>

          );
        default:
          return (
            <>
              {title && (
                <div style={headerStyle}>
                  {icon}
                  {title}
                </div>
              )}
              <div style={{ paddingTop: 10 }}>
                <Markdown markdown={message.text} />
              </div>
            </>
          );
      }
    case "ask":
      switch (message.ask) {
        case "mistake_limit_reached":
          return (
            <>
              <div style={headerStyle}>
                {icon}
                {title}
              </div>
              <p
                style={{
                  ...pStyle,
                  color: "var(--vscode-errorForeground)",
                }}
              >
                {message.text}
              </p>
            </>
          );
        case "auto_approval_max_req_reached":
          return (
            <>
              <div style={headerStyle}>
                {icon}
                {title}
              </div>
              <p
                style={{
                  ...pStyle,
                  color: "var(--vscode-errorForeground)",
                }}
              >
                {message.text}
              </p>
            </>
          );
        case "completion_result": {
          {
            const hasChanges =
              message.text?.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false;
            const text = hasChanges
              ? message.text?.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length)
              : message.text;
            const hasSummary = !!message.summaryMarkdown;
            const initialPromptText = valorideMessages?.[0]?.text;
            const shouldHideText = Boolean(
              text &&
              initialPromptText &&
              text.trim() === initialPromptText.trim(),
            );
            if (!text && !hasSummary && !hasChanges) {
              return null; // nothing to show
            }
            return (
              <div>
                <div
                  style={{
                    ...headerStyle,
                    marginBottom: "10px",
                  }}
                >
                  {icon}
                  {title}
                  <TaskFeedbackButtons
                    messageTs={message.ts}
                    isFromHistory={
                      !isLast ||
                      lastModifiedMessage?.ask === "resume_completed_task" ||
                      lastModifiedMessage?.ask === "resume_task"
                    }
                    style={{
                      marginLeft: "auto",
                    }}
                  />
                </div>
                <div
                  style={{
                    color: "var(--vscode-charts-green)",
                    paddingTop: 10,
                  }}
                >
                  {text && !shouldHideText && <Markdown markdown={text} />}
                  <CompletionSummaryCard
                    markdown={message.summaryMarkdown}
                    title={message.summaryTitle}
                    completedAt={message.summaryCompletedAt}
                    fallbackMarkdown={(() => {
                      const sections: string[] = [];
                      if (text && !shouldHideText) {
                        sections.push(text.trim());
                      }
                      if (message.changesSummary) {
                        const { totalInsertions, totalDeletions, files = [] } =
                          message.changesSummary;
                        const keyFiles = files
                          .slice(0, 3)
                          .map(
                            (f) =>
                              `- ${f.relativePath} (${f.status.toUpperCase()})`,
                          )
                          .join("\n");
                        sections.push(
                          [
                            "### Changes",
                            `- Files touched: ${files.length}`,
                            `- Insertions/Deletions: +${totalInsertions} / -${totalDeletions}`,
                            keyFiles ? `Key files:\n${keyFiles}` : undefined,
                          ]
                            .filter(Boolean)
                            .join("\n"),
                        );
                      }
                      return sections.filter(Boolean).join("\n\n");
                    })()}
                  />
                  {message.partial !== true &&
                    hasChanges &&
                    (message.changesSummary ? (
                      <CompletionChangesSummary
                        summary={message.changesSummary}
                        disabled={seeNewChangesDisabled}
                        onOpenAllChanges={handleOpenAllChanges}
                        onOpenFileDiff={handleOpenFileDiff}
                        messageTs={message.ts}
                      />
                    ) : (
                      <div style={{ marginTop: 15 }}>
                        <SuccessButton
                          appearance="secondary"
                          disabled={seeNewChangesDisabled}
                          onClick={handleOpenAllChanges}
                        >
                          <FaFile />
                          See new changes
                        </SuccessButton>
                      </div>
                    ))}
                </div>
              </div>
            );
          }
        }
        case "followup":
          let question: string | undefined;
          let options: string[] | undefined;
          let selected: string | undefined;
          const parsedMessage = safeParseJSON<ValorIDEAskQuestion>(
            message.text,
          );

          if (parsedMessage) {
            question = parsedMessage.question;
            options = parsedMessage.options;
            selected = parsedMessage.selected;
          } else {
            // legacy messages would pass question directly
            question = message.text;
          }

          return (
            <>
              {title && (
                <div style={headerStyle}>
                  {icon}
                  {title}
                </div>
              )}
              <div style={{ paddingTop: 10 }}>
                <Markdown markdown={question} />
                <OptionsButtons
                  options={options}
                  selected={selected}
                  isActive={isLast && message.ask === "followup"}
                  inputValue={inputValue}
                  onSelectOption={(text) => {
                    if (sendMessageFromChatRow) {
                      sendMessageFromChatRow(text, []);
                    } else if (setInputValue) {
                      setInputValue(text);
                    }
                  }}
                />
              </div>
            </>
          );
        case "new_task":
          return (
            <>
              <div style={headerStyle}>
                <FaFileUpload />
                <span style={{ color: normalColor, fontWeight: "bold" }}>
                  ValorIDE starting a new task:
                </span>
              </div>
              <NewTaskPreview context={message.text || ""} />
            </>
          );
        case "condense":
          return (
            <>
              <div style={headerStyle}>
                <FaFileUpload />
                <span style={{ color: normalColor, fontWeight: "bold" }}>
                  ValorIDE condensing your conversation:
                </span>
              </div>
              <NewTaskPreview context={message.text || ""} />
            </>
          );
        case "plan_mode_respond": {
          let response: string | undefined;
          let options: string[] | undefined;
          let selected: string | undefined;
          const parsedMessage = safeParseJSON<ValorIDEPlanModeResponse>(
            message.text,
          );

          if (parsedMessage) {
            response = parsedMessage.response;
            options = parsedMessage.options;
            selected = parsedMessage.selected;
          } else {
            // legacy messages would pass response directly
            response = message.text;
          }
          return (
            <div style={{}}>
              <Markdown markdown={response} />
              <OptionsButtons
                options={options}
                selected={selected}
                isActive={isLast && message.ask === "plan_mode_respond"}
                inputValue={inputValue}
                onSelectOption={(text) => {
                  if (sendMessageFromChatRow) {
                    sendMessageFromChatRow(text, []);
                  } else if (setInputValue) {
                    setInputValue(text);
                  }
                }}
              />
            </div>
          );
        }
        default:
          return null;
      }
  }
};

/** Safely parse JSON and return a fallback (or undefined) on error. */
function safeParseJSON<T = any>(text?: string, fallback?: T): T | undefined {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    // Avoid noisy errors in production UI but keep a debug line for devs
    // eslint-disable-next-line no-console
    console.debug("safeParseJSON failed to parse text", text);
    return fallback;
  }
}

function parseErrorText(text?: string): Record<string, any> | undefined {
  if (!text) return undefined;
  try {
    const startIndex = text.indexOf("{");
    const endIndex = text.lastIndexOf("}");
    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      return undefined;
    }
    const jsonStr = text.substring(startIndex, endIndex + 1);
    const errorObject = safeParseJSON<Record<string, any>>(jsonStr);
    return typeof errorObject === "object" && errorObject !== null
      ? errorObject
      : undefined;
  } catch {
    return undefined;
  }
}
