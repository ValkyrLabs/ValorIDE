export const VALORIDE_ACTIVITYBAR_COMMAND =
  "workbench.view.extension.valoride-activitybar";

export const valorideSidebarFocusCommand = (sideBarId: string) =>
  `${sideBarId}.focus`;

export async function revealValorideSidebar(
  sideBarId: string,
  executeCommand: (command: string) => PromiseLike<unknown> | Promise<unknown>,
) {
  await executeCommand(VALORIDE_ACTIVITYBAR_COMMAND);
  await executeCommand(valorideSidebarFocusCommand(sideBarId));
}
