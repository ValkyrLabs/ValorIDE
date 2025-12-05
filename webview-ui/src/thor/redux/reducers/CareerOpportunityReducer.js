import { createSlice } from "@reduxjs/toolkit";
const CareerOpportunitySlice = createSlice({
    name: "CareerOpportunitys",
    initialState: [],
    reducers: {
        CareerOpportunityAdded(state, action) {
            state.push(action.payload);
        },
        CareerOpportunityValueToggled(state, action) {
            console.log("CareerOpportunity TOGGLE");
            console.warn(JSON.stringify(action));
            const CareerOpportunity = state.find((CareerOpportunity) => CareerOpportunity.id === action.payload.CareerOpportunityId);
            if (CareerOpportunity) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        CareerOpportunitypropertySet(state, action) {
            const CareerOpportunity = state.find((CareerOpportunity) => CareerOpportunity.id === action.payload.CareerOpportunityId);
            if (CareerOpportunity) {
                //  CareerOpportunity[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { CareerOpportunityAdded, CareerOpportunityValueToggled, CareerOpportunitypropertySet, } = CareerOpportunitySlice.actions;
export default CareerOpportunitySlice.reducer;
//# sourceMappingURL=CareerOpportunityReducer.js.map