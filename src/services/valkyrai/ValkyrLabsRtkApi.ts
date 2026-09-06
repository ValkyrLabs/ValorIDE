import { configureStore } from "@reduxjs/toolkit";
import { BaseQueryFn, createApi } from "@reduxjs/toolkit/query";
import { VALKYR_LABS_API_TIMEOUT_MS } from "@shared/ValkyrLabsApi";

export type ValkyrLabsFetch = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export interface ValkyrLabsApiRequest {
  acceptHttpErrors?: boolean;
  body?: BodyInit | null;
  credentials?: RequestCredentials;
  headers?: HeadersInit;
  json?: unknown;
  method?: string;
  params?: Record<string, unknown>;
  responseType?: "arrayBuffer" | "auto" | "json" | "raw" | "text";
  url: string;
}

export interface ValkyrLabsApiResponse<T = unknown> {
  data: T;
  headers: Record<string, string>;
  setCookies?: string[];
  status: number;
  statusText: string;
}

type ValkyrLabsApiErrorStatus = number | "FETCH_ERROR" | "TIMEOUT_ERROR";

interface ValkyrLabsApiBaseQueryError {
  data?: unknown;
  error?: string;
  status: ValkyrLabsApiErrorStatus;
}

export class ValkyrLabsApiError extends Error {
  constructor(
    message: string,
    readonly status: ValkyrLabsApiErrorStatus,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "ValkyrLabsApiError";
  }
}

export interface ValkyrLabsRtkApiClient {
  request<T = unknown>(
    request: ValkyrLabsApiRequest,
  ): Promise<ValkyrLabsApiResponse<T>>;
}

const readResponseHeaders = (
  headers: Response["headers"],
): { headers: Record<string, string>; setCookies: string[] } => {
  const record: Record<string, string> = {};
  let setCookies: string[] = [];
  if (headers && typeof headers.forEach === "function") {
    headers.forEach((value, key) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === "set-cookie") {
        setCookies.push(value);
        return;
      }
      record[normalizedKey] = value;
    });
  }

  // Node/Undici exposes one entry per Set-Cookie. Never collapse these values:
  // ValkyrAI returns the live VALKYR_AUTH cookie followed by legacy-scope
  // expirations, and retaining only the final header discards the JWT.
  const getSetCookie = (
    headers as Response["headers"] & { getSetCookie?: () => string[] }
  )?.getSetCookie;
  if (typeof getSetCookie === "function") {
    const nativeSetCookies = getSetCookie.call(headers).filter(Boolean);
    if (nativeSetCookies.length > 0) {
      setCookies = nativeSetCookies;
    }
  }
  return { headers: record, setCookies };
};

const parseResponseBody = async (
  response: Response,
  responseType: ValkyrLabsApiRequest["responseType"] = "auto",
): Promise<unknown> => {
  if (responseType === "raw") {
    return response;
  }
  if (response.status === 204 || response.status === 205) {
    return undefined;
  }
  if (responseType === "arrayBuffer") {
    return response.arrayBuffer();
  }
  if (responseType === "json") {
    return response.json();
  }
  if (responseType === "text") {
    return response.text();
  }

  const contentType = response.headers?.get?.("content-type") ?? "";
  if (
    contentType.includes("application/json") ||
    (typeof response.json === "function" && typeof response.text !== "function")
  ) {
    return response.json();
  }
  return response.text();
};

const requestUrl = (request: ValkyrLabsApiRequest): string => {
  if (!request.params) {
    return request.url;
  }
  const url = new URL(request.url);
  Object.entries(request.params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          url.searchParams.append(key, String(item));
        }
      });
    } else if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

