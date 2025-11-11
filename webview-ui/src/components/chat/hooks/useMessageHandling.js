import { useCallback } from "react";
import { WebsocketMessageTypeEnum } from "@thor/model";
import { vscode } from "@/utils/vscode";
import { TaskServiceClient } from "@/services/grpc-client";
export const useMessageHandling = ({ messages, valorideAsk, clearChatInput, setTextAreaDisabled, setValorIDEAsk, setEnableButtons, ourSenderId, markUserMessagePending }) => {
    // Helper: detect @valoride mention
    const containsValorIDEMention = useCallback((text) => text?.toLowerCase?.().includes("@valoride") === true, []);
    const handleSendMessage = useCallback(async (text, images) => {
        text = text.trim();
        if (text || images.length > 0) {
            // If the user is explicitly addressing the mothership model, send over websocket instead
            if (text.toLowerCase().startsWith("@valorone")) {
                try {
                    const wsMessage = {
                        type: WebsocketMessageTypeEnum.USER,
                        payload: text,
                        time: new Date().toISOString(),
                        user: { id: ourSenderId },
                    };
                    window.dispatchEvent(new CustomEvent("websocket-send", { detail: wsMessage }));
                    vscode.postMessage({ type: "displayVSCodeInfo", text: "Sent @valorone message via websocket" });
                }
                catch (e) {
                    console.warn("Failed to send @valorone message:", e);
                }
                // Clear input and do not forward to local model
                clearChatInput();
                return;
            }
            markUserMessagePending(text, images);
            if (messages.length === 0) {
                await TaskServiceClient.newTask({ text, images });
            }
            else if (valorideAsk) {
                switch (valorideAsk) {
                    case "followup":
                    case "plan_mode_respond":
                    case "tool":
                    case "browser_action_launch":
                    case "command":
                    case "command_output":
                    case "use_mcp_server":
                    case "completion_result":
                    case "resume_task":
                    case "resume_completed_task":
                    case "mistake_limit_reached":
                    case "new_task":
                        vscode.postMessage({
                            type: "askResponse",
                            askResponse: "messageResponse",
                            text,
                            images,
                        });
                        break;
                    case "condense":
                        vscode.postMessage({
                            type: "askResponse",
                            askResponse: "messageResponse",
                            text,
                            images,
                        });
                        break;
                }
            }
            clearChatInput();
            setTextAreaDisabled(true);
            setValorIDEAsk(undefined);
            setEnableButtons(false);
        }
    }, [messages.length, valorideAsk, clearChatInput, setTextAreaDisabled, setValorIDEAsk, setEnableButtons, ourSenderId, markUserMessagePending]);
    return {
        containsValorIDEMention,
        handleSendMessage
    };
};
//# sourceMappingURL=useMessageHandling.js.map