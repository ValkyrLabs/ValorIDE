export type MarketplaceSort = "newest" | "popular" | "price-low";
export type MarketplacePricingModel =
  | "PER_CALL"
  | "PER_MONTH"
  | "TIERED"
  | "USAGE_BASED";
export type MarketplaceSubscriptionType =
  | "MONTHLY"
  | "YEARLY"
  | "PAY_AS_YOU_GO";

export interface MarketplaceServiceSummary {
  id: string;
  applicationId?: string;
  createdBy?: string;
  pricingModel: MarketplacePricingModel;
  costPerCall?: number;
  costPerMonth?: number;
  tierName?: string;
  createdAt: string;
  updatedAt: string;
  averageRating?: number;
  rating?: number;
  downloadCount?: number;
  installCount?: number;
  invocationCount?: number;
  monthlyInvocations?: number;
  subscriberCount?: number;
  usageCount?: number;
}

export interface MarketplaceFunnelCopy {
  creatorDisplayName: string;
  priceLabel: string;
  proofPoints: string[];
  recommendedSubscriptionType: MarketplaceSubscriptionType;
  primaryCta: string;
  detailHref: string | null;
}

const CREATED_BY_FALLBACK = "Verified Valkyr creator";

const scoreFields: Array<keyof MarketplaceServiceSummary> = [
  "subscriberCount",
  "installCount",
  "downloadCount",
  "monthlyInvocations",
  "invocationCount",
  "usageCount",
];

function numericValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function timeValue(value: string | undefined): number {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getCreatorDisplayName(service: { createdBy?: string }): string {
  const creator = service.createdBy?.trim();
  if (!creator || creator.toLowerCase() === "creator") {
    return CREATED_BY_FALLBACK;
  }

  return creator;
}

export function getRecommendedSubscriptionType(
  pricingModel: MarketplacePricingModel,
): MarketplaceSubscriptionType {
  return pricingModel === "PER_MONTH" ? "MONTHLY" : "PAY_AS_YOU_GO";
}

export function getServicePopularityScore(
  service: MarketplaceServiceSummary,
): number {
  const usageScore = scoreFields.reduce(
    (score, field) => score + numericValue(service[field]),
    0,
  );
  const ratingScore = Math.round(
    numericValue(service.averageRating ?? service.rating) * 20,
  );

  return usageScore + ratingScore;
}

export function sortMarketplaceServices<T extends MarketplaceServiceSummary>(
  services: T[],
  sortBy: MarketplaceSort,
): T[] {
  return [...services].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return (
          (a.costPerCall ?? a.costPerMonth ?? 999) -
          (b.costPerCall ?? b.costPerMonth ?? 999)
        );
      case "popular": {
        const scoreDelta =
          getServicePopularityScore(b) - getServicePopularityScore(a);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }
        return timeValue(b.updatedAt) - timeValue(a.updatedAt);
      }
      default:
        return timeValue(b.createdAt) - timeValue(a.createdAt);
    }
  });
}

function priceLabel(service: MarketplaceServiceSummary): string {
  if (service.pricingModel === "PER_MONTH" && service.costPerMonth) {
    return `$${service.costPerMonth}/month`;
  }

  if (service.costPerCall) {
    return `${service.costPerCall} credits/call`;
  }

  return "Usage-based pricing";
}

export function buildMarketplaceFunnel(
  service: MarketplaceServiceSummary,
): MarketplaceFunnelCopy {
  const popularityScore = getServicePopularityScore(service);
  const recommendedSubscriptionType = getRecommendedSubscriptionType(
    service.pricingModel,
  );
  const detailHref = service.applicationId
    ? `/application-detail/${encodeURIComponent(service.applicationId)}?source=valoride-mcp-marketplace&serviceId=${encodeURIComponent(service.id)}&intent=subscribe`
    : null;

  const proofPoints = [
    `${priceLabel(service)} with checkout-safe activation`,
    `${getCreatorDisplayName(service)} marketplace attribution`,
  ];

  if (popularityScore > 0) {
    proofPoints.push(
      `${popularityScore.toLocaleString()} marketplace traction score`,
    );
  } else {
    proofPoints.push("New service — review pricing before first run");
  }

  if (service.tierName) {
    proofPoints.push(`${service.tierName.toLowerCase()} tier fit`);
  }

  return {
    creatorDisplayName: getCreatorDisplayName(service),
    priceLabel: priceLabel(service),
    proofPoints,
    recommendedSubscriptionType,
    primaryCta:
      recommendedSubscriptionType === "MONTHLY"
        ? "Review monthly plan"
        : "Review pay-as-you-go",
    detailHref,
  };
}
