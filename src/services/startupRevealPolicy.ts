export type StartupRevealDecisionInput = {
  revealOnStartupSetting?: boolean;
  firstActivationRevealCompleted?: boolean;
};

export type StartupRevealDecision = {
  shouldReveal: boolean;
  reason: "explicit_setting" | "first_activation" | "returning_user";
};

export const FIRST_ACTIVATION_REVEAL_STATE_KEY =
  "valoride.firstActivationRevealCompleted";

export function decideStartupReveal(
  input: StartupRevealDecisionInput,
): StartupRevealDecision {
  if (input.revealOnStartupSetting === true) {
    return { shouldReveal: true, reason: "explicit_setting" };
  }

  if (!input.firstActivationRevealCompleted) {
    return { shouldReveal: true, reason: "first_activation" };
  }

  return { shouldReveal: false, reason: "returning_user" };
}
