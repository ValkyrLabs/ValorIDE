import { getValkyraiWsBase } from "@/utils/valkyraiHost";
const envWebsocketUrl = (import.meta.env?.VITE_wssBasePath &&
    String(import.meta.env.VITE_wssBasePath).trim()) ||
    (process.env.REACT_APP_WS_BASE_PATH || "").trim();
export const getWebsocketUrl = () => envWebsocketUrl || getValkyraiWsBase();
export const isValidWsUrl = (url) => {
    if (!url)
        return false;
    // Basic sanity check to ensure a ws:// or wss:// URL
    return /^wss?:\/\//i.test(url);
};
//# sourceMappingURL=websocket.js.map