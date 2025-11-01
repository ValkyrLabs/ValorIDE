import { createSlice } from "@reduxjs/toolkit";

import { SwarmGraphSnapshot } from '@thor/model/SwarmGraphSnapshot';

const SwarmGraphSnapshotSlice = createSlice({
  name: "SwarmGraphSnapshots",
  initialState: [],

  reducers: {
    SwarmGraphSnapshotAdded(state, action) {
      state.push(action.payload);
    },

    SwarmGraphSnapshotValueToggled(state, action) {
      console.log("SwarmGraphSnapshot TOGGLE")
      console.warn(JSON.stringify(action))
      const SwarmGraphSnapshot:SwarmGraphSnapshot = state.find((SwarmGraphSnapshot) => SwarmGraphSnapshot.id === action.payload.SwarmGraphSnapshotId);
      if (SwarmGraphSnapshot) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    SwarmGraphSnapshotpropertySet(state, action) {
      const SwarmGraphSnapshot = state.find((SwarmGraphSnapshot) => SwarmGraphSnapshot.id === action.payload.SwarmGraphSnapshotId);
      if (SwarmGraphSnapshot) {
      //  SwarmGraphSnapshot[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  SwarmGraphSnapshotAdded,
  SwarmGraphSnapshotValueToggled,
  SwarmGraphSnapshotpropertySet
} = SwarmGraphSnapshotSlice.actions;
export default SwarmGraphSnapshotSlice.reducer;
