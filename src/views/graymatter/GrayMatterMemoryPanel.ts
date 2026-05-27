import * as vscode from "vscode";
import { getGlobalState } from "@core/storage/state";
import type { GrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";

export class GrayMatterMemoryPanel {
  static readonly viewType = "valoride.graymatter.memoryPanel";

  static async open(context: vscode.ExtensionContext): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      GrayMatterMemoryPanel.viewType,
      "GrayMatter Memory Browser",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );
    panel.webview.html = await renderMemoryPanel(context);
  }
}

const renderMemoryPanel = async (context: vscode.ExtensionContext) => {
  const session = (await getGlobalState(context, "grayMatterSession")) as
    | GrayMatterSessionState
    | undefined;
  const status = session?.status ?? "unauthenticated";
  const checkedAt = session?.checkedAt ?? "never";
  const capabilities = session?.capabilities;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GrayMatter Memory Browser</title>
  <style>
    body { color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); margin: 0; }
    main { padding: 16px; display: grid; gap: 16px; }
    header { display: flex; justify-content: space-between; align-items: center; gap: 12px; border-bottom: 1px solid var(--vscode-panel-border); padding-bottom: 12px; }
    h1 { font-size: 16px; margin: 0; }
    h2 { font-size: 13px; margin: 0 0 8px; color: var(--vscode-descriptionForeground); text-transform: uppercase; }
    section { border: 1px solid var(--vscode-panel-border); border-radius: 6px; padding: 12px; }
    .status { color: var(--vscode-descriptionForeground); font-size: 12px; }
    .empty { color: var(--vscode-descriptionForeground); margin: 0; }
    code { color: var(--vscode-textLink-foreground); }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>GrayMatter Memory Browser</h1>
      <div class="status">Status: <code>${escapeHtml(status)}</code> · Checked: ${escapeHtml(checkedAt)}</div>
    </header>
    <section>
      <h2>Project Memories</h2>
      <p class="empty">Memory listing will populate from GrayMatter query results when the session is ready.</p>
    </section>
    <section>
      <h2>Org Memories</h2>
      <p class="empty">${capabilities?.memoryRead ? "Read access is available for RBAC-scoped org memories." : "No org memory read capability detected."}</p>
    </section>
    <section>
      <h2>My Memories</h2>
      <p class="empty">User-scoped entries remain isolated from project and organization scopes.</p>
    </section>
    <section>
      <h2>Session Log</h2>
      <p class="empty">Reads and writes are tracked by the GrayMatter services during agent tasks.</p>
    </section>
  </main>
</body>
</html>`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
