import * as vscode from "vscode";

export const STARTUP_REVEAL_STATE_KEY = "valoride.startupReveal.completed";

export type StartupRevealMode = "never" | "firstInstall" | "always";

export function normalizeStartupRevealMode(value: unknown): StartupRevealMode {
  if (value === "always" || value === "never" || value === "firstInstall") {
    return value;
  }

  return "never";
}

export function shouldRevealValorIDESidebarOnStartup(
  mode: StartupRevealMode,
  startupRevealCompleted: boolean,
): boolean {
  if (mode === "always") {
    return true;
  }

  if (mode === "firstInstall") {
    return !startupRevealCompleted;
  }

  return false;
}

export async function revealValorIDESidebar(
  commands: Pick<typeof vscode.commands, "executeCommand">,
  sideBarId: string,
): Promise<void> {
  await commands.executeCommand("workbench.view.extension.valoride-activitybar");
  await commands.executeCommand(`${sideBarId}.focus`);
}

export async function maybeRevealValorIDESidebarOnStartup(
  context: vscode.ExtensionContext,
  sideBarId: string,
  logger: (message: string) => void,
): Promise<void> {
  const mode = normalizeStartupRevealMode(
    vscode.workspace
      .getConfiguration("valoride")
      .get<StartupRevealMode>("startupReveal"),
  );
  const startupRevealCompleted = Boolean(
    context.globalState.get(STARTUP_REVEAL_STATE_KEY),
  );

  if (!shouldRevealValorIDESidebarOnStartup(mode, startupRevealCompleted)) {
    logger(`Startup sidebar reveal skipped; mode=${mode}`);
    return;
  }

  await revealValorIDESidebar(vscode.commands, sideBarId);
  await context.globalState.update(STARTUP_REVEAL_STATE_KEY, true);
  logger(`Startup sidebar reveal completed; mode=${mode}`);
}
