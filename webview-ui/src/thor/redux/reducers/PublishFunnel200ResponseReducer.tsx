import { createSlice } from "@reduxjs/toolkit";

import { PublishFunnel200Response } from '@thor/model/PublishFunnel200Response';

const PublishFunnel200ResponseSlice = createSlice({
  name: "PublishFunnel200Responses",
  initialState: [],

  reducers: {
    PublishFunnel200ResponseAdded(state, action) {
      state.push(action.payload);
    },

    PublishFunnel200ResponseValueToggled(state, action) {
      console.log("PublishFunnel200Response TOGGLE")
      console.warn(JSON.stringify(action))
      const PublishFunnel200Response:PublishFunnel200Response = state.find((PublishFunnel200Response) => PublishFunnel200Response.id === action.payload.PublishFunnel200ResponseId);
      if (PublishFunnel200Response) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    PublishFunnel200ResponsepropertySet(state, action) {
      const PublishFunnel200Response = state.find((PublishFunnel200Response) => PublishFunnel200Response.id === action.payload.PublishFunnel200ResponseId);
      if (PublishFunnel200Response) {
      //  PublishFunnel200Response[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PublishFunnel200ResponseAdded,
  PublishFunnel200ResponseValueToggled,
  PublishFunnel200ResponsepropertySet
} = PublishFunnel200ResponseSlice.actions;
export default PublishFunnel200ResponseSlice.reducer;
