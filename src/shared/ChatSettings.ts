export interface ChatSettings {
  mode: "plan" | "act";
  stubbornMode?: boolean; // When enabled, auto-asks for thoroughness after completion
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  mode: "act",
};
