/* eslint-disable @typescript-eslint/no-require-imports */
import { JSDOM } from "jsdom";
import type {
  ManagedMcpService,
  SubscriptionType,
} from "@thorapi/services/monetization/ServiceMonetizationService";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});

(global as any).window = dom.window;
(global as any).document = dom.window.document;
(global as any).navigator = dom.window.navigator;
(global as any).CustomEvent = dom.window.CustomEvent;

jest.mock("./MonetizedServicesMarketplace.css", () => ({}));

jest.mock("@thorapi/services/monetization/ServiceMonetizationService", () => ({
  getMarketplaceServices: jest.fn(),
  getService: jest.fn(),
  subscribeToService: jest.fn(),
}));

const React = require("react");
const {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} = require("@testing-library/react");
require("@testing-library/jest-dom");

const {
  MonetizedServicesMarketplace,
} = require("./MonetizedServicesMarketplace");
const {
  getMarketplaceServices,
  getService,
  subscribeToService,
} = require("@thorapi/services/monetization/ServiceMonetizationService");
const {
  MONETIZATION_PRICING_UPDATED_EVENT,
} = require("@thorapi/services/monetization/pricingEvents");

const getMarketplaceServicesMock =
  getMarketplaceServices as jest.MockedFunction<
    () => Promise<ManagedMcpService[]>
  >;
const getServiceMock = getService as jest.MockedFunction<
  (serviceId: string) => Promise<ManagedMcpService>
>;
const subscribeToServiceMock = subscribeToService as jest.MockedFunction<
  (serviceId: string, subscriptionType?: SubscriptionType) => Promise<unknown>
>;

function service(overrides: Partial<ManagedMcpService> = {}) {
  return {
    id: "svc-123",
    applicationId: "app-123",
    name: "Revenue Bot",
    description: "Finds expansion opportunities",
    createdBy: "creator-1",
    status: "MONETIZED",
    pricingModel: "PER_CALL",
    costPerCall: 5,
    tierName: "PRO",
    hideFromMarketplace: false,
    isMonetized: true,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    creatorName: "Aster Labs",
    creatorVerified: true,
    invocationCount: 120,
    successRate: 0.96,
    rating: 4.7,
    ...overrides,
  } satisfies ManagedMcpService;
}

describe("MonetizedServicesMarketplace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
    (global as any).alert = jest.fn();
  });

  it("refreshes marketplace pricing after a creator pricing save event", async () => {
    getMarketplaceServicesMock
      .mockResolvedValueOnce([service({ costPerCall: 5 })])
      .mockResolvedValueOnce([service({ costPerCall: 9 })]);

    render(<MonetizedServicesMarketplace />);

    await screen.findByText("Revenue Bot");
    expect(screen.getByText("5")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MONETIZATION_PRICING_UPDATED_EVENT, {
          detail: {
            service: service({ costPerCall: 9 }),
            audit: {
              action: "creator_pricing_updated",
              serviceId: "svc-123",
              applicationId: "app-123",
              pricingModel: "PER_CALL",
              costPerCall: 9,
              recordedAt: "2026-05-22T00:00:00.000Z",
            },
          },
        }),
      );
    });

    await screen.findByText(/marketplace refreshed/i);
    await waitFor(() =>
      expect(getMarketplaceServicesMock).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findByText("9")).toBeInTheDocument();
  });

  it("opens a purchase review sheet before subscribing and avoids browser alerts", async () => {
    const marketplaceService = service({
      id: "svc-revenue",
      applicationId: "app-revenue",
      name: "Revenue MCP",
    });
    getMarketplaceServicesMock
      .mockResolvedValueOnce([marketplaceService])
      .mockResolvedValueOnce([marketplaceService]);
    getServiceMock.mockResolvedValue(marketplaceService);
    subscribeToServiceMock.mockResolvedValue({ id: "sub-1" });

    render(<MonetizedServicesMarketplace />);

    fireEvent.click(
      await screen.findByRole("button", { name: /review & subscribe/i }),
    );

    expect(await screen.findByText(/purchase review/i)).toBeInTheDocument();
    expect(await screen.findByText(/trust posture/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Aster Labs/i).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getByRole("button", { name: /confirm subscription/i }),
    );

    await waitFor(() =>
      expect(subscribeToServiceMock).toHaveBeenCalledWith(
        "svc-revenue",
        "PAY_AS_YOU_GO",
      ),
    );
    await screen.findByText(/subscription activated/i);
    expect((global as any).alert).not.toHaveBeenCalled();
  });
});
