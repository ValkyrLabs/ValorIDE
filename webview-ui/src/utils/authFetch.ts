import { BASE_PATH } from "@thorapi/src";
import {
  applyCsrfHeader,
  CSRF_HEADER_NAME,
  rememberCsrfToken,
  shouldAttachCsrfToken,
} from "./csrfToken";

type HeadersLike = HeadersInit | undefined;
export interface AuthRequestInit extends RequestInit { }

const apiBasePath = BASE_PATH.replace(/\/+$/, "");
const rootBasePath = apiBasePath.replace(/\/v1$/, "");

const toHeaders = (input: HeadersLike): Headers => {
  if (input instanceof Headers) {
    return new Headers(input);
  }
  return new Headers(input ?? {});
};

const resolveUrl = (input: string): string => {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  if (!input.startsWith("/")) {
    return `${apiBasePath}/${input}`;
  }
  return `${apiBasePath}${input}`;
};

const buildError = async (response: Response, url: string) => {
  let detail: string | undefined;
  try {
    detail = await response.text();
  } catch {
    detail = undefined;
  }
  const bodyPreview = detail ? detail.slice(0, 800) : "";
  throw new Error(
    `Request to ${url} failed with ${response.status} ${response.statusText}${bodyPreview ? ` – ${bodyPreview}` : ""
    }`,
  );
};

const readStorageValue = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const resolveOrganizationIdFromStorage = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const directKeys = ["orgId", "organizationId"];
  for (const key of directKeys) {
    const fromSession = readStorageValue(window.sessionStorage, key);
    if (fromSession) {
      return fromSession;
    }
    const fromLocal = readStorageValue(window.localStorage, key);
    if (fromLocal) {
      return fromLocal;
    }
  }

  const rawPrincipal = readStorageValue(
    window.localStorage,
    "authenticatedPrincipal",
  );
  if (!rawPrincipal) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawPrincipal) as Record<string, any>;
    const value =
      parsed?.organizationId ?? parsed?.orgId ?? parsed?.organization?.id;
    return value ? String(value) : undefined;
  } catch {
    return undefined;
  }
};

const applyAuthHeaders = (headers: Headers): Headers => {
  const orgId = resolveOrganizationIdFromStorage();
  if (orgId) {
    if (!headers.has("X-Org-Id")) {
      headers.set("X-Org-Id", orgId);
    }
    if (!headers.has("X-OrganizationId")) {
      headers.set("X-OrganizationId", orgId);
    }
    if (!headers.has("X-OrgId")) {
      headers.set("X-OrgId", orgId);
    }
  }
  return headers;
};

export const refreshCsrfToken = async (): Promise<string | undefined> => {
  try {
    const response = await fetch(resolveUrl("/auth/csrf"), {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return undefined;
    }

    let token =
      response.headers.get(CSRF_HEADER_NAME) ||
      response.headers.get("X-CSRF-TOKEN");
    if (!token) {
      try {
        const body = (await response.json()) as { token?: string };
        token = body.token;
      } catch {
        token = undefined;
      }
    }
    rememberCsrfToken(token);
    return token || undefined;
  } catch {
    return undefined;
  }
};

export const authFetch = async (
  input: string,
  init: AuthRequestInit = {},
): Promise<Response> => {
  const callerHeaders = toHeaders(init.headers);
  const callerProvidedCsrf = callerHeaders.has(CSRF_HEADER_NAME);
  const url = resolveUrl(input);

  const buildInit = (): RequestInit => {
    const headers = applyAuthHeaders(toHeaders(init.headers));
    applyCsrfHeader(headers, init.method);
    return {
      ...init,
      headers,
      credentials: init.credentials ?? "include",
    };
  };

  const response = await fetch(url, buildInit());
  if (
    response.status === 403 &&
    shouldAttachCsrfToken(init.method) &&
    !callerProvidedCsrf
  ) {
    const refreshed = await refreshCsrfToken();
    if (refreshed) {
      return fetch(url, buildInit());
    }
  }
  return response;
};

export const authJsonFetch = async <T>(
  input: string,
  init: AuthRequestInit = {},
): Promise<T> => {
  const headers = toHeaders(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const response = await authFetch(input, {
    ...init,
    headers,
  });
  if (!response.ok) {
    await buildError(response, resolveUrl(input));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};

export const resolveApiPath = (path: string) => resolveUrl(path);
export const resolveRootApiPath = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${rootBasePath}${normalized}`;
};

export const ApiEndpoints = {
  basePath: apiBasePath,
  rootPath: rootBasePath,
};
