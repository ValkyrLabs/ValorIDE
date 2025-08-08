import * as StompJs from "@stomp/stompjs"
import { useEffect, useState } from "react"
import { Badge, Card, Col, Form, Image, Row } from "react-bootstrap"
import { FiTerminal } from "react-icons/fi"
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux"

import type { AppDispatch, RootState } from "../../redux/store" // Adjust to your store
import type { WebsocketMessage } from "../../thor/model/WebsocketMessage" // Adjust to your store
import { WEBSOCKET_URL } from "../../websocket/websocket"
import CoolButton from "../CoolButton"
import { addMessage, setConnected } from "./websocketSlice" // Ensure these actions are correct
// import { WebsocketMessageAdded } from "../../thor/redux/reducers/WebsocketMessageReducer";

const { Client } = StompJs

// Use throughout your app instead of plain `useAppDispatch` and `useAppSelector`
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

const socketUrl = WEBSOCKET_URL
const stompClient = new Client({
	brokerURL: socketUrl,
	reconnectDelay: 5000,
	onConnect: () => {
		console.log("Connected to WebSocket")
	},
	onDisconnect: () => {
		console.log("Disconnected from WebSocket")
	},
	onStompError: (frame) => {
		console.error("Broker reported error: " + frame.headers["message"])
		console.error("Additional details: " + frame.body)
	},
})

const ServerConsole = () => {
	const [maxxed, setMaxxed] = useState(false)
	const [chatText, setChatText] = useState("")
	const connected = useAppSelector((state: RootState) => state.websocket.connected)
	const messages = useAppSelector((state: RootState) => state.websocket.messages)

	const dispatch = useAppDispatch()

	// Adjust your selectors based on your actual state shape.
	// Here we assume WebsocketSession reducer has a `messages` array.
	// TODO: this will need to be lazy loaded and server memory managed
	/*
  const { connected, messages, user } = useAppSelector((state: RootState) => ({
    connected: state.websocket.connected,
    messages: state.messages || [],
    responses: state.websocket,
    user: state.Principal
  }));*/

	useEffect(() => {
		const socketUrl = WEBSOCKET_URL
		stompClient.configure({
			brokerURL: socketUrl,
			reconnectDelay: 5000,
			onConnect: () => {
				dispatch(setConnected(true))
				stompClient.subscribe("/topic/statuses", (message) => {
					const parsedMessage: WebsocketMessage = JSON.parse(message.body)
					//alert("status: " + parsedMessage.payload)
					dispatch(addMessage(parsedMessage))
					scrollToBottom()
				})
				stompClient.subscribe("/topic/messages", (message) => {
					const parsedMessage: WebsocketMessage = JSON.parse(message.body)
					//alert("message: " + parsedMessage.payload)
					dispatch(addMessage(parsedMessage))
					scrollToBottom()
				})
			},
			onDisconnect: () => {
				dispatch(setConnected(false))
			},
			onStompError: (frame) => {
				console.error("Broker error: " + frame.headers["message"])
				console.error("Details: " + frame.body)
			},
		})

		stompClient.activate()

		return () => {
			stompClient.deactivate()
		}
	}, [dispatch, stompClient])

	const scrollToBottom = () => {
		alert("fix scroll ")
		//animateScroll.scrollToBottom({
		// containerId: "messages",
		//});
	}

	const handleCommandTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setChatText(e.target.value)
	}

	const sendMessage = () => {
		const message = {
			payload: chatText,
			type: "user",
		}
		stompClient.publish({
			destination: "/app/chat",
			body: JSON.stringify(message),
		})
		setChatText("")
	}

	const maxheight = maxxed ? window.innerHeight - 200 : "80px"

	return (
		<Card bg="primary" style={{ borderRadius: 0 }}>
			<Card.Header style={{ padding: "5px" }}>VALKYRAI CONSOLE</Card.Header>
			<Card.Body
				id="messages"
				style={{
					backgroundColor: "rgba(0,0,0,0.3)",
					overflowY: "scroll",
					maxHeight: maxheight,
					minHeight: maxheight,
				}}>
				{Array.isArray(messages) && messages.length > 0 ? (
					messages.map((message: WebsocketMessage, index: number) => {
						const { payload, time, type } = message
						const typeMap = {
							error: "danger",
							warn: "warning",
							success: "success",
							agent: "info",
							broadcast: "info",
							console: "info",
							debug: "info",
							info: "info",
							private: "info",
							room: "info",
							secure: "info",
							service: "info",
							user: "info",
						}

						const variant = typeMap[type as keyof typeof typeMap] || "secondary"

						return (
							<Row key={index}>
								<Col sm={2} md={2} lg={1}>
									<Badge bg={variant}>{type}</Badge>
								</Col>
								<Col sm={2} md={1} lg={1}>
									{time}
								</Col>
								<Col sm={2} md={3} lg={2}>
									<Image
										roundedCircle
										style={{
											border: "1px solid blue",
											width: "32px",
											height: "32px",
										}}
										src={message.user ? message.user.avatarUrl : ""}
									/>
									<b>{message.user ? message.user.username : "anon"}</b>
								</Col>
								<Col sm={6} md={6} lg={8}>
									{payload}
								</Col>
							</Row>
						)
					})
				) : (
					<div style={{ color: "white" }}>No messages available.</div>
				)}
			</Card.Body>
			<Card.Footer style={{ maxHeight: "25px", padding: 0 }}>
				<Row>
					<Col md={10}>
						<Form.Control
							style={{ maxHeight: "5em" }}
							type="textarea"
							value={chatText}
							onChange={handleCommandTextChange}
						/>
					</Col>
					<Col md={2}>
						{true && (
							<CoolButton
								customStyle={{ width: "20px", height: "20px" }}
								size="tiny"
								variant="success"
								onClick={sendMessage}>
								<FiTerminal size={20} />
							</CoolButton>
						)}
					</Col>
				</Row>
			</Card.Footer>
		</Card>
	)
}

export default ServerConsole
