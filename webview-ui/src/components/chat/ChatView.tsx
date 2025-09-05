import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { VscChevronDown } from "react-icons/vsc"
import { FaRobot } from "react-icons/fa"
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

const ChatView = ({ isHidden, showAnnouncement, hideAnnouncement, showHistoryView }: ChatViewProps) => {
	const { version, valorideMessages: messages, taskHistory, apiConfiguration, telemetrySetting, mcpServers } = useExtensionState()
	const communicationService = useCommunicationService();

	const task = useMemo(() => messages.at(0), [messages])
	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])
	const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])

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

	useEffect(() => {
		setMultipleInstances(mcpServers.length > 1)
	}, [mcpServers])

	useEffect(() => {
		if (!multipleInstances) return

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
	}, [multipleInstances, communicationService])

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
						onHeightChange={() => {}}
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
					onHeightChange={() => {}}
					inputValue={inputValue}
					sendMessageFromChatRow={handleSendMessage}
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

	const handleTaskCloseButtonClick = useCallback(async () => {
		await TaskServiceClient.clearTask({})
	}, [])

	const selectedModelInfo = useMemo(() => normalizeApiConfiguration(apiConfiguration).selectedModelInfo, [apiConfiguration])

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
			{multipleInstances && <RobotIconComponent />}
			<div style={{ padding: "5px", fontSize: "12px", color: "#888" }}>
				{handshakeMessages.map((msg, idx) => (
					<div key={idx}>{msg}</div>
				))}
			</div>

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
							initialTopMostItemIndex={groupedMessages.length - 1}
						/>
					</div>
					<AutoApproveMenu />
					{showScrollToBottom ? (
						<div
							style={{
								display: "flex",
								padding: "10px 15px 0px 15px",
							}}>
							<ScrollToBottomButton
								onClick={() => {
									scrollToBottomSmooth()
									disableAutoScrollRef.current = false
								}}>
								<VscChevronDown style={{ fontSize: "18px" }} />
							</ScrollToBottomButton>
						</div>
					) : null}
				</>
			)}
			<ChatTextArea
				ref={textAreaRef}
				inputValue={inputValue}
				setInputValue={setInputValue}
				textAreaDisabled={textAreaDisabled}
				placeholderText={task ? "Start with your command..." : "Enter your command..."}
				selectedImages={selectedImages}
				setSelectedImages={setSelectedImages}
				onSend={() => {
					const text = inputValue
					const images = selectedImages
					if (text.trim() || images.length > 0) {
						handleSendMessage(text, images)
					}
				}}
				onSelectImages={() => vscode.postMessage({ type: "selectImages" })}
				shouldDisableImages={!selectedModelInfo.supportsImages || textAreaDisabled || selectedImages.length >= MAX_IMAGES_PER_MESSAGE}
				onHeightChange={() => {
					if (isAtBottom) {
						virtuosoRef.current?.scrollTo({
							top: Number.MAX_SAFE_INTEGER,
							behavior: "auto",
						})
					}
				}}
			/>
		</div>
	)
}

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

export default ChatView
