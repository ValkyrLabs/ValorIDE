import { createSlice } from "@reduxjs/toolkit";
const WebsocketMessageSlice = createSlice({
    name: "WebsocketMessages",
    initialState: [],
    reducers: {
        WebsocketMessageAdded(state, action) {
            state.push(action.payload);
        },
        WebsocketMessageValueToggled(state, action) {
            console.log("WebsocketMessage TOGGLE");
            console.warn(JSON.stringify(action));
            const WebsocketMessage = state.find((WebsocketMessage) => WebsocketMessage.id === action.payload.WebsocketMessageId);
            if (WebsocketMessage) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        WebsocketMessagepropertySet(state, action) {
            const WebsocketMessage = state.find((WebsocketMessage) => WebsocketMessage.id === action.payload.WebsocketMessageId);
            if (WebsocketMessage) {
                //  WebsocketMessage[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { WebsocketMessageAdded, WebsocketMessageValueToggled, WebsocketMessagepropertySet } = WebsocketMessageSlice.actions;
export default WebsocketMessageSlice.reducer;
//# sourceMappingURL=WebsocketMessageReducer.js.map