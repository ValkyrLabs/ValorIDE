import { createSlice } from "@reduxjs/toolkit"

import { AclObjectIdentity } from "../../model/AclObjectIdentity"

const AclObjectIdentitySlice = createSlice({
	name: "AclObjectIdentitys",
	initialState: [],

	reducers: {
		AclObjectIdentityAdded(state, action) {
			state.push(action.payload)
		},

		AclObjectIdentityValueToggled(state, action) {
			console.log("AclObjectIdentity TOGGLE")
			console.warn(JSON.stringify(action))
			const AclObjectIdentity: AclObjectIdentity = state.find(
				(AclObjectIdentity) => AclObjectIdentity.id === action.payload.AclObjectIdentityId,
			)
			if (AclObjectIdentity) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		AclObjectIdentitypropertySet(state, action) {
			const AclObjectIdentity = state.find(
				(AclObjectIdentity) => AclObjectIdentity.id === action.payload.AclObjectIdentityId,
			)
			if (AclObjectIdentity) {
				//  AclObjectIdentity[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { AclObjectIdentityAdded, AclObjectIdentityValueToggled, AclObjectIdentitypropertySet } =
	AclObjectIdentitySlice.actions
export default AclObjectIdentitySlice.reducer
