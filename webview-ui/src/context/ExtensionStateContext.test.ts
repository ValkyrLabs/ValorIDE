import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../themes", () => ({
  setTheme: vi.fn(),
}));

vi.mock("../utils/vscode", () => ({
  vscode: {
    postMessage: vi.fn(),
  },
}));

const clearTestStorage = (storage: Storage) => {
  if (typeof storage.clear === "function") {
    storage.clear();
    return;
  }
  for (const key of [
    "jwtToken",
    "jwtSession",
    "authToken",
    "authenticatedPrincipal",
    "authenticatedUser",
  ]) {
    storage.removeItem(key);
  }
};

const createMemoryStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: vi.fn(() => store.clear()),
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  } as Storage;
};

describe("hasConfiguredApiProvider", () => {
  beforeEach(() => {
    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    clearTestStorage(sessionStorage);
    clearTestStorage(localStorage);
  });

  it("treats OpenAI native as configured without a local API key", async () => {
    const { hasConfiguredApiProvider } = await import(
      "./ExtensionStateContext"
    );

    expect(
      hasConfiguredApiProvider({
        apiProvider: "openai-native",
        openAiNativeApiKey: undefined,
      }),
    ).toBe(true);
  }, 10_000);

  it("does not treat an empty configuration as configured", async () => {
    const { hasConfiguredApiProvider } = await import(
      "./ExtensionStateContext"
    );

    expect(hasConfiguredApiProvider({})).toBe(false);
  }, 10_000);

  it("clears authenticated context state when logout clears client auth", async () => {
    const { ExtensionStateContextProvider, useExtensionState } = await import(
      "./ExtensionStateContext"
    );

    const AuthProbe = () => {
      const { authenticatedUser, isLoggedIn, jwtToken, userInfo } =
        useExtensionState();
      return React.createElement(
        "output",
        { "data-testid": "auth-state" },
        JSON.stringify({
            authenticatedUser: authenticatedUser?.id ?? null,
            isLoggedIn,
            jwtToken: jwtToken ?? null,
            userInfo: userInfo?.username ?? userInfo?.id ?? null,
          }),
      );
    };

    render(
      React.createElement(
        ExtensionStateContextProvider,
        null,
        React.createElement(AuthProbe),
      ),
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: {
            type: "state",
            state: {
              authenticatedPrincipal: {
                id: "principal-1",
                username: "valor",
              },
              isLoggedIn: true,
              jwtToken: "jwt-token",
              userInfo: { username: "valor" },
              valorideMessages: [],
              taskHistory: [],
            },
          },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        '"isLoggedIn":true',
      ),
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "clearClientAuthState" },
        }),
      );
    });

    await waitFor(() =>
      expect(screen.getByTestId("auth-state")).toHaveTextContent(
        '"isLoggedIn":false',
      ),
    );
    expect(screen.getByTestId("auth-state")).toHaveTextContent(
      '"jwtToken":null',
    );
    expect(screen.getByTestId("auth-state")).toHaveTextContent(
      '"authenticatedUser":null',
    );
    expect(sessionStorage.getItem("jwtToken")).toBeNull();
    expect(localStorage.getItem("jwtToken")).toBeNull();
    expect(sessionStorage.getItem("authenticatedPrincipal")).toBeNull();
    expect(localStorage.getItem("authenticatedPrincipal")).toBeNull();
  });
});
