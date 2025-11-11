import { createSlice } from "@reduxjs/toolkit";
const DigitalAssetSlice = createSlice({
    name: "DigitalAssets",
    initialState: [],
    reducers: {
        DigitalAssetAdded(state, action) {
            state.push(action.payload);
        },
        DigitalAssetValueToggled(state, action) {
            console.log("DigitalAsset TOGGLE");
            console.warn(JSON.stringify(action));
            const DigitalAsset = state.find((DigitalAsset) => DigitalAsset.id === action.payload.DigitalAssetId);
            if (DigitalAsset) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        DigitalAssetpropertySet(state, action) {
            const DigitalAsset = state.find((DigitalAsset) => DigitalAsset.id === action.payload.DigitalAssetId);
            if (DigitalAsset) {
                //  DigitalAsset[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { DigitalAssetAdded, DigitalAssetValueToggled, DigitalAssetpropertySet } = DigitalAssetSlice.actions;
export default DigitalAssetSlice.reducer;
//# sourceMappingURL=DigitalAssetReducer.js.map