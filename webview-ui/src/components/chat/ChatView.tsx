import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { VscChevronDown } from "react-icons/vsc"
import { FaRobot, FaSpinner, FaPlug, FaTimes } from "react-icons/fa"
import debounce from "debounce"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDeepCompareEffect, useEvent, useMount } from "react-use"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import styled from "styled-components"
import { Image } from "react-bootstrap";
import bannerImage from "../../assets/valorIde-horizontal.png";
import {
	ValorIDEApiReqInfo,
	ValorIDEAsk,
	ValorIDEMessage,
	ValorIDESayBrowserAction,
	ValorIDESayTool,
	ExtensionMessage,
} from "@shared/ExtensionMessage"
import { findLast } from "@shared/array"
import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences } from "@shared/combineCommandSequences"
import { getApiMetrics } from "@shared/getApiMetrics"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useCommunicationService } from "@/context/CommunicationServiceContext"
import StatusBadge from "@/components/common/StatusBadge"
import { useGetBalanceResponsesQuery } from "@/thor/redux/services/BalanceResponseService";
import OfflineBanner from "@/components/common/OfflineBanner"
import { vscode } from "@/utils/vscode"
import { TaskServiceClient } from "@/services/grpc-client"
import HistoryPreview from "@/components/history/HistoryPreview"
import { normalizeApiConfiguration } from "@/components/settings/ApiOptions"
import { useChatInputPersistence } from "@/utils/useSessionStorage"
import Announcement from "@/components/chat/Announcement"
import AutoApproveMenu from "@/components/chat/AutoApproveMenu"
import BrowserSessionRow from "@/components/chat/BrowserSessionRow"
import ChatRow from "@/components/chat/ChatRow"
import ChatTextArea from "@/components/chat/ChatTextArea"
import TaskHeader from "@/components/chat/TaskHeader"
import TelemetryBanner from "@/components/common/TelemetryBanner"
import RobotIcon from "./RobotIcon"

interface ChatViewProps {
	isHidden: boolean
	showAnnouncement: boolean
	hideAnnouncement: () => void
	showHistoryView: () => void
}

export const MAX_IMAGES_PER_MESSAGE = 20 // Anthropic limits to 20 images

const ScrollToBottomButton = styled.div`
	background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 55%, transparent);
	border-radius: 3px;
	overflow: hidden;
	cursor: pointer;
	display: flex;
	justify-content: center;
	align-items: center;
	flex: 1;
	height: 25px;

	&:hover {
		background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 90%, transparent);
	}

	&:active {
		background-color: color-mix(in srgb, var(--vscode-toolbar-hoverBackground) 70%, transparent);
	}
`

const ActionButtonsContainer = styled.div`
	display: flex;
	gap: 8px;
	padding: 8px 15px;
	border-top: 1px solid var(--vscode-editorGroup-border);
	background-color: var(--vscode-editor-background);
`

const ChatView = ({ isHidden, showAnnouncement, hideAnnouncement, showHistoryView }: ChatViewProps) => {
const { version, valorideMessages: messages, taskHistory, apiConfiguration, telemetrySetting, mcpServers, chatSettings, jwtToken } = useExtensionState()
	const communicationService = useCommunicationService();
	const [peerCount, setPeerCount] = useState(0);
	const [p2pOpen, setP2pOpen] = useState(0);
	const [isConnectingPeers, setIsConnectingPeers] = useState(false);
		useEffect(() => {
			const handlePresence = (list: string[] | number) => setPeerCount(Array.isArray(list) ? list.length : (typeof list === 'number' ? list : 0));
			const handleP2PStatus = (s: any) => setP2pOpen(typeof s?.open === 'number' ? s.open : 0);
			communicationService.on("presence", handlePresence);
			communicationService.on("p2p-status", handleP2PStatus);
			return () => {
				communicationService.off("presence", handlePresence);
				communicationService.off("p2p-status", handleP2PStatus);
			};
		}, [communicationService]);

		// Connect to the Thor/STOMP broker the same way ServerConsole does
		useEffect(() => {
			try {
				const jwt = sessionStorage.getItem("jwtToken");
				if (jwt) {
					window.dispatchEvent(
						new CustomEvent("telecom-connect-broker", {
							detail: { reason: "chatview-mount", timestamp: Date.now() },
						}),
					);
				}
			} catch {
				// ignore if sessionStorage unavailable
			}
		}, []);

	const task = useMemo(() => messages.at(0), [messages])
	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])
