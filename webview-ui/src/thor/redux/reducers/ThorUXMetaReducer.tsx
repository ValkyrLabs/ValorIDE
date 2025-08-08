import { createSlice } from "@reduxjs/toolkit"

import { ThorUXMeta } from "../../model/ThorUXMeta"

const ThorUXMetaSlice = createSlice({
	name: "ThorUXMetas",
	initialState: [],

	reducers: {
		ThorUXMetaAdded(state, action) {
			state.push(action.payload)
		},

		ThorUXMetaValueToggled(state, action) {
			console.log("ThorUXMeta TOGGLE")
			console.warn(JSON.stringify(action))
			const ThorUXMeta: ThorUXMeta = state.find((ThorUXMeta) => ThorUXMeta.id === action.payload.ThorUXMetaId)
			if (ThorUXMeta) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		ThorUXMetapropertySet(state, action) {
			const ThorUXMeta = state.find((ThorUXMeta) => ThorUXMeta.id === action.payload.ThorUXMetaId)
			if (ThorUXMeta) {
				//  ThorUXMeta[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { ThorUXMetaAdded, ThorUXMetaValueToggled, ThorUXMetapropertySet } = ThorUXMetaSlice.actions
export default ThorUXMetaSlice.reducer
