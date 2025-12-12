import type { JSXElementConstructor } from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
// Initialize ThorAPI/STOMP bridge so CommunicationService can relay to mothership
import "./P2P/thorBridge";

// import reportWebVitals from "./reportWebVitals"

import { initThemes } from "./themes";
initThemes();
import "./themes/valkyr/bootstrap.css";
import "./App.css";
import "./index.css";
import "antd/dist/reset.css";

import type { ProviderProps } from "react-redux";
import { Provider } from "react-redux";
import store from "./redux/store";
import { vscode } from "@thorapi/utils/vscode";

const ReduxProvider =
  Provider as unknown as JSXElementConstructor<ProviderProps>;

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(
  <ReduxProvider store={store}>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </ReduxProvider>,
);

// Global error handlers to report back to extension for diagnostics
window.addEventListener("error", (event) => {
  try {
    vscode.postMessage({ type: "webviewError", text: event.message, });
  } catch (e) {
    console.error("Failed to post webview error to extension:", e);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  try {
    const reason = (event as any).reason;
    vscode.postMessage({ type: "webviewError", text: String(reason?.message ?? reason), });
  } catch (e) {
    console.error("Failed to post webview rejection to extension:", e);
  }
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals()
