import {
  deriveWsUrlFromHost,
  getValkyraiHost,
  getValkyraiWsBase,
  subscribeToValkyraiHost,
} from "@thorapi/utils/valkyraiHost";

const resolveEnvWebsocketUrl = (): string | undefined => {
  const fromVite = import.meta.env?.VITE_wssBasePath;
  if (fromVite) {
    const trimmed = String(fromVite).trim();
    if (trimmed) {
      return trimmed;
    }
  }
  const fromReact = (process.env.REACT_APP_WS_BASE_PATH || "").trim();
  return fromReact || undefined;
};

const sanitizeWsBase = (value?: string): string | undefined => {
  const candidate = (value || "").trim();
  return candidate || undefined;
};

let websocketBaseUrl =
  sanitizeWsBase(resolveEnvWebsocketUrl()) || getValkyraiWsBase();

subscribeToValkyraiHost((host) => {
  const derived = deriveWsUrlFromHost(host);
  if (derived) {
    websocketBaseUrl = derived;
  }
});

export const setWebsocketBaseUrl = (value?: string) => {
  const normalized = sanitizeWsBase(value);
  websocketBaseUrl =
    normalized ||
    deriveWsUrlFromHost(getValkyraiHost()) ||
    getValkyraiWsBase();
  return websocketBaseUrl;
};

export const getWebsocketUrl = () => websocketBaseUrl || getValkyraiWsBase();

export const isValidWsUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  // Basic sanity check to ensure a ws:// or wss:// URL
  return /^wss?:\/\//i.test(url);
};
