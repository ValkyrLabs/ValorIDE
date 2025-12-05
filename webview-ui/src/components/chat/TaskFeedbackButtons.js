import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import styled from "styled-components";
import { vscode } from "@/utils/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { FaThumbsUp } from "react-icons/fa";
const IconWrapper = styled.span `
  color: var(--vscode-descriptionForeground);
`;
const ButtonWrapper = styled.div `
  transform: scale(0.85);
`;
const TaskFeedbackButtons = ({ messageTs, isFromHistory = false, style, }) => {
    const [feedback, setFeedback] = useState(null);
    const [shouldShow, setShouldShow] = useState(true);
    // Check localStorage on mount to see if feedback was already given for this message
    useEffect(() => {
        try {
            const feedbackHistory = localStorage.getItem("taskFeedbackHistory") || "{}";
            const history = JSON.parse(feedbackHistory);
            // Check if this specific message timestamp has received feedback
            if (history[messageTs]) {
                setShouldShow(false);
            }
        }
        catch (e) {
            console.error("Error checking feedback history:", e);
        }
    }, [messageTs]);
    // Don't show buttons if this is from history or feedback was already given
    if (isFromHistory || !shouldShow) {
        return null;
    }
    const handleFeedback = (type) => {
        if (feedback !== null)
            return; // Already provided feedback
        setFeedback(type);
        // Send feedback to extension
        vscode.postMessage({
            type: "taskFeedback",
            feedbackType: type,
        });
        // Store in localStorage that feedback was provided for this message
        try {
            const feedbackHistory = localStorage.getItem("taskFeedbackHistory") || "{}";
            const history = JSON.parse(feedbackHistory);
            history[messageTs] = true;
            localStorage.setItem("taskFeedbackHistory", JSON.stringify(history));
        }
        catch (e) {
            console.error("Error updating feedback history:", e);
        }
    };
    return (_jsx(Container, { style: style, children: _jsxs(ButtonsContainer, { children: [_jsx(ButtonWrapper, { children: _jsx(VSCodeButton, { appearance: "icon", onClick: () => handleFeedback("thumbs_up"), disabled: feedback !== null, title: "This was helpful", "aria-label": "This was helpful", children: _jsxs(IconWrapper, { children: ["$", feedback === "thumbs_up" ? _jsx(FaThumbsUp, {}) : _jsx("i", { children: "no comment" })] }) }) }), _jsx(ButtonWrapper, { children: _jsx(VSCodeButton, { appearance: "icon", onClick: () => handleFeedback("thumbs_down"), disabled: feedback !== null && feedback !== "thumbs_down", title: "This wasn't helpful", "aria-label": "This wasn't helpful", children: _jsxs(IconWrapper, { children: ["$", feedback === "thumbs_up" ? _jsx(FaThumbsUp, {}) : _jsx("i", { children: "no comment" })] }) }) })] }) }));
};
const Container = styled.div `
  display: flex;
  align-items: center;
  justify-content: flex-end;
`;
const ButtonsContainer = styled.div `
  display: flex;
  gap: 0px;
  opacity: 0.5;

  &:hover {
    opacity: 1;
  }
`;
export default TaskFeedbackButtons;
//# sourceMappingURL=TaskFeedbackButtons.js.map