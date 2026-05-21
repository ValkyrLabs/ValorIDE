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

jest.mock("./MonetizationSettings.css", () => ({}));

jest.mock("@thorapi/services/monetization/ServiceMonetizationService", () => ({
  enableMonetization: jest.fn(),
  updatePricing: jest.fn(),
}));

const React = require("react");
const { fireEvent, render, screen, waitFor } = require("@testing-library/react");
require("@testing-library/jest-dom");

const {
  MONETIZATION_PRICING_UPDATED_EVENT,
  MonetizationSettings,
} = require("./MonetizationSettings");
const { updatePricing } = require("@thorapi/services/monetization/ServiceMonetizationService");

const updatePricingMock = updatePricing as jest.MockedFunction<
  (serviceId: string, pricingModel: string, costPerCall: number) => Promise<ManagedMcpService>
>;

function monetizedService(overrides: Partial<ManagedMcpService> = {}) {
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

describe("MonetizationSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("persists pricing through the backend before showing success", async () => {
    const saved = monetizedService({ costPerCall: 8 });
    const onSuccess = jest.fn();
    const eventSpy = jest.fn();
    updatePricingMock.mockResolvedValue(saved);
    window.addEventListener(MONETIZATION_PRICING_UPDATED_EVENT, eventSpy);

    render(
      <MonetizationSettings
        applicationId="app-123"
        service={monetizedService()}
        onSuccess={onSuccess}
      />,
    );

    fireEvent.change(screen.getByLabelText(/cost per call/i), {
      target: { value: "8" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update pricing/i }));

    expect(updatePricingMock).toHaveBeenCalledWith("svc-123", "PER_CALL", 8);
    expect(screen.queryByText(/pricing persisted/i)).not.toBeInTheDocument();

    await screen.findByText(/pricing persisted/i);
    expect(onSuccess).toHaveBeenCalledWith(saved);
    expect(eventSpy).toHaveBeenCalledTimes(1);

    window.removeEventListener(MONETIZATION_PRICING_UPDATED_EVENT, eventSpy);
  });

  it("does not show success when the backend rejects the pricing save", async () => {
    const onError = jest.fn();
    updatePricingMock.mockRejectedValue(new Error("Unauthorized"));

    render(
      <MonetizationSettings
        applicationId="app-123"
        service={monetizedService()}
        onError={onError}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /update pricing/i }));

    await screen.findByText("Unauthorized");
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(screen.queryByText(/pricing persisted/i)).not.toBeInTheDocument();
  });

  it("blocks pricing saves when a monetized service has no service ID", async () => {
    render(
      <MonetizationSettings
        applicationId="app-123"
        service={monetizedService({ id: "", isMonetized: true })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /update pricing/i }));

    await screen.findByText(/no service id was provided/i);
    expect(updatePricingMock).not.toHaveBeenCalled();
  });

  it("blocks invalid pricing before calling the backend", async () => {
    render(
      <MonetizationSettings applicationId="app-123" service={monetizedService()} />,
    );

    fireEvent.change(screen.getByLabelText(/cost per call/i), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update pricing/i }));

    await screen.findByText(/at least 0.1 credits/i);
    expect(updatePricingMock).not.toHaveBeenCalled();
  });

  it("keeps the save button disabled while pricing persistence is pending", async () => {
    let resolveSave: (service: ManagedMcpService) => void = () => undefined;
    updatePricingMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    render(
      <MonetizationSettings applicationId="app-123" service={monetizedService()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /update pricing/i }));

    expect(await screen.findByRole("button", { name: /updating/i })).toBeDisabled();

    resolveSave(monetizedService({ costPerCall: 6 }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /update pricing/i })).toBeEnabled(),
    );
  });
});
