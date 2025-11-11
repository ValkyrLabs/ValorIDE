import { createSlice } from "@reduxjs/toolkit";
const websocketSlice = createSlice({
    name: "websocket",
    initialState: {
        connected: false,
        messages: [],
        statuses: [],
    },
    reducers: {
        setConnected: (state, action) => {
            state.connected = !!action.payload;
        },
        addMessage: (state, action) => {
            state.messages = state.messages || [];
            state.messages.push(action.payload);
        },
        addStatus: (state, action) => {
            state.statuses = state.statuses || [];
            state.statuses.push(action.payload);
        },
    },
});
export const { setConnected, addMessage, addStatus } = websocketSlice.actions;
export default websocketSlice.reducer;
//# sourceMappingURL=websocketSlice.js.map