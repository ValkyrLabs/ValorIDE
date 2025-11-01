import {
  VSCodeBadge,
  VSCodeProgressRing,
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
  FaFileUpload
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
import { useExtensionState } from "@/context/ExtensionStateContext";
import {
  findMatchingResourceOrTemplate,
  getMcpServerDisplayName,
} from "@/utils/mcp";
import { vscode } from "@/utils/vscode";
import { FileServiceClient } from "@/services/grpc-client";
import { CheckmarkControl } from "@/components/common/CheckmarkControl";
import {
  CheckpointControls,
  CheckpointOverlay,
} from "../common/CheckpointControls";
import CodeAccordian, { cleanPathPrefix } from "../common/CodeAccordian";
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import MarkdownBlock from "@/components/common/MarkdownBlock";
import Thumbnails from "@/components/common/Thumbnails";
import McpToolRow from "@/components/mcp/configuration/tabs/installed/server-row/McpToolRow";
import McpResponseDisplay from "@/components/mcp/chat-display/McpResponseDisplay";
import CreditLimitError from "@/components/chat/CreditLimitError";
import { OptionsButtons } from "@/components/chat/OptionsButtons";
import { highlightText } from "./TaskHeader";
import SuccessButton from "@/components/common/SuccessButton";
import TaskFeedbackButtons from "@/components/chat/TaskFeedbackButtons";
import NewTaskPreview from "./NewTaskPreview";
import McpResourceRow from "@/components/mcp/configuration/tabs/installed/server-row/McpResourceRow";
import UserMessage from "./UserMessage";

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
  color: ${({ status }) => statusColorMap[status] ?? "var(--vscode-foreground)"};
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
}

const CompletionChangesSummary: React.FC<CompletionChangesSummaryProps> = ({
  summary,
  disabled,
  onOpenAllChanges,
  onOpenFileDiff,
}) => {
  if (!summary || summary.totalFiles === 0) {
    return null;
  }

  const totalFilesLabel =
    summary.totalFiles === 1
      ? "1 file"
      : `${summary.totalFiles} files`;

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
            <ChangesSummaryRow
              key={`${file.relativePath}-${index}`}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) {
                  onOpenFileDiff(file.relativePath);
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
                <FaChevronRight size={12} />
              </RowRight>
            </ChangesSummaryRow>
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
}

interface ChatRowContentProps extends Omit<ChatRowProps, "onHeightChange"> { }

