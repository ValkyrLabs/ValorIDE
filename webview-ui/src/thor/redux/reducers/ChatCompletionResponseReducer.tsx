import { createSlice } from "@reduxjs/toolkit";

import { ChatCompletionResponse } from "../../model/ChatCompletionResponse";

const ChatCompletionResponseSlice = createSlice({
  name: "ChatCompletionResponses",
  initialState: [],

  reducers: {
    ChatCompletionResponseAdded(state, action) {
      state.push(action.payload);
    },

    ChatCompletionResponseValueToggled(state, action) {
      console.log("ChatCompletionResponse TOGGLE");
      console.warn(JSON.stringify(action));
      const ChatCompletionResponse: ChatCompletionResponse = state.find(
        (ChatCompletionResponse) =>
          ChatCompletionResponse.id === action.payload.ChatCompletionResponseId,
      );
      if (ChatCompletionResponse) {
        if (action.payload.target === "SOMETHING") {
        }
      }
    },

    ChatCompletionResponsepropertySet(state, action) {
      const ChatCompletionResponse = state.find(
        (ChatCompletionResponse) =>
          ChatCompletionResponse.id === action.payload.ChatCompletionResponseId,
      );
      if (ChatCompletionResponse) {
        //  ChatCompletionResponse[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ChatCompletionResponseAdded,
  ChatCompletionResponseValueToggled,
  ChatCompletionResponsepropertySet,
} = ChatCompletionResponseSlice.actions;
export default ChatCompletionResponseSlice.reducer;
