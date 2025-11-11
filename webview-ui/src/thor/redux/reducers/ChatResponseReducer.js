import { createSlice } from "@reduxjs/toolkit";
const ChatResponseSlice = createSlice({
    name: "ChatResponses",
    initialState: [],
    reducers: {
        ChatResponseAdded(state, action) {
            state.push(action.payload);
        },
        ChatResponseValueToggled(state, action) {
            console.log("ChatResponse TOGGLE");
            console.warn(JSON.stringify(action));
            const ChatResponse = state.find((ChatResponse) => ChatResponse.id === action.payload.ChatResponseId);
            if (ChatResponse) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ChatResponsepropertySet(state, action) {
            const ChatResponse = state.find((ChatResponse) => ChatResponse.id === action.payload.ChatResponseId);
            if (ChatResponse) {
                //  ChatResponse[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ChatResponseAdded, ChatResponseValueToggled, ChatResponsepropertySet } = ChatResponseSlice.actions;
export default ChatResponseSlice.reducer;
//# sourceMappingURL=ChatResponseReducer.js.map