import { createSlice, PayloadAction } from "@reduxjs/toolkit"
import { WebsocketMessage } from "../../thor/model"
import { WebsocketSession } from "../../thor/model/WebsocketSession"

const initialState: WebsocketSession = {
	messages: [] as WebsocketMessage[],
	statuses: [] as WebsocketMessage[],
	connected: false,
}

const websocketSlice = createSlice({
	name: "websocket",
	initialState,
	reducers: {
		addMessage: (state, action: PayloadAction<WebsocketMessage>) => {
			state.messages.push(action.payload)
		},
	},
})

export const { addMessage } = websocketSlice.actions

export default websocketSlice.reducer
