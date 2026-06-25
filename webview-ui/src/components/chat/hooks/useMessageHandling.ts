import { useCallback } from "react";
import { WebsocketMessage, WebsocketMessageTypeEnum } from "@thorapi/model";
import { ValorIDEAsk } from "@shared/ExtensionMessage";
import { vscode } from "@thorapi/utils/vscode";
import { TaskServiceClient } from "@thorapi/services/grpc-client";

interface UseMessageHandlingProps {
  messages: any[];
  valorideAsk?: ValorIDEAsk;
  clearChatInput: () => void;
  setTextAreaDisabled: (disabled: boolean) => void;
  setValorIDEAsk: (ask: ValorIDEAsk | undefined) => void;
  setEnableButtons: (enabled: boolean) => void;
  ourSenderId: string;
}

export const useMessageHandling = ({
  messages,
  valorideAsk,
  clearChatInput,
  setTextAreaDisabled,
  setValorIDEAsk,
  setEnableButtons,
  ourSenderId,
}: UseMessageHandlingProps) => {
  // Helper: detect @valoride mention
  const containsValorIDEMention = useCallback(
    (text: string) => text?.toLowerCase?.().includes("@valoride") === true,
    [],
  );

  const handleSendMessage = useCallback(
    async (text: string, images: string[]) => {
      text = text.trim();
      if (text || images.length > 0) {
        // If the user is explicitly addressing the mothership model, send over websocket instead
        if (text.toLowerCase().startsWith("@valorone")) {
          try {
            const wsMessage: WebsocketMessage = {
              type: WebsocketMessageTypeEnum.USER,
              payload: text,
              time: new Date().toISOString(),
              user: { id: ourSenderId } as any,
            };
            window.dispatchEvent(
              new CustomEvent("websocket-send", { detail: wsMessage }),
            );
            vscode.postMessage({
              type: "displayVSCodeInfo",
              text: "Sent @valorone message via websocket",
            });
          } catch (e) {
            console.warn("Failed to send @valorone message:", e);
          }
          // Clear input and do not forward to local model
          clearChatInput();
          return;
        }
        if (messages.length === 0) {
          await TaskServiceClient.newTask({ text, images });
        } else if (valorideAsk) {
          vscode.postMessage({
            type: "askResponse",
            askResponse: "messageResponse",
            text,
            images,
          });
        } else {
          vscode.postMessage({
            type: "userMessage",
            text,
            images,
          });
        }
        clearChatInput();
        setTextAreaDisabled(true);
        setValorIDEAsk(undefined);
        setEnableButtons(false);
      }
    },
    [
      messages.length,
      valorideAsk,
      clearChatInput,
      setTextAreaDisabled,
      setValorIDEAsk,
      setEnableButtons,
      ourSenderId,
    ],
  );

  return {
    containsValorIDEMention,
    handleSendMessage,
  };
};
