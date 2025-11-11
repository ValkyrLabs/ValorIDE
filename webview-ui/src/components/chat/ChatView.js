import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useEffect, useCallback } from "react";
import { findLast } from "@shared/array";
import { combineApiRequests } from "@shared/combineApiRequests";
import { combineCommandSequences } from "@shared/combineCommandSequences";
import { getApiMetrics } from "@shared/getApiMetrics";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { useCommunicationService } from "@/context/CommunicationServiceContext";
import { useGetBalanceResponsesQuery } from "@/thor/redux/services/BalanceResponseService";
import { vscode } from "@/utils/vscode";
import { useChatInputPersistence } from "@/utils/useSessionStorage";
import ChatTextArea from "@/components/chat/ChatTextArea";
import SystemAlerts from "@/components/SystemAlerts";
// Custom hooks
import { useWebSocketConnection } from "./hooks/useWebSocketConnection";
import { usePeerCommunication } from "./hooks/usePeerCommunication";
import { useChatState } from "./hooks/useChatState";
import { useMessageHandling } from "./hooks/useMessageHandling";
import WelcomeScreen from "./WelcomeScreen";
import TaskView from "./TaskView";
export const MAX_IMAGES_PER_MESSAGE = 20; // Anthropic limits to 20 images
const ChatView = ({ isHidden, showAnnouncement, hideAnnouncement, showHistoryView }) => {
    const { version, valorideMessages: messages, taskHistory, apiConfiguration, telemetrySetting, chatSettings, jwtToken } = useExtensionState();
    const communicationService = useCommunicationService();
    const { inputValue, setInputValue, selectedImages, setSelectedImages, clearChatInput } = useChatInputPersistence();
    // Handle images selected from the VS Code file picker
    useEffect(() => {
        const handleMessage = (e) => {
            const message = e.data;
            if (message?.type === "selectedImages" && Array.isArray(message.images)) {
                setSelectedImages((prev) => [...prev, ...message.images].slice(0, MAX_IMAGES_PER_MESSAGE));
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [setSelectedImages]);
    // Initialize hooks
    const { wsConnected, wsInstanceCount, isConnectingMothership, ourSenderId, pendingRemoteReplyRef, broadcastLLMResponse, connectToMothership } = useWebSocketConnection({
        messages,
        containsValorIDEMention: useCallback((text) => text?.toLowerCase?.().includes("@valoride") === true, []),
        clearChatInput
    });
    const { peerCount, p2pOpen, isConnectingPeers, multipleInstances, handleRobotIconClick, connectToPeers } = usePeerCommunication();
    const { valorideAsk, enableButtons, primaryButtonText, secondaryButtonText, textAreaDisabled, isChatLoading, lastMessage, handlePrimaryButtonClick, handleSecondaryButtonClick, handleCancelClick, handleTaskCloseButtonClick, setTextAreaDisabled, setValorIDEAsk, setEnableButtons, markUserMessagePending } = useChatState({ messages, chatSettings });
    const { handleSendMessage } = useMessageHandling({
        messages,
        valorideAsk,
        clearChatInput,
        setTextAreaDisabled,
        setValorIDEAsk,
        setEnableButtons,
        ourSenderId,
        markUserMessagePending
    });
    // Computed values
    const task = useMemo(() => messages.at(0), [messages]);
    const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages]);
    const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages]);
    // Global balance fetch for status strip; skip until JWT is present
    const { data: balanceData } = useGetBalanceResponsesQuery(undefined, { skip: !jwtToken });
    const netBalance = useMemo(() => {
        const raw = balanceData?.[0]?.currentBalance || 0;
        const net = Math.max(0, raw - (apiMetrics.totalCost || 0));
        return net;
    }, [balanceData, apiMetrics.totalCost]);
    const lastApiReqTotalTokens = useMemo(() => {
        const getTotalTokensFromApiReqMessage = (msg) => {
            if (!msg.text)
                return 0;
            const { tokensIn, tokensOut, cacheWrites, cacheReads } = JSON.parse(msg.text);
            return (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0);
        };
        const lastApiReqMessage = findLast(modifiedMessages, (msg) => {
            if (msg.say !== "api_req_started")
                return false;
            return getTotalTokensFromApiReqMessage(msg) > 0;
        });
        if (!lastApiReqMessage)
            return undefined;
        return getTotalTokensFromApiReqMessage(lastApiReqMessage);
    }, [modifiedMessages]);
    // If a peer-triggered prompt was injected, broadcast the very next assistant reply to @valorone
    useEffect(() => {
        if (!pendingRemoteReplyRef.current)
            return;
        const lm = lastMessage;
        if (!lm || lm.type !== "say" || lm.partial)
            return;
        const kind = lm.say;
        if (kind === "text" || kind === "completion_result") {
            const content = (lm.text || "").trim();
            if (content) {
                broadcastLLMResponse(content);
                pendingRemoteReplyRef.current = false;
            }
        }
    }, [lastMessage, broadcastLLMResponse]);
    // Handle image selection via file picker
    const handleSelectImages = useCallback(() => {
        vscode.postMessage({ type: "selectImages" });
    }, []);
    return (_jsxs("div", { style: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: isHidden ? "none" : "flex",
            flexDirection: "column",
            overflow: "hidden",
        }, children: [_jsx(SystemAlerts, {}), task ? (_jsx(TaskView, { task: task, messages: messages, apiConfiguration: apiConfiguration, inputValue: inputValue, setInputValue: setInputValue, isChatLoading: isChatLoading, lastApiReqTotalTokens: lastApiReqTotalTokens, valorideAsk: valorideAsk, enableButtons: enableButtons, primaryButtonText: primaryButtonText, secondaryButtonText: secondaryButtonText, onTaskClose: handleTaskCloseButtonClick, onPrimaryButton: handlePrimaryButtonClick, onSecondaryButton: handleSecondaryButtonClick, onCancel: handleCancelClick })) : (_jsx(WelcomeScreen, { version: version, telemetrySetting: telemetrySetting, showAnnouncement: showAnnouncement, hideAnnouncement: hideAnnouncement, taskHistory: taskHistory, showHistoryView: showHistoryView })), _jsx(ChatTextArea, { inputValue: inputValue, setInputValue: setInputValue, selectedImages: selectedImages, setSelectedImages: setSelectedImages, onSend: handleSendMessage, textAreaDisabled: textAreaDisabled, placeholderText: task ? "Type a message..." : "Start a new conversation...", onSelectImages: handleSelectImages, shouldDisableImages: false })] }));
};
export default ChatView;
//# sourceMappingURL=ChatView.js.map