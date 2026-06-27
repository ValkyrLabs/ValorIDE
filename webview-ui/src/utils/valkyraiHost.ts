import { Configuration, setBasePath } from "@thorapi/src";

type HostListener = (host: string) => void;

const rawDefault =
  (import.meta.env?.VITE_basePath &&
    String(import.meta.env.VITE_basePath).trim()) ||
  "https://api-0.valkyrlabs.com/v1";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const ensureApiBasePath = (value: string) => {
  try {
    const parsed = new URL(value);
    const pathname = parsed.pathname.replace(/\/+$/, "");
    parsed.pathname = pathname && pathname !== "/" ? pathname : "/v1";
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return value;
  }
};

const listeners = new Set<HostListener>();

const sanitizeHost = (value?: string): string => {
  const candidate = (value || "").trim();
  if (!candidate) {
    return trimTrailingSlashes(rawDefault);
  }
  try {
    // Validate the URL – this throws if invalid
    const normalized = ensureApiBasePath(candidate);
    return trimTrailingSlashes(normalized);
  } catch {
    return trimTrailingSlashes(rawDefault);
  }
};

export const DEFAULT_VALKYRAI_HOST = trimTrailingSlashes(rawDefault);

let currentHost =
  (typeof window !== "undefined" &&
    typeof (window as any).__valorideValkyraiBasePath === "string" &&
    (window as any).__valorideValkyraiBasePath) ||
  DEFAULT_VALKYRAI_HOST;

currentHost = sanitizeHost(currentHost);
setBasePath(currentHost);

const notifyHostChange = (host: string) => {
  listeners.forEach((listener) => {
    try {
      listener(host);
    } catch (error) {
      console.error("ValkyrAI host listener error:", error);
    }
  });
};

export const getValkyraiHost = () => currentHost;

export const setValkyraiHost = (value?: string) => {
  const nextHost = sanitizeHost(value);
  if (nextHost === currentHost) {
    return;
  }
  currentHost = nextHost;
  setBasePath(nextHost);
  try {
    if (typeof window !== "undefined") {
      (window as any).__valorideValkyraiBasePath = nextHost;
    }
  } catch {
    // ignore sandboxed assignment errors
  }
  notifyHostChange(nextHost);
};

export const subscribeToValkyraiHost = (listener: HostListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const deriveWsUrlFromHost = (host?: string): string | undefined => {
  if (!host) {
    return undefined;
  }
  const trimmed = host.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^wss?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return trimTrailingSlashes(parsed.toString());
    } catch {
      return trimTrailingSlashes(trimmed);
    }
  }
  try {
    const base = new URL(trimmed);
    const protocol = base.protocol === "https:" ? "wss:" : "ws:";
    const pathname = base.pathname.replace(/\/+$/, "");
    base.protocol = protocol;
    base.pathname = pathname && pathname !== "/" ? pathname : "/v1";
    return trimTrailingSlashes(base.toString());
  } catch {
    return undefined;
  }
};

export const getValkyraiWsBase = () =>
  deriveWsUrlFromHost(currentHost) ?? "ws://localhost:8080";
