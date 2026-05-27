/* eslint-disable @typescript-eslint/no-require-imports */
import { JSDOM } from "jsdom";
import type { ManagedMcpService } from "@thorapi/services/monetization/ServiceMonetizationService";

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
  subscribeToService: jest.fn(),
}));

const React = require("react");
const { act, render, screen, waitFor } = require("@testing-library/react");
require("@testing-library/jest-dom");

const {
  MonetizedServicesMarketplace,
} = require("./MonetizedServicesMarketplace");
const {
  getMarketplaceServices,
} = require("@thorapi/services/monetization/ServiceMonetizationService");
const {
  MONETIZATION_PRICING_UPDATED_EVENT,
} = require("@thorapi/services/monetization/pricingEvents");

const getMarketplaceServicesMock =
  getMarketplaceServices as jest.MockedFunction<
    () => Promise<ManagedMcpService[]>
  >;

function service(overrides: Partial<ManagedMcpService> = {}) {
  return {
    id: "svc-123",
    applicationId: "app-123",
    name: "Revenue Bot",
    createdBy: "creator-1",
    status: "MONETIZED",
    pricingModel: "PER_CALL",
    costPerCall: 5,
    hideFromMarketplace: false,
    isMonetized: true,
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
    ...overrides,
  } satisfies ManagedMcpService;
}

describe("MonetizedServicesMarketplace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
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
});
