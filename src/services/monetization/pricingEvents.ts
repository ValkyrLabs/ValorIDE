import type { ManagedMcpService } from "./ServiceMonetizationService";

export const MONETIZATION_PRICING_UPDATED_EVENT =
  "valoride:monetization-pricing-updated";

export interface MonetizationPricingUpdatedDetail {
  service: ManagedMcpService;
  audit: {
    action: "creator_pricing_updated";
    serviceId: string;
    applicationId: string;
    pricingModel: ManagedMcpService["pricingModel"];
    costPerCall?: number;
    recordedAt: string;
  };
}

export function dispatchPricingUpdated(service: ManagedMcpService) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<MonetizationPricingUpdatedDetail>(
      MONETIZATION_PRICING_UPDATED_EVENT,
      {
        detail: {
          service,
          audit: {
            action: "creator_pricing_updated",
            serviceId: service.id,
            applicationId: service.applicationId,
            pricingModel: service.pricingModel,
            costPerCall: service.costPerCall,
            recordedAt: new Date().toISOString(),
          },
        },
      },
    ),
  );
}

export function isPricingUpdatedEvent(
  event: Event,
): event is CustomEvent<MonetizationPricingUpdatedDetail> {
  return (
    event.type === MONETIZATION_PRICING_UPDATED_EVENT &&
    Boolean(
      (event as CustomEvent<MonetizationPricingUpdatedDetail>).detail?.service
        ?.id,
    )
  );
}
