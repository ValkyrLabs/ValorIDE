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

      const method = typeof arg === "string" ? undefined : arg?.method;
      return applyCsrfHeader(headers, method);
    },
  });

const customBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  const isLogin = isLoginRequest(args);
  if (isLogin) {
    clearStoredAuthSession("pre-login");
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
