import {
  applyCsrfHeader,
  CSRF_HEADER_NAME,
  rememberCsrfToken,
  shouldAttachCsrfToken,
} from "./csrfToken";

type HeadersLike = HeadersInit | undefined;

export interface AuthRequestInit extends RequestInit {}

const apiBasePath = (
  process.env.VALORIDE_API_BASE_PATH ||
  process.env.REACT_APP_BASE_PATH ||
  "https://api-0.valkyrlabs.com/v1"
).replace(/\/+$/, "");

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
    const headers = toHeaders(init.headers);
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
