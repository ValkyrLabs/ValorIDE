import * as vscode from "vscode";
const DEFAULT_VALKYRAI_HOST = (process.env.VITE_basePath && process.env.VITE_basePath.trim()) ||
    "http://localhost:8080/v1";
const normalizeHost = (value) => {
    const candidate = (value || "").trim();
    if (!candidate) {
        return DEFAULT_VALKYRAI_HOST.replace(/\/+$/, "");
    }
    return candidate.replace(/\/+$/, "");
};
export const getValkyraiBasePath = () => {
    const configured = vscode.workspace
        .getConfiguration("valoride.valkyrai")
        .get("host");
    return normalizeHost(configured);
};
export const getValkyraiWsBase = () => {
    try {
        const base = new URL(getValkyraiBasePath());
        const protocol = base.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${base.host}`;
    }
    catch {
        return "ws://localhost:8080";
    }
};
export const getDefaultValkyraiHost = () => DEFAULT_VALKYRAI_HOST.replace(/\/+$/, "");
//# sourceMappingURL=serverValkyraiHost.js.map