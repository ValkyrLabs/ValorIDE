import { createSlice } from "@reduxjs/toolkit";
const ContentDataSlice = createSlice({
    name: "ContentDatas",
    initialState: [],
    reducers: {
        ContentDataAdded(state, action) {
            state.push(action.payload);
        },
        ContentDataValueToggled(state, action) {
            console.log("ContentData TOGGLE");
            console.warn(JSON.stringify(action));
            const ContentData = state.find((ContentData) => ContentData.id === action.payload.ContentDataId);
            if (ContentData) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ContentDatapropertySet(state, action) {
            const ContentData = state.find((ContentData) => ContentData.id === action.payload.ContentDataId);
            if (ContentData) {
                //  ContentData[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ContentDataAdded, ContentDataValueToggled, ContentDatapropertySet } = ContentDataSlice.actions;
export default ContentDataSlice.reducer;
//# sourceMappingURL=ContentDataReducer.js.map