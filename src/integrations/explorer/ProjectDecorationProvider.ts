import * as vscode from "vscode";
import * as path from "path";
import { resolveThorapiFolderPath, thorapiSettingChanged } from "@utils/thorapi";
import { arePathsEqual } from "@utils/path";

function isThorProjectRoot(uri: vscode.Uri): boolean {
  const fsPath = uri.fsPath;
  const base = path.basename(fsPath);

  if (!/^v\d+\./i.test(base)) {
    return false;
  }

  const parentDir = path.dirname(fsPath);
  const workspaceFolders = vscode.workspace.workspaceFolders || [];

  return workspaceFolders.some((folder) => {
    const thorapiRoot = resolveThorapiFolderPath(folder.uri.fsPath);
    return arePathsEqual(parentDir, thorapiRoot);
  });
}

class ProjectRootDecorationProvider implements vscode.FileDecorationProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();
  readonly onDidChangeFileDecorations = this._onDidChange.event;

  refresh(): void {
    this._onDidChange.fire(undefined);
  }

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
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (thorapiSettingChanged(event)) {
        provider.refresh();
      }
    }),
  );

  // Command: Show quick actions for a ThorAPI project root
  const openActions = vscode.commands.registerCommand(
    "valoride.projectActions",
    async (uri?: vscode.Uri) => {
      if (!uri || !isThorProjectRoot(uri)) {
        vscode.window.showInformationMessage(
          "Select a ValorIDE ThorAPI project folder under the configured ThorAPI output directory to use this.",
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
