// customBaseQuery.ts
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { getValkyraiHost } from "@thorapi/utils/valkyraiHost";
import { clearStoredAuthSession } from "@thorapi/utils/accessControl";
import { applyCsrfHeader, shouldAttachCsrfToken } from "@thorapi/utils/csrfToken";
import { getStoredJwtToken } from "@thorapi/utils/authTokenStorage";
import { refreshCsrfToken } from "@thorapi/utils/authFetch";
import { applyTenantHeaders } from "@thorapi/utils/tenantContext";
import { vscode } from "@thorapi/utils/vscode";

const getRequestPath = (arg: unknown): string => {
  const url = typeof arg === "string" ? arg : (arg as { url?: string })?.url;
  if (!url) {
    return "";
  }
  try {
    return new URL(url, getValkyraiHost()).pathname.replace(/\/+$/, "");
  } catch {
    return url.split("?")[0].replace(/\/+$/, "");
  }
};

const isLoginRequest = (arg: unknown): boolean =>
  getRequestPath(arg).endsWith("/auth/login");

const isExpiredSessionError = (
  error: unknown,
): error is FetchBaseQueryError => {
  const candidate = error as FetchBaseQueryError | undefined;
  const status = candidate?.status;
  if (status !== 401 && status !== 403) {
    return false;
  }

  const data = (candidate as any)?.data;
  const message =
    typeof data === "string"
      ? data
      : typeof data?.message === "string"
        ? data.message
        : typeof data?.error === "string"
          ? data.error
          : "";
  const normalized = message.toLowerCase();
  return (
    normalized.includes("session expired") ||
    normalized.includes("replaced by another login") ||
    normalized.includes("fresh token")
  );
};

const buildBaseQuery = () =>
  fetchBaseQuery({
    baseUrl: getValkyraiHost(),
    credentials: "include",
    prepareHeaders: (headers, { arg }) => {
      const token = getStoredJwtToken();
      if (token && !isLoginRequest(arg)) {
        headers.set("Authorization", `Bearer ${token}`);
        headers.set("jwtSession", token);
      }

      applyTenantHeaders(headers);
      const method = typeof arg === "string" ? undefined : arg?.method;
      return applyCsrfHeader(headers, method);
    },
  });

type ThorapiBridgeResult =
  | { data: unknown }
  | {
      error: {
        status?: number | string;
        data?: unknown;
        error?: string;
      };
    };

