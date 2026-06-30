import { ManagedMcpService } from "@thorapi/services/monetization/ServiceMonetizationService";

export function getCreatorDisplayName(service: ManagedMcpService): string {
  const creator = service.createdBy?.trim();
  if (!creator) {
    return "Verified creator";
  }

  if (creator.includes("@")) {
    return creator.split("@")[0] || "Verified creator";
  }

  return creator;
}

export function getServicePricingSummary(service: ManagedMcpService): string {
  if (service.pricingModel === "PER_MONTH" && service.costPerMonth) {
    return `$${service.costPerMonth.toFixed(2)} monthly`;
  }

  if (service.costPerCall) {
    return `${service.costPerCall} credits per call`;
  }

  return "Usage-based pricing";
}

export function estimateMonthlyCreditSpend(
  service: ManagedMcpService,
  expectedCalls = 100,
): number | null {
  if (service.pricingModel !== "PER_CALL" || !service.costPerCall) {
    return null;
  }

  return Math.max(0, Math.round(service.costPerCall * expectedCalls));
}

export function getEstimatedSpendLabel(
  service: ManagedMcpService,
  expectedCalls = 100,
): string {
  const spend = estimateMonthlyCreditSpend(service, expectedCalls);
  return spend === null ? "Plan based" : `${spend} credits`;
}

export function getMarketplacePopularityScore(
  service: ManagedMcpService,
): number {
  const subscriptions = Math.max(0, service.subscriptionCount ?? 0);
  const invocations = Math.max(0, service.invocationCount ?? 0);
  const rating = Math.max(0, Math.min(5, service.rating ?? 0));
  const verifiedBoost = service.verifiedPublisher ? 50 : 0;
  const recencyBoost = getRecencyBoost(service.updatedAt || service.createdAt);

  return (
    subscriptions * 100 +
    invocations * 0.1 +
    rating * 20 +
    verifiedBoost +
    recencyBoost
  );
}

export function buildTrustSignals(service: ManagedMcpService): string[] {
  const signals = [
    service.status === "MONETIZED" ? "Monetized service" : "Published service",
    service.tierName ? `${service.tierName} tier` : "Standard tier",
    "ValkyrAI billing ledger",
    "Creator support required",
  ];

  return signals;
}

function getRecencyBoost(timestamp: string | undefined): number {
  if (!timestamp) {
    return 0;
  }

  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 0;
  }

  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 14 - Math.floor(ageDays));
}
