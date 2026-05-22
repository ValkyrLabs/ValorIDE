import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMarketplaceFunnel,
  getCreatorDisplayName,
  getRecommendedSubscriptionType,
  sortMarketplaceServices,
} from "./monetizedMarketplaceFunnel";

const baseService = {
  id: "svc-1",
  applicationId: "app-1",
  name: "Memory Sync",
  description: "Portable GrayMatter memory sync",
  createdBy: "Creator",
  status: "MONETIZED" as const,
  pricingModel: "PER_CALL" as const,
  costPerCall: 7,
  tierName: "PRO" as const,
  hideFromMarketplace: false,
  isMonetized: true,
  createdAt: "2026-05-20T10:00:00.000Z",
  updatedAt: "2026-05-20T10:00:00.000Z",
};

test("buildMarketplaceFunnel turns generic creator cards into attributed conversion copy", () => {
  const funnel = buildMarketplaceFunnel({
    ...baseService,
    subscriberCount: 12,
    averageRating: 4.5,
  } as typeof baseService & { subscriberCount: number; averageRating: number });

  assert.equal(funnel.creatorDisplayName, "Verified Valkyr creator");
  assert.equal(funnel.priceLabel, "7 credits/call");
  assert.equal(funnel.recommendedSubscriptionType, "PAY_AS_YOU_GO");
  assert.equal(funnel.primaryCta, "Review pay-as-you-go");
  assert.equal(
    funnel.detailHref,
    "/application-detail/app-1?source=valoride-mcp-marketplace&serviceId=svc-1&intent=subscribe",
  );
  assert.ok(
    funnel.proofPoints.some((point) =>
      point.includes("102 marketplace traction"),
    ),
  );
});

test("sortMarketplaceServices ranks popular services by live usage metrics before recency", () => {
  const newest = {
    ...baseService,
    id: "newest",
    applicationId: "app-newest",
    updatedAt: "2026-05-22T10:00:00.000Z",
    subscriberCount: 1,
  } as typeof baseService & { subscriberCount: number };
  const popular = {
    ...baseService,
    id: "popular",
    applicationId: "app-popular",
    updatedAt: "2026-05-19T10:00:00.000Z",
    subscriberCount: 50,
  } as typeof baseService & { subscriberCount: number };

  assert.deepEqual(
    sortMarketplaceServices([newest, popular], "popular").map(
      (service) => service.id,
    ),
    ["popular", "newest"],
  );
});

test("recommended subscription follows monthly pricing without forcing every service into PAY_AS_YOU_GO", () => {
  assert.equal(getRecommendedSubscriptionType("PER_MONTH"), "MONTHLY");
  assert.equal(getRecommendedSubscriptionType("PER_CALL"), "PAY_AS_YOU_GO");
  assert.equal(
    getCreatorDisplayName({ createdBy: "Ada Lovelace" }),
    "Ada Lovelace",
  );
});
