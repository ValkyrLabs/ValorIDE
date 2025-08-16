import { createSlice } from "@reduxjs/toolkit";

import { OasObjectSchema } from '../../model/OasObjectSchema';

const OasObjectSchemaSlice = createSlice({
  name: "OasObjectSchemas",
  initialState: [],

  reducers: {
    OasObjectSchemaAdded(state, action) {
      state.push(action.payload);
    },

    OasObjectSchemaValueToggled(state, action) {
      console.log("OasObjectSchema TOGGLE")
      console.warn(JSON.stringify(action))
      const OasObjectSchema:OasObjectSchema = state.find((OasObjectSchema) => OasObjectSchema.id === action.payload.OasObjectSchemaId);
      if (OasObjectSchema) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    OasObjectSchemapropertySet(state, action) {
      const OasObjectSchema = state.find((OasObjectSchema) => OasObjectSchema.id === action.payload.OasObjectSchemaId);
      if (OasObjectSchema) {
      //  OasObjectSchema[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  OasObjectSchemaAdded,
  OasObjectSchemaValueToggled,
  OasObjectSchemapropertySet
} = OasObjectSchemaSlice.actions;
export default OasObjectSchemaSlice.reducer;
