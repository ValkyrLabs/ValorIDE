import { createSlice } from "@reduxjs/toolkit";

import { OasSecurityScheme } from '../../model/OasSecurityScheme';

const OasSecuritySchemeSlice = createSlice({
  name: "OasSecuritySchemes",
  initialState: [],

  reducers: {
    OasSecuritySchemeAdded(state, action) {
      state.push(action.payload);
    },

    OasSecuritySchemeValueToggled(state, action) {
      console.log("OasSecurityScheme TOGGLE")
      console.warn(JSON.stringify(action))
      const OasSecurityScheme:OasSecurityScheme = state.find((OasSecurityScheme) => OasSecurityScheme.id === action.payload.OasSecuritySchemeId);
      if (OasSecurityScheme) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    OasSecuritySchemepropertySet(state, action) {
      const OasSecurityScheme = state.find((OasSecurityScheme) => OasSecurityScheme.id === action.payload.OasSecuritySchemeId);
      if (OasSecurityScheme) {
      //  OasSecurityScheme[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  OasSecuritySchemeAdded,
  OasSecuritySchemeValueToggled,
  OasSecuritySchemepropertySet
} = OasSecuritySchemeSlice.actions;
export default OasSecuritySchemeSlice.reducer;
