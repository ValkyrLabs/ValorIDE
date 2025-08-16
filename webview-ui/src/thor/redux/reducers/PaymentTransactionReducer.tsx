import { createSlice } from "@reduxjs/toolkit";

import { PaymentTransaction } from '../../model/PaymentTransaction';

const PaymentTransactionSlice = createSlice({
  name: "PaymentTransactions",
  initialState: [],

  reducers: {
    PaymentTransactionAdded(state, action) {
      state.push(action.payload);
    },

    PaymentTransactionValueToggled(state, action) {
      console.log("PaymentTransaction TOGGLE")
      console.warn(JSON.stringify(action))
      const PaymentTransaction:PaymentTransaction = state.find((PaymentTransaction) => PaymentTransaction.id === action.payload.PaymentTransactionId);
      if (PaymentTransaction) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    PaymentTransactionpropertySet(state, action) {
      const PaymentTransaction = state.find((PaymentTransaction) => PaymentTransaction.id === action.payload.PaymentTransactionId);
      if (PaymentTransaction) {
      //  PaymentTransaction[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  PaymentTransactionAdded,
  PaymentTransactionValueToggled,
  PaymentTransactionpropertySet
} = PaymentTransactionSlice.actions;
export default PaymentTransactionSlice.reducer;
