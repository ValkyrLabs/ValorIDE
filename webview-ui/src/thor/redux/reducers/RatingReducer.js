import { createSlice } from "@reduxjs/toolkit";
const RatingSlice = createSlice({
    name: "Ratings",
    initialState: [],
    reducers: {
        RatingAdded(state, action) {
            state.push(action.payload);
        },
        RatingValueToggled(state, action) {
            console.log("Rating TOGGLE");
            console.warn(JSON.stringify(action));
            const Rating = state.find((Rating) => Rating.id === action.payload.RatingId);
            if (Rating) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        RatingpropertySet(state, action) {
            const Rating = state.find((Rating) => Rating.id === action.payload.RatingId);
            if (Rating) {
                //  Rating[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { RatingAdded, RatingValueToggled, RatingpropertySet } = RatingSlice.actions;
export default RatingSlice.reducer;
//# sourceMappingURL=RatingReducer.js.map