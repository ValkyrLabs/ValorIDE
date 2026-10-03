import { getValkyraiHost } from "./valkyraiHost";
import { getStoredJwtToken } from "./authTokenStorage";
import {
  assertCredentialHeaders,
  assertRefreshCredential,
  credentialOrigin,
} from "@shared/CredentialOrigin";
import {
  applyCsrfHeader,
  CSRF_HEADER_NAME,
  rememberCsrfToken,
  shouldAttachCsrfToken,
} from "./csrfToken";

type HeadersLike = HeadersInit | undefined;
export interface AuthRequestInit extends RequestInit {}

const currentApiPath = () => getValkyraiHost().replace(/\/+$/, "");

const toHeaders = (input: HeadersLike): Headers => {
  if (input instanceof Headers) {
    return new Headers(input);
  }
  return new Headers(input ?? {});
};

const resolveUrl = (input: string): string => {
  const apiBasePath = currentApiPath();
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
    `Request to ${url} failed with ${response.status} ${response.statusText}${
      bodyPreview ? ` – ${bodyPreview}` : ""
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
      credentials: "omit",
      redirect: "error",
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
  const safe = new URL(url);
  safe.search = "";
  credentialOrigin(safe.toString());

  const buildInit = (): RequestInit => {
    const headers = applyAuthHeaders(toHeaders(init.headers));
    const token = getStoredJwtToken(url);
    if (token) {
      if (!headers.has("Authorization"))
        headers.set("Authorization", `Bearer ${token}`);
      if (!headers.has("jwtSession")) headers.set("jwtSession", token);
    }
    assertCredentialHeaders(url, headers);
    assertRefreshCredential(url, init.body);
    applyCsrfHeader(headers, init.method);
    return {
      ...init,
      headers,
      credentials: "omit",
      redirect: "error",
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
  return `${currentApiPath().replace(/\/v1$/, "")}${normalized}`;
};

export const ApiEndpoints = {
  get basePath() {
    return currentApiPath();
  },
  get rootPath() {
    return currentApiPath().replace(/\/v1$/, "");
  },
};
