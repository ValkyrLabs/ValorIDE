import { createSlice } from "@reduxjs/toolkit";

import { MediaObject } from '../../model/MediaObject';

const MediaObjectSlice = createSlice({
  name: "MediaObjects",
  initialState: [],

  reducers: {
    MediaObjectAdded(state, action) {
      state.push(action.payload);
    },

    MediaObjectValueToggled(state, action) {
      console.log("MediaObject TOGGLE")
      console.warn(JSON.stringify(action))
      const MediaObject:MediaObject = state.find((MediaObject) => MediaObject.id === action.payload.MediaObjectId);
      if (MediaObject) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    MediaObjectpropertySet(state, action) {
      const MediaObject = state.find((MediaObject) => MediaObject.id === action.payload.MediaObjectId);
      if (MediaObject) {
      //  MediaObject[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  MediaObjectAdded,
  MediaObjectValueToggled,
  MediaObjectpropertySet
} = MediaObjectSlice.actions;
export default MediaObjectSlice.reducer;
