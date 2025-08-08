import { createSlice } from "@reduxjs/toolkit"

import { ContentMediaLink } from "../../model/ContentMediaLink"

const ContentMediaLinkSlice = createSlice({
	name: "ContentMediaLinks",
	initialState: [],

	reducers: {
		ContentMediaLinkAdded(state, action) {
			state.push(action.payload)
		},

		ContentMediaLinkValueToggled(state, action) {
			console.log("ContentMediaLink TOGGLE")
			console.warn(JSON.stringify(action))
			const ContentMediaLink: ContentMediaLink = state.find(
				(ContentMediaLink) => ContentMediaLink.id === action.payload.ContentMediaLinkId,
			)
			if (ContentMediaLink) {
				if (action.payload.target === "SOMETHING") {
				}
			}
		},

		ContentMediaLinkpropertySet(state, action) {
			const ContentMediaLink = state.find((ContentMediaLink) => ContentMediaLink.id === action.payload.ContentMediaLinkId)
			if (ContentMediaLink) {
				//  ContentMediaLink[action.property] = action.payload[action.property];
			}
		},
	},
})

export const { ContentMediaLinkAdded, ContentMediaLinkValueToggled, ContentMediaLinkpropertySet } = ContentMediaLinkSlice.actions
export default ContentMediaLinkSlice.reducer
