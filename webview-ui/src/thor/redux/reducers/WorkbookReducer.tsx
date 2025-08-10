import { createSlice } from "@reduxjs/toolkit";

import { Workbook } from "../../model/Workbook";

const WorkbookSlice = createSlice({
  name: "Workbooks",
  initialState: [],

  reducers: {
    WorkbookAdded(state, action) {
      state.push(action.payload);
    },

    WorkbookValueToggled(state, action) {
      console.log("Workbook TOGGLE");
      console.warn(JSON.stringify(action));
      const Workbook: Workbook = state.find(
        (Workbook) => Workbook.id === action.payload.WorkbookId,
      );
      if (Workbook) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    WorkbookpropertySet(state, action) {
      const Workbook = state.find(
        (Workbook) => Workbook.id === action.payload.WorkbookId,
      );
      if (Workbook) {
        //  Workbook[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { WorkbookAdded, WorkbookValueToggled, WorkbookpropertySet } =
  WorkbookSlice.actions;
export default WorkbookSlice.reducer;
