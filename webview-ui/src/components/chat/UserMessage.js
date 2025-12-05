import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, forwardRef } from "react";
import Thumbnails from "@/components/common/Thumbnails";
import { highlightText } from "./TaskHeader";
import DynamicTextArea from "react-textarea-autosize";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { CheckpointsServiceClient } from "@/services/grpc-client";
const UserMessage = ({ text, images, messageTs, sendMessageFromChatRow, }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(text || "");
    const textAreaRef = useRef(null);
    const { checkpointTrackerErrorMessage } = useExtensionState();
    // Create refs for the buttons to check in the blur handler
    const restoreAllButtonRef = useRef(null);
    const restoreChatButtonRef = useRef(null);
    const handleClick = () => {
        if (!isEditing) {
            setIsEditing(true);
        }
    };
    // Select all text when entering edit mode
    React.useEffect(() => {
        if (isEditing && textAreaRef.current) {
            textAreaRef.current.select();
        }
    }, [isEditing]);
    const handleRestoreWorkspace = async (type) => {
        const delay = type === "task" ? 500 : 1000; // Delay for task and workspace restore
        setIsEditing(false);
        if (text === editedText) {
            return;
        }
        try {
            await CheckpointsServiceClient.checkpointRestore({
                number: messageTs,
                restoreType: type,
                offset: 1,
            });
            setTimeout(() => {
                sendMessageFromChatRow?.(editedText, images || []);
            }, delay);
        }
        catch (err) {
            console.error("Checkpoint restore error:", err);
        }
    };
    const handleBlur = (e) => {
        // Check if focus is moving to one of our button elements
        if (e.relatedTarget === restoreAllButtonRef.current ||
            e.relatedTarget === restoreChatButtonRef.current) {
            // Don't close edit mode if focus is moving to one of our buttons
            return;
        }
        // Otherwise, close edit mode
        setIsEditing(false);
    };
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setIsEditing(false);
        }
        else if (e.key === "Enter" &&
            e.metaKey &&
            !checkpointTrackerErrorMessage) {
            handleRestoreWorkspace("taskAndWorkspace");
        }
        else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleRestoreWorkspace("task");
        }
    };
    return (_jsxs("div", { style: {
            backgroundColor: isEditing ? "unset" : "var(--vscode-badge-background)",
            color: "var(--vscode-badge-foreground)",
            borderRadius: "3px",
            padding: "9px",
            whiteSpace: "pre-line",
            wordWrap: "break-word",
        }, onClick: handleClick, children: [isEditing ? (_jsxs(_Fragment, { children: [_jsx(DynamicTextArea, { ref: textAreaRef, value: editedText, onChange: (e) => setEditedText(e.target.value), onBlur: (e) => handleBlur(e), onKeyDown: handleKeyDown, autoFocus: true, style: {
                            width: "100%",
                            backgroundColor: "var(--vscode-input-background)",
                            color: "var(--vscode-input-foreground)",
                            borderColor: "var(--vscode-input-border)",
                            border: "1px solid",
                            borderRadius: "2px",
                            padding: "6px",
                            fontFamily: "inherit",
                            fontSize: "inherit",
                            lineHeight: "2em",
                            boxSizing: "border-box",
                            resize: "none",
                            overflowX: "hidden",
                            overflowY: "scroll",
                            scrollbarWidth: "none",
                        } }), _jsxs("div", { style: {
                            display: "flex",
                            gap: "8px",
                            marginTop: "8px",
                            justifyContent: "flex-end",
                        }, children: [!checkpointTrackerErrorMessage && (_jsx(RestoreButton, { ref: restoreAllButtonRef, type: "taskAndWorkspace", label: "Restore All", isPrimary: false, onClick: handleRestoreWorkspace, title: "Restore both the chat and workspace files to this checkpoint and send your edited message" })), _jsx(RestoreButton, { ref: restoreChatButtonRef, type: "task", label: "Restore Chat", isPrimary: true, onClick: handleRestoreWorkspace, title: "Restore just the chat to this checkpoint and send your edited message" })] })] })) : (_jsx("span", { style: { display: "block" }, children: highlightText(editedText || text) })), images && images.length > 0 && (_jsx(Thumbnails, { images: images, style: { marginTop: "8px" } }))] }));
};
const RestoreButton = forwardRef(({ type, label, isPrimary, onClick, title }, ref) => {
    const handleClick = (e) => {
        e.stopPropagation();
        onClick(type);
    };
    return (_jsx("button", { ref: ref, onClick: handleClick, title: title, style: {
            backgroundColor: isPrimary
                ? "var(--vscode-button-background)"
                : "var(--vscode-button-secondaryBackground, var(--vscode-descriptionForeground))",
            color: isPrimary
                ? "var(--vscode-button-foreground)"
                : "var(--vscode-button-secondaryForeground, var(--vscode-foreground))",
            border: "none",
            padding: "4px 8px",
            borderRadius: "2px",
            fontSize: "9px",
            cursor: "pointer",
        }, children: label }));
});
export default UserMessage;
//# sourceMappingURL=UserMessage.js.map