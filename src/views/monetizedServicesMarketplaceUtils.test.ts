import { describe, expect, it } from "vitest";
import {
  buildTrustSignals,
  estimateMonthlyCreditSpend,
  getCreatorDisplayName,
  getEstimatedSpendLabel,
  getServicePricingSummary,
} from "./monetizedServicesMarketplaceUtils";
import { ManagedMcpService } from "@thorapi/services/monetization/ServiceMonetizationService";

const service = (
  overrides: Partial<ManagedMcpService> = {},
): ManagedMcpService => ({
  id: "svc-1",
  applicationId: "app-1",
  name: "Revenue Assistant",
  description: "Premium MCP service",
  createdBy: "creator@valkyrlabs.com",
  status: "MONETIZED",
  pricingModel: "PER_CALL",
  costPerCall: 7,
  tierName: "PRO",
  hideFromMarketplace: false,
  isMonetized: true,
  createdAt: "2026-06-14T00:00:00Z",
  updatedAt: "2026-06-14T01:00:00Z",
  ...overrides,
});

describe("monetized service marketplace helpers", () => {
  it("derives creator display names without exposing full email addresses", () => {
    expect(getCreatorDisplayName(service())).toBe("creator");
    expect(getCreatorDisplayName(service({ createdBy: "" }))).toBe(
      "Verified creator",
    );
  });

  it("summarizes pricing and expected credit spend for purchase review", () => {
    expect(getServicePricingSummary(service())).toBe("7 credits per call");
    expect(estimateMonthlyCreditSpend(service(), 25)).toBe(175);
    expect(getEstimatedSpendLabel(service(), 25)).toBe("175 credits");
    expect(
      getServicePricingSummary(
        service({
          pricingModel: "PER_MONTH",
          costPerCall: undefined,
          costPerMonth: 29,
        }),
      ),
    ).toBe("$29.00 monthly");
    expect(
      getEstimatedSpendLabel(
        service({ pricingModel: "PER_MONTH", costPerMonth: 29 }),
      ),
    ).toBe("Plan based");
  });

  it("builds trust signals from service status and tier", () => {
    expect(buildTrustSignals(service())).toEqual([
      "Monetized service",
      "PRO tier",
      "ValkyrAI billing ledger",
      "Creator support required",
    ]);
  });
});
