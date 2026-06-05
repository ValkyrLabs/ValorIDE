import * as vscode from "vscode";
import { getGlobalState } from "@core/storage/state";
import type { GrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";
import { loadPendingGrayMatterWrites } from "@services/graymatter/GrayMatterMemoryQueueStorage";

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
  const pendingWrites = await loadPendingGrayMatterWrites(context);
  const pendingPreview = pendingWrites.slice(0, 5);

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
    .queue { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
    .queue li { border-top: 1px solid var(--vscode-panel-border); padding-top: 8px; }
    .queue .meta { color: var(--vscode-descriptionForeground); font-size: 12px; }
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
      ${renderQueueSummary(pendingWrites.length, pendingPreview)}
    </section>
  </main>
</body>
</html>`;
};

const renderQueueSummary = (
  pendingCount: number,
  pendingPreview: Awaited<ReturnType<typeof loadPendingGrayMatterWrites>>,
) => {
  if (!pendingCount) {
    return `<p class="empty">No pending memory writes. Reads and writes are tracked by the GrayMatter services during agent tasks.</p>`;
  }

  const hiddenCount = Math.max(0, pendingCount - pendingPreview.length);
  const items = pendingPreview
    .map(
      (write) => `<li>
        <div><code>${escapeHtml(write.type)}</code> ${escapeHtml(write.content.slice(0, 140))}</div>
        <div class="meta">Queued ${escapeHtml(write.queuedAt)}${write.lastErrorKind ? ` · ${escapeHtml(write.lastErrorKind)}` : ""}${write.attempts ? ` · attempts ${write.attempts}` : ""}</div>
      </li>`,
    )
    .join("");

  return `<p class="empty">${pendingCount} memory write${pendingCount === 1 ? "" : "s"} queued for replay.</p>
    <ul class="queue">${items}</ul>
    ${hiddenCount ? `<p class="empty">${hiddenCount} more queued item${hiddenCount === 1 ? "" : "s"} hidden.</p>` : ""}`;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
