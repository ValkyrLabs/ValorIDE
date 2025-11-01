import { createSlice } from "@reduxjs/toolkit";

import { Budget } from '@thor/model/Budget';

const BudgetSlice = createSlice({
  name: "Budgets",
  initialState: [],

  reducers: {
    BudgetAdded(state, action) {
      state.push(action.payload);
    },

    BudgetValueToggled(state, action) {
      console.log("Budget TOGGLE")
      console.warn(JSON.stringify(action))
      const Budget:Budget = state.find((Budget) => Budget.id === action.payload.BudgetId);
      if (Budget) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    BudgetpropertySet(state, action) {
      const Budget = state.find((Budget) => Budget.id === action.payload.BudgetId);
      if (Budget) {
      //  Budget[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  BudgetAdded,
  BudgetValueToggled,
  BudgetpropertySet
} = BudgetSlice.actions;
export default BudgetSlice.reducer;
