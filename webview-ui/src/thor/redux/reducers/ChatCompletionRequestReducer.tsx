import { createSlice } from "@reduxjs/toolkit";

import { ChatCompletionRequest } from '../../model/ChatCompletionRequest';

const ChatCompletionRequestSlice = createSlice({
  name: "ChatCompletionRequests",
  initialState: [],

  reducers: {
    ChatCompletionRequestAdded(state, action) {
      state.push(action.payload);
    },

    ChatCompletionRequestValueToggled(state, action) {
      console.log("ChatCompletionRequest TOGGLE")
      console.warn(JSON.stringify(action))
      const ChatCompletionRequest:ChatCompletionRequest = state.find((ChatCompletionRequest) => ChatCompletionRequest.id === action.payload.ChatCompletionRequestId);
      if (ChatCompletionRequest) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    ChatCompletionRequestpropertySet(state, action) {
      const ChatCompletionRequest = state.find((ChatCompletionRequest) => ChatCompletionRequest.id === action.payload.ChatCompletionRequestId);
      if (ChatCompletionRequest) {
      //  ChatCompletionRequest[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  ChatCompletionRequestAdded,
  ChatCompletionRequestValueToggled,
  ChatCompletionRequestpropertySet
} = ChatCompletionRequestSlice.actions;
export default ChatCompletionRequestSlice.reducer;
