import { createSlice } from "@reduxjs/toolkit"

import { SalesActivity } from "../../model/SalesActivity"

const SalesActivitySlice = createSlice({
	name: "SalesActivitys",
	initialState: [],

	reducers: {
		SalesActivityAdded(state, action) {
			state.push(action.payload)
		},

		SalesActivityValueToggled(state, action) {
			console.log("SalesActivity TOGGLE")
			console.warn(JSON.stringify(action))
			const SalesActivity: SalesActivity = state.find(
				(SalesActivity) => SalesActivity.id === action.payload.SalesActivityId,
			)
			if (SalesActivity) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		SalesActivitypropertySet(state, action) {
			const SalesActivity = state.find((SalesActivity) => SalesActivity.id === action.payload.SalesActivityId)
			if (SalesActivity) {
				//  SalesActivity[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { SalesActivityAdded, SalesActivityValueToggled, SalesActivitypropertySet } = SalesActivitySlice.actions
export default SalesActivitySlice.reducer
