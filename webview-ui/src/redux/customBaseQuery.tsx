// customBaseQuery.ts
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { getValkyraiHost } from "@thorapi/utils/valkyraiHost";
import { clearStoredAuthSession } from "@thorapi/utils/accessControl";

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
      const token = sessionStorage.getItem("jwtToken");
      if (token && !isLoginRequest(arg)) {
        headers.set("authorization", `Bearer ${token}`);
      }
      return headers;
    },
  });

const omitCredentials = (args: string | FetchArgs): FetchArgs =>
  typeof args === "string"
    ? { url: args, credentials: "omit" }
    : { ...args, credentials: "omit" };

const customBaseQuery: BaseQueryFn = async (args, api, extraOptions) => {
  const isLogin = isLoginRequest(args);
  if (isLogin) {
    clearStoredAuthSession("pre-login");
  }
  const baseQuery = buildBaseQuery();
  const result = await baseQuery(
    isLogin ? omitCredentials(args as string | FetchArgs) : args,
    api,
    extraOptions,
  );
  if (isExpiredSessionError(result.error)) {
    clearStoredAuthSession("api-auth-error");
  }
  return result;
};

export default customBaseQuery;
