import { createSlice } from "@reduxjs/toolkit"

import { MergeRange } from "../../model/MergeRange"

const MergeRangeSlice = createSlice({
	name: "MergeRanges",
	initialState: [],

	reducers: {
		MergeRangeAdded(state, action) {
			state.push(action.payload)
		},

		MergeRangeValueToggled(state, action) {
			console.log("MergeRange TOGGLE")
			console.warn(JSON.stringify(action))
			const MergeRange: MergeRange = state.find((MergeRange) => MergeRange.id === action.payload.MergeRangeId)
			if (MergeRange) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		MergeRangepropertySet(state, action) {
			const MergeRange = state.find((MergeRange) => MergeRange.id === action.payload.MergeRangeId)
			if (MergeRange) {
				//  MergeRange[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { MergeRangeAdded, MergeRangeValueToggled, MergeRangepropertySet } = MergeRangeSlice.actions
export default MergeRangeSlice.reducer
