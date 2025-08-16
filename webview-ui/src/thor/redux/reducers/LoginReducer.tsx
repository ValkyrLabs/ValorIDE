import { createSlice } from "@reduxjs/toolkit";

import { Login } from '../../model/Login';

const LoginSlice = createSlice({
  name: "Logins",
  initialState: [],

  reducers: {
    LoginAdded(state, action) {
      state.push(action.payload);
    },

    LoginValueToggled(state, action) {
      console.log("Login TOGGLE")
      console.warn(JSON.stringify(action))
      const Login:Login = state.find((Login) => Login.id === action.payload.LoginId);
      if (Login) {
        if (action.payload.target === "SOMETHING") {
          
        }
      }
    },
    
    LoginpropertySet(state, action) {
      const Login = state.find((Login) => Login.id === action.payload.LoginId);
      if (Login) {
      //  Login[action.property] = action.payload[action.property];
      }
    },
  },
});

export const {
  LoginAdded,
  LoginValueToggled,
  LoginpropertySet
} = LoginSlice.actions;
export default LoginSlice.reducer;
