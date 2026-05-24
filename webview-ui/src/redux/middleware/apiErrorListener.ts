import {
  createListenerMiddleware,
  isRejectedWithValue,
  type Middleware,
} from "@reduxjs/toolkit";
import {
  apiErrorReceived,
  clearLastError,
  insufficientCreditsDetected,
  type ApiErrorPayload,
} from "../slices/apiErrorsSlice";
import { clearStoredAuthSession } from "@thorapi/utils/accessControl";

const isInsufficientCreditsPayload = (data: any): boolean => {
  if (!data) return false;
  const errorCode =
    typeof data.error === "string" ? data.error.toUpperCase() : "";
  if (errorCode === "INSUFFICIENT_CREDITS") return true;
  if (errorCode === "INSUFFICIENT_FUNDS") return true;
  if (typeof data.message === "string") {
    const msg = data.message.toLowerCase();
    return msg.includes("insufficient") && msg.includes("credit");
  }
  return false;
};

const httpStatusLabel: Record<number, string> = {
  400: "Bad request",
  401: "Authentication required",
  402: "Payment required",
  403: "Access forbidden",
  404: "Resource not found",
  408: "Request timed out",
  429: "Too many requests",
  500: "Internal server error",
  502: "Bad gateway",
  503: "Service unavailable",
  504: "Gateway timeout",
};

const buildMessage = (
  status: number,
  data: any,
  endpointName?: string,
): string => {
  const endpointSuffix = endpointName ? ` (${endpointName})` : "";
  if (data == null) {
    const label = httpStatusLabel[status] ?? `HTTP ${status}`;
    return `${label}${endpointSuffix}`;
  }
  if (typeof data === "string" && data.trim()) {
    return `${data.trim()}${endpointSuffix}`;
  }
  if (typeof data.message === "string" && data.message.trim()) {
    return `${data.message.trim()}${endpointSuffix}`;
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return `${data.error.trim()}${endpointSuffix}`;
  }
  const label = httpStatusLabel[status] ?? `HTTP ${status}`;
  return `${label}${endpointSuffix}`;
};

const isExpiredSessionPayload = (status: number, data: any): boolean => {
  if (status !== 401 && status !== 403) {
    return false;
  }
  const message = buildMessage(status, data).toLowerCase();
  return (
    message.includes("session expired") ||
    message.includes("replaced by another login") ||
    message.includes("fresh token")
  );
};

export const apiErrorListener = createListenerMiddleware();

apiErrorListener.startListening({
  matcher: isRejectedWithValue,
  effect: async (action, listenerApi) => {
    const payload = action.payload as any;
    const status = payload?.status;

    if (typeof status !== "number" || status < 400) {
      return;
    }

    const data = payload?.data;
    const meta = (action as any)?.meta;
    const endpointName = meta?.arg?.endpointName as string | undefined;
    const id = (meta?.requestId as string | undefined) || `${Date.now()}`;

    const errorPayload: ApiErrorPayload = {
      id,
      status,
      endpointName,
      message: buildMessage(status, data, endpointName),
      data,
    };

    if (isExpiredSessionPayload(status, data)) {
      clearStoredAuthSession("api-error-listener");
      listenerApi.dispatch(clearLastError());
      return;
    }

    // Suppress 401/403 errors that occur when there is no active session.
    // These are expected "not yet authenticated" failures from components
    // that mount before login — not actionable errors to surface to the user.
    if (status === 401 || status === 403) {
      const hasSession = Boolean(sessionStorage.getItem("jwtToken"));
      if (!hasSession) {
        return;
      }
    }

    if (isInsufficientCreditsPayload(data)) {
      listenerApi.dispatch(insufficientCreditsDetected(errorPayload));
      return;
    }

    listenerApi.dispatch(apiErrorReceived(errorPayload));
  },
});

export const apiErrorMiddleware: Middleware = apiErrorListener.middleware;
