import { Configuration } from "@/thor/src/runtime";
const rawDefault =
  (import.meta.env?.VITE_basePath &&
    String(import.meta.env.VITE_basePath).trim()) ||
  "https://api-0.valkyrlabs.com/v1";
const trimTrailingSlashes = (value) => value.replace(/\/+$/, "");
const listeners = new Set();
const sanitizeHost = (value) => {
  const candidate = (value || "").trim();
  if (!candidate) {
    return trimTrailingSlashes(rawDefault);
  }
  try {
    // Validate the URL – this throws if invalid
    const parsed = new URL(candidate);
    const normalized = `${parsed.protocol}//${parsed.host}${parsed.pathname || ""}${parsed.search || ""}${parsed.hash || ""}`;
    return trimTrailingSlashes(normalized);
  } catch {
    return trimTrailingSlashes(rawDefault);
  }
};
export const DEFAULT_VALKYRAI_HOST = trimTrailingSlashes(rawDefault);
let currentHost =
  (typeof window !== "undefined" &&
    typeof window.__valorideValkyraiBasePath === "string" &&
    window.__valorideValkyraiBasePath) ||
  DEFAULT_VALKYRAI_HOST;
currentHost = sanitizeHost(currentHost);
Configuration.basePath = currentHost;
const notifyHostChange = (host) => {
  listeners.forEach((listener) => {
    try {
      listener(host);
    } catch (error) {
      console.error("ValkyrAI host listener error:", error);
    }
  });
};
export const getValkyraiHost = () => currentHost;
export const setValkyraiHost = (value) => {
  const nextHost = sanitizeHost(value);
  if (nextHost === currentHost) {
    return;
  }
  currentHost = nextHost;
  Configuration.basePath = nextHost;
  try {
    if (typeof window !== "undefined") {
      window.__valorideValkyraiBasePath = nextHost;
    }
  } catch {
    // ignore sandboxed assignment errors
  }
  notifyHostChange(nextHost);
};
export const subscribeToValkyraiHost = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const deriveWsUrlFromHost = (host) => {
  if (!host) {
    return undefined;
  }
  const trimmed = host.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    const base = new URL(trimmed);
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${base.host}`;
  } catch {
    return undefined;
  }
};
export const getValkyraiWsBase = () =>
  deriveWsUrlFromHost(currentHost) ?? "ws://localhost:8080";
//# sourceMappingURL=valkyraiHost.js.map
