import { createSlice } from "@reduxjs/toolkit"

import { BalanceResponse } from "../../model/BalanceResponse"

const BalanceResponseSlice = createSlice({
	name: "BalanceResponses",
	initialState: [],

	reducers: {
		BalanceResponseAdded(state, action) {
			state.push(action.payload)
		},

		BalanceResponseValueToggled(state, action) {
			console.log("BalanceResponse TOGGLE")
			console.warn(JSON.stringify(action))
			const BalanceResponse: BalanceResponse = state.find(
				(BalanceResponse) => BalanceResponse.id === action.payload.BalanceResponseId,
			)
			if (BalanceResponse) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		BalanceResponsepropertySet(state, action) {
			const BalanceResponse = state.find((BalanceResponse) => BalanceResponse.id === action.payload.BalanceResponseId)
			if (BalanceResponse) {
				//  BalanceResponse[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { BalanceResponseAdded, BalanceResponseValueToggled, BalanceResponsepropertySet } = BalanceResponseSlice.actions
export default BalanceResponseSlice.reducer