const createRequestId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `thorapi-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const headersToRecord = (
  headers: unknown,
): Record<string, string> | undefined => {
  if (!headers) {
    return undefined;
  }
  try {
    if (headers instanceof Headers) {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }
    if (Array.isArray(headers)) {
      return Object.fromEntries(headers as Array<[string, string]>);
    }
    if (typeof headers === "object") {
      return Object.fromEntries(
        Object.entries(headers as Record<string, unknown>).map(
          ([key, value]) => [key, String(value)],
        ),
      );
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const argsToThorapiRequest = (args: any) => {
  if (typeof args === "string") {
    return {
      url: args,
      method: "GET",
    };
  }

  return {
    url: args?.url || "",
    method: args?.method || "GET",
    body: args?.body,
    params: args?.params,
    headers: headersToRecord(args?.headers),
    responseType: hasCustomResponseHandler(args)
      ? ("arraybuffer" as const)
      : undefined,
  };
};

const hasHeader = (
  headers: Record<string, string> | undefined,
  headerName: string,
): boolean =>
  Boolean(
    headers &&
      Object.keys(headers).some(
        (key) => key.toLowerCase() === headerName.toLowerCase(),
      ),
  );

const withStoredAuthHeaders = <
  T extends { url?: string; headers?: Record<string, string> },
>(
  request: T,
): T => {
  const token = getStoredJwtToken();
  if (!token || isLoginRequest(request.url)) {
    return request;
  }

  const headers = { ...(request.headers ?? {}) };
  if (!hasHeader(headers, "authorization")) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (!hasHeader(headers, "jwtSession")) {
    headers.jwtSession = token;
  }

  return {
    ...request,
    headers,
  };
};

const hasCustomResponseHandler = (args: unknown): boolean =>
  typeof args === "object" &&
  args !== null &&
  "responseHandler" in (args as Record<string, unknown>);

const shouldUseExtensionThorapiBridge = (args: unknown): boolean =>
  typeof window !== "undefined" &&
  vscode.isAvailable() &&
  !isLoginRequest(args);

const base64ToArrayBuffer = (value: string): ArrayBuffer => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
};

const responseFromThorapiBridge = (response: any): Response => {
  const body =
    typeof response.bodyBase64 === "string"
      ? base64ToArrayBuffer(response.bodyBase64)
      : undefined;

  return new Response(body, {
    status: response.status ?? (response.ok ? 200 : 500),
    statusText: response.statusText,
    headers: response.headers,
  });
};

const runResponseHandler = async (handler: unknown, response: Response) => {
  if (typeof handler === "function") {
    return handler(response);
  }

  if (handler === "text") {
    return response.text();
  }

  if (handler === "content-type") {
    const contentType = response.headers.get("content-type") || "";
    return contentType.includes("application/json")
      ? response.json()
      : response.text();
  }

  return response.json();
};

const extensionThorapiBaseQuery = async (
  args: any,
): Promise<ThorapiBridgeResult> => {
  const requestId = createRequestId();
  const request = withStoredAuthHeaders(argsToThorapiRequest(args));

  return new Promise<ThorapiBridgeResult>((resolve) => {
    let handleResponse: (event: MessageEvent) => void = () => undefined;
    const timeoutId = window.setTimeout(() => {
      window.removeEventListener("message", handleResponse);
      resolve({
        error: {
          status: "TIMEOUT_ERROR",
          error: "ThorAPI request timed out.",
        },
      });
    }, 30000);

    handleResponse = (event: MessageEvent) => {
      const message = event.data;
      const response = message?.thorapiResponse;
      if (
        message?.type !== "thorapiResponse" ||
        response?.requestId !== requestId
      ) {
        return;
      }

      window.clearTimeout(timeoutId);
      window.removeEventListener("message", handleResponse);

      if (hasCustomResponseHandler(args)) {
        runResponseHandler(
          typeof args === "object" ? args?.responseHandler : undefined,
          responseFromThorapiBridge(response),
        )
          .then((data) => {
            if (response.ok) {
              resolve({ data });
              return;
            }

            resolve({
              error: {
                status: response.status ?? "FETCH_ERROR",
                data,
                error:
                  response.error ||
                  response.statusText ||
                  "ThorAPI request failed.",
              },
            });
          })
          .catch((error) => {
            resolve({
              error: {
                status: "PARSING_ERROR",
                error:
                  error instanceof Error
                    ? error.message
                    : "ThorAPI response parsing failed.",
              },
            });
          });
        return;
      }

      if (response.ok) {
        resolve({ data: response.data });
        return;
      }

      resolve({
        error: {
          status: response.status ?? "FETCH_ERROR",
          data: response.data,
          error:
            response.error || response.statusText || "ThorAPI request failed.",
        },
      });
    };

    window.addEventListener("message", handleResponse);
    vscode.postMessage({
      type: "thorapiRequest",
      thorapiRequest: {
        requestId,
        ...request,
      },
    });
  });
};

const customBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  const isLogin = isLoginRequest(args);
  if (isLogin) {
    clearStoredAuthSession("pre-login");
  }

  if (shouldUseExtensionThorapiBridge(args)) {
    const result = await extensionThorapiBaseQuery(args);
    if (isExpiredSessionError((result as any).error)) {
      clearStoredAuthSession("api-auth-error");
    }
    return result;
  }

  const baseQuery = buildBaseQuery();
  let result = await baseQuery(args, api, extraOptions);

  if (
    result.error &&
    typeof result.error === "object" &&
    "status" in result.error &&
    (result.error as any).status === 403
  ) {
    const method =
      typeof args === "string" ? undefined : (args as FetchArgs).method;
    if (shouldAttachCsrfToken(method)) {
      const refreshed = await refreshCsrfToken();
      if (refreshed) {
        result = await baseQuery(args, api, extraOptions);
      }
    }
  }

  if (isExpiredSessionError(result.error)) {
    clearStoredAuthSession("api-auth-error");
  }
  return result;
};

export default customBaseQuery;
