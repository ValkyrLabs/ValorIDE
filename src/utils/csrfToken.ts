export const CSRF_COOKIE_NAME = "XSRF-TOKEN";
export const CSRF_HEADER_NAME = "X-XSRF-TOKEN";

const UNSAFE_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);

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

export const applyCsrfHeader = (headers: Headers, method?: string): Headers => {
  if (!shouldAttachCsrfToken(method) || headers.has(CSRF_HEADER_NAME)) {
    return headers;
  }

  const csrfToken = readCookieValue(CSRF_COOKIE_NAME);
  if (csrfToken) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }
  return headers;
};
