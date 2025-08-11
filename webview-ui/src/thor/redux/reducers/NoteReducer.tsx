import { createSlice } from "@reduxjs/toolkit";

import { Note } from "../../model/Note";

const NoteSlice = createSlice({
  name: "Notes",
  initialState: [],

  reducers: {
    NoteAdded(state, action) {
      state.push(action.payload);
    },

    NoteValueToggled(state, action) {
      console.log("Note TOGGLE");
      console.warn(JSON.stringify(action));
      const Note: Note = state.find(
        (Note) => Note.id === action.payload.NoteId,
      );
      if (Note) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    NotepropertySet(state, action) {
      const Note = state.find((Note) => Note.id === action.payload.NoteId);
      if (Note) {
        //  Note[action.property] = action.payload[action.property];
      }
    },
  },
});

export const { NoteAdded, NoteValueToggled, NotepropertySet } =
  NoteSlice.actions;
export default NoteSlice.reducer;
