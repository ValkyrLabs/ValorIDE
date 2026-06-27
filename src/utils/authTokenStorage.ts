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
  "authToken",
  "auth_token",
  "valoride_jwt",
  "temp_auth_token",
  "VALKYR_AUTH",
  "JSESSIONID",
  "SESSION",
  "XSRF-TOKEN",
] as const;

const COOKIE_PRESERVE_DURING_AUTH_CLEAR = new Set(["cart"]);

const JWT_STORAGE_KEYS = [
  "jwtToken",
  "authToken",
  "jwtSession",
  "auth_token",
  "valoride_jwt",
  "temp_auth_token",
  "VALKYR_AUTH",
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
    .filter(
      (name): name is string =>
        Boolean(name) && !COOKIE_PRESERVE_DURING_AUTH_CLEAR.has(name),
    );
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

const normalizeJwtToken = (value?: string | null): string | null => {
  const token = value?.trim();
  if (!token) {
    return null;
  }
  const bearerMatch = token.match(/^Bearer\s+(.+)$/i);
  return bearerMatch ? bearerMatch[1]?.trim() || null : token;
};

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined" || !document.cookie) {
    return null;
  }
  const encodedName = encodeURIComponent(name);
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.split("=");
    const cookieName = rawName?.trim();
    if (cookieName !== name && cookieName !== encodedName) {
      continue;
    }
    try {
      return decodeURIComponent(rawValue.join("=").trim());
    } catch {
      return rawValue.join("=").trim();
    }
  }
  return null;
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
  const { localStorage, sessionStorage } = getStorageScope();

  for (const key of JWT_STORAGE_KEYS) {
    const sessionToken = normalizeJwtToken(readStorage(sessionStorage, key));
    if (sessionToken) {
      return sessionToken;
    }
  }

  for (const key of JWT_STORAGE_KEYS) {
    const localToken = normalizeJwtToken(readStorage(localStorage, key));
    if (localToken) {
      try {
        sessionStorage?.setItem("jwtToken", localToken);
        sessionStorage?.setItem("jwtSession", localToken);
      } catch {
        // no-op
      }
      return localToken;
    }
  }

  for (const key of JWT_STORAGE_KEYS) {
    const cookieToken = normalizeJwtToken(readCookie(key));
    if (cookieToken) {
      return cookieToken;
    }
  }

  return null;
};
