import { createSlice } from "@reduxjs/toolkit";
const ChartSeriesSlice = createSlice({
    name: "ChartSeriess",
    initialState: [],
    reducers: {
        ChartSeriesAdded(state, action) {
            state.push(action.payload);
        },
        ChartSeriesValueToggled(state, action) {
            console.log("ChartSeries TOGGLE");
            console.warn(JSON.stringify(action));
            const ChartSeries = state.find((ChartSeries) => ChartSeries.id === action.payload.ChartSeriesId);
            if (ChartSeries) {
                if (action.payload.target === "SOMETHING") {
                }
            }
        },
        ChartSeriespropertySet(state, action) {
            const ChartSeries = state.find((ChartSeries) => ChartSeries.id === action.payload.ChartSeriesId);
            if (ChartSeries) {
                //  ChartSeries[action.property] = action.payload[action.property];
            }
        },
    },
});
export const { ChartSeriesAdded, ChartSeriesValueToggled, ChartSeriespropertySet } = ChartSeriesSlice.actions;
export default ChartSeriesSlice.reducer;
//# sourceMappingURL=ChartSeriesReducer.js.map