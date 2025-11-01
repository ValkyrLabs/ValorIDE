import { createSlice } from "@reduxjs/toolkit";

import { Expense } from '@thor/model/Expense';

const ExpenseSlice = createSlice({
  name: "Expenses",
  initialState: [],

  reducers: {
    ExpenseAdded(state, action) {
      state.push(action.payload);
    },

    ExpenseValueToggled(state, action) {
      console.log("Expense TOGGLE")
      console.warn(JSON.stringify(action))
      const Expense:Expense = state.find((Expense) => Expense.id === action.payload.ExpenseId);
      if (Expense) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ExpensepropertySet(state, action) {
      const Expense = state.find((Expense) => Expense.id === action.payload.ExpenseId);
      if (Expense) {
      //  Expense[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ExpenseAdded,
  ExpenseValueToggled,
  ExpensepropertySet
} = ExpenseSlice.actions;
export default ExpenseSlice.reducer;
