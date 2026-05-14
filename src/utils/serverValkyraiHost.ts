import * as vscode from "vscode";

const DEFAULT_VALKYRAI_HOST =
  (process.env.VITE_basePath && process.env.VITE_basePath.trim()) ||
  "https://api-0.valkyrlabs.com/v1";

export const normalizeValkyraiHost = (value?: string) => {
  const candidate = (value || "").trim();
  if (!candidate) {
    return DEFAULT_VALKYRAI_HOST.replace(/\/+$/, "");
  }
  try {
    const parsed = new URL(candidate);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    parsed.pathname = pathname && pathname !== "/" ? pathname : "/v1";
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`.replace(
      /\/+$/,
      "",
    );
  } catch {
    return candidate.replace(/\/+$/, "");
  }
};

export const getValkyraiBasePath = () => {
  const configured = vscode.workspace
    .getConfiguration("valoride.valkyrai")
    .get<string>("host");
  return normalizeValkyraiHost(configured);
};

export const getValkyraiWsBase = () => {
  try {
    const base = new URL(getValkyraiBasePath());
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${base.host}`;
  } catch {
    return "ws://localhost:8080";
  }
};

export const getDefaultValkyraiHost = () =>
  DEFAULT_VALKYRAI_HOST.replace(/\/+$/, "");
