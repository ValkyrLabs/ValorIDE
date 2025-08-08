import { createSlice } from "@reduxjs/toolkit"

import { ChatMessage } from "../../model/ChatMessage"

const ChatMessageSlice = createSlice({
	name: "ChatMessages",
	initialState: [],

	reducers: {
		ChatMessageAdded(state, action) {
			state.push(action.payload)
		},

		ChatMessageValueToggled(state, action) {
			console.log("ChatMessage TOGGLE")
			console.warn(JSON.stringify(action))
			const ChatMessage: ChatMessage = state.find((ChatMessage) => ChatMessage.id === action.payload.ChatMessageId)
			if (ChatMessage) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		ChatMessagepropertySet(state, action) {
			const ChatMessage = state.find((ChatMessage) => ChatMessage.id === action.payload.ChatMessageId)
			if (ChatMessage) {
				//  ChatMessage[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { ChatMessageAdded, ChatMessageValueToggled, ChatMessagepropertySet } = ChatMessageSlice.actions
export default ChatMessageSlice.reducer
