import { createSlice } from "@reduxjs/toolkit"

import { OasRequired } from "../../model/OasRequired"

const OasRequiredSlice = createSlice({
	name: "OasRequireds",
	initialState: [],

	reducers: {
		OasRequiredAdded(state, action) {
			state.push(action.payload)
		},

		OasRequiredValueToggled(state, action) {
			console.log("OasRequired TOGGLE")
			console.warn(JSON.stringify(action))
			const OasRequired: OasRequired = state.find((OasRequired) => OasRequired.id === action.payload.OasRequiredId)
			if (OasRequired) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		OasRequiredpropertySet(state, action) {
			const OasRequired = state.find((OasRequired) => OasRequired.id === action.payload.OasRequiredId)
			if (OasRequired) {
				//  OasRequired[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { OasRequiredAdded, OasRequiredValueToggled, OasRequiredpropertySet } = OasRequiredSlice.actions
export default OasRequiredSlice.reducer
