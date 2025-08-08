import SplitPane, { Divider, SplitPaneBottom, SplitPaneLeft, SplitPaneRight, SplitPaneTop } from "./index"

import "./index.css"

const SplitPaneView = ({ children }: { children: React.ReactNode | React.ReactNode[] }) => {
	// Ensure children is an array for consistent access
	const childrenArray = Array.isArray(children) ? children : [children]

	return (
		<div className="split-pane">
			<SplitPane className="split-pane-row">
				<SplitPaneLeft clientWidth={100}>{childrenArray[0]}</SplitPaneLeft>
				<Divider className="separator-col" />
				<SplitPaneRight>
					<SplitPane className="split-pane-col">
						<SplitPaneTop>{childrenArray[1]}</SplitPaneTop>

						<Divider className="separator-row" />

						<SplitPaneBottom>{childrenArray[2]}</SplitPaneBottom>
					</SplitPane>
				</SplitPaneRight>
			</SplitPane>
		</div>
	)
}

export default SplitPaneView
