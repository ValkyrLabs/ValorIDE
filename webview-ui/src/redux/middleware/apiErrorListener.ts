import {
  createListenerMiddleware,
  isRejectedWithValue,
  type Middleware,
} from "@reduxjs/toolkit";
import {
  apiErrorReceived,
  insufficientCreditsDetected,
  type ApiErrorPayload,
} from "../slices/apiErrorsSlice";

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

const buildMessage = (status: number, data: any): string => {
  if (data == null) {
    return `Request failed with status ${status}`;
  }
  if (typeof data === "string") return data;
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;
  try {
    return JSON.stringify(data);
  } catch {
    return `Request failed with status ${status}`;
  }
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
      message: buildMessage(status, data),
      data,
    };

    if (isInsufficientCreditsPayload(data)) {
      listenerApi.dispatch(insufficientCreditsDetected(errorPayload));
      return;
    }

    listenerApi.dispatch(apiErrorReceived(errorPayload));
  },
});

export const apiErrorMiddleware: Middleware = apiErrorListener.middleware;
