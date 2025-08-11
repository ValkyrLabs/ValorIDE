import { createSlice } from "@reduxjs/toolkit";

import { Border } from "../../model/Border";

const BorderSlice = createSlice({
  name: "Borders",
  initialState: [],

  reducers: {
    BorderAdded(state, action) {
      state.push(action.payload);
    },

    BorderValueToggled(state, action) {
      console.log("Border TOGGLE");
      console.warn(JSON.stringify(action));
      const Border: Border = state.find(
        (Border) => Border.id === action.payload.BorderId,
      );
      if (Border) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    BorderpropertySet(state, action) {
      const Border = state.find(
        (Border) => Border.id === action.payload.BorderId,
      );
      if (Border) {
        //  Border[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { BorderAdded, BorderValueToggled, BorderpropertySet } =
  BorderSlice.actions;
export default BorderSlice.reducer;
