import * as vscode from "vscode";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { getGlobalState, getSecret, storeSecret, updateGlobalState } from "@core/storage/state";
import { createGrayMatterSessionState } from "@services/graymatter/GrayMatterSessionService";
import { getStatusBarService } from "@services/StatusBarService";
import { GrayMatterMemoryPanel } from "../../views/graymatter/GrayMatterMemoryPanel";
import { extractTenantContext, mergeTenantContext } from "@services/auth/tenantContext";

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
  const tenantContext = await readStoredTenantContext(context);
  const session = await createGrayMatterSessionState({
    baseUrl: getValkyraiBasePath(),
    token,
    tenantContext,
  });
  await updateGlobalState(context, "grayMatterSession", session);
  getStatusBarService().updateGrayMatterStatus(session.status, session.error);
};

const readStoredTenantContext = async (context: vscode.ExtensionContext) => {
  const authenticatedPrincipal = await getGlobalState(
    context,
    "authenticatedPrincipal",
  );
  const userInfo = await getGlobalState(context, "userInfo");
  const rawTenantContext = await context.secrets.get("tenantContext");
  let tenantSecret = undefined;
  if (rawTenantContext) {
    try {
      tenantSecret = JSON.parse(rawTenantContext);
    } catch {
      tenantSecret = undefined;
    }
  }
  return mergeTenantContext(
    extractTenantContext(authenticatedPrincipal),
    extractTenantContext(userInfo),
    tenantSecret,
  );
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
