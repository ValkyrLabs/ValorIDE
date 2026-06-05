export type StartupRevealMode = "manual" | "firstInstall" | "always";

export const STARTUP_REVEAL_SETTING = "startup.revealSidebar";
export const STARTUP_REVEAL_GLOBAL_KEY = "valoride.startupReveal.completed";

type WorkspaceConfigurationLike = {
  get<T>(section: string, defaultValue: T): T;
};

type GlobalStateLike = {
  get<T>(key: string, defaultValue: T): T;
};

export type StartupRevealContext = {
  globalState: GlobalStateLike;
};

export function getStartupRevealMode(
  configuration: WorkspaceConfigurationLike,
): StartupRevealMode {
  const configured = configuration.get<StartupRevealMode>(
    STARTUP_REVEAL_SETTING,
    "manual",
  );

  if (
    configured === "manual" ||
    configured === "firstInstall" ||
    configured === "always"
  ) {
    return configured;
  }

  return "manual";
}

export function shouldRevealSidebarOnStartup(
  mode: StartupRevealMode,
  context: StartupRevealContext,
): boolean {
  if (mode === "always") {
    return true;
  }

  if (mode === "firstInstall") {
    return !context.globalState.get<boolean>(STARTUP_REVEAL_GLOBAL_KEY, false);
  }

  return false;
}
