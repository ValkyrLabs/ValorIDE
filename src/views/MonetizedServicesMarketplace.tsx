import React, { useState, useEffect } from "react";
import {
  ManagedMcpService,
  getMarketplaceServices,
  subscribeToService,
} from "@thorapi/services/monetization/ServiceMonetizationService";
import {
  buildTrustSignals,
  getEstimatedSpendLabel,
  getCreatorDisplayName,
  getMarketplacePopularityScore,
  getServicePricingSummary,
} from "./monetizedServicesMarketplaceUtils";
import "./MonetizedServicesMarketplace.css";

/**
 * Browse and subscribe to monetized MCP services from creators.
 */
export const MonetizedServicesMarketplace: React.FC = () => {
  const [services, setServices] = useState<ManagedMcpService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [selectedService, setSelectedService] =
    useState<ManagedMcpService | null>(null);
  const [purchaseService, setPurchaseService] =
    useState<ManagedMcpService | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "price-low">(
    "newest",
  );

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
      const message =
        err instanceof Error ? err.message : "Failed to load services";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (service: ManagedMcpService) => {
    setSubscribing(service.id);
    setNotice(null);

    try {
      await subscribeToService(service.id, "PAY_AS_YOU_GO");
      setNotice({
        tone: "success",
        message: `Subscribed to ${service.name}. You can now use it from connected MCP tools.`,
      });
      setPurchaseService(null);
      await loadServices();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to subscribe";
      setNotice({
        tone: "error",
        message,
      });
    } finally {
      setSubscribing(null);
    }
  };

  const filteredServices = filterTier
    ? services.filter((s) => s.tierName === filterTier)
    : services;

  const sortedServices = [...filteredServices].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return (a.costPerCall || 999) - (b.costPerCall || 999);
      case "popular":
        return (
          getMarketplacePopularityScore(b) - getMarketplacePopularityScore(a)
        );
      default:
        return b.createdAt.localeCompare(a.createdAt);
    }
  });

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

      {notice && (
        <div className={`notice-banner notice-${notice.tone}`} role="status">
          <p>{notice.message}</p>
          <button onClick={() => setNotice(null)}>Dismiss</button>
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
            onChange={(e) =>
              setSortBy(e.target.value as "newest" | "popular" | "price-low")
            }
            className="sort-select"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
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
              </div>

              <div className="creator-info">
                <span className="creator-label">
                  By: {getCreatorDisplayName(service)}
                </span>
                <span className="created-date">
                  {new Date(service.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => setPurchaseService(service)}
                  disabled={subscribing === service.id}
                  className="btn btn-subscribe"
                >
                  {subscribing === service.id
                    ? "Subscribing..."
                    : "Subscribe Now"}
                </button>
                <button
                  className="btn btn-details"
                  onClick={() => setSelectedService(service)}
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
        <div className="marketplace-dialog-backdrop" role="presentation">
          <section
            className="marketplace-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedService.name} service details`}
          >
            <div className="dialog-header">
              <div>
                <p className="dialog-kicker">Service profile</p>
                <h2>{selectedService.name}</h2>
              </div>
              <button
                className="dialog-close"
                onClick={() => setSelectedService(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>
            <p className="dialog-description">
              {selectedService.description || "No description available"}
            </p>
            <dl className="service-facts">
              <div>
                <dt>Creator</dt>
                <dd>{getCreatorDisplayName(selectedService)}</dd>
              </div>
              <div>
                <dt>Pricing</dt>
                <dd>{getServicePricingSummary(selectedService)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{selectedService.status}</dd>
              </div>
            </dl>
            <div className="trust-signal-list">
              {buildTrustSignals(selectedService).map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
            <div className="dialog-actions">
              <button
                className="btn btn-details"
                onClick={() => setSelectedService(null)}
              >
                Close
              </button>
              <button
                className="btn btn-subscribe"
                onClick={() => {
                  setPurchaseService(selectedService);
                  setSelectedService(null);
                }}
              >
                Review Purchase
              </button>
            </div>
          </section>
        </div>
      )}

      {purchaseService && (
        <div className="marketplace-dialog-backdrop" role="presentation">
          <section
            className="marketplace-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Review ${purchaseService.name} purchase`}
          >
            <div className="dialog-header">
              <div>
                <p className="dialog-kicker">Purchase review</p>
                <h2>{purchaseService.name}</h2>
              </div>
              <button
                className="dialog-close"
                onClick={() => setPurchaseService(null)}
                aria-label="Close purchase review"
              >
                ×
              </button>
            </div>
            <div className="purchase-summary">
              <div>
                <span>Price</span>
                <strong>{getServicePricingSummary(purchaseService)}</strong>
              </div>
              <div>
                <span>Estimated 100-call spend</span>
                <strong>{getEstimatedSpendLabel(purchaseService)}</strong>
              </div>
              <div>
                <span>Subscription</span>
                <strong>Pay as you go</strong>
              </div>
            </div>
            <p className="purchase-policy">
              Charges are recorded through the ValkyrAI billing ledger. You can
              stop using the service at any time, and support requests go to the
              listed creator.
            </p>
            <div className="dialog-actions">
              <button
                className="btn btn-details"
                onClick={() => setPurchaseService(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-subscribe"
                onClick={() => handleSubscribe(purchaseService)}
                disabled={subscribing === purchaseService.id}
              >
                {subscribing === purchaseService.id
                  ? "Subscribing..."
                  : "Confirm Subscription"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default MonetizedServicesMarketplace;
