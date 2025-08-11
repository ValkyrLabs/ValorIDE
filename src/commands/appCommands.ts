import * as vscode from "vscode";
import {
  getApps,
  generateApp,
  pollAppStatus,
  getAppDownloadUrl,
} from "../services/appService";
import { Application } from "../../webview-ui/src/thor/model/Application";

const JWT_SECRET_KEY = "valor_jwt_token";

/**
 * Registers Valor app commands and enables Redux sync with the webview.
 * @param context VSCode extension context
 * @param controller Extension Controller instance (must provide postMessageToWebview)
 */
export function registerAppCommands(
  context: vscode.ExtensionContext,
  controller: { postMessageToWebview: (msg: any) => void },
) {
  context.subscriptions.push(
    vscode.commands.registerCommand("valor.listMyApps", async () => {
      try {
        // Retrieve JWT from VSCode secrets storage
        const jwt = await context.secrets.get(JWT_SECRET_KEY);
        if (!jwt) {
          vscode.window.showErrorMessage("You must login to Valkyr first.");
          return;
        }

        // Fetch user apps
        const apps = await getApps(jwt);

        // Redux sync: send to webview
        controller.postMessageToWebview({
          type: "LIST_APPLICATION_SUCCESS",
          payload: apps,
        });

        if (!apps.length) {
          vscode.window.showInformationMessage(
            "No applications found for your account.",
          );
          return;
        }

        // Show QuickPick for app selection
        const appItems = apps.map((app) => ({
          label: app.name,
          description: app.description,
          app,
        }));
        const selectedAppItem = await vscode.window.showQuickPick(appItems, {
          placeHolder: "Select an application",
        });
        if (!selectedAppItem) return;

        // Show sub-options
        const subOptions = [
          { label: "Generate App", action: "generate" },
          { label: "Open App Folder", action: "open" },
          { label: "Deploy App", action: "deploy" },
        ];
        const selectedOption = await vscode.window.showQuickPick(subOptions, {
          placeHolder: `What would you like to do with "${selectedAppItem.label}"?`,
        });
        if (!selectedOption) return;

        switch (selectedOption.action) {
          case "generate":
            await handleGenerateApp(context, jwt, selectedAppItem.app);
            break;
          case "open":
            await handleOpenAppFolder(selectedAppItem.app);
            break;
          case "deploy":
            await handleDeployApp(selectedAppItem.app);
            break;
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(`Error: ${err.message}`);
      }
    }),
  );
}

async function handleGenerateApp(
  context: vscode.ExtensionContext,
  jwt: string,
  app: Application,
) {
  const appId = app.id;
  vscode.window.showInformationMessage(
    `Triggering code generation for "${app.name}"...`,
  );
  await generateApp(jwt, appId);

  // Poll status
  let status: string = "pending";
  while (status === "pending") {
    await new Promise((res) => setTimeout(res, 5000));
    status = await pollAppStatus(jwt, appId);
  }

  if (status === "completed") {
    vscode.window.showInformationMessage(
      `Generation complete for "${app.name}". Downloading...`,
    );
    const url = await getAppDownloadUrl(jwt, appId);

    // Download and extract zip to ~/valor-projects with app name as subfolder
    const homeDir = require("os").homedir();
    const targetDir = require("path").join(homeDir, "valor-projects");
    const fs = require("fs");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const { downloadAndExtractZip } = await import("../utils/zipExtractor");
    try {
      const sanitizedAppName =
        app.name?.replace(/[^a-zA-Z0-9-_]/g, "_") || "unknown-app";
      await downloadAndExtractZip(url, targetDir, sanitizedAppName);
      const extractedPath = require("path").join(targetDir, sanitizedAppName);
      vscode.window.showInformationMessage(
        `App "${app.name}" downloaded and extracted to ${extractedPath}.`,
      );
      const open = await vscode.window.showInformationMessage(
        `Open "${app.name}" in a new VS Code window?`,
        "Open Folder",
      );
      if (open === "Open Folder") {
        vscode.commands.executeCommand(
          "vscode.openFolder",
          vscode.Uri.file(extractedPath),
          true,
        );
      }
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to extract app: ${err.message}`);
    }
  } else {
    vscode.window.showErrorMessage(`Generation failed for "${app.name}".`);
  }
}

async function handleOpenAppFolder(app: Application) {
  const homeDir = require("os").homedir();
  const targetDir = require("path").join(
    homeDir,
    "valor-projects",
    app.name.replace(/[^a-zA-Z0-9-_]/g, "_"),
  );
  const fs = require("fs");
  if (!fs.existsSync(targetDir)) {
    vscode.window.showErrorMessage(
      `Folder for "${app.name}" does not exist: ${targetDir}`,
    );
    return;
  }
  vscode.commands.executeCommand(
    "vscode.openFolder",
    vscode.Uri.file(targetDir),
    true,
  );
}

async function handleDeployApp(app: Application) {
  const homeDir = require("os").homedir();
  const targetDir = require("path").join(
    homeDir,
    "valor-projects",
    app.name.replace(/[^a-zA-Z0-9-_]/g, "_"),
  );
  const fs = require("fs");
  if (!fs.existsSync(targetDir)) {
    vscode.window.showErrorMessage(
      `Folder for "${app.name}" does not exist: ${targetDir}`,
    );
    return;
  }
  const terminal = vscode.window.createTerminal({
    name: `Deploy: ${app.name}`,
    cwd: targetDir,
  });
  terminal.show();
  terminal.sendText("./vai --deploy");
  vscode.window.showInformationMessage(
    `Deploying "${app.name}"... Logs are streaming in the terminal.`,
  );
}
