import React, { useState, useEffect } from "react";
import {
  ManagedMcpService,
  getMarketplaceServices,
  subscribeToService,
} from "@thorapi/services/monetization/ServiceMonetizationService";
import "./MonetizedServicesMarketplace.css";

/**
 * Browse and subscribe to monetized MCP services from creators.
 */
export const MonetizedServicesMarketplace: React.FC = () => {
  const [services, setServices] = useState<ManagedMcpService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
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

  const handleSubscribe = async (serviceId: string) => {
    setSubscribing(serviceId);

    try {
      await subscribeToService(serviceId, "PAY_AS_YOU_GO");
      // Show success and refresh
      alert("✓ Successfully subscribed!");
      loadServices();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to subscribe";
      alert(`✗ ${message}`);
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
                <span className="creator-label">By: Creator</span>
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
                <button className="btn btn-details">Details →</button>
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
    </div>
  );
};

export default MonetizedServicesMarketplace;
