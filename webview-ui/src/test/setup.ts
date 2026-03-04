import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Provide virtual mocks for components/services that may not exist in test runs
vi.mock(
  "@valkyr/component-library/CoolButton",
  () => ({
    default: () => null,
  }),
);

vi.mock(
  "@thorapi/redux/services/UsageTransactionService",
  () => ({
    useAddUsageTransactionMutation: () => [vi.fn()],
    useRecordPaymentTransactionMutation: () => [vi.fn()],
    useGetUsageTransactionsQuery: () => ({ data: [], isLoading: false }),
  }),
);

vi.mock(
  "@thorapi/redux/services/ContentDataService",
  () => ({
    ContentDataService: {
      reducerPath: "ContentDataService",
      reducer: () => ({}),
      middleware: () => (next: any) => (action: any) => next(action),
    },
    useGetContentDataQuery: () => ({ data: [], isLoading: false }),
    useGetContentDatasPagedQuery: () => ({
      data: [],
      isLoading: false,
      isFetching: false,
    }),
  }),
);

vi.mock(
  "@thorapi/redux/services/LlmDetailsService",
  () => ({
    useGetLlmDetailssQuery: () => ({ data: [], isLoading: false }),
  }),
);
