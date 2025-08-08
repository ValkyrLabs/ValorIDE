import { createSlice } from "@reduxjs/toolkit"

import { KeyMetric } from "../../model/KeyMetric"

const KeyMetricSlice = createSlice({
	name: "KeyMetrics",
	initialState: [],

	reducers: {
		KeyMetricAdded(state, action) {
			state.push(action.payload)
		},

		KeyMetricValueToggled(state, action) {
			console.log("KeyMetric TOGGLE")
			console.warn(JSON.stringify(action))
			const KeyMetric: KeyMetric = state.find((KeyMetric) => KeyMetric.id === action.payload.KeyMetricId)
			if (KeyMetric) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		KeyMetricpropertySet(state, action) {
			const KeyMetric = state.find((KeyMetric) => KeyMetric.id === action.payload.KeyMetricId)
			if (KeyMetric) {
				//  KeyMetric[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { KeyMetricAdded, KeyMetricValueToggled, KeyMetricpropertySet } = KeyMetricSlice.actions
export default KeyMetricSlice.reducer
