import { useState, useEffect, useMemo, useCallback } from "react"
import { useDeepCompareEffect } from "react-use"
import { ValorIDEAsk, ValorIDEMessage, ValorIDESayTool } from "@shared/ExtensionMessage"
import { vscode } from "@/utils/vscode"
import { TaskServiceClient } from "@/services/grpc-client"

interface UseChatStateProps {
	messages: ValorIDEMessage[]
	chatSettings?: any
}

export const useChatState = ({ messages, chatSettings }: UseChatStateProps) => {
	const [valorideAsk, setValorIDEAsk] = useState<ValorIDEAsk | undefined>(undefined)
	const [enableButtons, setEnableButtons] = useState<boolean>(false)
	const [primaryButtonText, setPrimaryButtonText] = useState<string | undefined>("Approve")
	const [secondaryButtonText, setSecondaryButtonText] = useState<string | undefined>("Reject")
	const [didClickCancel, setDidClickCancel] = useState(false)
	const [textAreaDisabled, setTextAreaDisabled] = useState(false)
	const [isChatLoading, setIsChatLoading] = useState(false)

	const lastMessage = useMemo(() => messages.at(-1), [messages])
	const secondLastMessage = useMemo(() => messages.at(-2), [messages])

	// Handle message state changes to update UI
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
							
							// Count attempts to limit stubborn mode
							const maxAttempts = chatSettings?.stubbornModeAttempts || 3
							const stubbornAttempts = messages.filter(m => 
								m.type === "ask" && m.ask === "followup" && 
								m.text?.includes("Are you sure you completed all")
							).length
							
							// Update button text with attempt counter during stubborn mode
							if (chatSettings?.stubbornMode && stubbornAttempts > 0 && stubbornAttempts < maxAttempts) {
								setPrimaryButtonText(`Stubborn ${stubbornAttempts + 1}/${maxAttempts}`)
							} else {
								setPrimaryButtonText("Start New Task")
							}
							setSecondaryButtonText(undefined)
							
							// Re-enabled Stubborn Mode with attempt tracking and delayed notification
							if (!isPartial && chatSettings?.stubbornMode && stubbornAttempts < maxAttempts) {
								const followup = "Are you sure you completed all of the tasks requested? Please double-check and continue if anything remains."
								const sendFollowup = () => {
									vscode.postMessage({
										type: "askResponse",
										askResponse: "messageResponse",
										text: followup,
										images: [],
									})
								}
								
								// Send followup after a delay (only after final message is complete)
								setTimeout(() => {
									// Only send notification after final stubborn attempt
									if (stubbornAttempts + 1 === maxAttempts) {
										vscode.postMessage({
											type: "displayVSCodeInfo",
											text: `Stubborn mode completed ${stubbornAttempts + 1}/${maxAttempts} attempts`
										})
									}
									sendFollowup()
								}, 500)
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
								setTextAreaDisabled(true)
								setValorIDEAsk(undefined)
								setEnableButtons(false)
							}
							break
					}
					break
			}
		}
	}, [lastMessage, secondLastMessage, chatSettings])

	// Detect chat loading state - when we're waiting for API responses
	useEffect(() => {
		const isWaitingForResponse = lastMessage?.say === "api_req_started" ||
			(textAreaDisabled && !enableButtons) ||
			lastMessage?.ask === "followup" && lastMessage?.partial
		setIsChatLoading(isWaitingForResponse)
	}, [lastMessage, textAreaDisabled, enableButtons])

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

	const handleTaskCloseButtonClick = useCallback(async () => {
		await TaskServiceClient.clearTask({})
	}, [])

	return {
		valorideAsk,
		enableButtons,
		primaryButtonText,
		secondaryButtonText,
		didClickCancel,
		textAreaDisabled,
		isChatLoading,
		lastMessage,
		secondLastMessage,
		handlePrimaryButtonClick,
		handleSecondaryButtonClick,
		handleCancelClick,
		handleTaskCloseButtonClick,
		setTextAreaDisabled,
		setValorIDEAsk,
		setEnableButtons
	}
}
