import { createSlice } from "@reduxjs/toolkit";

import { PivotTable } from '../../model/PivotTable';

const PivotTableSlice = createSlice({
  name: "PivotTables",
  initialState: [],

  reducers: {
    PivotTableAdded(state, action) {
      state.push(action.payload);
    },

    PivotTableValueToggled(state, action) {
      console.log("PivotTable TOGGLE")
      console.warn(JSON.stringify(action))
      const PivotTable:PivotTable = state.find((PivotTable) => PivotTable.id === action.payload.PivotTableId);
      if (PivotTable) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    PivotTablepropertySet(state, action) {
      const PivotTable = state.find((PivotTable) => PivotTable.id === action.payload.PivotTableId);
      if (PivotTable) {
      //  PivotTable[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PivotTableAdded,
  PivotTableValueToggled,
  PivotTablepropertySet
} = PivotTableSlice.actions;
export default PivotTableSlice.reducer;
