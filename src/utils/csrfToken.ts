export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

const UNSAFE_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);
let rememberedCsrfToken: string | undefined;

export const readCookieValue = (name: string): string | undefined => {
  if (typeof document === "undefined" || !document.cookie) {
    return undefined;
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(encodedName));

  if (!cookie) {
    return undefined;
  }

  try {
    return decodeURIComponent(cookie.slice(encodedName.length));
  } catch {
    return cookie.slice(encodedName.length);
  }
};

export const shouldAttachCsrfToken = (method?: string): boolean =>
  UNSAFE_METHODS.has((method || "GET").toUpperCase());

export const rememberCsrfToken = (token?: string | null): void => {
  const normalized = token?.trim();
  rememberedCsrfToken = normalized || undefined;
};

export const clearRememberedCsrfToken = (): void => {
  rememberedCsrfToken = undefined;
};

// Prefer an explicit token returned by /auth/csrf over document.cookie.
// In cross-subdomain production, the browser can send an API-scoped
// XSRF-TOKEN cookie that frontend JavaScript cannot reliably read, while an
// older app-domain cookie with the same name may still be visible. The
// response header is the authoritative value after a CSRF refresh.
export const readCsrfToken = (): string | undefined =>
  rememberedCsrfToken || readCookieValue(CSRF_COOKIE_NAME);

export const applyCsrfHeader = (headers: Headers, method?: string): Headers => {
  if (!shouldAttachCsrfToken(method) || headers.has(CSRF_HEADER_NAME)) {
    return headers;
  }

  const csrfToken = readCsrfToken();
  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }
  return headers;
};
