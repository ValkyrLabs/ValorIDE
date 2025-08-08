import { createSlice } from "@reduxjs/toolkit"

import { SalesPipeline } from "../../model/SalesPipeline"

const SalesPipelineSlice = createSlice({
	name: "SalesPipelines",
	initialState: [],

	reducers: {
		SalesPipelineAdded(state, action) {
			state.push(action.payload)
		},

		SalesPipelineValueToggled(state, action) {
			console.log("SalesPipeline TOGGLE")
			console.warn(JSON.stringify(action))
			const SalesPipeline: SalesPipeline = state.find(
				(SalesPipeline) => SalesPipeline.id === action.payload.SalesPipelineId,
			)
			if (SalesPipeline) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		SalesPipelinepropertySet(state, action) {
			const SalesPipeline = state.find((SalesPipeline) => SalesPipeline.id === action.payload.SalesPipelineId)
			if (SalesPipeline) {
				//  SalesPipeline[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { SalesPipelineAdded, SalesPipelineValueToggled, SalesPipelinepropertySet } = SalesPipelineSlice.actions
export default SalesPipelineSlice.reducer
