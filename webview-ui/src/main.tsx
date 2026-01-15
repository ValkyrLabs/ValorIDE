import type { JSXElementConstructor } from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
// Initialize ThorAPI/STOMP bridge so CommunicationService can relay to mothership
import "./P2P/thorBridge";

// import reportWebVitals from "./reportWebVitals"

import { initThemes, setTheme } from "./themes";
initThemes();

const ensureVsCodeBridge = () => {
  if (typeof window === "undefined") return;

  const hasAcquireVsCodeApi =
    typeof (globalThis as any).acquireVsCodeApi === "function";

  if (hasAcquireVsCodeApi) {
    // Some parts of the webview still reference `window.vscode` directly.
    // Expose our wrapper so those code paths work in VS Code without falling
    // back to localhost fetches (blocked by webview CSP).
    (window as any).vscode = vscode;
    return;
  }

  // In dev/preview mode there's no `acquireVsCodeApi`; provide a fallback that
  // logs payloads and POSTs them to a local capture server for diagnostics.
  if (!(window as any)?.vscode?.postMessage) {
    (window as any).vscode = {
      postMessage: (payload: any) => {
        try {
          console.log("__WEBVIEW_POST_MESSAGE__" + JSON.stringify(payload));
          if (typeof fetch === "function") {
            fetch("http://localhost:3001/webview-error", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }).catch((err) =>
              console.warn("Failed to post to local error server", err),
            );
          }
        } catch {
          // ignore
        }
      },
    };
  }
};

ensureVsCodeBridge();

// On load, request current theme from VSCode extension host
try {
  vscode.postMessage({ type: "requestTheme" });
} catch {
  // ignore
}

// Listen for VSCode theme messages and sync Valkyr theme
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (msg && msg.type === "theme" && msg.text) {
    try {
      // Try to detect dark/light from the theme name or content
      const themeObj = JSON.parse(msg.text);
      // Heuristic: if theme name or type contains 'dark', use dark, else use valkyr (light)
      let themeName = "valkyr";
      if (themeObj && (themeObj.name || themeObj.type)) {
        const n = String(themeObj.name || themeObj.type || "").toLowerCase();
        if (n.includes("dark")) themeName = "dark";
      }
      setTheme(themeName);
    } catch (e) {
      // fallback: do nothing
    }
  }
});
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

import ErrorBoundary from "./components/common/ErrorBoundary";

root.render(
  <ReduxProvider store={store}>
    <MemoryRouter>
      <ErrorBoundary
        title="Webview root failed to render"
        context={{
          component: "main.tsx root",
          location: typeof window !== "undefined" ? window.location.href : "",
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }}
      >
        <App />
      </ErrorBoundary>
    </MemoryRouter>
  </ReduxProvider>,
);

// Global error handlers to report back to extension for diagnostics
window.addEventListener("error", (event) => {
  try {
    const err = (event as any).error;
    (vscode as any).postMessage({
      type: "webviewError",
      text: event.message || String(err?.message ?? err),
      filename: (event as any).filename || null,
      lineno: (event as any).lineno ?? null,
      colno: (event as any).colno ?? null,
      stack: err?.stack ?? null,
    });
  } catch (e) {
    console.error("Failed to post webview error to extension:", e);
  }
  // Show a visible overlay in the webview so users see an error instead of a blank screen
  try {
    const existing = document.getElementById("__webview-global-error");
    if (!existing) {
      const container = document.createElement("div");
      container.id = "__webview-global-error";
      container.style.position = "fixed";
      container.style.left = "12px";
      container.style.top = "12px";
      container.style.zIndex = "99999";
      container.style.background = "rgba(255,0,0,0.08)";
      container.style.color = "var(--vscode-editor-foreground)";
      container.style.border = "1px solid rgba(255,0,0,0.12)";
      container.style.padding = "12px";
      container.style.borderRadius = "6px";
      container.innerText = `${String(event.message || "An unexpected error occurred")}`;
      const reload = document.createElement("button");
      reload.innerText = "Reload View";
      reload.style.marginLeft = "8px";
      reload.onclick = () => location.reload();
      container.appendChild(reload);
      document.body.appendChild(container);
    }
  } catch (e) {
    // ignore overlay errors
  }
});

window.addEventListener("unhandledrejection", (event) => {
  try {
    const reason = (event as any).reason;
    (vscode as any).postMessage({
      type: "webviewError",
      text: String(reason?.message ?? reason),
      stack: reason?.stack ?? null,
    });
  } catch (e) {
    console.error("Failed to post webview rejection to extension:", e);
  }
  try {
    const existing = document.getElementById("__webview-global-error");
    if (!existing) {
      const container = document.createElement("div");
      container.id = "__webview-global-error";
      container.style.position = "fixed";
      container.style.left = "12px";
      container.style.top = "12px";
      container.style.zIndex = "99999";
      container.style.background = "rgba(255,0,0,0.08)";
      container.style.color = "var(--vscode-editor-foreground)";
      container.style.border = "1px solid rgba(255,0,0,0.12)";
      container.style.padding = "12px";
      container.style.borderRadius = "6px";
      container.innerText = `Unhandled rejection: ${String((event as any).reason ?? "")}`;
      const reload = document.createElement("button");
      reload.innerText = "Reload View";
      reload.style.marginLeft = "8px";
      reload.onclick = () => location.reload();
      container.appendChild(reload);
      document.body.appendChild(container);
    }
  } catch (e) {
    // ignore
  }
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals()
