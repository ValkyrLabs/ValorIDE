import * as vscode from "vscode";

/**
 * Registers a command to open a web page inside an editor tab.
 * Prefers the built-in Simple Browser; falls back to a webview iframe panel.
 */
export function registerUrlCommands(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "valoride.openUrlInEditor",
    async (urlArg?: string) => {
      const url =
        urlArg ||
        (await vscode.window.showInputBox({
          prompt: "Enter URL to open in editor",
          value: "https://",
          validateInput: (val) =>
            /^https?:\/\//i.test(val) ? undefined : "Enter a valid http(s) URL",
        }));
      if (!url) return;

      try {
        // Try built-in Simple Browser (ships with VS Code)
        await vscode.commands.executeCommand("simpleBrowser.show", url);
        return;
      } catch {
        // Fallback to custom WebviewPanel with iframe
      }

      const panel = vscode.window.createWebviewPanel(
        "valoride.simpleBrowser",
        `Web: ${url}`,
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        },
      );

      // Minimal CSP allowing framing the requested URL
      const csp = [
        "default-src 'none'",
        `frame-src ${url.startsWith("https:") ? "https:" : "http:"} data:`,
        `style-src ${panel.webview.cspSource} 'unsafe-inline'`,
        `img-src ${panel.webview.cspSource} https: data:`,
      ].join("; ");

      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      panel.webview.html = `<!doctype html>
        <html>
          <head>
            <meta http-equiv="Content-Security-Policy" content="${csp}">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>html,body,iframe{height:100%;width:100%;margin:0;padding:0;border:0} iframe{background:#1e1e1e}</style>
            <title>${esc(url)}</title>
          </head>
          <body>
            <iframe src="${esc(url)}" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"></iframe>
          </body>
        </html>`;
    },
  );

  context.subscriptions.push(disposable);
}

