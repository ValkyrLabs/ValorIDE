import { randomBytes } from "crypto";

export const workflowStudioFrameOrigins = (launchUrl: string): string[] => {
  const launchOrigin = new URL(launchUrl).origin;
  const origins = new Set<string>([launchOrigin]);
  if (launchOrigin.endsWith(".valkyrlabs.com")) {
    origins.add("https://valkyrlabs.com");
    origins.add("https://*.valkyrlabs.com");
  } else {
    origins.add("http://localhost:*");
    origins.add("http://127.0.0.1:*");
  }
  return [...origins];
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const inlineScriptString = (value: string) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

export const workflowStudioWebviewHtml = (
  launchUrl: string,
  workflowName: string,
) => {
  const frameOrigins = workflowStudioFrameOrigins(launchUrl).join(" ");
  const nonce = randomBytes(16).toString("base64");
  const workflowNameScript = inlineScriptString(workflowName);
  const expectedWorkflowIdScript = inlineScriptString(
    new URL(launchUrl).searchParams.get("workflowId") || "",
  );
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${frameOrigins}; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(workflowName)} - Workflow Studio</title>
  <style>
    :root { color-scheme: dark; font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif); }
    html, body, main, iframe { width: 100%; height: 100%; margin: 0; padding: 0; border: 0; overflow: hidden; }
    body { background: #0f1115; color: #d7dbe2; }
    iframe { display: block; background: #0f1115; opacity: 0; transition: opacity 120ms ease-out; }
    body[data-state="ready"] iframe { opacity: 1; }
    #status {
      position: fixed;
      inset: 0;
      z-index: 2;
      display: grid;
      place-items: center;
      background: #0f1115;
      padding: 24px;
      box-sizing: border-box;
    }
    body[data-state="ready"] #status { display: none; }
    .status-card { max-width: 540px; text-align: center; }
    .spinner {
      width: 22px;
      height: 22px;
      margin: 0 auto 16px;
      border: 2px solid #3a3f48;
      border-top-color: #b8bec8;
      border-radius: 50%;
      animation: spin 700ms linear infinite;
    }
    body[data-state="error"] .spinner { display: none; }
    h1 { margin: 0 0 10px; font-size: 17px; font-weight: 600; color: #eef0f4; }
    p { margin: 0; font-size: 13px; line-height: 1.55; color: #aeb4bf; }
    button {
      display: none;
      margin: 18px auto 0;
      padding: 7px 14px;
      border: 1px solid #59606c;
      border-radius: 4px;
      background: #252932;
      color: #eef0f4;
      font: inherit;
      cursor: pointer;
    }
    body[data-state="error"] button { display: block; }
    button:hover { background: #303540; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body data-state="loading">
  <main>
    <section id="status" role="status" aria-live="polite">
      <div class="status-card">
        <div class="spinner" aria-hidden="true"></div>
        <h1 id="status-title">Opening Workflow Studio</h1>
        <p id="status-detail">Establishing the secure session and loading ${escapeHtml(workflowName)}…</p>
        <button id="retry" type="button">Retry secure handoff</button>
      </div>
    </section>
    <iframe id="studio" src="${escapeHtml(launchUrl)}" title="${escapeHtml(workflowName)} Workflow Studio" allow="clipboard-read; clipboard-write" referrerpolicy="no-referrer"></iframe>
  </main>
  <script nonce="${nonce}">
    (() => {
      const vscode = acquireVsCodeApi();
      const frame = document.getElementById("studio");
      const title = document.getElementById("status-title");
      const detail = document.getElementById("status-detail");
      const retry = document.getElementById("retry");
      let timeout;

      const armTimeout = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          document.body.dataset.state = "error";
          title.textContent = "Workflow Studio did not load";
          detail.textContent = "The secure handoff may have expired. Retry without signing in again.";
        }, 15000);
      };

      const setLoading = () => {
        document.body.dataset.state = "loading";
        title.textContent = "Opening Workflow Studio";
        detail.textContent = "Establishing the secure session and loading " + ${workflowNameScript} + "…";
        armTimeout();
      };

      window.addEventListener("message", (event) => {
        if (
          event.source !== frame.contentWindow ||
          !event.data ||
          event.data.workflowId !== ${expectedWorkflowIdScript}
        ) return;
        if (event.data.type === "valkyrai.workflowStudio.ready") {
          clearTimeout(timeout);
          document.body.dataset.state = "ready";
        } else if (event.data.type === "valkyrai.workflowStudio.error") {
          clearTimeout(timeout);
          document.body.dataset.state = "error";
          title.textContent = "Workflow Studio could not open this workflow";
          detail.textContent = event.data.message || "The selected workflow could not be loaded.";
        }
      });

      window.addEventListener("message", (event) => {
        if (event.source !== window || !event.data) return;
        if (event.data.type === "valoride.workflowStudio.retryFailed") {
          clearTimeout(timeout);
          document.body.dataset.state = "error";
          title.textContent = "Secure handoff failed";
          detail.textContent = event.data.message || "Unable to create a new Workflow Studio session.";
        }
      });

      retry.addEventListener("click", () => {
        setLoading();
        vscode.postMessage({ type: "valoride.workflowStudio.retry" });
      });

      armTimeout();
    })();
  </script>
</body>
</html>`;
};
