import { BASE_PATH } from "@thorapi/src";

type HeadersLike = HeadersInit | undefined;

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

const attachAuthHeader = (headers: Headers) => {
  if (!headers.has("Authorization")) {
    const token =
      typeof window !== "undefined" ? sessionStorage.getItem("jwtToken") : null;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
};

const attachOrgHeader = (headers: Headers) => {
  if (headers.has("X-Org-Id") || headers.has("X-Organization-Id")) return;
  if (typeof window === "undefined") return;

  const pickOrg = (): string | null => {
    const direct =
      sessionStorage.getItem("orgId") ||
      sessionStorage.getItem("organizationId") ||
      sessionStorage.getItem("ownerId");
    if (direct) return direct;

    const principalRaw = sessionStorage.getItem("authenticatedPrincipal");
    if (principalRaw) {
      try {
        const parsed = JSON.parse(principalRaw);
        return (
          parsed?.organizationId || parsed?.orgId || parsed?.ownerId || null
        );
      } catch {
        return null;
      }
    }
    return null;
  };

  const org = pickOrg();
  if (org) {
    headers.set("X-Org-Id", org);
  }
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

export const authFetch = async (
  input: string,
  init: RequestInit = {},
): Promise<Response> => {
  const headers = toHeaders(init.headers);
  attachAuthHeader(headers);
  attachOrgHeader(headers);
  const url = resolveUrl(input);
  return fetch(url, {
    ...init,
    headers,
  });
};

export const authJsonFetch = async <T>(
  input: string,
  init: RequestInit = {},
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
