import React, { useState, useEffect } from "react";
import {
  ManagedMcpService,
  SubscriptionType,
  getMarketplaceServices,
  subscribeToService,
} from "@thorapi/services/monetization/ServiceMonetizationService";
import {
  MONETIZATION_PRICING_UPDATED_EVENT,
  isPricingUpdatedEvent,
} from "@thorapi/services/monetization/pricingEvents";
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
  const [subscriptionType, setSubscriptionType] =
    useState<SubscriptionType>("PAY_AS_YOU_GO");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "price-low">(
    "newest",
  );

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    const handlePricingUpdated = (event: Event) => {
      if (!isPricingUpdatedEvent(event)) {
        return;
      }

      const updatedService = event.detail.service;
      setServices((current) =>
        current.map((service) =>
          service.id === updatedService.id
            ? { ...service, ...updatedService }
            : service,
        ),
      );
      setSelectedService((current) =>
        current?.id === updatedService.id
          ? { ...current, ...updatedService }
          : current,
      );
      setStatusTone("success");
      setStatusMessage("Marketplace refreshed with the saved creator pricing.");
      void loadServices();
    };

    window.addEventListener(
      MONETIZATION_PRICING_UPDATED_EVENT,
      handlePricingUpdated,
    );

    return () => {
      window.removeEventListener(
        MONETIZATION_PRICING_UPDATED_EVENT,
        handlePricingUpdated,
      );
    };
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

  const handleSubscribe = async (
    serviceId: string,
    type: SubscriptionType = "PAY_AS_YOU_GO",
  ) => {
    setSubscribing(serviceId);

    try {
      await subscribeToService(serviceId, type);
      setStatusTone("success");
      setStatusMessage("Subscription activated. You can now use this service.");
      setSelectedService(null);
      loadServices();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to subscribe";
      setStatusTone("error");
      setStatusMessage(message);
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
        return b.updatedAt.localeCompare(a.updatedAt);
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

      {statusMessage && (
        <div className={`status-banner ${statusTone}`}>
          <p>{statusMessage}</p>
          <button onClick={() => setStatusMessage(null)}>Dismiss</button>
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
                <span className="creator-label">By: {service.createdBy}</span>
                <span className="created-date">
                  {new Date(service.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="card-actions">
                <button
                  onClick={() => handleSubscribe(service.id)}
                  disabled={subscribing === service.id}
                  className="btn btn-subscribe"
                >
                  {subscribing === service.id
                    ? "Subscribing..."
                    : "Subscribe Now"}
                </button>
                <button
                  className="btn btn-details"
                  onClick={() => {
                    setSelectedService(service);
                    setSubscriptionType(
                      service.pricingModel === "PER_MONTH"
                        ? "MONTHLY"
                        : "PAY_AS_YOU_GO",
                    );
                  }}
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
        <div
          className="service-modal-backdrop"
          onClick={() => setSelectedService(null)}
        >
          <div className="service-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedService.name}</h2>
            <p>{selectedService.description || "No description available"}</p>
            <div className="modal-meta">
              <div>Creator: {selectedService.createdBy}</div>
              <div>Pricing Model: {selectedService.pricingModel}</div>
              <div>
                Est. Credits/Call:{" "}
                {selectedService.costPerCall ?? "Not specified"}
              </div>
            </div>
            <label htmlFor="subscriptionType">Plan</label>
            <select
              id="subscriptionType"
              value={subscriptionType}
              onChange={(e) =>
                setSubscriptionType(e.target.value as SubscriptionType)
              }
            >
              <option value="PAY_AS_YOU_GO">Pay as you go</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            <div className="modal-actions">
              <button
                className="btn btn-details"
                onClick={() => setSelectedService(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-subscribe"
                disabled={subscribing === selectedService.id}
                onClick={() =>
                  handleSubscribe(selectedService.id, subscriptionType)
                }
              >
                {subscribing === selectedService.id
                  ? "Subscribing..."
                  : "Subscribe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonetizedServicesMarketplace;
