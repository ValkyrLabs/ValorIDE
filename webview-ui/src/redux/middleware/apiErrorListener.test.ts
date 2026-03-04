import { describe, expect, it } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import apiErrorsReducer, {
  type ApiErrorPayload,
} from "../slices/apiErrorsSlice";
import { apiErrorListener } from "./apiErrorListener";

const makeStore = () =>
  configureStore({
    reducer: { apiErrors: apiErrorsReducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(apiErrorListener.middleware),
  });

describe("apiErrorListener", () => {
  it("dispatches insufficient credits flag for credit errors", async () => {
    const store = makeStore();

    store.dispatch({
      type: "fake/rejected",
      payload: {
        status: 402,
        data: { error: "INSUFFICIENT_CREDITS", message: "insufficient" },
      },
      meta: {
        arg: { endpointName: "generateApplication" },
        requestId: "r1",
        rejectedWithValue: true,
        requestStatus: "rejected",
      },
      error: { message: "Rejected" },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = store.getState().apiErrors;
    expect(state.showAccountBalance).toBe(true);
    expect((state.lastError as ApiErrorPayload).endpointName).toBe(
      "generateApplication",
    );
  });

  it("stores generic api errors for non credit failures", async () => {
    const store = makeStore();

    store.dispatch({
      type: "fake/rejected",
      payload: {
        status: 500,
        data: { message: "server error" },
      },
      meta: {
        arg: { endpointName: "getApplications" },
        requestId: "r2",
        rejectedWithValue: true,
        requestStatus: "rejected",
      },
      error: { message: "Rejected" },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    const state = store.getState().apiErrors;
    expect(state.showAccountBalance).toBe(false);
    expect((state.lastError as ApiErrorPayload).status).toBe(500);
  });
});
