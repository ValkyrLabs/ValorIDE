// export const  = "ws://localhost:8081/chat";

// un-comment for Vite apps
export const WEBSOCKET_URL = import.meta.env.VITE_wssBasePath
//.replace(
//  /\/+$/,
//  "",
//);

// un-comment for Create REact APp apps
// Note: Guard against undefined or invalid values to avoid runtime crashes in webviews.
const rawUrl = (process.env.REACT_APP_WS_BASE_PATH || "").trim();

//export const WEBSOCKET_URL: string = rawUrl;

export const isValidWsUrl = (url: string | undefined | null): boolean => {
  if (!url) return false;
  // Basic sanity check to ensure a ws:// or wss:// URL
  return /^wss?:\/\//i.test(url);
};

export const Configuration = {
  basePath: WEBSOCKET_URL,
};
