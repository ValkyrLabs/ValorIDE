import React from "react"
import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import TelemetryBanner from "@/components/common/TelemetryBanner"
import Announcement from "@/components/chat/Announcement"
import HistoryPreview from "@/components/history/HistoryPreview"
import AutoApproveMenu from "@/components/chat/AutoApproveMenu"

interface WelcomeScreenProps {
	version: string
	telemetrySetting: string
	showAnnouncement: boolean
	hideAnnouncement: () => void
	taskHistory: any[]
	showHistoryView: () => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
	version,
	telemetrySetting,
	showAnnouncement,
	hideAnnouncement,
	taskHistory,
	showHistoryView
}) => {
	return (
		<>
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

			{/* login front and center */}
			<div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
				{/* Login form or content goes here */}
				<form>
					<input type="text" placeholder="Username" />
					<input type="password" placeholder="Password" />
					<button type="submit">Login</button>
				</form>
			</div>

			<AutoApproveMenu
				style={{
					marginBottom: -2,
					flex: "0 1 auto",
					minHeight: 0,
				}}
			/>
		</>
	)
}

export default WelcomeScreen
