/**
 * VSCode Commands for ContentData functionality
 * These commands can be registered in the extension to provide easy access to ContentData features
 */

import * as vscode from "vscode";
import { ValorIDEAccountService } from "../services/account/ValorIDEAccountService";
import { ExtensionMessage } from "@shared/ExtensionMessage";

/**
 * Command to fetch ContentData and display it in VSCode
 * This command can be called from the command palette or programmatically
 */
export async function fetchContentDataCommand(
  accountService: ValorIDEAccountService
): Promise<void> {
  try {
    // Show progress indicator
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Fetching ContentData",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: `Connecting to ${process.env.REACT_APP_BASE_PATH?.replace('/v1', '') || "http://localhost:8080"}/ContentData...` });
        
        const contentData = await accountService.fetchContentData();
        
        if (contentData) {
          // Show success message
          const action = await vscode.window.showInformationMessage(
            "ContentData fetched successfully!",
            "View Data",
            "Copy to Clipboard"
          );
          
          const dataString = JSON.stringify(contentData, null, 2);
          
          if (action === "View Data") {
            // Create a new document to display the data
            const doc = await vscode.workspace.openTextDocument({
              content: dataString,
              language: "json",
            });
            await vscode.window.showTextDocument(doc);
          } else if (action === "Copy to Clipboard") {
            // Copy data to clipboard
            await vscode.env.clipboard.writeText(dataString);
            vscode.window.showInformationMessage("ContentData copied to clipboard!");
          }
        } else {
          vscode.window.showErrorMessage(
            "Failed to fetch ContentData. Check your JWT token and ensure the backend is running."
          );
        }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`ContentData fetch failed: ${errorMessage}`);
  }
}

/**
 * Command to test the ContentData endpoint connection
 */
export async function testContentDataConnectionCommand(
  accountService: ValorIDEAccountService
): Promise<void> {
  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Testing ContentData Connection",
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: "Testing connection..." });
        
        const startTime = Date.now();
        const contentData = await accountService.fetchContentData();
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        if (contentData) {
          vscode.window.showInformationMessage(
            `✅ ContentData connection successful! Response time: ${responseTime}ms`
          );
        } else {
          vscode.window.showWarningMessage(
            `⚠️ ContentData connection failed. Response time: ${responseTime}ms`
          );
        }
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    vscode.window.showErrorMessage(`Connection test failed: ${errorMessage}`);
  }
}

/**
 * Register ContentData commands with VSCode
 * This function should be called from the extension's activate function
 */
export function registerContentDataCommands(
  context: vscode.ExtensionContext,
  accountService: ValorIDEAccountService
): void {
  // Register the fetch ContentData command
  const fetchCommand = vscode.commands.registerCommand(
    "valoride.fetchContentData",
    () => fetchContentDataCommand(accountService)
  );
  
  // Register the test connection command
  const testCommand = vscode.commands.registerCommand(
    "valoride.testContentDataConnection",
    () => testContentDataConnectionCommand(accountService)
  );
  
  // Add commands to subscriptions for proper cleanup
  context.subscriptions.push(fetchCommand, testCommand);
  
  console.log("ContentData commands registered successfully");
}

/**
 * Helper function to create an account service instance
 * This would typically use the actual extension context and webview
 */
export function createAccountServiceForCommands(
  context: vscode.ExtensionContext,
  postMessageToWebview?: (message: ExtensionMessage) => Promise<void>
): ValorIDEAccountService {
  // Default message handler if none provided
  const defaultPostMessage = async (message: ExtensionMessage): Promise<void> => {
    console.log("ContentData message:", message.type, message.contentData ? "with data" : "no data");
  };
  
  // JWT token retrieval function
  const getValorIDEApiKey = async (): Promise<string | undefined> => {
    try {
      // Use the ValkyrAI config to get the token
      const { ValkyrAIAuthConfig } = await import("../services/auth/valkyrai-config");
      return await ValkyrAIAuthConfig.getToken(context);
    } catch (error) {
      console.error("Failed to get ValorIDE API key:", error);
      return undefined;
    }
  };
  
  return new ValorIDEAccountService(
    postMessageToWebview || defaultPostMessage,
    getValorIDEApiKey
  );
}
