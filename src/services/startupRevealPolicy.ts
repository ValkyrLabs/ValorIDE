export type StartupRevealMode = "manual" | "firstInstall" | "always";

export type StartupRevealDecisionInput = {
  revealOnStartupSetting?: boolean;
  legacyRevealMode?: StartupRevealMode;
  firstActivationRevealCompleted?: boolean;
  legacyRevealCompleted?: boolean;
};

export type StartupRevealDecision = {
  shouldReveal: boolean;
  reason:
    | "explicit_setting"
    | "legacy_setting"
    | "first_activation"
    | "returning_user";
};

export const FIRST_ACTIVATION_REVEAL_STATE_KEY =
  "valoride.firstActivationRevealCompleted";
export const LEGACY_STARTUP_REVEAL_STATE_KEY =
  "valoride.startupReveal.completed";

// Configuration defaults are not user choices. In particular, the default false
// for revealOnStartup must leave first-activation onboarding available.
export function getExplicitStartupSetting<T>(inspection?: {
  globalValue?: T;
  workspaceValue?: T;
  workspaceFolderValue?: T;
}): T | undefined {
  return (
    inspection?.workspaceFolderValue ??
    inspection?.workspaceValue ??
    inspection?.globalValue
  );
}

export function decideStartupReveal(
  input: StartupRevealDecisionInput,
): StartupRevealDecision {
  if (typeof input.revealOnStartupSetting === "boolean") {
    return {
      shouldReveal: input.revealOnStartupSetting,
      reason: "explicit_setting",
    };
  }

  if (
    input.legacyRevealMode === "manual" ||
    input.legacyRevealMode === "always"
  ) {
    return {
      shouldReveal: input.legacyRevealMode === "always",
      reason: "legacy_setting",
    };
  }

  if (!input.firstActivationRevealCompleted && !input.legacyRevealCompleted) {
    return { shouldReveal: true, reason: "first_activation" };
  }

  return { shouldReveal: false, reason: "returning_user" };
}