const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])

// Global balance fetch for status strip; skip until JWT is present
const { data: balanceData } = useGetBalanceResponsesQuery(undefined as any, { skip: !jwtToken });
const netBalance = useMemo(() => {
  const raw = balanceData?.[0]?.currentBalance || 0;
  const net = Math.max(0, raw - (apiMetrics.totalCost || 0));
  return net;
}, [balanceData, apiMetrics.totalCost]);

	const lastApiReqTotalTokens = useMemo(() => {
		const getTotalTokensFromApiReqMessage = (msg: ValorIDEMessage) => {
			if (!msg.text) return 0
			const { tokensIn, tokensOut, cacheWrites, cacheReads }: ValorIDEApiReqInfo = JSON.parse(msg.text)
			return (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0)
		}
		const lastApiReqMessage = findLast(modifiedMessages, (msg) => {
			if (msg.say !== "api_req_started") return false
			return getTotalTokensFromApiReqMessage(msg) > 0
		})
		if (!lastApiReqMessage) return undefined
		return getTotalTokensFromApiReqMessage(lastApiReqMessage)
	}, [modifiedMessages])

	const { inputValue, setInputValue, selectedImages, setSelectedImages, clearChatInput } = useChatInputPersistence()
	const textAreaRef = useRef<HTMLTextAreaElement>(null)
	const [textAreaDisabled, setTextAreaDisabled] = useState(false)

	const [valorideAsk, setValorIDEAsk] = useState<ValorIDEAsk | undefined>(undefined)
	const [enableButtons, setEnableButtons] = useState<boolean>(false)
	const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>("Approve")
	const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>("Reject")
	const [didClickCancel, setDidClickCancel] = useState(false)
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const disableAutoScrollRef = useRef(false)
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [isAtBottom, setIsAtBottom] = useState(false)

	const lastMessage = useMemo(() => messages.at(-1), [messages])
	const secondLastMessage = useMemo(() => messages.at(-2), [messages])

	// Define handleSendMessage early so it can be used in itemContent
	const handleSendMessage = useCallback(
		async (text: string, images: string[]) => {
			text = text.trim()
			if (text || images.length > 0) {
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
				disableAutoScrollRef.current = false
			}
		},
		[messages.length, valorideAsk, clearChatInput]
	)

	useDeepCompareEffect(() => {
		if (lastMessage) {
			switch (lastMessage.type) {
				case "ask":
					const isPartial = lastMessage.partial === true
					switch (lastMessage.ask) {
						case "api_req_failed":
							setTextAreaDisabled(true)
							setValorIDEAsk("api_req_failed")
							setEnableButtons(true)
							setPrimaryButtonText("Retry")
							setSecondaryButtonText("Start New Task")
							break
						case "mistake_limit_reached":
							setTextAreaDisabled(false)
							setValorIDEAsk("mistake_limit_reached")
							setEnableButtons(true)
							setPrimaryButtonText("Proceed Anyways")
							setSecondaryButtonText("Start New Task")
							break
						case "auto_approval_max_req_reached":
							setTextAreaDisabled(true)
							setValorIDEAsk("auto_approval_max_req_reached")
							setEnableButtons(true)
							setPrimaryButtonText("Proceed")
							setSecondaryButtonText("Start New Task")
							break
						case "followup":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("followup")
							setEnableButtons(false)
							break
						case "plan_mode_respond":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("plan_mode_respond")
							setEnableButtons(false)
							break
						case "tool":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("tool")
							setEnableButtons(!isPartial)
							const tool = JSON.parse(lastMessage.text || "{}") as ValorIDESayTool
							switch (tool.tool) {
								case "editedExistingFile":
								case "newFileCreated":
									setPrimaryButtonText("Save")
									setSecondaryButtonText("Reject")
									break
								default:
									setPrimaryButtonText("Approve")
									setSecondaryButtonText("Reject")
									break
							}
							break
						case "browser_action_launch":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("browser_action_launch")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Approve")
							setSecondaryButtonText("Reject")
							break
						case "command":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("command")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Run Command")
							setSecondaryButtonText("Reject")
							break
						case "command_output":
							setTextAreaDisabled(false)
							setValorIDEAsk("command_output")
							setEnableButtons(true)
							setPrimaryButtonText("Proceed While Running")
							setSecondaryButtonText(undefined)
							break
						case "use_mcp_server":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("use_mcp_server")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Approve")
							setSecondaryButtonText("Reject")
							break
						case "completion_result":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("completion_result")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Start New Task")
							setSecondaryButtonText(undefined)
							// Stubborn Mode: when completion result arrives, auto-ask the assistant to double-check
							// Use a direct askResponse post to avoid race conditions with state/closures
							if (!isPartial && chatSettings?.stubbornMode) {
								const followup = "Are you sure you completed all of the tasks requested? Please double-check and continue if anything remains.";
								const sendFollowup = () => {
									vscode.postMessage({
										type: "askResponse",
										askResponse: "messageResponse",
										text: followup,
										images: [],
									});
								};
								// Kick once after a short delay to let UI settle, then one quick retry
								setTimeout(sendFollowup, 150);
								setTimeout(sendFollowup, 450);
							}
							break
						case "resume_task":
							setTextAreaDisabled(false)
							setValorIDEAsk("resume_task")
							setEnableButtons(true)
							setPrimaryButtonText("Resume Task")
							setSecondaryButtonText(undefined)
							setDidClickCancel(false)
							break
						case "resume_completed_task":
							setTextAreaDisabled(false)
							setValorIDEAsk("resume_completed_task")
							setEnableButtons(true)
							setPrimaryButtonText("Start New Task")
							setSecondaryButtonText(undefined)
							setDidClickCancel(false)
							break
						case "new_task":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("new_task")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Start New Task with Context")
							setSecondaryButtonText(undefined)
							break
						case "condense":
							setTextAreaDisabled(isPartial)
							setValorIDEAsk("condense")
							setEnableButtons(!isPartial)
							setPrimaryButtonText("Condense Conversation")
							setSecondaryButtonText(undefined)
							break
					}
					break
				case "say":
					switch (lastMessage.say) {
						case "api_req_started":
							if (secondLastMessage?.ask === "command_output") {
								clearChatInput()
								setTextAreaDisabled(true)
								setValorIDEAsk(undefined)
								setEnableButtons(false)
							}
							break
						case "task":
						case "error":
						case "api_req_finished":
						case "text":
						case "browser_action":
						case "browser_action_result":
						case "browser_action_launch":
						case "command":
						case "use_mcp_server":
						case "command_output":
						case "mcp_server_request_started":
						case "mcp_server_response":
						case "completion_result":
						case "tool":
						case "load_mcp_documentation":
							break
					}
					break
			}
		} else {
		}
	}, [lastMessage, secondLastMessage])

	// Add state for multiple instances detection and handshake messages
	const [multipleInstances, setMultipleInstances] = useState(false)
	const [handshakeMessages, setHandshakeMessages] = useState<string[]>([])

	// Compute multi-instance status from peer count (more accurate than MCP servers)
	useEffect(() => {
		setMultipleInstances(peerCount > 0)
	}, [peerCount])

	// Always listen for inter-instance messages to surface handshake feedback
	useEffect(() => {
		const handleCommMessage = (message: any) => {
			if (!message || !message.type) return
			if (message.type === "ping") {
				communicationService.sendMessage("ack", { receivedAt: Date.now() })
				setHandshakeMessages((msgs) => [...msgs, `Received ping at ${new Date().toLocaleTimeString()}`])
			} else if (message.type === "ack") {
				setHandshakeMessages((msgs) => [...msgs, `Received ack at ${new Date().toLocaleTimeString()}`])
			} else if (message.type === "nack") {
				setHandshakeMessages((msgs) => [...msgs, `Received nack at ${new Date().toLocaleTimeString()}`])
			}
		}
		communicationService.on("message", handleCommMessage)
		return () => {
			communicationService.off("message", handleCommMessage)
		}
	}, [communicationService])

	const handleRobotIconClick = () => {
		communicationService.sendMessage("ping", { sentAt: Date.now() })
		setHandshakeMessages((msgs) => [...msgs, `Sent ping at ${new Date().toLocaleTimeString()}`])
	}

	// Render RobotIcon conditionally
	const RobotIconComponent = () => (
		<div
			style={{
				cursor: "pointer",
				color: "#61dafb",
				fontSize: "24px",
				marginLeft: "10px",
				alignSelf: "center",
			}}
			title="Click to ping other ValorIDE instances"
			onClick={handleRobotIconClick}
		>
			<FaRobot />
		</div>
	)

	// Restore groupedMessages, itemContent, scrollToBottomSmooth, handleSendMessage, handleTaskCloseButtonClick, selectedModelInfo
	const visibleMessages = useMemo(() => {
		return modifiedMessages.filter((message) => {
			switch (message.ask) {
				case "completion_result":
					if (message.text === "") {
						return false
					}
					break
				case "api_req_failed":
				case "resume_task":
				case "resume_completed_task":
					return false
			}
			switch (message.say) {
				case "api_req_finished":
				case "api_req_retried":
				case "deleted_api_reqs":
					return false
				case "text":
					if ((message.text ?? "") === "" && (message.images?.length ?? 0) === 0) {
						return false
					}
					break
				case "mcp_server_request_started":
					return false
			}
			return true
		})
	}, [modifiedMessages])

	const groupedMessages = useMemo(() => {
		const result: (ValorIDEMessage | ValorIDEMessage[])[] = []
		let currentGroup: ValorIDEMessage[] = []
		let isInBrowserSession = false

		const endBrowserSession = () => {
			if (currentGroup.length > 0) {
				result.push([...currentGroup])
				currentGroup = []
				isInBrowserSession = false
			}
		}

		const isBrowserSessionMessage = (message: ValorIDEMessage): boolean => {
			if (message.type === "ask") {
				return ["browser_action_launch"].includes(message.ask!)
			}
			if (message.type === "say") {
				return [
					"browser_action_launch",
					"api_req_started",
					"text",
					"browser_action",
					"browser_action_result",
					"checkpoint_created",
					"reasoning",
				].includes(message.say!)
			}
			return false
		}

		visibleMessages.forEach((message) => {
			if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
				endBrowserSession()
				isInBrowserSession = true
				currentGroup.push(message)
			} else if (isInBrowserSession) {
				if (message.say === "api_req_started") {
					const lastApiReqStarted = [...currentGroup].reverse().find((m) => m.say === "api_req_started")
					if (lastApiReqStarted?.text != null) {
						const info = JSON.parse(lastApiReqStarted.text)
						const isCancelled = info.cancelReason != null
						if (isCancelled) {
							endBrowserSession()
							result.push(message)
							return
						}
					}
				}

				if (isBrowserSessionMessage(message)) {
					currentGroup.push(message)
					if (message.say === "browser_action") {
						const browserAction = JSON.parse(message.text || "{}") as ValorIDESayBrowserAction
						if (browserAction.action === "close") {
							endBrowserSession()
						}
					}
				} else {
					endBrowserSession()
					result.push(message)
				}
			} else {
				result.push(message)
			}
		})

		if (currentGroup.length > 0) {
			result.push([...currentGroup])
		}

		return result
	}, [visibleMessages])

	const itemContent = useCallback(
		(index: number, messageOrGroup: ValorIDEMessage | ValorIDEMessage[]) => {
			if (Array.isArray(messageOrGroup)) {
				return (
					<BrowserSessionRow
						messages={messageOrGroup}
						isLast={index === groupedMessages.length - 1}
						lastModifiedMessage={modifiedMessages.at(-1)}
						onHeightChange={() => { }}
						isExpanded={(messageTs: number) => expandedRows[messageTs] ?? false}
						onToggleExpand={(messageTs: number) => {
							setExpandedRows((prev) => ({
								...prev,
								[messageTs]: !prev[messageTs],
							}))
						}}
					/>
				)
			}
			return (
				<ChatRow
					key={messageOrGroup.ts}
					message={messageOrGroup}
					isExpanded={expandedRows[messageOrGroup.ts] || false}
					onToggleExpand={() => {
						setExpandedRows((prev) => ({
							...prev,
							[messageOrGroup.ts]: !prev[messageOrGroup.ts],
						}))
					}}
					lastModifiedMessage={modifiedMessages.at(-1)}
					isLast={index === groupedMessages.length - 1}
					onHeightChange={() => { }}
					inputValue={inputValue}
					sendMessageFromChatRow={() => { }}
				/>
			)
		},
		[expandedRows, modifiedMessages, groupedMessages.length, inputValue]
	)

	const scrollToBottomSmooth = useMemo(
		() =>
			debounce(
				() => {
					virtuosoRef.current?.scrollTo({
						top: Number.MAX_SAFE_INTEGER,
						behavior: "smooth",
					})
				},
				10,
				{ immediate: true },
			),
		[]
	)

	const handleTaskCloseButtonClick = useCallback(async () => {
		await TaskServiceClient.clearTask({})
	}, [])

	const handlePrimaryButtonClick = useCallback(() => {
		if (!enableButtons || !valorideAsk) return

		vscode.postMessage({
			type: "askResponse",
			askResponse: "messageResponse",
			text: "yes",
			images: [],
		})
		setEnableButtons(false)
	}, [enableButtons, valorideAsk])

	const handleSecondaryButtonClick = useCallback(() => {
		if (!enableButtons || !valorideAsk) return

		vscode.postMessage({
			type: "askResponse",
			askResponse: "messageResponse",
			text: "no",
			images: [],
		})
		setEnableButtons(false)
	}, [enableButtons, valorideAsk])

	const handleCancelClick = useCallback(() => {
		vscode.postMessage({
			type: "askResponse",
			askResponse: "messageResponse",
			text: "Cancel this request",
			images: [],
		})
		setDidClickCancel(true)
		setEnableButtons(false)
	}, [])

	const selectedModelInfo = useMemo(() => normalizeApiConfiguration(apiConfiguration).selectedModelInfo, [apiConfiguration])

	// Handle image selection via file picker
	const handleSelectImages = useCallback(() => {
		vscode.postMessage({ type: "selectImages" })
	}, [])

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (!disableAutoScrollRef.current && virtuosoRef.current && groupedMessages.length > 0) {
			virtuosoRef.current.scrollTo({
				top: Number.MAX_SAFE_INTEGER,
				behavior: "smooth",
			})
		}
	}, [groupedMessages.length, lastMessage?.ts])

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: isHidden ? "none" : "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px" }}>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					{multipleInstances && <RobotIconComponent />}
				</div>
				{/* Communication + P2P status */}
				{(() => {
					const svc: any = communicationService;
					const ready = !!svc.ready;
					const hasError = !!svc.error;
					const connecting = !ready && !hasError;
					const value = ready
						? "Online"
						: hasError
							? "Error"
							: connecting
								? "Connecting"
								: "Offline";
					const kind = ready
						? "ok"
						: hasError
							? "error"
							: "warn";
					return (
						<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
							{connecting && (
								<FaSpinner
									style={{
										animation: "spin 1s linear infinite",
										color: "#61dafb",
									}}
								/>
							)}
							<StatusBadge
								label="Telecom"
								value={value}
								kind={kind as any}
								title={hasError ? String(svc.error) : undefined}
								style={
									connecting
										? {
											border: "1px solid #61dafb",
											boxShadow: "0 0 8px #61dafb",
										}
										: undefined
								}
							/>
            <StatusBadge label="P2P" value={`${p2pOpen}/${peerCount}`} kind={p2pOpen > 0 ? 'ok' as any : 'warn' as any} title="Open peer channels / peers" />
            {jwtToken && (
              <StatusBadge
                label="Balance"
                value={`$${netBalance.toFixed(2)}`}
                kind={netBalance > 0 ? ('ok' as any) : ('error' as any)}
                title="Current balance minus this session's live API cost"
              />
            )}
							<VSCodeButton
								appearance="icon"
								onClick={() => {
									// Ask the extension hub to (re)broadcast presence so VSCode views discover each other
									(communicationService as any).connectToVsCodePeers?.();
									
									// Initiate websocket broker connection (serverconsole style connectivity)
									try {
										// Trigger websocket connection attempt via custom event
										window.dispatchEvent(new CustomEvent("telecom-connect-broker", { 
											detail: { 
												timestamp: Date.now(),
												reason: "peer-discovery" 
											} 
										}));
										
										// Send presence announcement over websocket broker
										window.dispatchEvent(new CustomEvent("websocket-send", { 
											detail: {
												type: "presence:announce",
												payload: { 
													id: (communicationService as any).senderId || "unknown",
													timestamp: Date.now(),
													role: "valoride-client"
												},
												senderId: (communicationService as any).senderId || "unknown",
												messageId: Math.random().toString(36).substring(2, 12),
												timestamp: Date.now()
											}
										}));
									} catch (e) {
										console.warn("Failed to establish websocket broker connection:", e);
									}
									
									// Also re-initiate P2P handshakes with any known peers
									(communicationService as any).reconnectPeers?.();
									// Proactively ping to provoke acks and show activity
									communicationService.sendMessage("ping", { sentAt: Date.now() });
									vscode.postMessage({ type: "displayVSCodeInfo", text: `Broadcasting presence & connecting to broker… ${new Date().toLocaleTimeString()}` });
									setIsConnectingPeers(true);
									// Clear connecting state and summarize
									setTimeout(() => {
										setIsConnectingPeers(false);
										const svc: any = communicationService;
										const thorStatus = svc.thorConnected ? "Connected" : "Disconnected";
										const hubStatus = svc.hubConnected ? "Connected" : "Disconnected";
										vscode.postMessage({ 
											type: "displayVSCodeInfo", 
											text: `Peers: ${peerCount} | P2P: ${p2pOpen} | Thor: ${thorStatus} | Hub: ${hubStatus}` 
										});
									}, 900);
								}}
								title={isConnectingPeers ? "Scanning…" : "Connect to VSCode peers & broker"}
							>
								{isConnectingPeers ? (
									<FaSpinner style={{ animation: "spin 1s linear infinite" }} />
								) : (
									<FaPlug />
								)}
							</VSCodeButton>
							{isConnectingPeers && (
								<span style={{ fontSize: 11, color: "#61dafb" }}>Scanning…</span>
							)}
						</div>
					);
				})()}
			</div>
			<OfflineBanner />

			{task ? (
				<TaskHeader
					task={task}
					tokensIn={apiMetrics.totalTokensIn}
					tokensOut={apiMetrics.totalTokensOut}
					doesModelSupportPromptCache={selectedModelInfo.supportsPromptCache}
					cacheWrites={apiMetrics.totalCacheWrites}
					cacheReads={apiMetrics.totalCacheReads}
					totalCost={apiMetrics.totalCost}
					lastApiReqTotalTokens={lastApiReqTotalTokens}
					onClose={handleTaskCloseButtonClick}
				/>
			) : (
				<div
					style={{
						flex: "1",
						minHeight: 0,
						overflowY: "auto",
						display: "flex",
						flexDirection: "column",
						paddingBottom: "10px",
					}}
				>
					{telemetrySetting === "unset" && <TelemetryBanner />}
					{showAnnouncement && <Announcement version={version} hideAnnouncement={hideAnnouncement} />}
					<div style={{ padding: "0 20px", flexShrink: 0 }}>
						<div style={{ backgroundColor: "#222222", padding: "0 20px", flexShrink: 0 }}>
							<a href="https://valkyrlabs.com/valoride">
								<img
									alt="Valkyr Labs"
									src="https://valkyrlabs.com/assets/valorIde-horizontal-DyPXHpke.png"
								/>
							</a>
						</div>
						<p>
							Agentic Coder Powered by{" "}
							<VSCodeLink href="https://valkyrlabs.com/thorapi" style={{ display: "inline" }}>
								ThorAPI Full-Stack CodeGen
							</VSCodeLink>
						</p>
					</div>
					{taskHistory.length > 0 && <HistoryPreview showHistoryView={showHistoryView} />}
				</div>
			)}

			{!task && (
				<AutoApproveMenu
					style={{
						marginBottom: -2,
						flex: "0 1 auto",
						minHeight: 0,
					}}
				/>
			)}

			{task && (
				<>
					<div style={{ flexGrow: 1, display: "flex" }} ref={scrollContainerRef}>
						<Virtuoso
							ref={virtuosoRef}
							key={task.ts}
							className="scrollable"
							style={{
								flexGrow: 1,
								overflowY: "scroll",
							}}
							components={{
								Footer: () => <div style={{ height: 5 }} />,
							}}
							increaseViewportBy={{
								top: 3_000,
								bottom: Number.MAX_SAFE_INTEGER,
							}}
							data={groupedMessages}
							itemContent={itemContent}
							atBottomStateChange={(isAtBottom) => {
								setIsAtBottom(isAtBottom)
								if (isAtBottom) {
									disableAutoScrollRef.current = false
								}
								setShowScrollToBottom(disableAutoScrollRef.current && !isAtBottom)
							}}
							atBottomThreshold={10}
						/>
						{showScrollToBottom && (
							<div style={{ position: "absolute", bottom: "20px", right: "20px" }}>
								<ScrollToBottomButton
									onClick={() => {
										virtuosoRef.current?.scrollToIndex({ index: "LAST" })
										disableAutoScrollRef.current = false
									}}
								>
									<VscChevronDown />
								</ScrollToBottomButton>
							</div>
						)}
					</div>

					<ActionButtonsContainer>
						{enableButtons && secondaryButtonText && (
							<VSCodeButton appearance="secondary" onClick={handleSecondaryButtonClick}>
								{secondaryButtonText}
							</VSCodeButton>
						)}
						{enableButtons && primaryButtonText && (
							<VSCodeButton onClick={handlePrimaryButtonClick}>
								{primaryButtonText}
							</VSCodeButton>
						)}
						{valorideAsk && (
							<VSCodeButton appearance="icon" onClick={handleCancelClick}>
								<FaTimes />
							</VSCodeButton>
						)}
					</ActionButtonsContainer>
				</>
			)}

			{/* Always render ChatTextArea so users can start new conversations */}
			<ChatTextArea
				ref={textAreaRef}
				inputValue={inputValue}
				setInputValue={setInputValue}
				selectedImages={selectedImages}
				setSelectedImages={setSelectedImages}
				onSend={(text, images) => { handleSendMessage(text, images) }}
				textAreaDisabled={textAreaDisabled}
				placeholderText={task ? "Type a message..." : "Start a new conversation..."}
				onSelectImages={handleSelectImages}
				shouldDisableImages={false}
			/>
		</div>
	)
}

export default ChatView
