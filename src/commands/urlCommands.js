import * as vscode from "vscode";
import { openUrlWithSimpleBrowser } from "@utils/openUrl";
/**
 * Registers a command to open a web page inside an editor tab.
 * Prefers the built-in Simple Browser; falls back to a webview iframe panel.
 */
export function registerUrlCommands(context) {
    const disposable = vscode.commands.registerCommand("valoride.openUrlInEditor", async (urlArg) => {
        const url = urlArg ||
            (await vscode.window.showInputBox({
                prompt: "Enter URL to open in editor",
                value: "https://",
                validateInput: (val) => /^https?:\/\//i.test(val) ? undefined : "Enter a valid http(s) URL",
            }));
        if (!url)
            return;
        const opened = await openUrlWithSimpleBrowser(url, `Web: ${url}`);
        if (!opened) {
            vscode.window.showErrorMessage(`Could not open URL: ${url}`);
        }
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=urlCommands.js.map