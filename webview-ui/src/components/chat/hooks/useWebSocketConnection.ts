import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { WebsocketMessage, WebsocketMessageTypeEnum } from "@thor/model"
import { vscode } from "@/utils/vscode"
import { useCommunicationService } from "@/context/CommunicationServiceContext"
import { TaskServiceClient } from "@/services/grpc-client"
import { ValorIDEMessage } from "@shared/ExtensionMessage"

interface UseWebSocketConnectionProps {
	messages: ValorIDEMessage[]
	containsValorIDEMention: (text: string) => boolean
	clearChatInput: () => void
}

export const useWebSocketConnection = ({
	messages,
	containsValorIDEMention,
	clearChatInput
}: UseWebSocketConnectionProps) => {
	const communicationService = useCommunicationService()
	const [wsConnected, setWsConnected] = useState(false)
	const [wsInstanceCount, setWsInstanceCount] = useState(0)
	const [wsRollCallComplete, setWsRollCallComplete] = useState(false)
	const [isConnectingMothership, setIsConnectingMothership] = useState(false)

	// Identify this instance for avoiding self-echo
	const ourSenderId = useMemo(() => (communicationService as any)?.senderId || "unknown", [communicationService])

	// When we inject a peer prompt, flag the next assistant reply to broadcast back
	const pendingRemoteReplyRef = useRef(false)

	// Helper: broadcast a short reply to the mothership addressed to @valorone
	const broadcastLLMResponse = useCallback((response: string) => {
		try {
			const wsMessage: WebsocketMessage = {
				type: WebsocketMessageTypeEnum.USER,
				payload: `@valorone ${response}`,
				time: new Date().toISOString(),
				user: { id: ourSenderId } as any,
			}
			window.dispatchEvent(new CustomEvent("websocket-send", { detail: wsMessage }))
			console.log("Broadcasted @valorone reply:", wsMessage)
		} catch (e) {
			console.warn("Failed to broadcast @valorone reply:", e)
		}
	}, [ourSenderId])

	const connectToMothership = useCallback(() => {
		setIsConnectingMothership(true)
		try {
			// Trigger websocket connection attempt
			window.dispatchEvent(new CustomEvent("P2P-connect-broker", {
				detail: {
					timestamp: Date.now(),
					reason: "mothership-reconnect"
				}
			}))

			// Send rollcall BROADCAST after connection
			setTimeout(() => {
				const broadcastMessage = {
					type: "BROADCAST",
					action: "rollcall_request",
					senderId: (communicationService as any).senderId || "unknown",
					timestamp: Date.now(),
					payload: {
						instanceId: (communicationService as any).senderId || "unknown",
						role: "valoride-client",
						requestType: "ack_nack_rollcall"
					}
				}

				window.dispatchEvent(new CustomEvent("websocket-send", {
					detail: broadcastMessage
				}))
				vscode.postMessage({ type: "displayVSCodeInfo", text: `Reconnecting to mothership… ${new Date().toLocaleTimeString()}` })
			}, 500)

			// Clear connecting state
			setTimeout(() => {
				setIsConnectingMothership(false)
				vscode.postMessage({
					type: "displayVSCodeInfo",
					text: `Mothership: ${wsConnected ? "Connected" : "Failed"} | Instances: ${wsInstanceCount}`
				})
			}, 2000)
		} catch (e) {
			console.warn("Failed to reconnect to mothership:", e)
			setIsConnectingMothership(false)
		}
	}, [communicationService, wsConnected, wsInstanceCount])

	useEffect(() => {
		const handleWebSocketConnect = () => {
			setWsConnected(true)
			setIsConnectingMothership(false)
			const broadcastMessage = {
				type: "BROADCAST",
				action: "rollcall_request",
				senderId: (communicationService as any).senderId || "unknown",
				timestamp: Date.now(),
				payload: {
					instanceId: (communicationService as any).senderId || "unknown",
					role: "valoride-client",
					requestType: "ack_nack_rollcall"
				}
			}

			try {
				window.dispatchEvent(new CustomEvent("websocket-send", {
					detail: broadcastMessage
				}))
				console.log("Sent mothership rollcall BROADCAST:", broadcastMessage)
			} catch (e) {
				console.warn("Failed to send rollcall broadcast:", e)
			}
		}

		const handleWebSocketDisconnect = () => {
			setWsConnected(false)
			setWsInstanceCount(0)
			setWsRollCallComplete(false)
		}

		const handleWebSocketMessage = (event: any) => {
			const message = event.detail
			if (message?.type === "BROADCAST") {
				if (message.action === "rollcall_request" && message.senderId !== (communicationService as any).senderId) {
					const ackMessage = {
						type: "BROADCAST",
						action: "rollcall_ack",
						senderId: (communicationService as any).senderId || "unknown",
						timestamp: Date.now(),
						payload: {
							instanceId: (communicationService as any).senderId || "unknown",
							role: "valoride-client"
						}
					}

					try {
						window.dispatchEvent(new CustomEvent("websocket-send", {
							detail: ackMessage
						}))
					} catch (e) {
						console.warn("Failed to send rollcall ack:", e)
					}
				} else if (message.action === "rollcall_ack") {
					setWsInstanceCount(prev => prev + 1)
					setWsRollCallComplete(true)
				} else if (message.action === "instance_count") {
					setWsInstanceCount(message.payload?.count || 0)
				}
			}

			// Handle simple peer chat: when payload is a string containing @valoride, forward to model
			try {
				const payloadStr = typeof message?.payload === 'string'
					? message.payload
					: typeof message?.payload?.message === 'string'
						? message.payload.message
						: typeof message?.payload?.text === 'string'
							? message.payload.text
							: undefined

				if (payloadStr && containsValorIDEMention(payloadStr)) {
					const senderId = message?.user?.id || message?.senderId || "unknown"
					if (senderId !== ourSenderId) {
						const cleaned = payloadStr.replace(/@valoride\s*/gi, '').trim()
						if (cleaned) {
							// If no task exists yet, start one; else inject as a user message
							if ((messages?.length ?? 0) === 0) {
								TaskServiceClient.newTask({ text: cleaned, images: [] }).catch(() => { })
							} else {
								vscode.postMessage({
									type: "askResponse",
									askResponse: "messageResponse",
									text: cleaned,
									images: [],
								})
							}
							pendingRemoteReplyRef.current = true
							// Small UX hint
							vscode.postMessage({ type: "displayVSCodeInfo", text: `Received @valoride prompt from ${String(senderId).slice(-4)}` })
						}
					}
				}
			} catch (e) {
				// Non-fatal
			}
		}

		// Listen for websocket events
		window.addEventListener("websocket-connected", handleWebSocketConnect)
		window.addEventListener("websocket-disconnected", handleWebSocketDisconnect)
		window.addEventListener("websocket-message", handleWebSocketMessage)

		return () => {
			window.removeEventListener("websocket-connected", handleWebSocketConnect)
			window.removeEventListener("websocket-disconnected", handleWebSocketDisconnect)
			window.removeEventListener("websocket-message", handleWebSocketMessage)
		}
	}, [communicationService, containsValorIDEMention, messages, ourSenderId])

	// Connect to the Thor/STOMP broker the same way ServerConsole does
	useEffect(() => {
		try {
			const jwt = sessionStorage.getItem("jwtToken")
			if (jwt) {
				window.dispatchEvent(
					new CustomEvent("P2P-connect-broker", {
						detail: { reason: "chatview-mount", timestamp: Date.now() },
					}),
				)
			}
		} catch {
			// ignore if sessionStorage unavailable
		}
	}, [])

	return {
		wsConnected,
		wsInstanceCount,
		wsRollCallComplete,
		isConnectingMothership,
		ourSenderId,
		pendingRemoteReplyRef,
		broadcastLLMResponse,
		connectToMothership
	}
}
