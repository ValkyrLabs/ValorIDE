import { createSlice } from "@reduxjs/toolkit";
const ActivateAgent200ResponseSlice = createSlice({
    name: "ActivateAgent200Responses",
    initialState: [],
    reducers: {
        ActivateAgent200ResponseAdded(state, action) {
            state.push(action.payload);
        },
        ActivateAgent200ResponseValueToggled(state, action) {
            console.log("ActivateAgent200Response TOGGLE");
            console.warn(JSON.stringify(action));
            const ActivateAgent200Response = state.find((ActivateAgent200Response) => ActivateAgent200Response.id === action.payload.ActivateAgent200ResponseId);
            if (ActivateAgent200Response) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ActivateAgent200ResponsepropertySet(state, action) {
            const ActivateAgent200Response = state.find((ActivateAgent200Response) => ActivateAgent200Response.id === action.payload.ActivateAgent200ResponseId);
            if (ActivateAgent200Response) {
                //  ActivateAgent200Response[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ActivateAgent200ResponseAdded, ActivateAgent200ResponseValueToggled, ActivateAgent200ResponsepropertySet } = ActivateAgent200ResponseSlice.actions;
export default ActivateAgent200ResponseSlice.reducer;
//# sourceMappingURL=ActivateAgent200ResponseReducer.js.map