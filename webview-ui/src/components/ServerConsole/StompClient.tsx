import { Client } from "@stomp/stompjs"

const socketUrl = "ws://localhost:8443/app/chat"
const StompClient = new Client({
	brokerURL: socketUrl,
	reconnectDelay: 5000,
	onConnect: () => {
		console.log("Connected to WebSocket")
		// Subscribe to topics or send messages here
	},
	onDisconnect: () => {
		console.log("Disconnected from WebSocket")
	},
	onStompError: (frame) => {
		console.error("Broker reported error: " + frame.headers["message"])
		console.error("Additional details: " + frame.body)
	},
})

StompClient.activate()

export default StompClient
