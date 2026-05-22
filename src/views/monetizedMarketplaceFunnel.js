const CREATED_BY_FALLBACK = "Verified Valkyr creator";
const scoreFields = [
  "subscriberCount",
  "installCount",
  "downloadCount",
  "monthlyInvocations",
  "invocationCount",
  "usageCount"
];
function numericValue(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
function timeValue(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function getCreatorDisplayName(service) {
  const creator = service.createdBy?.trim();
  if (!creator || creator.toLowerCase() === "creator") {
    return CREATED_BY_FALLBACK;
  }
  return creator;
}
function getRecommendedSubscriptionType(pricingModel) {
  return pricingModel === "PER_MONTH" ? "MONTHLY" : "PAY_AS_YOU_GO";
}
function getServicePopularityScore(service) {
  const usageScore = scoreFields.reduce(
    (score, field) => score + numericValue(service[field]),
    0
  );
  const ratingScore = Math.round(
    numericValue(service.averageRating ?? service.rating) * 20
  );
  return usageScore + ratingScore;
}
function sortMarketplaceServices(services, sortBy) {
  return [...services].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return (a.costPerCall ?? a.costPerMonth ?? 999) - (b.costPerCall ?? b.costPerMonth ?? 999);
      case "popular": {
        const scoreDelta = getServicePopularityScore(b) - getServicePopularityScore(a);
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
function priceLabel(service) {
  if (service.pricingModel === "PER_MONTH" && service.costPerMonth) {
    return `$${service.costPerMonth}/month`;
  }
  if (service.costPerCall) {
    return `${service.costPerCall} credits/call`;
  }
  return "Usage-based pricing";
}
function buildMarketplaceFunnel(service) {
  const popularityScore = getServicePopularityScore(service);
  const recommendedSubscriptionType = getRecommendedSubscriptionType(
    service.pricingModel
  );
  const detailHref = service.applicationId ? `/application-detail/${encodeURIComponent(service.applicationId)}?source=valoride-mcp-marketplace&serviceId=${encodeURIComponent(service.id)}&intent=subscribe` : null;
  const proofPoints = [
    `${priceLabel(service)} with checkout-safe activation`,
    `${getCreatorDisplayName(service)} marketplace attribution`
  ];
  if (popularityScore > 0) {
    proofPoints.push(
      `${popularityScore.toLocaleString()} marketplace traction score`
    );
  } else {
    proofPoints.push("New service \u2014 review pricing before first run");
  }
  if (service.tierName) {
    proofPoints.push(`${service.tierName.toLowerCase()} tier fit`);
  }
  return {
    creatorDisplayName: getCreatorDisplayName(service),
    priceLabel: priceLabel(service),
    proofPoints,
    recommendedSubscriptionType,
    primaryCta: recommendedSubscriptionType === "MONTHLY" ? "Review monthly plan" : "Review pay-as-you-go",
    detailHref
  };
}
export {
  buildMarketplaceFunnel,
  getCreatorDisplayName,
  getRecommendedSubscriptionType,
  getServicePopularityScore,
  sortMarketplaceServices
};
//# sourceMappingURL=monetizedMarketplaceFunnel.js.map
