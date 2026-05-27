import * as vscode from "vscode";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { getSecret, storeSecret, updateGlobalState } from "@core/storage/state";
import { createGrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";
import { getStatusBarService } from "@services/StatusBarService";
import { GrayMatterMemoryPanel } from "../../views/graymatter/GrayMatterMemoryPanel";

export const registerGrayMatterCommands = (
  context: vscode.ExtensionContext,
): void => {
  context.subscriptions.push(
    vscode.commands.registerCommand("valoride.graymatter.openMemoryPanel", () =>
      GrayMatterMemoryPanel.open(context),
    ),
    vscode.commands.registerCommand("valoride.graymatter.signIn", () =>
      signInToGrayMatter(),
    ),
    vscode.commands.registerCommand(
      "valoride.graymatter.rotateToken",
      async () => rotateGrayMatterToken(context),
    ),
  );
};

export const refreshGrayMatterStatus = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  const token =
    (await getSecret(context, "graymatter-token")) ||
    (await getSecret(context, "jwtToken"));
  const session = await createGrayMatterSessionState({
    baseUrl: getValkyraiBasePath(),
    token,
  });
  await updateGlobalState(context, "grayMatterSession", session);
  getStatusBarService().updateGrayMatterStatus(session.status, session.error);
};

const signInToGrayMatter = async () => {
  await vscode.env.openExternal(
    vscode.Uri.parse(
      "https://valkyrlabs.com/login?redirect=/graymatter/install/mcp",
    ),
  );
};

const rotateGrayMatterToken = async (context: vscode.ExtensionContext) => {
  await storeSecret(context, "graymatter-token", undefined);
  await updateGlobalState(context, "grayMatterSession", undefined);
  getStatusBarService().updateGrayMatterStatus("unauthenticated");
  await signInToGrayMatter();
  vscode.window.showInformationMessage(
    "GrayMatter token cleared. Complete sign-in, then reload ValorIDE to validate the new token.",
  );
};