const requestHeaders = (request: ValkyrLabsApiRequest): HeadersInit => {
  const input = request.headers;
  if (request.json === undefined) {
    return input ?? {};
  }
  const headers: Record<string, string> = {};
  if (Array.isArray(input)) {
    input.forEach(([key, value]) => {
      headers[key] = value;
    });
  } else if (input && typeof (input as Headers).forEach === "function") {
    (input as Headers).forEach((value, key) => {
      headers[key] = value;
    });
  } else if (input) {
    Object.assign(headers, input);
  }
  if (
    !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
  ) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

const createValkyrLabsBaseQuery =
  (
    fetchImpl: ValkyrLabsFetch,
  ): BaseQueryFn<
    ValkyrLabsApiRequest,
    ValkyrLabsApiResponse,
    ValkyrLabsApiBaseQueryError
  > =>
  async (request, api) => {
    const abortController = new AbortController();
    const abortFromRtk = () => abortController.abort();
    api.signal.addEventListener("abort", abortFromRtk, { once: true });
    const timeout = setTimeout(
      () => abortController.abort(),
      VALKYR_LABS_API_TIMEOUT_MS,
    );

    try {
      const body =
        request.json === undefined
          ? request.body
          : JSON.stringify(request.json);
      const response = await fetchImpl(requestUrl(request), {
        body,
        credentials: request.credentials,
        headers: requestHeaders(request),
        method: request.method ?? "GET",
        signal: abortController.signal,
      });
      const data = await parseResponseBody(response, request.responseType);
      const responseHeaders = readResponseHeaders(response.headers);

      if (!response.ok && !request.acceptHttpErrors) {
        return {
          error: {
            data,
            status: response.status,
          },
        };
      }

      return {
        data: {
          data,
          headers: responseHeaders.headers,
          setCookies: responseHeaders.setCookies,
          status: response.status,
          statusText: response.statusText,
        },
      };
    } catch (error) {
      const timedOut = abortController.signal.aborted && !api.signal.aborted;
      return {
        error: {
          error: timedOut
            ? `Valkyr Labs API request timed out after ${VALKYR_LABS_API_TIMEOUT_MS} ms.`
            : error instanceof Error
              ? error.message
              : "Valkyr Labs API request failed.",
          status: timedOut ? "TIMEOUT_ERROR" : "FETCH_ERROR",
        },
      };
    } finally {
      clearTimeout(timeout);
      api.signal.removeEventListener("abort", abortFromRtk);
    }
  };

const createClient = (fetchImpl: ValkyrLabsFetch): ValkyrLabsRtkApiClient => {
  const valkyrLabsApi = createApi({
    baseQuery: createValkyrLabsBaseQuery(fetchImpl),
    endpoints: (builder) => ({
      request: builder.mutation<ValkyrLabsApiResponse, ValkyrLabsApiRequest>({
        query: (request) => request,
      }),
    }),
    reducerPath: "valkyrLabsApi",
  });
  const store = configureStore({
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(
        valkyrLabsApi.middleware,
      ),
    reducer: {
      [valkyrLabsApi.reducerPath]: valkyrLabsApi.reducer,
    },
  });

  return {
    async request<T>(request: ValkyrLabsApiRequest) {
      const operation = store.dispatch(
        valkyrLabsApi.endpoints.request.initiate(request, { track: false }),
      );
      const result = await operation;
      if ("error" in result) {
        const error = result.error as ValkyrLabsApiBaseQueryError;
        throw new ValkyrLabsApiError(
          error.error ?? `Valkyr Labs API request failed (${error.status}).`,
          error.status,
          error.data,
        );
      }
      return result.data as ValkyrLabsApiResponse<T>;
    },
  };
};

let defaultClient: ValkyrLabsRtkApiClient | undefined;

export const getValkyrLabsRtkApiClient = (
  fetchImpl?: ValkyrLabsFetch,
): ValkyrLabsRtkApiClient => {
  if (fetchImpl) {
    return createClient(fetchImpl);
  }
  if (!defaultClient) {
    defaultClient = createClient((url, init) => globalThis.fetch(url, init));
  }
  return defaultClient;
};
