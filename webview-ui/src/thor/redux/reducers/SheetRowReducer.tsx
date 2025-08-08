import { createSlice } from "@reduxjs/toolkit"

import { SheetRow } from "../../model/SheetRow"

const SheetRowSlice = createSlice({
	name: "SheetRows",
	initialState: [],

	reducers: {
		SheetRowAdded(state, action) {
			state.push(action.payload)
		},

		SheetRowValueToggled(state, action) {
			console.log("SheetRow TOGGLE")
			console.warn(JSON.stringify(action))
			const SheetRow: SheetRow = state.find((SheetRow) => SheetRow.id === action.payload.SheetRowId)
			if (SheetRow) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		SheetRowpropertySet(state, action) {
			const SheetRow = state.find((SheetRow) => SheetRow.id === action.payload.SheetRowId)
			if (SheetRow) {
				//  SheetRow[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { SheetRowAdded, SheetRowValueToggled, SheetRowpropertySet } = SheetRowSlice.actions
export default SheetRowSlice.reducer