export const ProgressIndicator = () => (
  <div
    style={{
      width: "16px",
      height: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div style={{ transform: "scale(0.55)", transformOrigin: "center" }}>
      <VSCodeProgressRing />
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
}: ChatRowContentProps) => {
  const { mcpServers, mcpMarketplaceCatalog } = useExtensionState();
  const [seeNewChangesDisabled, setSeeNewChangesDisabled] = useState(false);

  const [cost, apiReqCancelReason, apiReqStreamingFailedMessage] =
    useMemo(() => {
      if (message.text != null && message.say === "api_req_started") {
        const info: ValorIDEApiReqInfo = JSON.parse(message.text);
        return [info.cost, info.cancelReason, info.streamingFailedMessage];
      }
      return [undefined, undefined, undefined];
    }, [message.text, message.say]);

  // when resuming task last won't be api_req_failed but a resume_task message so api_req_started will show loading spinner. that's why we just remove the last api_req_started that failed without streaming anything
  const apiRequestFailedMessage =
    isLast && lastModifiedMessage?.ask === "api_req_failed" // if request is retried then the latest message is a api_req_retried
      ? lastModifiedMessage?.text
      : undefined;

  const isCommandExecuting =
    isLast &&
    (lastModifiedMessage?.ask === "command" ||
      lastModifiedMessage?.say === "command") &&
    lastModifiedMessage?.text?.includes(COMMAND_OUTPUT_STRING);

  const isMcpServerResponding =
    isLast && lastModifiedMessage?.say === "mcp_server_request_started";

  const type = message.type === "ask" ? message.ask : message.say;

  const normalColor = "var(--vscode-foreground)";
  const errorColor = "var(--vscode-errorForeground)";
  const successColor = "var(--vscode-charts-green)";
  const cancelledColor = "var(--vscode-descriptionForeground)";

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

  const seeNewChangesSinceLastCompletion =
    message.ask === "completion_result" ||
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

  const handleOpenFileDiff = useCallback(
    (relativePath: string) => {
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
    },
    [
      message.ts,
      seeNewChangesDisabled,
      seeNewChangesSinceLastCompletion,
    ],
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
        return [
          isCommandExecuting ? (
            <ProgressIndicator />
          ) : (
            <FaTerminal
              style={{
                color: normalColor,
                marginBottom: "-1.5px",
              }}
            />
          ),
          <span style={{ color: normalColor, fontWeight: "bold" }}>
            ValorIDE executing command:
          </span>,
        ];
      case "use_mcp_server":
        const mcpServerUse = JSON.parse(
          message.text || "{}",
        ) as ValorIDEAskUseMcpServer;
        return [
          isMcpServerResponding ? (
            <ProgressIndicator />
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
        const getIconSpan = (IconComponent: React.ComponentType<any>, color: string) => (
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
        return [
          apiReqCancelReason != null ? (
            apiReqCancelReason === "user_cancelled" ? (
              getIconSpan(VscError, cancelledColor)
            ) : (
              getIconSpan(VscError, errorColor)
            )
          ) : cost != null ? (
            getIconSpan(VscCheck, successColor)
          ) : apiRequestFailedMessage ? (
            getIconSpan(VscError, errorColor)
          ) : (
            <ProgressIndicator />
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

            if (cost != null) {
              return (
                <span style={{ color: normalColor, fontWeight: "bold" }}>
                  API Request
                </span>
              );
            }

            if (apiRequestFailedMessage) {
              return (
                <span style={{ color: errorColor, fontWeight: "bold" }}>
                  API Request Failed
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
    isMcpServerResponding,
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
      try {
        return JSON.parse(message.text || "{}") as ValorIDESayTool;
      } catch (error) {
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
              <span style={{ fontWeight: "bold" }}>
                ValorIDE editing:
              </span>
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
          parsedContent = tool.content ? JSON.parse(tool.content) : undefined;
          if (parsedContent) {
            prettyContent = JSON.stringify(parsedContent, null, 2);
          }
        } catch (error) {
          // If parsing fails, fall back to raw content
        }

        let editSummary: string | undefined;
        if (Array.isArray(parsedContent?.edits) && parsedContent.edits.length > 0) {
          const counts = parsedContent.edits.reduce(
            (acc: Record<string, number>, edit: { kind?: string }) => {
              const kind = typeof edit?.kind === "string" ? edit.kind : "contextual";
              acc[kind] = (acc[kind] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );
          editSummary = Object.entries(counts)
            .map(([kind, count]) => `${kind}×${count}`)
            .join(", ");
        }

        const summaryParts: string[] = [];
        if (editSummary) {
          summaryParts.push(`Edits: ${editSummary}`);
        }
        if (parsedContent?.options && Object.keys(parsedContent.options).length > 0) {
          summaryParts.push("Options provided");
        }

        const summary = summaryParts.join(" • ");
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
            {summary && (
              <div
                style={{
                  marginBottom: "8px",
                  fontSize: "12px",
                  color: "var(--vscode-descriptionForeground)",
                }}
              >
                {summary}
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
                ValorIDE searching this directory for{" "}
                <code>{tool.regex}</code>:
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

  if (message.ask === "command" || message.say === "command") {
    const splitMessage = (text: string) => {
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
          {output.length > 0 && (
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
                <span style={{ fontSize: "0.8em" }}>Command Output</span>
              </div>
              {isExpanded && (
                <CodeBlock source={`${"```"}shell\n${output}\n${"```"}`} />
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
    const useMcpServer = JSON.parse(
      message.text || "{}",
    ) as ValorIDEAskUseMcpServer;
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
          return (
            <>
              <div
                style={{
                  ...headerStyle,
                  marginBottom:
                    (cost == null && apiRequestFailedMessage) ||
                      apiReqStreamingFailedMessage
                      ? 10
                      : 0,
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
              {((cost == null && apiRequestFailedMessage) ||
                apiReqStreamingFailedMessage) && (
                  <>
                    {(() => {
                      // Try to parse the error message as JSON for credit limit error
                      const errorData = parseErrorText(apiRequestFailedMessage);
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
                          {apiRequestFailedMessage ||
                            apiReqStreamingFailedMessage}
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
                <div style={{ marginTop: "10px" }}>
                  <CodeAccordian
                    code={JSON.parse(message.text || "{}").request}
                    language="markdown"
                    isExpanded={true}
                    onToggleExpand={onToggleExpand}
                  />
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
          return (
            <>
              {message.text && (
                <div
                  onClick={onToggleExpand}
                  style={{
                    // marginBottom: 15,
                    cursor: "pointer",
                    color: "var(--vscode-descriptionForeground)",

                    fontStyle: "italic",
                    overflow: "hidden",
                  }}
                >
                  {isExpanded ? (
                    <div style={{ marginTop: -3 }}>
                      <span
                        style={{
                          fontWeight: "bold",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        <FaBrain className="chatTextArea" color="red" size={32} /> Thinking
                      </span>
                      {message.text}
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span style={{ fontWeight: "bold", marginRight: "4px" }}>
                        Thinking:
                      </span>
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
              )}
            </>
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
        case "user_feedback_diff":
          const tool = JSON.parse(message.text || "{}") as ValorIDESayTool;
          return (
            <div
              style={{
                marginTop: -10,
                width: "100%",
              }}
            >
              <CodeAccordian
                diff={tool.diff!}
                isFeedback={true}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
              />
            </div>
          );
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
                <Markdown markdown={text} />
                {message.partial !== true &&
                  hasChanges &&
                  (message.changesSummary ? (
                    <CompletionChangesSummary
                      summary={message.changesSummary}
                      disabled={seeNewChangesDisabled}
                      onOpenAllChanges={handleOpenAllChanges}
                      onOpenFileDiff={handleOpenFileDiff}
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
                    href="https://github.com/valkyrlabs/valoride/wiki/Troubleshooting-%E2%80%90-Shell-Integration-Unavailable"
                    style={{
                      color: "inherit",
                      textDecoration: "underline",
                    }}
                  >
                    Still having trouble?
                  </a>
                </div>
              </div>
            </>
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
        case "completion_result":
          if (message.text) {
            const hasChanges =
              message.text.endsWith(COMPLETION_RESULT_CHANGES_FLAG) ?? false;
            const text = hasChanges
              ? message.text.slice(0, -COMPLETION_RESULT_CHANGES_FLAG.length)
              : message.text;
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
                  <Markdown markdown={text} />
                  {message.partial !== true &&
                    hasChanges &&
                    (message.changesSummary ? (
                      <CompletionChangesSummary
                        summary={message.changesSummary}
                        disabled={seeNewChangesDisabled}
                        onOpenAllChanges={handleOpenAllChanges}
                        onOpenFileDiff={handleOpenFileDiff}
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
          } else {
            return null; // Don't render anything when we get a completion_result ask without text
          }
        case "followup":
          let question: string | undefined;
          let options: string[] | undefined;
          let selected: string | undefined;
          try {
            const parsedMessage = JSON.parse(
              message.text || "{}",
            ) as ValorIDEAskQuestion;
            question = parsedMessage.question;
            options = parsedMessage.options;
            selected = parsedMessage.selected;
          } catch (e) {
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
                  onSelectOption={setInputValue}
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
          try {
            const parsedMessage = JSON.parse(
              message.text || "{}",
            ) as ValorIDEPlanModeResponse;
            response = parsedMessage.response;
            options = parsedMessage.options;
            selected = parsedMessage.selected;
          } catch (e) {
            // legacy messages would pass response directly
            response = message.text;
          }
          return (
            <div style={{}}>
              <Markdown markdown={response} />
              <OptionsButtons
                options={options}
                selected={selected}
                isActive={
                  isLast && message.ask === "plan_mode_respond"
                }
                inputValue={inputValue}
                onSelectOption={setInputValue}
              />
            </div>
          );
        }
        default:
          return null;
      }
  }
};

function parseErrorText(text: string | undefined) {
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
  } catch (e) {
    // Not JSON or missing required fields
  }
}
