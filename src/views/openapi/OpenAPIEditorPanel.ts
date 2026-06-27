import * as vscode from "vscode";
import { getTheme } from "@integrations/theme/getTheme";
import { getNonce } from "@core/webview/getNonce";
import { getUri } from "@core/webview/getUri";
import {
  getValkyraiBasePath,
  normalizeValkyraiHost,
} from "@utils/serverValkyraiHost";

const FALLBACK_VALKYRAI_BASE =
  (process.env.VITE_basePath && process.env.VITE_basePath.trim()) ||
  "https://api-0.valkyrlabs.com/v1";

const resolveValkyraiBasePath = () => {
  const configured = vscode.workspace
    .getConfiguration("valoride.valkyrai")
    .get<string>("host");
  return (
    normalizeValkyraiHost(configured) ||
    getValkyraiBasePath() ||
    normalizeValkyraiHost(FALLBACK_VALKYRAI_BASE)
  );
};

const deriveValkyraiOrigins = (basePath: string) => {
  try {
    const parsed = new URL(basePath);
    const httpOrigin = `${parsed.protocol}//${parsed.host}`;
    const wsOrigin = `${parsed.protocol === "https:" ? "wss" : "ws"}://${parsed.host}`;
    return { httpOrigin, wsOrigin };
  } catch {
    return { httpOrigin: basePath.replace(/\/v1$/, ""), wsOrigin: undefined };
  }
};

export class OpenAPIEditorPanel {
  static readonly viewType = "valoride.openapi.editor";
  private static currentPanel: vscode.WebviewPanel | undefined;

  static open(context: vscode.ExtensionContext): void {
    if (OpenAPIEditorPanel.currentPanel) {
      OpenAPIEditorPanel.currentPanel.reveal(vscode.ViewColumn.Active);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      OpenAPIEditorPanel.viewType,
      "OpenAPI Editor",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      },
    );

    OpenAPIEditorPanel.currentPanel = panel;
    panel.webview.html = renderOpenAPIEditorPanel(context, panel.webview);

    panel.webview.onDidReceiveMessage((message) => {
      if (message?.type === "requestTheme") {
        panel.webview.postMessage({
          type: "theme",
          text: JSON.stringify(getTheme()),
        });
      }
      if (message?.type === "webviewError") {
        console.error("OpenAPI editor webview error:", message);
      }
    });

    panel.onDidDispose(() => {
      OpenAPIEditorPanel.currentPanel = undefined;
    });
  }
}

const renderOpenAPIEditorPanel = (
  context: vscode.ExtensionContext,
  webview: vscode.Webview,
): string => {
  const stylesUri = getUri(webview, context.extensionUri, [
    "dist",
    "webview",
    "assets",
    "index.css",
  ]);
  const scriptUri = getUri(webview, context.extensionUri, [
    "dist",
    "webview",
    "assets",
    "index.js",
  ]);
  const nonce = getNonce();
  const valkyraiBasePath = resolveValkyraiBasePath();
  const { httpOrigin: valkyraiOrigin, wsOrigin: valkyraiWsOrigin } =
    deriveValkyraiOrigins(valkyraiBasePath);
  const connectSrcEntries = new Set<string>([
    webview.cspSource,
    valkyraiOrigin || "http://localhost:8080",
    "https://*.valkyrlabs.com",
    "wss://*.valkyrlabs.com",
    "ws://localhost:*",
    "https://*.posthog.com",
    "https://*.googleapis.com",
  ]);
  if (valkyraiWsOrigin) {
    connectSrcEntries.add(valkyraiWsOrigin);
  }
  const connectSrc = Array.from(connectSrcEntries).filter(Boolean).join(" ");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
    <link rel="stylesheet" type="text/css" href="${stylesUri}">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src ${connectSrc}; font-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval' 'wasm-unsafe-eval';">
    <title>OpenAPI Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}">
      try {
        window.__valorideWebviewMode = "openapi-editor";
        window.__valorideValkyraiBasePath = ${JSON.stringify(valkyraiBasePath)};
      } catch {}
    </script>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
  </body>
</html>`;
};
