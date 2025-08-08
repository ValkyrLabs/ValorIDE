import { useCallback, useEffect, useState } from "react"

import { useDispatch } from "react-redux"
import { addMessage } from "../redux/services/websocketSlice"
import { WebsocketMessage, WebsocketMessageTypeEnum } from "../thor/model"

const useWebSocket = (url: string) => {
	const [socket, setSocket] = useState<WebSocket | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const dispatch = useDispatch()

	const sendMessage = useCallback(
		(message: string) => {
			if (socket && socket.readyState === WebSocket.OPEN) {
				socket.send(message)
			}
		},
		[socket],
	)

	useEffect(() => {
		const newSocket = new WebSocket(url)

		newSocket.onopen = () => {
			console.log("WebSocket connected")
			setIsConnected(true)
			setSocket(newSocket)
			const event: WebsocketMessage = {
				type: WebsocketMessageTypeEnum.CONSOLE,
				payload: "status: 'connected'",
				createdDate: new Date(),
			}

			dispatch(addMessage(event))
		}

		newSocket.onclose = () => {
			console.log("WebSocket disconnected")
			setIsConnected(false)
			setSocket(null)
			const event: WebsocketMessage = {
				type: WebsocketMessageTypeEnum.CONSOLE,
				payload: "status: 'disconnected'",
				createdDate: new Date(),
			}
			dispatch(addMessage(event))
		}

		newSocket.onerror = (error) => {
			console.error("WebSocket error:", error)
			const event: WebsocketMessage = {
				type: WebsocketMessageTypeEnum.ERROR,
				payload: "status: 'error'",
				createdDate: new Date(),
			}
			dispatch(addMessage(event))
		}

		newSocket.onmessage = (event) => {
			console.log("WebSocket message:", event.data)
			try {
				const parsedEvent: WebsocketMessage = JSON.parse(event.data)
				dispatch(addMessage(parsedEvent))
				dispatch(
					addMessage({
						type: WebsocketMessageTypeEnum.CONSOLE,
						payload: event.data,
						createdDate: new Date(),
					}),
				)
			} catch (error) {
				console.error("Failed to parse WebSocket message:", error)
			}
		}

		return () => {
			newSocket.close()
		}
	}, [url, dispatch])

	const sendLoggedMessage = useCallback(
		(message: string) => {
			sendMessage(message)
			const event: WebsocketMessage = {
				type: WebsocketMessageTypeEnum.CONSOLE,
				payload: "CLIENT LOG MESSAGE:  " + message,
				createdDate: new Date(),
			}
			dispatch(addMessage(event))
		},
		[sendMessage, dispatch],
	)

	return { socket, isConnected, sendMessage: sendLoggedMessage }
}

export default useWebSocket
