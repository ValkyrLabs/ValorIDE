// ValorIDE Prompt Loader
// Loads VALKYRAI behavioral rules and provides them to the agent at runtime.

import { valkyrRules } from './valkyr-rules';

/** The complete ValkyrAI prompt that augments the built-in ValorIDE runtime contract */
export const SYSTEM_PROMPT = valkyrRules;

export { valkyrRules };