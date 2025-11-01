// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import * as vscode from "vscode";
import pWaitFor from "p-wait-for";
import { Logger } from "./services/logging/Logger";
import { createValorIDEAPI } from "./exports";
import "./utils/path"; // necessary to have access to String.prototype.toPosix
import { DIFF_VIEW_URI_SCHEME } from "./integrations/editor/DiffViewProvider";
import assert from "node:assert";
import { telemetryService } from "./services/telemetry/TelemetryService";
import { WebviewProvider } from "./core/webview";
import { ErrorService } from "./services/error/ErrorService";
import { initializeTestMode, cleanupTestMode } from "./services/test/TestMode";
import { registerUrlCommands } from "./commands/urlCommands";
import { registerAliasCommands } from "./commands/aliasCommands";
import { StartupAuthService } from "./services/auth/StartupAuthService";
/*
Built using https://github.com/microsoft/vscode-webview-ui-toolkit

Inspired by
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/weather-webview
https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/frameworks/hello-world-react-cra

*/
let outputChannel;
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
// Defer loading of browser-only CommunicationService to avoid pulling Vite/runtime
// modules into the extension host at activation time.
let communicationService = null;
let toolRelayService = null;
export function activate(context) {
    outputChannel = vscode.window.createOutputChannel("ValorIDE");
    context.subscriptions.push(outputChannel);
    ErrorService.initialize();
    Logger.initialize(outputChannel);
    // Register the webview view provider FIRST
    const sidebarWebview = new WebviewProvider(context, outputChannel);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(WebviewProvider.sideBarId, sidebarWebview, {
        webviewOptions: { retainContextWhenHidden: true },
    }));
    Logger.log("ValorIDE extension activated");
    // Initialize startup authentication restoration in background
    void (async () => {
        try {
            const startupAuthService = StartupAuthService.getInstance(context);
            const authResult = await startupAuthService.restoreAuthentication();
            if (authResult.success) {
                Logger.log("Successfully restored authentication from stored tokens");
                // Notify the webview that authentication was restored
                sidebarWebview.controller.postMessageToWebview({
                    type: "loginSuccess",
                    token: authResult.tokens?.jwtToken,
                    authenticatedPrincipal: authResult.user ? JSON.stringify(authResult.user) : undefined,
                });
            }
            else {
                Logger.log(`Authentication restoration failed: ${authResult.error || "Unknown error"}`);
            }
        }
        catch (error) {
            Logger.log(`Error during startup authentication restoration: ${error}`);
        }
    })();
    // Register utility commands
    registerUrlCommands(context);
    registerAliasCommands(context);
    // Initialize CommunicationService only in browser-like contexts (e.g., web UI)
    // Use dynamic import to avoid loading Vite/webview code in Node extension host.
    void (async () => {
        const hasWindow = typeof globalThis.window !== "undefined";
        if (!hasWindow) {
            Logger.log("CommunicationService not supported in this environment; skipping init.");
            return;
        }
        const mod = await import("./services/communication/CommunicationService");
        if (!mod?.CommunicationService?.isSupported()) {
            Logger.log("CommunicationService not supported in this environment; skipping init.");
            return;
        }
        const role = process.env.VALORIDE_ROLE === "manager" ? "manager" : "worker";
        communicationService = new mod.CommunicationService({ role });
        communicationService.connect();
        communicationService.on("message", (message) => {
            Logger.log(`CommunicationService received message: ${JSON.stringify(message)}`);
            // TODO: Add message handling logic here, e.g., dispatch commands or update UI
        });
        // Optional: surface service errors to output channel (won't crash)
        communicationService.on("error", (err) => {
            Logger.log(`CommunicationService error: ${String(err)}`);
        });
        // Initialize ToolRelayService for remote control capabilities
        try {
            const toolRelayMod = await import("./services/communication/ToolRelayService");
            const visibleWebview = WebviewProvider.getVisibleInstance() || sidebarWebview;
            if (visibleWebview?.controller) {
                toolRelayService = new toolRelayMod.ToolRelayService(communicationService, visibleWebview.controller);
                Logger.log("ToolRelayService initialized for remote control");
            }
        }
        catch (error) {
            Logger.log(`Failed to initialize ToolRelayService: ${error}`);
        }
    })();
    // Register Explorer decorations and context actions for downloaded ThorAPI projects
    void import("./integrations/explorer/ProjectDecorationProvider")
        .then(({ registerProjectExplorerIntegrations }) => {
        registerProjectExplorerIntegrations(context, outputChannel);
    })
        .catch((e) => {
        Logger.log(`Explorer integration registration failed: ${String(e)}`);
    });
    // Register the Projects tree view with inline actions
    void import("./integrations/explorer/ProjectsView")
        .then(({ registerProjectsView }) => {
        registerProjectsView(context, outputChannel);
    })
        .catch((e) => {
        Logger.log(`Projects view registration failed: ${String(e)}`);
    });
    // Initialize test mode and set dev mode context
    context.subscriptions.push(...initializeTestMode(context, sidebarWebview));
    vscode.commands.executeCommand("setContext", "valoride.isDevMode", IS_DEV && IS_DEV === "true");
    // Ensure our Activity Bar container is visible, then focus our view
    // This helps recover if the container was hidden from prior layout changes
    void vscode.commands.executeCommand("workbench.view.extension.valoride-activitybar");
    // Proactively reveal the sidebar view once after activation
    // This helps surface the Activity Bar icon if the container was hidden/cached
    void vscode.commands.executeCommand(`${WebviewProvider.sideBarId}.focus`);
    context.subscriptions.push(vscode.commands.registerCommand("valoride.plusButtonClicked", async (webview) => {
        const openChat = async (instance) => {
            await instance?.controller.clearTask();
            await instance?.controller.postStateToWebview();
            await instance?.controller.postMessageToWebview({
                type: "action",
                action: "chatButtonClicked",
            });
        };
        const isSidebar = !webview;
        if (isSidebar) {
            openChat(WebviewProvider.getSidebarInstance());
        }
        else {
            WebviewProvider.getTabInstances().forEach(openChat);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("valoride.mcpButtonClicked", (webview) => {
        const openMcp = (instance) => instance?.controller.postMessageToWebview({
            type: "action",
            action: "mcpButtonClicked",
        });
        const isSidebar = !webview;
        if (isSidebar) {
            openMcp(WebviewProvider.getSidebarInstance());
        }
        else {
            WebviewProvider.getTabInstances().forEach(openMcp);
        }
    }));
    const openValorIDEInNewTab = async () => {
        Logger.log("Opening ValorIDE in new tab");
        // (this example uses webviewProvider activation event which is necessary to deserialize cached webview, but since we use retainContextWhenHidden, we don't need to use that event)
        // https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
        const tabWebview = new WebviewProvider(context, outputChannel);
        //const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined
        const lastCol = Math.max(...vscode.window.visibleTextEditors.map((editor) => editor.viewColumn || 0));
        // Check if there are any visible text editors, otherwise open a new group to the right
        const hasVisibleEditors = vscode.window.visibleTextEditors.length > 0;
        if (!hasVisibleEditors) {
            await vscode.commands.executeCommand("workbench.action.newGroupRight");
        }
        const targetCol = hasVisibleEditors
            ? Math.max(lastCol + 1, 1)
            : vscode.ViewColumn.Two;
        const panel = vscode.window.createWebviewPanel(WebviewProvider.tabPanelId, "ValorIDE", targetCol, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [context.extensionUri],
        });
        // TODO: use better svg icon with light and dark variants (see https://stackoverflow.com/questions/58365687/vscode-extension-iconpath)
        panel.iconPath = {
            light: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_light.png"),
            dark: vscode.Uri.joinPath(context.extensionUri, "assets", "icons", "robot_panel_dark.png"),
        };
        tabWebview.resolveWebviewView(panel);
        // Mark editor title context so our toolbar buttons appear in tab view
        await vscode.commands.executeCommand("setContext", "valoride.isValorIDETab", panel.active === true);
        // Update context when tab selection changes
        panel.onDidChangeViewState(() => {
            void vscode.commands.executeCommand("setContext", "valoride.isValorIDETab", panel.active === true);
        }, undefined, context.subscriptions);
        // Clear context on dispose
        panel.onDidDispose(() => {
            void vscode.commands.executeCommand("setContext", "valoride.isValorIDETab", false);
        }, undefined, context.subscriptions);
        // Lock the editor group so clicking on files doesn't open them over the panel
        await setTimeoutPromise(100);
        await vscode.commands.executeCommand("workbench.action.lockEditorGroup");
    };
    context.subscriptions.push(vscode.commands.registerCommand("valoride.popoutButtonClicked", openValorIDEInNewTab));
    context.subscriptions.push(vscode.commands.registerCommand("valoride.openInNewTab", openValorIDEInNewTab));
    context.subscriptions.push(vscode.commands.registerCommand("valoride.settingsButtonClicked", (webview) => {
        WebviewProvider.getAllInstances().forEach((instance) => {
            const openSettings = async (instance) => {
                instance?.controller.postMessageToWebview({
                    type: "action",
                    action: "settingsButtonClicked",
                });
            };
            const isSidebar = !webview;
            if (isSidebar) {
                openSettings(WebviewProvider.getSidebarInstance());
            }
            else {
                WebviewProvider.getTabInstances().forEach(openSettings);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("valoride.historyButtonClicked", (webview) => {
        WebviewProvider.getAllInstances().forEach((instance) => {
            const openHistory = async (instance) => {
                instance?.controller.postMessageToWebview({
                    type: "action",
                    action: "historyButtonClicked",
                });
            };
            const isSidebar = !webview;
            if (isSidebar) {
                openHistory(WebviewProvider.getSidebarInstance());
            }
            else {
                WebviewProvider.getTabInstances().forEach(openHistory);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("valoride.accountButtonClicked", (webview) => {
        WebviewProvider.getAllInstances().forEach((instance) => {
            const openAccount = async (instance) => {
                instance?.controller.postMessageToWebview({
                    type: "action",
                    action: "accountButtonClicked",
                });
            };
            const isSidebar = !webview;
            if (isSidebar) {
                openAccount(WebviewProvider.getSidebarInstance());
            }
            else {
                WebviewProvider.getTabInstances().forEach(openAccount);
            }
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand("valoride.serverConsoleButtonClicked", (webview) => {
        WebviewProvider.getAllInstances().forEach((instance) => {
            const openServerConsole = async (instance) => {
                instance?.controller.postMessageToWebview({
                    type: "action",
                    action: "serverConsoleButtonClicked",
                });
            };
            const isSidebar = !webview;
            if (isSidebar) {
                openServerConsole(WebviewProvider.getSidebarInstance());
            }
            else {
                WebviewProvider.getTabInstances().forEach(openServerConsole);
            }
        });
    }));
    /*
      We use the text document content provider API to show the left side for diff view by creating a virtual document for the original content. This makes it readonly so users know to edit the right side if they want to keep their changes.
  
      - This API allows you to create readonly documents in VSCode from arbitrary sources, and works by claiming an uri-scheme for which your provider then returns text contents. The scheme must be provided when registering a provider and cannot change afterwards.
      - Note how the provider doesn't create uris for virtual documents - its role is to provide contents given such an uri. In return, content providers are wired into the open document logic so that providers are always considered.
      https://code.visualstudio.com/api/extension-guides/virtual-documents
      */
    const diffContentProvider = new (class {
        provideTextDocumentContent(uri) {
            return Buffer.from(uri.query, "base64").toString("utf-8");
        }
    })();
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(DIFF_VIEW_URI_SCHEME, diffContentProvider));
    // URI Handler
    const handleUri = async (uri) => {
        console.log("URI Handler called with:", {
            path: uri.path,
            query: uri.query,
            scheme: uri.scheme,
        });
        const path = uri.path;
        // Guard against missing query to avoid calling replace on undefined
        const rawQuery = uri.query || "";
        const query = new URLSearchParams(rawQuery.replace(/\+/g, "%2B"));
        const visibleWebview = WebviewProvider.getVisibleInstance();
        if (!visibleWebview) {
            return;
        }
        switch (path) {
            case "/openrouter": {
                const code = query.get("code");
                if (code) {
                    await visibleWebview?.controller.handleOpenRouterCallback(code);
                }
                break;
            }
            case "/auth": {
                const token = query.get("token");
                const state = query.get("state");
                const apiKey = query.get("apiKey");
                const authenticatedPrincipal = query.get("authenticatedPrincipal");
                console.log("Auth callback received:", {
                    token: token,
                    state: state,
                    apiKey: apiKey,
                    authenticatedPrincipal: authenticatedPrincipal,
                });
                // Validate state parameter
                if (!(await visibleWebview?.controller.validateAuthState(state))) {
                    vscode.window.showErrorMessage("Invalid auth state");
                    return;
                }
                if (token && apiKey) {
                    let parsedUser;
                    try {
                        parsedUser = authenticatedPrincipal ? JSON.parse(decodeURIComponent(authenticatedPrincipal)) : undefined;
                    }
                    catch (error) {
                        console.warn("Failed to parse authenticatedPrincipal:", error);
                    }
                    // Use StartupAuthService to handle login persistently
                    const startupAuthService = StartupAuthService.getInstance(context);
                    await startupAuthService.handleSuccessfulLogin({ jwtToken: token, apiKey }, parsedUser);
                    await visibleWebview?.controller.handleAuthCallback(token, apiKey, parsedUser);
                }
                break;
            }
            default:
                break;
        }
    };
    context.subscriptions.push(vscode.window.registerUriHandler({ handleUri }));
    // Register size testing commands in development mode
    if (IS_DEV && IS_DEV === "true") {
        // Use dynamic import to avoid loading the module in production
        import("./dev/commands/tasks")
            .then((module) => {
            const devTaskCommands = module.registerTaskCommands(context, sidebarWebview.controller);
            context.subscriptions.push(...devTaskCommands);
            Logger.log("ValorIDE dev task commands registered");
        })
            .catch((error) => {
            Logger.log("Failed to register dev task commands: " + error);
        });
    }
    context.subscriptions.push(vscode.commands.registerCommand("valoride.addToChat", async (range, diagnostics) => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        // Use provided range if available, otherwise use current selection
        // (vscode command passes an argument in the first param by default, so we need to ensure it's a Range object)
        const textRange = range instanceof vscode.Range ? range : editor.selection;
        const selectedText = editor.document.getText(textRange);
        if (!selectedText) {
            return;
        }
        // Get the file path and language ID
        const filePath = editor.document.uri.fsPath;
        const languageId = editor.document.languageId;
        const visibleWebview = WebviewProvider.getVisibleInstance();
        await visibleWebview?.controller.addSelectedCodeToChat(selectedText, filePath, languageId, Array.isArray(diagnostics) ? diagnostics : undefined);
    }));
    context.subscriptions.push(vscode.commands.registerCommand("valoride.addTerminalOutputToChat", async () => {
        const terminal = vscode.window.activeTerminal;
        if (!terminal) {
            return;
        }
        // Save current clipboard content
        const tempCopyBuffer = await vscode.env.clipboard.readText();
        try {
            // Copy the *existing* terminal selection (without selecting all)
            await vscode.commands.executeCommand("workbench.action.terminal.copySelection");
            // Get copied content
            let terminalContents = (await vscode.env.clipboard.readText()).trim();
            // Restore original clipboard content
            await vscode.env.clipboard.writeText(tempCopyBuffer);
            if (!terminalContents) {
                // No terminal content was copied (either nothing selected or some error)
                return;
            }
            // [Optional] Any additional logic to process multi-line content can remain here
            // For example:
            /*
                  const lines = terminalContents.split("\n")
                  const lastLine = lines.pop()?.trim()
                  if (lastLine) {
                      let i = lines.length - 1
                      while (i >= 0 && !lines[i].trim().startsWith(lastLine)) {
                          i--
                      }
                      terminalContents = lines.slice(Math.max(i, 0)).join("\n")
                  }
                  */
            // Send to sidebar provider
            const visibleWebview = WebviewProvider.getVisibleInstance();
            await visibleWebview?.controller.addSelectedTerminalOutputToChat(terminalContents, terminal.name);
        }
        catch (error) {
            // Ensure clipboard is restored even if an error occurs
            await vscode.env.clipboard.writeText(tempCopyBuffer);
            console.error("Error getting terminal contents:", error);
            vscode.window.showErrorMessage("Failed to get terminal contents");
        }
    }));
    // Register code action provider
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider("*", new (class {
        static providedCodeActionKinds = [
            vscode.CodeActionKind.QuickFix,
        ];
        provideCodeActions(document, range, context) {
            // Expand range to include surrounding 3 lines
            const expandedRange = new vscode.Range(Math.max(0, range.start.line - 3), 0, Math.min(document.lineCount - 1, range.end.line + 3), document.lineAt(Math.min(document.lineCount - 1, range.end.line + 3)).text.length);
            const addAction = new vscode.CodeAction("Add to ValorIDE", vscode.CodeActionKind.QuickFix);
            addAction.command = {
                command: "valoride.addToChat",
                title: "Add to ValorIDE",
                arguments: [expandedRange, context.diagnostics],
            };
            const fixAction = new vscode.CodeAction("Fix with ValorIDE", vscode.CodeActionKind.QuickFix);
            fixAction.command = {
                command: "valoride.fixWithValorIDE",
                title: "Fix with ValorIDE",
                arguments: [expandedRange, context.diagnostics],
            };
            // Only show actions when there are errors
            if (context.diagnostics.length > 0) {
                return [addAction, fixAction];
            }
            else {
                return [];
            }
        }
    })(), {
        providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }));
    // Register the command handler
    context.subscriptions.push(vscode.commands.registerCommand("valoride.fixWithValorIDE", async (range, diagnostics) => {
        // Add this line to focus the chat input first
        await vscode.commands.executeCommand("valoride.focusChatInput");
        // Wait for a webview instance to become visible after focusing
        await pWaitFor(() => !!WebviewProvider.getVisibleInstance());
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const selectedText = editor.document.getText(range);
        const filePath = editor.document.uri.fsPath;
        const languageId = editor.document.languageId;
        // Send to sidebar provider with diagnostics
        const visibleWebview = WebviewProvider.getVisibleInstance();
        await visibleWebview?.controller.fixWithValorIDE(selectedText, filePath, languageId, diagnostics);
    }));
    // Register the focusChatInput command handler
    context.subscriptions.push(vscode.commands.registerCommand("valoride.focusChatInput", () => {
        let visibleWebview = WebviewProvider.getVisibleInstance();
        if (!visibleWebview) {
            vscode.commands.executeCommand("valoride-dev.SidebarProvider.focus");
            visibleWebview = WebviewProvider.getSidebarInstance();
            // showing the extension will call didBecomeVisible which focuses it already
            // but it doesn't focus if a tab is selected which focusChatInput accounts for
        }
        visibleWebview?.controller.postMessageToWebview({
            type: "action",
            action: "focusChatInput",
        });
    }));
    // Add diagnostic command to help troubleshoot extension issues
    context.subscriptions.push(vscode.commands.registerCommand("valoride.diagnostics", () => {
        const diagnostics = {
            activeInstances: WebviewProvider.getAllInstances().length,
            sidebarInstance: !!WebviewProvider.getSidebarInstance(),
            tabInstances: WebviewProvider.getTabInstances().length,
            visibleInstance: !!WebviewProvider.getVisibleInstance(),
            extensionVersion: context.extension?.packageJSON?.version,
            vscodeVersion: vscode.version,
            platform: process.platform,
            extensionMode: context.extensionMode,
            globalStoragePath: context.globalStorageUri.fsPath,
            workspaceStoragePath: context.storageUri?.fsPath,
            machineId: vscode.env.machineId,
            sessionId: vscode.env.sessionId,
            uriScheme: vscode.env.uriScheme,
        };
        const diagnosticsText = JSON.stringify(diagnostics, null, 2);
        Logger.log(`ValorIDE Diagnostics:\n${diagnosticsText}`);
        vscode.window.showInformationMessage(`ValorIDE Diagnostics logged to output channel. Active instances: ${diagnostics.activeInstances}`, "Show Output").then((selection) => {
            if (selection === "Show Output") {
                outputChannel.show();
            }
        });
    }));
    // Command: Fix Layout (Resets view locations and focuses ValorIDE container/view)
    context.subscriptions.push(vscode.commands.registerCommand("valoride.fixLayout", async () => {
        const choice = await vscode.window.showWarningMessage("Reset all view locations to defaults? This can fix ValorIDE appearing in Chat instead of the sidebar.", { modal: true }, "Reset", "Cancel");
        if (choice !== "Reset")
            return;
        try {
            await vscode.commands.executeCommand("workbench.action.resetViewLocations");
        }
        catch (err) {
            Logger.log(`Error running resetViewLocations: ${err}`);
        }
        // Bring our container and view to the front after reset
        void vscode.commands.executeCommand("workbench.view.extension.valoride-activitybar");
        void vscode.commands.executeCommand(`${WebviewProvider.sideBarId}.focus`);
        vscode.window.showInformationMessage("View locations reset. ValorIDE sidebar restored (if previously moved).");
    }));
    return createValorIDEAPI(outputChannel, sidebarWebview.controller);
}
// TODO: Find a solution for automatically removing DEV related content from production builds.
//  This type of code is fine in production to keep. We just will want to remove it from production builds
//  to bring down built asset sizes.
//
// This is a workaround to reload the extension when the source code changes
// since vscode doesn't support hot reload for extensions
const { IS_DEV, DEV_WORKSPACE_FOLDER } = process.env;
// This method is called when your extension is deactivated
export function deactivate() {
    return new Promise((resolve) => {
        Logger.log("Starting ValorIDE extension deactivation...");
        try {
            // Clean up test mode
            cleanupTestMode();
            Logger.log("Test mode cleaned up successfully");
        }
        catch (error) {
            Logger.log(`Error cleaning up test mode: ${error}`);
            console.error("Error cleaning up test mode:", error);
        }
        try {
            // Shutdown telemetry
            telemetryService.shutdown();
            Logger.log("Telemetry service shut down successfully");
        }
        catch (error) {
            Logger.log(`Error shutting down telemetry: ${error}`);
            console.error("Error shutting down telemetry:", error);
        }
        Logger.log("ValorIDE extension deactivated successfully");
        resolve();
    });
}
// Set up development mode file watcher
if (IS_DEV && IS_DEV !== "false") {
    assert(DEV_WORKSPACE_FOLDER, "DEV_WORKSPACE_FOLDER must be set in development");
    const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(DEV_WORKSPACE_FOLDER, "src/**/*"));
    watcher.onDidChange(({ scheme, path }) => {
        console.info(`${scheme} ${path} changed. Reloading VSCode...`);
        vscode.commands.executeCommand("workbench.action.reloadWindow");
    });
}
//# sourceMappingURL=extension.js.map