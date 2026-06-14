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

export function buildTrustSignals(service: ManagedMcpService): string[] {
  const signals = [
    service.status === "MONETIZED" ? "Monetized service" : "Published service",
    service.tierName ? `${service.tierName} tier` : "Standard tier",
    "ValkyrAI billing ledger",
    "Creator support required",
  ];

  return signals;
}
