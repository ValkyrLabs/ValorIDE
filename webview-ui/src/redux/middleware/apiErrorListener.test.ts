import { beforeEach, describe, expect, it, vi } from "vitest";
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

const createMockStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  } as Storage;
};

describe("apiErrorListener", () => {
  beforeEach(() => {
    const session = createMockStorage();
    const local = createMockStorage();
    Object.defineProperty(window, "sessionStorage", {
      value: session,
      configurable: true,
    });
    Object.defineProperty(window, "localStorage", {
      value: local,
      configurable: true,
    });
    vi.stubGlobal("sessionStorage", session);
    vi.stubGlobal("localStorage", local);
  });

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

  it("clears stale auth when api-0 reports an expired or replaced session", async () => {
    const store = makeStore();
    sessionStorage.setItem("jwtToken", "stale");
    localStorage.setItem("jwtToken", "stale");
    sessionStorage.setItem("authenticatedPrincipal", "{}");
    localStorage.setItem("authenticatedPrincipal", "{}");

    store.dispatch({
      type: "fake/rejected",
      payload: {
        status: 401,
        data: {
          message:
            "Session expired or replaced by another login. Please sign in again to obtain a fresh token.",
        },
      },
      meta: {
        arg: { endpointName: "addUsageTransaction" },
        requestId: "r3",
        rejectedWithValue: true,
        requestStatus: "rejected",
      },
      error: { message: "Rejected" },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sessionStorage.getItem("jwtToken")).toBeNull();
    expect(localStorage.getItem("jwtToken")).toBeNull();
    expect(sessionStorage.getItem("authenticatedPrincipal")).toBeNull();
    expect(localStorage.getItem("authenticatedPrincipal")).toBeNull();
    expect(store.getState().apiErrors.lastError).toBeNull();
  });
});
