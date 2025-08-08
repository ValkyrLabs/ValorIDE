import { createSlice } from "@reduxjs/toolkit"

import { McpServer } from "../../model/McpServer"

const McpServerSlice = createSlice({
	name: "McpServers",
	initialState: [],

	reducers: {
		McpServerAdded(state, action) {
			state.push(action.payload)
		},

		McpServerValueToggled(state, action) {
			console.log("McpServer TOGGLE")
			console.warn(JSON.stringify(action))
			const McpServer: McpServer = state.find((McpServer) => McpServer.id === action.payload.McpServerId)
			if (McpServer) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		McpServerpropertySet(state, action) {
			const McpServer = state.find((McpServer) => McpServer.id === action.payload.McpServerId)
			if (McpServer) {
				//  McpServer[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { McpServerAdded, McpServerValueToggled, McpServerpropertySet } = McpServerSlice.actions
export default McpServerSlice.reducer
