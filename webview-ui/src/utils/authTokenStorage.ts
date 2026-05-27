import { clearRememberedCsrfToken } from "./csrfToken";

const readStorage = (
  storage: Storage | undefined,
  key: string,
): string | null => {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
};

const getStorageScope = (): {
  localStorage?: Storage;
  sessionStorage?: Storage;
} => {
  if (typeof window !== "undefined") {
    return {
      localStorage: window.localStorage,
      sessionStorage: window.sessionStorage,
    };
  }
  return globalThis as {
    localStorage?: Storage;
    sessionStorage?: Storage;
  };
};

const READABLE_AUTH_COOKIE_NAMES = [
  "jwtSession",
  "jwtToken",
  "auth_token",
  "valoride_jwt",
  "temp_auth_token",
  "VALKYR_AUTH",
  "JSESSIONID",
  "SESSION",
  "XSRF-TOKEN",
] as const;

type ClearBrowserAuthStorageOptions = {
  preserveSessionKeys?: string[];
};

const clearStorage = (
  storage: Storage | undefined,
  preserveKeys: string[] = [],
): void => {
  if (!storage) {
    return;
  }
  const preservedValues = new Map<string, string>();
  for (const key of preserveKeys) {
    try {
      const value = storage.getItem(key);
      if (value !== null) {
        preservedValues.set(key, value);
      }
    } catch {
      // no-op
    }
  }

  try {
    storage.clear();
  } catch {
    for (const key of [
      "authenticatedPrincipal",
      "jwtSession",
      "jwtToken",
      "auth_token",
      "valoride_jwt",
      "temp_auth_token",
      "2fa_methods",
      "oauth_post_login_redirect",
      "oauth_last_event",
      "remember_me",
      "dashboardOps.objectStats.preferences",
      "statisticsService:pollingSuspended",
      "statisticsService:401Count",
    ]) {
      try {
        storage.removeItem(key);
      } catch {
        // no-op
      }
    }
  }

  for (const [key, value] of Array.from(preservedValues.entries())) {
    try {
      storage.setItem(key, value);
    } catch {
      // no-op
    }
  }
};

const getCookieNames = (): string[] => {
  if (typeof document === "undefined") {
    return [];
  }
  const readableCookieNames = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));
  return Array.from(
    new Set([...readableCookieNames, ...READABLE_AUTH_COOKIE_NAMES]),
  );
};

const getCookieDomains = (): Array<string | undefined> => {
  if (typeof window === "undefined") {
    return [undefined];
  }
  const hostname = window.location.hostname;
  if (
    !hostname ||
    hostname === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  ) {
    return [undefined];
  }
  const parts = hostname.split(".");
  const rootDomain =
    parts.length > 2
      ? `.${parts.slice(parts.length - 2).join(".")}`
      : undefined;
  return Array.from(new Set([undefined, hostname, `.${hostname}`, rootDomain]));
};

export const clearReadableAuthCookies = (): void => {
  if (typeof document === "undefined") {
    return;
  }
  const paths = new Set<string>(["/", "/v1"]);
  if (typeof window !== "undefined" && window.location.pathname) {
    paths.add(window.location.pathname);
  }

  for (const name of getCookieNames()) {
    for (const path of Array.from(paths)) {
      for (const domain of getCookieDomains()) {
        const domainPart = domain ? `; domain=${domain}` : "";
        document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}${domainPart}; SameSite=Lax`;
      }
    }
  }
};

export const clearBrowserAuthStorage = (
  options: ClearBrowserAuthStorageOptions = {},
): void => {
  clearRememberedCsrfToken();
  const { localStorage, sessionStorage } = getStorageScope();
  clearStorage(sessionStorage, options.preserveSessionKeys);
  clearStorage(localStorage);
  clearReadableAuthCookies();
};

export const getStoredJwtToken = (): string | null => {
  return null;
};
