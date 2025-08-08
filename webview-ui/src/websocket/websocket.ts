// export const  = "ws://localhost:8081/chat";

// un-comment for Vite apps
// export const WEBSOCKET_URL = import.meta.env.VITE_wssBasePath.replace(
//  /\/+$/,
//  "",
//);

// un-comment for Create REact APp apps
export const WEBSOCKET_URL = process.env.REACT_APP_WS_BASE_PATH // .replace(/\/+$/, "");

export const Configuration = {
	basePath: WEBSOCKET_URL, // This is the value that will be prepended to all endpoints.  For compatibility with
	// previous versions, the default is an empty string.  Other generators typically use
	// BASE_PATH as the default.
}
