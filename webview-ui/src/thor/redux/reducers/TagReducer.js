import { createSlice } from "@reduxjs/toolkit";
const TagSlice = createSlice({
    name: "Tags",
    initialState: [],
    reducers: {
        TagAdded(state, action) {
            state.push(action.payload);
        },
        TagValueToggled(state, action) {
            console.log("Tag TOGGLE");
            console.warn(JSON.stringify(action));
            const Tag = state.find((Tag) => Tag.id === action.payload.TagId);
            if (Tag) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        TagpropertySet(state, action) {
            const Tag = state.find((Tag) => Tag.id === action.payload.TagId);
            if (Tag) {
                //  Tag[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { TagAdded, TagValueToggled, TagpropertySet } = TagSlice.actions;
export default TagSlice.reducer;
//# sourceMappingURL=TagReducer.js.map