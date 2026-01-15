import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { JSXElementConstructor } from "react";
import type { ProviderProps } from "react-redux";

describe("ExtensionStateContextProvider", () => {
  const mockStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        store.delete(key);
      }),
      clear: vi.fn(() => store.clear()),
      key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
      get length() {
        return store.size;
      },
    };
  };

  beforeEach(() => {
    (globalThis as any).localStorage = mockStorage();
    (globalThis as any).acquireVsCodeApi = () => ({
      postMessage: vi.fn(),
      setState: vi.fn(),
      getState: vi.fn(),
    });
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).acquireVsCodeApi;
  });

  it("renders without throwing when VS Code API is present", async () => {
    const { ExtensionStateContextProvider, useExtensionState } = await import(
      "../ExtensionStateContext"
    );

    const Child = () => {
      const ctx = useExtensionState();
      return <div data-testid="hydrated">{String(ctx.didHydrateState)}</div>;
    };

    render(
      <ExtensionStateContextProvider>
        <Child />
      </ExtensionStateContextProvider>,
    );

    expect(screen.getByTestId("hydrated")).toBeInTheDocument();
  });

  it("renders the App shell without crashing", async () => {
    vi.unmock("@thorapi/redux/services/UsageTransactionService");
    vi.unmock("@thorapi/redux/services/ContentDataService");
    vi.unmock("@thorapi/redux/services/LlmDetailsService");

    const [{ default: App }, { Provider }] = await Promise.all([
      import("../../App"),
      import("react-redux"),
    ]);
    const { default: store } = await import("../../redux/store");
    const { MemoryRouter } = await import("react-router-dom");
    const ReduxProvider =
      Provider as unknown as JSXElementConstructor<ProviderProps>;

    expect(() =>
      render(
        <ReduxProvider store={store}>
          <MemoryRouter>
            <App />
          </MemoryRouter>
        </ReduxProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByText(/Loading ValorIDE/i)).toBeInTheDocument();
  }, 15000);
});
