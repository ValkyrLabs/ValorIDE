import React, { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { VscChevronDown } from "react-icons/vsc"
import { FaTimes } from "react-icons/fa"
import debounce from "debounce"
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso"
import styled from "styled-components"
import { ValorIDEMessage, ValorIDESayBrowserAction } from "@shared/ExtensionMessage"
import { combineApiRequests } from "@shared/combineApiRequests"
import { combineCommandSequences, COMMAND_OUTPUT_STRING } from "@shared/combineCommandSequences"
import { getApiMetrics } from "@shared/getApiMetrics"
import { normalizeApiConfiguration } from "@/components/settings/ApiOptions"
import TaskHeader from "@/components/chat/TaskHeader"
import BrowserSessionRow from "@/components/chat/BrowserSessionRow"
import ChatRow from "@/components/chat/ChatRow"
import LoadingSpinner from "@/components/LoadingSpinner"

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
	position: relative;
	z-index: 1;
	flex-shrink: 0;
`

interface TaskViewProps {
	task: ValorIDEMessage
	messages: ValorIDEMessage[]
	apiConfiguration: any
	inputValue: string
	setInputValue: (value: string) => void
	isChatLoading: boolean
	lastApiReqTotalTokens?: number

	// State
	valorideAsk: any
	enableButtons: boolean
	primaryButtonText?: string
	secondaryButtonText?: string

	// Handlers
	onTaskClose: () => void
	onPrimaryButton: () => void
	onSecondaryButton: () => void
	onCancel: () => void
}

const TaskView: React.FC<TaskViewProps> = ({
	task,
	messages,
	apiConfiguration,
	inputValue,
	setInputValue,
	isChatLoading,
	lastApiReqTotalTokens,
	valorideAsk,
	enableButtons,
	primaryButtonText,
	secondaryButtonText,
	onTaskClose,
	onPrimaryButton,
	onSecondaryButton,
	onCancel
}) => {
	const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
	const [showScrollToBottom, setShowScrollToBottom] = useState(false)
	const [isAtBottom, setIsAtBottom] = useState(false)
	const virtuosoRef = useRef<VirtuosoHandle>(null)
	const scrollContainerRef = useRef<HTMLDivElement>(null)
	const disableAutoScrollRef = useRef(false)

	const modifiedMessages = useMemo(() => combineApiRequests(combineCommandSequences(messages.slice(1))), [messages])
	const apiMetrics = useMemo(() => getApiMetrics(modifiedMessages), [modifiedMessages])
	const selectedModelInfo = useMemo(() => normalizeApiConfiguration(apiConfiguration).selectedModelInfo, [apiConfiguration])

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

	useEffect(() => {
		setExpandedRows((prev) => {
			let next = prev
			let changed = false

			for (const message of visibleMessages) {
				if (next[message.ts] !== undefined) {
					continue
				}

				const shouldAutoExpand =
					(message.say === "api_req_started" && Boolean(message.text)) ||
					((message.ask === "command" || message.say === "command") &&
						typeof message.text === "string" &&
						message.text.includes(COMMAND_OUTPUT_STRING))

				if (shouldAutoExpand) {
					if (!changed) {
						next = { ...prev }
						changed = true
					}
					next[message.ts] = true
				}
			}

			return changed ? next : prev
		})
	}, [visibleMessages])

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
					setInputValue={setInputValue}
					sendMessageFromChatRow={() => { }}
				/>
			)
		},
		[expandedRows, modifiedMessages, groupedMessages.length, inputValue, setInputValue]
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

	// Auto-scroll to bottom when new messages arrive
	useEffect(() => {
		if (!disableAutoScrollRef.current && virtuosoRef.current && groupedMessages.length > 0) {
			virtuosoRef.current.scrollTo({
				top: Number.MAX_SAFE_INTEGER,
				behavior: "smooth",
			})
		}
	}, [groupedMessages.length])

	return (
		<>
			<TaskHeader
				task={task}
				tokensIn={apiMetrics.totalTokensIn}
				tokensOut={apiMetrics.totalTokensOut}
				doesModelSupportPromptCache={selectedModelInfo.supportsPromptCache}
				cacheWrites={apiMetrics.totalCacheWrites}
				cacheReads={apiMetrics.totalCacheReads}
				totalCost={apiMetrics.totalCost}
				lastApiReqTotalTokens={lastApiReqTotalTokens}
				onClose={onTaskClose}
			/>

			<div style={{ flexGrow: 1, display: "flex", position: "relative" }} ref={scrollContainerRef}>
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
				{isChatLoading && (
					<div style={{
						position: "absolute",
						bottom: "60px",
						right: "20px",
						background: "color-mix(in srgb, var(--vscode-editor-background) 95%, transparent)",
						borderRadius: "8px",
						border: "1px solid var(--vscode-editorGroup-border)",
						boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
						zIndex: 1000
					}}>
						<LoadingSpinner label="Working..." size={24} />
					</div>
				)}
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
					<VSCodeButton appearance="secondary" onClick={onSecondaryButton}>
						{secondaryButtonText}
					</VSCodeButton>
				)}
				{enableButtons && primaryButtonText && (
					<VSCodeButton onClick={onPrimaryButton}>
						{primaryButtonText}
					</VSCodeButton>
				)}
				{valorideAsk && (
					<VSCodeButton appearance="icon" onClick={onCancel}>
						<FaTimes />
					</VSCodeButton>
				)}
			</ActionButtonsContainer>
		</>
	)
}

export default TaskView
