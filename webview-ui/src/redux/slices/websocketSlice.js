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
            // state.connected = action.payload;
        },
        addMessage: (state, action) => {
            state.messages.push(action.payload);
            if (state.messages.length > 200) {
                state.messages.splice(0, state.messages.length - 200);
            }
        },
        addStatus: (state, action) => {
            state.statuses.push(action.payload);
        },
    },
});
export const { setConnected, addMessage, addStatus } = websocketSlice.actions;
export default websocketSlice.reducer;
//# sourceMappingURL=websocketSlice.js.map