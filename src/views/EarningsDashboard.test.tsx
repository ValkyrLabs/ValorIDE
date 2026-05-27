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

jest.mock("./EarningsDashboard.css", () => ({}));

jest.mock("@thorapi/services/monetization/ServiceMonetizationService", () => ({
  getCreatorServices: jest.fn(),
  getMonthlyEarnings: jest.fn(),
  getTotalEarnings: jest.fn(),
}));

const React = require("react");
const { act, render, screen, waitFor } = require("@testing-library/react");
require("@testing-library/jest-dom");

const { EarningsDashboard } = require("./EarningsDashboard");
const {
  getCreatorServices,
  getMonthlyEarnings,
  getTotalEarnings,
} = require("@thorapi/services/monetization/ServiceMonetizationService");
const {
  MONETIZATION_PRICING_UPDATED_EVENT,
} = require("@thorapi/services/monetization/pricingEvents");

const getCreatorServicesMock = getCreatorServices as jest.MockedFunction<
  () => Promise<ManagedMcpService[]>
>;
const getMonthlyEarningsMock = getMonthlyEarnings as jest.MockedFunction<
  () => Promise<{
    month: string;
    totalEarned: number;
    totalInvocations: number;
    payoutStatus: "PENDING";
  }>
>;
const getTotalEarningsMock = getTotalEarnings as jest.MockedFunction<
  () => Promise<{ totalAllTimeEarnings: number }>
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

describe("EarningsDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
    getTotalEarningsMock.mockResolvedValue({ totalAllTimeEarnings: 42 });
    getMonthlyEarningsMock.mockResolvedValue({
      month: "2026-05",
      totalEarned: 10,
      totalInvocations: 20,
      payoutStatus: "PENDING",
    });
  });

  it("refreshes creator service pricing after a pricing save event", async () => {
    getCreatorServicesMock
      .mockResolvedValueOnce([service({ costPerCall: 5 })])
      .mockResolvedValueOnce([service({ costPerCall: 11 })]);

    render(<EarningsDashboard />);

    await screen.findByText("Revenue Bot");
    expect(screen.getByText("5")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(
        new CustomEvent(MONETIZATION_PRICING_UPDATED_EVENT, {
          detail: {
            service: service({ costPerCall: 11 }),
            audit: {
              action: "creator_pricing_updated",
              serviceId: "svc-123",
              applicationId: "app-123",
              pricingModel: "PER_CALL",
              costPerCall: 11,
              recordedAt: "2026-05-22T00:00:00.000Z",
            },
          },
        }),
      );
    });

    await waitFor(() =>
      expect(getCreatorServicesMock).toHaveBeenCalledTimes(2),
    );
    expect(await screen.findByText("11")).toBeInTheDocument();
  });
});
