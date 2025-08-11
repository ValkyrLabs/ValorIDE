import { createSlice } from "@reduxjs/toolkit";

import { Format } from "../../model/Format";

const FormatSlice = createSlice({
  name: "Formats",
  initialState: [],

  reducers: {
    FormatAdded(state, action) {
      state.push(action.payload);
    },

    FormatValueToggled(state, action) {
      console.log("Format TOGGLE");
      console.warn(JSON.stringify(action));
      const Format: Format = state.find(
        (Format) => Format.id === action.payload.FormatId,
      );
      if (Format) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    FormatpropertySet(state, action) {
      const Format = state.find(
        (Format) => Format.id === action.payload.FormatId,
      );
      if (Format) {
        //  Format[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { FormatAdded, FormatValueToggled, FormatpropertySet } =
  FormatSlice.actions;
export default FormatSlice.reducer;
