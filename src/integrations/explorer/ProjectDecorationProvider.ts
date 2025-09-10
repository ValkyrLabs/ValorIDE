import * as vscode from "vscode";
import * as path from "path";

function isThorProjectRoot(uri: vscode.Uri): boolean {
  const fsPath = uri.fsPath;
  const base = path.basename(fsPath);
  const dir = path.basename(path.dirname(fsPath));
  // Root if parent folder is 'thorapi' and this folder name starts with version prefix like v1., v2., etc.
  return dir.toLowerCase() === "thorapi" && /^v\d+\./i.test(base);
}

class ProjectRootDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations = this._onDidChange.event;

  provideFileDecoration(
    uri: vscode.Uri,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.FileDecoration> {
    try {
      if (isThorProjectRoot(uri)) {
        return {
          badge: "V",
          color: new vscode.ThemeColor("gitDecoration.addedResourceForeground"),
          tooltip: "ValorIDE ThorAPI Project Root",
        };
      }
    } catch {
      // ignore
    }
    return undefined;
  }
}

export function registerProjectExplorerIntegrations(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
) {
  // Decorations for project root folders
  const provider = new ProjectRootDecorationProvider();
  context.subscriptions.push(
    vscode.window.registerFileDecorationProvider(provider),
  );

  // Command: Show quick actions for a ThorAPI project root
  const openActions = vscode.commands.registerCommand(
    "valoride.projectActions",
    async (uri?: vscode.Uri) => {
      if (!uri || !isThorProjectRoot(uri)) {
        vscode.window.showInformationMessage(
          "Select a ValorIDE ThorAPI project folder under 'thorapi' to use this.",
        );
        return;
      }

      const items: Array<{
        label: string;
        action: () => Thenable<void> | void;
      }> = [
        {
          label: "Open in New Window",
          action: () =>
            vscode.commands.executeCommand(
              "vscode.openFolder",
              uri,
              true,
            ),
        },
        {
          label: "Open Integrated Terminal Here",
          action: () => {
            const term = vscode.window.createTerminal({ cwd: uri.fsPath });
            term.show();
          },
        },
        {
          label: "Copy Folder Path",
          action: () => vscode.env.clipboard.writeText(uri.fsPath),
        },
        {
          label: "Reveal in Explorer",
          action: () => vscode.commands.executeCommand("revealInExplorer", uri),
        },
      ];

      const pick = await vscode.window.showQuickPick(
        items.map((i) => i.label),
        { placeHolder: path.basename(uri.fsPath) },
      );
      const chosen = items.find((i) => i.label === pick);
      if (chosen) await chosen.action();
    },
  );
  context.subscriptions.push(openActions);

  output.appendLine("ValorIDE Explorer integrations registered");
}

