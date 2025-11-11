import { jsx as _jsx } from "react/jsx-runtime";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
// Initialize Thor/STOMP bridge so CommunicationService can relay to mothership
import "./P2P/thorBridge";
// import reportWebVitals from "./reportWebVitals"
import { initThemes } from "./themes";
initThemes();
import "./themes/valkyr/bootstrap.css";
import "./App.css";
import "./index.css";
import { Provider } from "react-redux";
import store from "./redux/store";
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(_jsx(Provider, { store: store, children: _jsx(MemoryRouter, { children: _jsx(App, {}) }) }));
//# sourceMappingURL=main.js.map