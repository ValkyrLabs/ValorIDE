import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Empty, Input, List, Space, Typography, message as antdMessage } from "antd";

const { Text } = Typography;
const { TextArea } = Input;

const SWARM_API_BASE = "http://localhost:8080/v1/swarm";

type ChatMessage = {
	id: string;
	conversationId: string;
	senderId: string;
	senderType: "AGENT" | "USER" | "SYSTEM";
	message: string;
	timestamp: number;
	readBy?: string[];
};

const fetchChatHistory = async (agentId: string, conversationId: string): Promise<ChatMessage[]> => {
	try {
		const url = new URL(`${SWARM_API_BASE}/agent/${encodeURIComponent(agentId)}/chat/history`);
		url.searchParams.set("conversationId", conversationId);
		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`History fetch failed (${response.status})`);
		}

		const payload = await response.json();
		if (Array.isArray(payload)) {
			return payload;
		}
		if (Array.isArray(payload?.content)) {
			return payload.content;
		}
		return [];
	} catch (error) {
		console.warn("Failed to fetch chat history", error);
		return [];
	}
};

const sendChatMessage = async (
	agentId: string,
	conversationId: string,
	message: string,
	senderId: string,
): Promise<ChatMessage | null> => {
	try {
		const response = await fetch(`${SWARM_API_BASE}/agent/${encodeURIComponent(agentId)}/chat`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				conversationId,
				organizationId: (window as any).__valkyr_organizationId || "org-default",
				senderId,
				message,
				senderType: "USER",
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText || `HTTP ${response.status}`);
		}

		return (await response.json()) as ChatMessage;
	} catch (error) {
		console.warn("Failed to send chat message", error);
		antdMessage.error("Failed to send message. Please try again.");
		return null;
	}
};

interface ChatPanelProps {
	agentId: string;
	organizationId: string;
	userId: string;
	conversationId: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ agentId, userId, conversationId }) => {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [draft, setDraft] = useState("");
	const [isSending, setIsSending] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const sortedMessages = useMemo(
		() =>
			[...messages].sort((a, b) => {
				return a.timestamp - b.timestamp;
			}),
		[messages],
	);

	const scrollToBottom = useCallback(() => {
		requestAnimationFrame(() => {
			const node = containerRef.current;
			if (node) {
				node.scrollTop = node.scrollHeight;
			}
		});
	}, []);

	useEffect(() => {
		let isMounted = true;
		setIsLoading(true);
		fetchChatHistory(agentId, conversationId)
			.then((history) => {
				if (isMounted) {
					setMessages(history);
					scrollToBottom();
				}
			})
			.finally(() => {
				if (isMounted) {
					setIsLoading(false);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [agentId, conversationId, scrollToBottom]);

	useEffect(() => {
		if (!isLoading) {
			scrollToBottom();
		}
	}, [isLoading, sortedMessages, scrollToBottom]);

	const handleSend = async () => {
		const trimmed = draft.trim();
		if (!trimmed) {
			return;
		}

		setIsSending(true);
		const optimisticMessage: ChatMessage = {
			id: `local_${Date.now()}`,
			conversationId,
			senderId: userId,
			senderType: "USER",
			message: trimmed,
			timestamp: Date.now(),
		};
		setMessages((prev) => [...prev, optimisticMessage]);
		setDraft("");
		scrollToBottom();

		const response = await sendChatMessage(agentId, conversationId, trimmed, userId);
		if (response) {
			setMessages((prev) => prev.map((msg) => (msg.id === optimisticMessage.id ? response : msg)));
		} else {
			setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
		}

		setIsSending(false);
	};

	return (
		<Card className="swarm-chat-panel" loading={isLoading}>
			<div className="swarm-chat-history" ref={containerRef}>
				{sortedMessages.length === 0 && !isLoading ? (
					<Empty description="No messages yet. Say hello to this agent!" />
				) : (
					<List
						dataSource={sortedMessages}
						renderItem={(item) => (
							<List.Item className={`swarm-chat-message ${item.senderType.toLowerCase()}`}>
								<Space direction="vertical" size={0} style={{ width: "100%" }}>
									<Text type="secondary">
										{item.senderType === "USER" ? "You" : item.senderType} •{" "}
										{new Date(item.timestamp).toLocaleTimeString()}
									</Text>
									<Text>{item.message}</Text>
								</Space>
							</List.Item>
						)}
					/>
				)}
			</div>

			<div className="swarm-chat-input">
				<TextArea
					autoSize={{ minRows: 2, maxRows: 4 }}
					placeholder="Type a message…"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					disabled={isSending}
				/>
				<Button type="primary" onClick={handleSend} loading={isSending} disabled={!draft.trim()}>
					Send
				</Button>
			</div>
		</Card>
	);
};

export default ChatPanel;
