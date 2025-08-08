import { createSlice } from "@reduxjs/toolkit"

import { UserPreference } from "../../model/UserPreference"

const UserPreferenceSlice = createSlice({
	name: "UserPreferences",
	initialState: [],

	reducers: {
		UserPreferenceAdded(state, action) {
			state.push(action.payload)
		},

		UserPreferenceValueToggled(state, action) {
			console.log("UserPreference TOGGLE")
			console.warn(JSON.stringify(action))
			const UserPreference: UserPreference = state.find(
				(UserPreference) => UserPreference.id === action.payload.UserPreferenceId,
			)
			if (UserPreference) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		UserPreferencepropertySet(state, action) {
			const UserPreference = state.find((UserPreference) => UserPreference.id === action.payload.UserPreferenceId)
			if (UserPreference) {
				//  UserPreference[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { UserPreferenceAdded, UserPreferenceValueToggled, UserPreferencepropertySet } = UserPreferenceSlice.actions
export default UserPreferenceSlice.reducer
