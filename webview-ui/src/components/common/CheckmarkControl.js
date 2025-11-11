import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, useState, useEffect } from "react";
import { useEvent } from "react-use";
import styled from "styled-components";
import { CheckpointsServiceClient } from "@/services/grpc-client";
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { createPortal } from "react-dom";
import { useFloating, offset, flip, shift } from "@floating-ui/react";
import { FaBookmark } from "react-icons/fa";
export const CheckmarkControl = ({ messageTs, isCheckpointCheckedOut, }) => {
    const [compareDisabled, setCompareDisabled] = useState(false);
    const [restoreTaskDisabled, setRestoreTaskDisabled] = useState(false);
    const [restoreWorkspaceDisabled, setRestoreWorkspaceDisabled] = useState(false);
    const [restoreBothDisabled, setRestoreBothDisabled] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [hasMouseEntered, setHasMouseEntered] = useState(false);
    const containerRef = useRef(null);
    const tooltipRef = useRef(null);
    const { refs, floatingStyles, update, placement } = useFloating({
        placement: "bottom-end",
        middleware: [
            offset({
                mainAxis: 8,
                crossAxis: 10,
            }),
            flip(),
            shift(),
        ],
    });
    useEffect(() => {
        const handleScroll = () => {
            update();
        };
        window.addEventListener("scroll", handleScroll, true);
        return () => window.removeEventListener("scroll", handleScroll, true);
    }, [update]);
    useEffect(() => {
        if (showRestoreConfirm) {
            update();
        }
    }, [showRestoreConfirm, update]);
    const handleMessage = useCallback((event) => {
        if (event.data.type === "relinquishControl") {
            setCompareDisabled(false);
            setRestoreTaskDisabled(false);
            setRestoreWorkspaceDisabled(false);
            setRestoreBothDisabled(false);
            setShowRestoreConfirm(false);
        }
    }, []);
    const handleRestoreTask = async () => {
        setRestoreTaskDisabled(true);
        try {
            const restoreType = "task";
            await CheckpointsServiceClient.checkpointRestore({
                number: messageTs,
                restoreType,
            });
        }
        catch (err) {
            console.error("Checkpoint restore task error:", err);
            setRestoreTaskDisabled(false);
        }
    };
    const handleRestoreWorkspace = async () => {
        setRestoreWorkspaceDisabled(true);
        try {
            const restoreType = "workspace";
            await CheckpointsServiceClient.checkpointRestore({
                number: messageTs,
                restoreType,
            });
        }
        catch (err) {
            console.error("Checkpoint restore workspace error:", err);
            setRestoreWorkspaceDisabled(false);
        }
    };
    const handleRestoreBoth = async () => {
        setRestoreBothDisabled(true);
        try {
            const restoreType = "taskAndWorkspace";
            await CheckpointsServiceClient.checkpointRestore({
                number: messageTs,
                restoreType,
            });
        }
        catch (err) {
            console.error("Checkpoint restore both error:", err);
            setRestoreBothDisabled(false);
        }
    };
    const handleMouseEnter = () => {
        setHasMouseEntered(true);
    };
    const handleMouseLeave = () => {
        if (hasMouseEntered) {
            setShowRestoreConfirm(false);
            setHasMouseEntered(false);
        }
    };
    const handleControlsMouseLeave = (e) => {
        const tooltipElement = tooltipRef.current;
        if (tooltipElement && showRestoreConfirm) {
            const tooltipRect = tooltipElement.getBoundingClientRect();
            if (e.clientY >= tooltipRect.top &&
                e.clientY <= tooltipRect.bottom &&
                e.clientX >= tooltipRect.left &&
                e.clientX <= tooltipRect.right) {
                return;
            }
        }
        setShowRestoreConfirm(false);
        setHasMouseEntered(false);
    };
    useEvent("message", handleMessage);
    return (_jsxs(Container, { isMenuOpen: showRestoreConfirm, "$isCheckedOut": isCheckpointCheckedOut, onMouseLeave: handleControlsMouseLeave, children: [_jsx(FaBookmark, {}), _jsx(Label, { "$isCheckedOut": isCheckpointCheckedOut, children: isCheckpointCheckedOut ? "Checkpoint (restored)" : "Checkpoint" }), _jsx(DottedLine, { "$isCheckedOut": isCheckpointCheckedOut }), _jsxs(ButtonGroup, { children: [_jsx(CustomButton, { "$isCheckedOut": isCheckpointCheckedOut, disabled: compareDisabled, style: { cursor: compareDisabled ? "wait" : "pointer" }, onClick: async () => {
                            setCompareDisabled(true);
                            try {
                                await CheckpointsServiceClient.checkpointDiff({
                                    value: messageTs,
                                });
                            }
                            catch (err) {
                                console.error("CheckpointDiff error:", err);
                            }
                            finally {
                                setCompareDisabled(false);
                            }
                        }, children: "Compare" }), _jsx(DottedLine, { small: true, "$isCheckedOut": isCheckpointCheckedOut }), _jsxs("div", { ref: refs.setReference, style: { position: "relative", marginTop: -2 }, children: [_jsx(CustomButton, { "$isCheckedOut": isCheckpointCheckedOut, isActive: showRestoreConfirm, onClick: () => setShowRestoreConfirm(true), children: "Restore" }), showRestoreConfirm &&
                                createPortal(_jsxs(RestoreConfirmTooltip, { ref: refs.setFloating, style: floatingStyles, "data-placement": placement, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, children: [_jsxs(RestoreOption, { children: [_jsx(VSCodeButton, { onClick: handleRestoreWorkspace, disabled: restoreWorkspaceDisabled, style: {
                                                        cursor: restoreWorkspaceDisabled ? "wait" : "pointer",
                                                        width: "100%",
                                                        marginBottom: "10px",
                                                    }, children: "Restore Files" }), _jsx("p", { children: "Restores your project's files back to a snapshot taken at this point (use \"Compare\" to see what will be reverted)" })] }), _jsxs(RestoreOption, { children: [_jsx(VSCodeButton, { onClick: handleRestoreTask, disabled: restoreTaskDisabled, style: {
                                                        cursor: restoreTaskDisabled ? "wait" : "pointer",
                                                        width: "100%",
                                                        marginBottom: "10px",
                                                    }, children: "Restore Task Only" }), _jsx("p", { children: "Deletes messages after this point (does not affect workspace files)" })] }), _jsxs(RestoreOption, { children: [_jsx(VSCodeButton, { onClick: handleRestoreBoth, disabled: restoreBothDisabled, style: {
                                                        cursor: restoreBothDisabled ? "wait" : "pointer",
                                                        width: "100%",
                                                        marginBottom: "10px",
                                                    }, children: "Restore Files & Task" }), _jsx("p", { children: "Restores your project's files and deletes all messages after this point" })] })] }), document.body)] }), _jsx(DottedLine, { small: true, "$isCheckedOut": isCheckpointCheckedOut })] })] }));
};
const Container = styled.div `
  display: flex;
  align-items: center;
  padding: 4px 0;
  gap: 4px;
  position: relative;
  min-width: 0;
  margin-top: -10px;
  margin-bottom: -10px;
  opacity: ${(props) => (props.$isCheckedOut ? 1 : props.isMenuOpen ? 1 : 0.5)};

  &:hover {
    opacity: 1;
  }
`;
const Label = styled.span `
  color: ${(props) => props.$isCheckedOut
    ? "var(--vscode-textLink-foreground)"
    : "var(--vscode-descriptionForeground)"};
  font-size: 9px;
  flex-shrink: 0;
`;
const DottedLine = styled.div `
  flex: ${(props) => (props.small ? "0 0 5px" : "1")};
  min-width: ${(props) => (props.small ? "5px" : "5px")};
  height: 1px;
  background-image: linear-gradient(
    to right,
    ${(props) => props.$isCheckedOut
    ? "var(--vscode-textLink-foreground)"
    : "var(--vscode-descriptionForeground)"}
      50%,
    transparent 50%
  );
  background-size: 4px 1px;
  background-repeat: repeat-x;
`;
const ButtonGroup = styled.div `
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
`;
const CustomButton = styled.button `
  background: ${(props) => props.isActive || props.disabled
    ? props.$isCheckedOut
        ? "var(--vscode-textLink-foreground)"
        : "var(--vscode-descriptionForeground)"
    : "transparent"};
  border: none;
  color: ${(props) => props.isActive || props.disabled
    ? "var(--vscode-editor-background)"
    : props.$isCheckedOut
        ? "var(--vscode-textLink-foreground)"
        : "var(--vscode-descriptionForeground)"};
  padding: 2px 6px;
  font-size: 9px;
  cursor: pointer;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 1px;
    background-image: ${(props) => props.isActive || props.disabled
    ? "none"
    : `linear-gradient(to right, ${props.$isCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"} 50%, transparent 50%),
			linear-gradient(to bottom, ${props.$isCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"} 50%, transparent 50%),
			linear-gradient(to right, ${props.$isCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"} 50%, transparent 50%),
			linear-gradient(to bottom, ${props.$isCheckedOut ? "var(--vscode-textLink-foreground)" : "var(--vscode-descriptionForeground)"} 50%, transparent 50%)`};
    background-size: ${(props) => props.isActive || props.disabled
    ? "auto"
    : `4px 1px, 1px 4px, 4px 1px, 1px 4px`};
    background-repeat: repeat-x, repeat-y, repeat-x, repeat-y;
    background-position:
      0 0,
      100% 0,
      0 100%,
      0 0;
  }

  &:hover:not(:disabled) {
    background: ${(props) => props.$isCheckedOut
    ? "var(--vscode-textLink-foreground)"
    : "var(--vscode-descriptionForeground)"};
    color: var(--vscode-editor-background);
    &::before {
      display: none;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const RestoreOption = styled.div `
  &:not(:last-child) {
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--vscode-editorGroup-border);
  }

  p {
    margin: 0 0 2px 0;
    color: var(--vscode-descriptionForeground);
    font-size: 11px;
    line-height: 14px;
  }

  &:last-child p {
    margin: 0 0 -2px 0;
  }
`;
const RestoreConfirmTooltip = styled.div `
  position: fixed;
  background: ${CODE_BLOCK_BG_COLOR};
  border: 1px solid var(--vscode-editorGroup-border);
  padding: 12px;
  border-radius: 3px;
  width: min(calc(100vw - 54px), 600px);
  z-index: 1000;

  // Add invisible padding to create a safe hover zone
  &::before {
    content: "";
    position: absolute;
    top: -8px;
    left: 0;
    right: 0;
    height: 8px;
  }

  // Adjust arrow to be above the padding
  &::after {
    content: "";
    position: absolute;
    top: -6px;
    right: 24px;
    width: 10px;
    height: 10px;
    background: ${CODE_BLOCK_BG_COLOR};
    border-left: 1px solid var(--vscode-editorGroup-border);
    border-top: 1px solid var(--vscode-editorGroup-border);
    transform: rotate(45deg);
    z-index: 1;
  }

  // When menu appears above the button
  &[data-placement^="top"] {
    &::before {
      top: auto;
      bottom: -8px;
    }

    &::after {
      top: auto;
      bottom: -6px;
      right: 24px;
      transform: rotate(225deg);
    }
  }

  p {
    margin: 0 0 6px 0;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    white-space: normal;
    word-wrap: break-word;
  }
`;
//# sourceMappingURL=CheckmarkControl.js.map