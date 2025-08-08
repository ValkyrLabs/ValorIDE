import { createSlice } from "@reduxjs/toolkit"

import { SecureKey } from "../../model/SecureKey"

const SecureKeySlice = createSlice({
	name: "SecureKeys",
	initialState: [],

	reducers: {
		SecureKeyAdded(state, action) {
			state.push(action.payload)
		},

		SecureKeyValueToggled(state, action) {
			console.log("SecureKey TOGGLE")
			console.warn(JSON.stringify(action))
			const SecureKey: SecureKey = state.find((SecureKey) => SecureKey.id === action.payload.SecureKeyId)
			if (SecureKey) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		SecureKeypropertySet(state, action) {
			const SecureKey = state.find((SecureKey) => SecureKey.id === action.payload.SecureKeyId)
			if (SecureKey) {
				//  SecureKey[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { SecureKeyAdded, SecureKeyValueToggled, SecureKeypropertySet } = SecureKeySlice.actions
export default SecureKeySlice.reducer
