import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import ReactDOM from "react-dom/client";
import App from "./App";
// Initialize Thor/STOMP bridge so CommunicationService can relay to mothership
import "./telecom/thorBridge";

// import reportWebVitals from "./reportWebVitals"
import "./App.css";
import "./index.css";

import { Provider } from "react-redux";
import store from "./redux/store";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <Provider store={store}>
    <App />
  </Provider>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals()
