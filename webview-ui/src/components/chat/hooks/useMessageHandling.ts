import { useCallback } from "react"
import { WebsocketMessage, WebsocketMessageTypeEnum } from "@thor/model"
import { ValorIDEAsk } from "@shared/ExtensionMessage"
import { vscode } from "@/utils/vscode"
import { TaskServiceClient } from "@/services/grpc-client"

interface UseMessageHandlingProps {
	messages: any[]
	valorideAsk?: ValorIDEAsk
	clearChatInput: () => void
	setTextAreaDisabled: (disabled: boolean) => void
	setValorIDEAsk: (ask: ValorIDEAsk | undefined) => void
	setEnableButtons: (enabled: boolean) => void
	ourSenderId: string
}

export const useMessageHandling = ({
	messages,
	valorideAsk,
	clearChatInput,
	setTextAreaDisabled,
	setValorIDEAsk,
	setEnableButtons,
	ourSenderId
}: UseMessageHandlingProps) => {
	// Helper: detect @valoride mention
	const containsValorIDEMention = useCallback((text: string) => text?.toLowerCase?.().includes("@valoride") === true, [])

	const handleSendMessage = useCallback(
		async (text: string, images: string[]) => {
			text = text.trim()
			if (text || images.length > 0) {
				// If the user is explicitly addressing the mothership model, send over websocket instead
				if (text.toLowerCase().startsWith("@valorone")) {
					try {
						const wsMessage: WebsocketMessage = {
							type: WebsocketMessageTypeEnum.USER,
							payload: text,
							time: new Date().toISOString(),
							user: { id: ourSenderId } as any,
						}
						window.dispatchEvent(new CustomEvent("websocket-send", { detail: wsMessage }))
						vscode.postMessage({ type: "displayVSCodeInfo", text: "Sent @valorone message via websocket" })
					} catch (e) {
						console.warn("Failed to send @valorone message:", e)
					}
					// Clear input and do not forward to local model
					clearChatInput()
					return
				}
				if (messages.length === 0) {
					await TaskServiceClient.newTask({ text, images })
				} else if (valorideAsk) {
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
							})
							break
						case "condense":
							vscode.postMessage({
								type: "askResponse",
								askResponse: "messageResponse",
								text,
								images,
							})
							break
					}
				}
				clearChatInput()
				setTextAreaDisabled(true)
				setValorIDEAsk(undefined)
				setEnableButtons(false)
			}
		},
		[messages.length, valorideAsk, clearChatInput, setTextAreaDisabled, setValorIDEAsk, setEnableButtons, ourSenderId]
	)

	return {
		containsValorIDEMention,
		handleSendMessage
	}
}
