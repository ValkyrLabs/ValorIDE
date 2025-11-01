import { createSlice } from "@reduxjs/toolkit";

import { GeneralLedgerEntry } from '@thor/model/GeneralLedgerEntry';

const GeneralLedgerEntrySlice = createSlice({
  name: "GeneralLedgerEntrys",
  initialState: [],

  reducers: {
    GeneralLedgerEntryAdded(state, action) {
      state.push(action.payload);
    },

    GeneralLedgerEntryValueToggled(state, action) {
      console.log("GeneralLedgerEntry TOGGLE")
      console.warn(JSON.stringify(action))
      const GeneralLedgerEntry:GeneralLedgerEntry = state.find((GeneralLedgerEntry) => GeneralLedgerEntry.id === action.payload.GeneralLedgerEntryId);
      if (GeneralLedgerEntry) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    GeneralLedgerEntrypropertySet(state, action) {
      const GeneralLedgerEntry = state.find((GeneralLedgerEntry) => GeneralLedgerEntry.id === action.payload.GeneralLedgerEntryId);
      if (GeneralLedgerEntry) {
      //  GeneralLedgerEntry[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  GeneralLedgerEntryAdded,
  GeneralLedgerEntryValueToggled,
  GeneralLedgerEntrypropertySet
} = GeneralLedgerEntrySlice.actions;
export default GeneralLedgerEntrySlice.reducer;
