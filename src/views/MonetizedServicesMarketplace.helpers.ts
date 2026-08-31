import { ManagedMcpService } from "@thorapi/services/monetization/ServiceMonetizationService";
import { getServicePopularityScore } from "./monetizedMarketplaceFunnel";

export type MarketplaceSort = "newest" | "popular" | "price-low";
export type PurchaseSheetMode = "details" | "subscribe";

export interface MarketplaceActionState {
  kind: "success" | "error" | "info";
  message: string;
}

const DEFAULT_MONTHLY_CALL_ESTIMATE = 100;

export function getCreatorLabel(service: ManagedMcpService): string {
  const creator = service.createdBy?.trim();
  return creator ? `By: ${creator}` : "By: verified creator";
}

export function getServicePriceLabel(service: ManagedMcpService): string {
  if (service.pricingModel === "PER_MONTH" && service.costPerMonth) {
    return `$${service.costPerMonth}/month`;
  }

  if (service.pricingModel === "PER_CALL" && service.costPerCall) {
    return `${service.costPerCall} credits/call`;
  }

  return "Usage-based pricing";
}

export function estimateMonthlySpend(service: ManagedMcpService): string {
  if (service.pricingModel === "PER_MONTH" && service.costPerMonth) {
    return `$${service.costPerMonth}/month before overages`;
  }

  if (service.pricingModel === "PER_CALL" && service.costPerCall) {
    return `~${service.costPerCall * DEFAULT_MONTHLY_CALL_ESTIMATE} credits for ${DEFAULT_MONTHLY_CALL_ESTIMATE} calls`;
  }

  return "Final spend depends on usage and plan limits";
}

export function sortMarketplaceServices(
  services: ManagedMcpService[],
  sortBy: MarketplaceSort,
): ManagedMcpService[] {
  return [...services].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return (
          (a.costPerCall || a.costPerMonth || 999) -
          (b.costPerCall || b.costPerMonth || 999)
        );
      case "popular":
        return (
          getServicePopularityScore(b) - getServicePopularityScore(a) ||
          b.updatedAt.localeCompare(a.updatedAt)
        );
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });
}
