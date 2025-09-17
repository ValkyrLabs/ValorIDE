import React from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { FaSpinner, FaPlug, FaRobot } from "react-icons/fa"
import StatusBadge from "@/components/common/StatusBadge"

interface StatusBarProps {
	// WebSocket status
	wsConnected: boolean
	wsInstanceCount: number
	isConnectingMothership: boolean
	onConnectMothership: () => void

	// Peer communication status
	peerCount: number
	p2pOpen: number
	isConnectingPeers: boolean
	multipleInstances: boolean
	onConnectPeers: () => void
	onRobotIconClick: () => void

	// Communication service status
	communicationService: any

	// Balance
	jwtToken?: string
	netBalance: number
}

const StatusBar: React.FC<StatusBarProps> = ({
	wsConnected,
	wsInstanceCount,
	isConnectingMothership,
	onConnectMothership,
	peerCount,
	p2pOpen,
	isConnectingPeers,
	multipleInstances,
	onConnectPeers,
	onRobotIconClick,
	communicationService,
	jwtToken,
	netBalance
}) => {
	const svc: any = communicationService
	const ready = !!svc.ready
	const hasError = !!svc.error
	const connecting = !ready && !hasError
	const telecomValue = ready
		? "Online"
		: hasError
			? "Error"
			: connecting
				? "Connecting"
				: "Offline"
	const telecomKind = ready
		? "ok"
		: hasError
			? "error"
			: "warn"

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
			onClick={onRobotIconClick}
		>
			<FaRobot />
		</div>
	)

	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px" }}>
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				{/* WebSocket Mothership Status - LEFT SIDE */}
				{isConnectingMothership && (
					<FaSpinner
						style={{
							animation: "spin 1s linear infinite",
							color: "#61dafb",
						}}
					/>
				)}
				<StatusBadge
					label="Socket"
					value={wsConnected ? `${wsInstanceCount}/${wsInstanceCount + 1}` : "Disconnected"}
					kind={wsConnected ? 'ok' as any : 'warn' as any}
					title={wsConnected ? `Connected to mothership with ${wsInstanceCount} other instances` : "Not connected to websocket mothership"}
					style={
						isConnectingMothership
							? {
								border: "1px solid #61dafb",
								boxShadow: "0 0 8px #61dafb",
							}
							: undefined
					}
				/>
				<VSCodeButton
					appearance="icon"
					onClick={onConnectMothership}
					title={isConnectingMothership ? "Connecting…" : "Reconnect to websocket mothership"}
				>
					{isConnectingMothership ? (
						<FaSpinner style={{ animation: "spin 1s linear infinite" }} />
					) : (
						<FaPlug />
					)}
				</VSCodeButton>
				{multipleInstances && <RobotIconComponent />}
			</div>

			{/* Communication + P2P status - RIGHT SIDE */}
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
					label="P2P"
					value={telecomValue}
					kind={telecomKind as any}
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
				<StatusBadge
					label="P2P"
					value={`${p2pOpen}/${peerCount}`}
					kind={p2pOpen > 0 ? 'ok' as any : 'warn' as any}
					title="Open peer channels / peers"
				/>
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
					onClick={onConnectPeers}
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
		</div>
	)
}

export default StatusBar
