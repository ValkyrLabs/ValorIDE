import { createSlice } from "@reduxjs/toolkit";

import { Stack } from '@thor/model/Stack';

const StackSlice = createSlice({
  name: "Stacks",
  initialState: [],

  reducers: {
    StackAdded(state, action) {
      state.push(action.payload);
    },

    StackValueToggled(state, action) {
      console.log("Stack TOGGLE")
      console.warn(JSON.stringify(action))
      const Stack:Stack = state.find((Stack) => Stack.id === action.payload.StackId);
      if (Stack) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    StackpropertySet(state, action) {
      const Stack = state.find((Stack) => Stack.id === action.payload.StackId);
      if (Stack) {
      //  Stack[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  StackAdded,
  StackValueToggled,
  StackpropertySet
} = StackSlice.actions;
export default StackSlice.reducer;
