import { createSlice } from "@reduxjs/toolkit";

import { Invoice } from '../../model/Invoice';

const InvoiceSlice = createSlice({
  name: "Invoices",
  initialState: [],

  reducers: {
    InvoiceAdded(state, action) {
      state.push(action.payload);
    },

    InvoiceValueToggled(state, action) {
      console.log("Invoice TOGGLE")
      console.warn(JSON.stringify(action))
      const Invoice:Invoice = state.find((Invoice) => Invoice.id === action.payload.InvoiceId);
      if (Invoice) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    InvoicepropertySet(state, action) {
      const Invoice = state.find((Invoice) => Invoice.id === action.payload.InvoiceId);
      if (Invoice) {
      //  Invoice[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  InvoiceAdded,
  InvoiceValueToggled,
  InvoicepropertySet
} = InvoiceSlice.actions;
export default InvoiceSlice.reducer;
