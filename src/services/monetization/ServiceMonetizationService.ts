import { api } from "./api";

/**
 * Service Monetization API client for ValkyrAI backend.
 * Handles MCP service pricing, earnings, and subscriptions.
 */

export interface ManagedMcpService {
  id: string;
  applicationId: string;
  name: string;
  description?: string;
  createdBy: string;
  status: ServiceStatus;
  pricingModel: PricingModel;
  costPerCall?: number;
  costPerMonth?: number;
  tierName?: ServiceTier;
  hideFromMarketplace: boolean;
  isMonetized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorEarnings {
  month: string;
  totalEarned: number;
  totalInvocations: number;
  payoutStatus: PayoutStatus;
  totalAllTimeEarnings?: number;
}

export interface ServiceSubscription {
  id: string;
  consumerId: string;
  serviceId: string;
  subscriptionType: SubscriptionType;
  creditsIncluded?: number;
  monthlyLimit?: number;
  status: SubscriptionStatus;
  createdAt: string;
}

export type ServiceStatus = "DRAFT" | "PUBLISHED" | "MONETIZED" | "SUSPENDED";
export type PricingModel = "PER_CALL" | "PER_MONTH" | "TIERED" | "USAGE_BASED";
export type ServiceTier = "STARTER" | "PRO" | "ENTERPRISE";
export type PayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED";
export type SubscriptionType = "MONTHLY" | "YEARLY" | "PAY_AS_YOU_GO";
export type SubscriptionStatus = "ACTIVE" | "SUSPENDED" | "EXPIRED";

/**
 * Enable monetization on an MCP service
 */
export async function enableMonetization(
  applicationId: string,
  pricingModel: PricingModel = "PER_CALL",
  costPerCall: number = 5.0,
): Promise<ManagedMcpService> {
  const response = await api.post(
    `/v1/monetization/services/${applicationId}/enable`,
    null,
    {
      params: { pricingModel, costPerCall },
    },
  );
  return response.data;
}

/**
 * Update service pricing
 */
export async function updatePricing(
  serviceId: string,
  pricingModel: PricingModel,
  costPerCall: number,
): Promise<ManagedMcpService> {
  const response = await api.patch(
    `/v1/monetization/services/${serviceId}/pricing`,
    null,
    {
      params: { pricingModel, costPerCall },
    },
  );
  return response.data;
}

/**
 * Get service details
 */
export async function getService(
  serviceId: string,
): Promise<ManagedMcpService> {
  const response = await api.get(`/v1/monetization/services/${serviceId}`);
  return response.data;
}

/**
 * Get creator's monetized services
 */
export async function getCreatorServices(): Promise<ManagedMcpService[]> {
  const response = await api.get("/v1/monetization/services");
  return response.data;
}

/**
 * Get marketplace services
 */
export async function getMarketplaceServices(): Promise<ManagedMcpService[]> {
  const response = await api.get("/v1/monetization/marketplace");
  return response.data;
}

/**
 * Get monthly earnings for a specific month (YYYY-MM format)
 */
export async function getMonthlyEarnings(
  month: string,
): Promise<CreatorEarnings> {
  const response = await api.get(`/v1/monetization/earnings/${month}`);
  return response.data;
}

/**
 * Get total all-time earnings
 */
export async function getTotalEarnings(): Promise<{
  totalAllTimeEarnings: number;
}> {
  const response = await api.get("/v1/monetization/earnings/total");
  return response.data;
}

/**
 * Subscribe to a service
 */
export async function subscribeToService(
  serviceId: string,
  subscriptionType: SubscriptionType = "PAY_AS_YOU_GO",
): Promise<ServiceSubscription> {
  const response = await api.post("/v1/monetization/subscribe", null, {
    params: { serviceId, subscriptionType },
  });
  return response.data;
}

/**
 * Record service invocation (internal)
 */
export async function recordInvocation(
  serviceId: string,
  consumerId: string,
  creatorId: string,
  executionTimeMs: number,
  success: boolean,
  errorMessage?: string,
): Promise<void> {
  await api.post("/v1/monetization/invocations", null, {
    params: {
      serviceId,
      consumerId,
      creatorId,
      executionTimeMs,
      success,
      ...(errorMessage && { errorMessage }),
    },
  });
}
