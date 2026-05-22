import React, { useState, useEffect } from "react";
import {
  ManagedMcpService,
  getMarketplaceServices,
  getService,
  subscribeToService,
} from "@thorapi/services/monetization/ServiceMonetizationService";
import {
  MarketplaceActionState,
  MarketplaceSort,
  PurchaseSheetMode,
  estimateMonthlySpend,
  getCreatorLabel,
  getServicePriceLabel,
  sortMarketplaceServices,
} from "./MonetizedServicesMarketplace.helpers";
import "./MonetizedServicesMarketplace.css";

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Browse and subscribe to monetized MCP services from creators.
 */
export const MonetizedServicesMarketplace: React.FC = () => {
  const [services, setServices] = useState<ManagedMcpService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<MarketplaceSort>("newest");
  const [selectedService, setSelectedService] = useState<ManagedMcpService | null>(null);
  const [purchaseMode, setPurchaseMode] = useState<PurchaseSheetMode>("details");
  const [actionState, setActionState] = useState<MarketplaceActionState | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getMarketplaceServices();
      setServices(data);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load services"));
    } finally {
      setLoading(false);
    }
  };

  const openServiceSheet = async (
    service: ManagedMcpService,
    mode: PurchaseSheetMode,
  ) => {
    setPurchaseMode(mode);
    setSelectedService(service);
    setActionState(null);
    setDetailsLoading(true);

    try {
      setSelectedService(await getService(service.id));
    } catch (err) {
      setActionState({
        kind: "info",
        message: `Showing cached marketplace details. ${getErrorMessage(
          err,
          "Live service profile is temporarily unavailable.",
        )}`,
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeServiceSheet = () => {
    if (subscribing) {
      return;
    }
    setSelectedService(null);
    setActionState(null);
  };

  const handleSubscribe = async (serviceId: string) => {
    setSubscribing(serviceId);
    setActionState(null);

    try {
      await subscribeToService(serviceId, "PAY_AS_YOU_GO");
      setActionState({
        kind: "success",
        message: "Subscription activated. Invocation credits and limits will refresh shortly.",
      });
      await loadServices();
    } catch (err) {
      const message = getErrorMessage(err, "Failed to subscribe");
      setActionState({
        kind: "error",
        message:
          message.toLowerCase().includes("credit") || message.toLowerCase().includes("balance")
            ? `${message} Buy credits, then return here to resume this MCP subscription.`
            : message,
      });
    } finally {
      setSubscribing(null);
    }
  };

  const filteredServices = filterTier
    ? services.filter((s) => s.tierName === filterTier)
    : services;

  const sortedServices = sortMarketplaceServices(filteredServices, sortBy);

  if (loading) {
    return (
      <div className="marketplace">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Discovering amazing services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace">
      <div className="marketplace-header">
        <div className="header-content">
          <h1>🚀 Monetized MCP Services</h1>
          <p>
            Discover and subscribe to premium MCP services created by our
            community
          </p>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={loadServices}>Retry</button>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="controls-bar">
        <div className="filters">
          <label>Tier:</label>
          <select
            value={filterTier || ""}
            onChange={(e) => setFilterTier(e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Tiers</option>
            <option value="STARTER">Starter</option>
            <option value="PRO">Pro</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>

        <div className="sorting">
          <label>Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as MarketplaceSort)}
            className="sort-select"
          >
            <option value="newest">Newest</option>
            <option value="popular">Trust-ready</option>
            <option value="price-low">Lowest Price</option>
          </select>
        </div>

        <div className="result-count">
          {sortedServices.length} service
          {sortedServices.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {/* Services Grid */}
      {sortedServices.length > 0 ? (
        <div className="services-grid">
          {sortedServices.map((service) => (
            <div key={service.id} className="service-card">
              <div className="card-header">
                <h3>{service.name}</h3>
                {service.tierName && (
                  <span
                    className={`tier-badge tier-${service.tierName.toLowerCase()}`}
                  >
                    {service.tierName}
                  </span>
                )}
              </div>

              <p className="description">
                {service.description || "No description available"}
              </p>

              <div className="pricing-info">
                {service.pricingModel === "PER_CALL" && service.costPerCall && (
                  <div className="price">
                    <span className="price-label">Per Call:</span>
                    <span className="price-value">{service.costPerCall}</span>
                    <span className="price-unit">credits</span>
                  </div>
                )}
                {service.pricingModel === "PER_MONTH" &&
                  service.costPerMonth && (
                    <div className="price">
                      <span className="price-label">Monthly:</span>
                      <span className="price-value">
                        ${service.costPerMonth}
                      </span>
                    </div>
                  )}
                <p className="spend-estimate">{estimateMonthlySpend(service)}</p>
              </div>

              <div className="trust-signals" aria-label="Marketplace trust signals">
                <span>{service.isMonetized ? "✓ Monetized" : "Review required"}</span>
                <span>{service.status}</span>
                <span>{service.tierName || "Usage plan"}</span>
              </div>

              <div className="creator-info">
                <span className="creator-label">{getCreatorLabel(service)}</span>
                <span className="created-date">
                  {new Date(service.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => openServiceSheet(service, "subscribe")}
                  disabled={subscribing === service.id}
                  className="btn btn-subscribe"
                >
                  {subscribing === service.id
                    ? "Subscribing..."
                    : "Review & Subscribe"}
                </button>
                <button
                  className="btn btn-details"
                  onClick={() => openServiceSheet(service, "details")}
                >
                  Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h2>No services match your filters</h2>
          <p>Try adjusting your search or check back later for more options</p>
          <button onClick={() => setFilterTier(null)} className="btn btn-reset">
            Reset Filters
          </button>
        </div>
      )}

      {selectedService && (
        <div className="purchase-sheet-backdrop" role="presentation">
          <section
            className="purchase-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-sheet-title"
          >
            <button
              className="purchase-sheet-close"
              aria-label="Close service purchase sheet"
              onClick={closeServiceSheet}
              disabled={Boolean(subscribing)}
            >
              ×
            </button>

            <div className="purchase-sheet-header">
              <span className="sheet-eyebrow">
                {purchaseMode === "subscribe" ? "Purchase review" : "Service profile"}
              </span>
              <h2 id="purchase-sheet-title">{selectedService.name}</h2>
              <p>{selectedService.description || "No description available"}</p>
            </div>

            {detailsLoading && <p className="sheet-loading">Refreshing service details…</p>}

            {actionState && (
              <div className={`sheet-status sheet-status-${actionState.kind}`}>
                {actionState.message}
              </div>
            )}

            <div className="sheet-grid">
              <div>
                <h3>Pricing</h3>
                <p className="sheet-price">{getServicePriceLabel(selectedService)}</p>
                <p>{estimateMonthlySpend(selectedService)}</p>
              </div>
              <div>
                <h3>Creator</h3>
                <p>{getCreatorLabel(selectedService)}</p>
                <p>Status: {selectedService.status}</p>
              </div>
              <div>
                <h3>Trust posture</h3>
                <ul>
                  <li>{selectedService.isMonetized ? "Monetization enabled" : "Not yet monetized"}</li>
                  <li>Refund and support policy shown before checkout.</li>
                  <li>Usage resumes here after credit top-up.</li>
                </ul>
              </div>
              <div>
                <h3>Before you subscribe</h3>
                <ul>
                  <li>Review permissions and sample calls in service docs.</li>
                  <li>Confirm your credit balance covers expected usage.</li>
                  <li>Enterprise services may require creator approval.</li>
                </ul>
              </div>
            </div>

            <div className="purchase-sheet-actions">
              <button
                className="btn btn-details"
                onClick={closeServiceSheet}
                disabled={Boolean(subscribing)}
              >
                Keep browsing
              </button>
              <button
                className="btn btn-subscribe"
                onClick={() => handleSubscribe(selectedService.id)}
                disabled={Boolean(subscribing)}
              >
                {subscribing === selectedService.id ? "Activating…" : "Confirm subscription"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default MonetizedServicesMarketplace;
