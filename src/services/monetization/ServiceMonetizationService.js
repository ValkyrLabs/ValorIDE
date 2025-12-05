import { api } from "./api";
/**
 * Enable monetization on an MCP service
 */
export async function enableMonetization(applicationId, pricingModel = "PER_CALL", costPerCall = 5.0) {
    const response = await api.post(`/v1/monetization/services/${applicationId}/enable`, null, {
        params: { pricingModel, costPerCall },
    });
    return response.data;
}
/**
 * Update service pricing
 */
export async function updatePricing(serviceId, pricingModel, costPerCall) {
    const response = await api.patch(`/v1/monetization/services/${serviceId}/pricing`, null, {
        params: { pricingModel, costPerCall },
    });
    return response.data;
}
/**
 * Get service details
 */
export async function getService(serviceId) {
    const response = await api.get(`/v1/monetization/services/${serviceId}`);
    return response.data;
}
/**
 * Get creator's monetized services
 */
export async function getCreatorServices() {
    const response = await api.get("/v1/monetization/services");
    return response.data;
}
/**
 * Get marketplace services
 */
export async function getMarketplaceServices() {
    const response = await api.get("/v1/monetization/marketplace");
    return response.data;
}
/**
 * Get monthly earnings for a specific month (YYYY-MM format)
 */
export async function getMonthlyEarnings(month) {
    const response = await api.get(`/v1/monetization/earnings/${month}`);
    return response.data;
}
/**
 * Get total all-time earnings
 */
export async function getTotalEarnings() {
    const response = await api.get("/v1/monetization/earnings/total");
    return response.data;
}
/**
 * Subscribe to a service
 */
export async function subscribeToService(serviceId, subscriptionType = "PAY_AS_YOU_GO") {
    const response = await api.post("/v1/monetization/subscribe", null, {
        params: { serviceId, subscriptionType },
    });
    return response.data;
}
/**
 * Record service invocation (internal)
 */
export async function recordInvocation(serviceId, consumerId, creatorId, executionTimeMs, success, errorMessage) {
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
//# sourceMappingURL=ServiceMonetizationService.js.map