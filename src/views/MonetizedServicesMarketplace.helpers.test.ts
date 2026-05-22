import { ManagedMcpService } from "@thorapi/services/monetization/ServiceMonetizationService";
import {
  estimateMonthlySpend,
  getCreatorLabel,
  getServicePriceLabel,
  sortMarketplaceServices,
} from "./MonetizedServicesMarketplace.helpers";

function service(overrides: Partial<ManagedMcpService>): ManagedMcpService {
  return {
    id: "svc-1",
    applicationId: "app-1",
    name: "Starter MCP",
    description: "Useful tool",
    createdBy: "creator-1",
    status: "MONETIZED",
    pricingModel: "PER_CALL",
    costPerCall: 5,
    tierName: "STARTER",
    hideFromMarketplace: false,
    isMonetized: true,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("MonetizedServicesMarketplace helpers", () => {
  it("uses explicit creator identity instead of the old hardcoded Creator label", () => {
    expect(getCreatorLabel(service({ createdBy: "verified-builder" }))).toBe(
      "By: verified-builder",
    );
    expect(getCreatorLabel(service({ createdBy: "   " }))).toBe(
      "By: verified creator",
    );
  });

  it("formats purchase review price and estimated monthly spend", () => {
    expect(getServicePriceLabel(service({ costPerCall: 7 }))).toBe(
      "7 credits/call",
    );
    expect(estimateMonthlySpend(service({ costPerCall: 7 }))).toBe(
      "~700 credits for 100 calls",
    );

    const monthly = service({
      pricingModel: "PER_MONTH",
      costPerCall: undefined,
      costPerMonth: 49,
    });
    expect(getServicePriceLabel(monthly)).toBe("$49/month");
    expect(estimateMonthlySpend(monthly)).toBe("$49/month before overages");
  });

  it("sorts trust-ready services ahead of non-monetized services for popular view", () => {
    const draft = service({
      id: "draft",
      isMonetized: false,
      updatedAt: "2026-05-05T00:00:00.000Z",
    });
    const monetized = service({
      id: "monetized",
      isMonetized: true,
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    expect(sortMarketplaceServices([draft, monetized], "popular")[0].id).toBe(
      "monetized",
    );
  });
});
