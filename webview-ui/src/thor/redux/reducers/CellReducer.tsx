import { createSlice } from "@reduxjs/toolkit"

import { Cell } from "../../model/Cell"

const CellSlice = createSlice({
	name: "Cells",
	initialState: [],

	reducers: {
		CellAdded(state, action) {
			state.push(action.payload)
		},

		CellValueToggled(state, action) {
			console.log("Cell TOGGLE")
			console.warn(JSON.stringify(action))
			const Cell: Cell = state.find((Cell) => Cell.id === action.payload.CellId)
			if (Cell) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		CellpropertySet(state, action) {
			const Cell = state.find((Cell) => Cell.id === action.payload.CellId)
			if (Cell) {
				//  Cell[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { CellAdded, CellValueToggled, CellpropertySet } = CellSlice.actions
export default CellSlice.reducer
