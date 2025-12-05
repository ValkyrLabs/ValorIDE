import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { getMarketplaceServices, subscribeToService, } from "@/services/monetization/ServiceMonetizationService";
import "./MonetizedServicesMarketplace.css";
/**
 * Browse and subscribe to monetized MCP services from creators.
 */
export const MonetizedServicesMarketplace = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [subscribing, setSubscribing] = useState(null);
    const [filterTier, setFilterTier] = useState(null);
    const [sortBy, setSortBy] = useState("newest");
    useEffect(() => {
        loadServices();
    }, []);
    const loadServices = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getMarketplaceServices();
            setServices(data);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load services";
            setError(message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubscribe = async (serviceId) => {
        setSubscribing(serviceId);
        try {
            await subscribeToService(serviceId, "PAY_AS_YOU_GO");
            // Show success and refresh
            alert("✓ Successfully subscribed!");
            loadServices();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to subscribe";
            alert(`✗ ${message}`);
        }
        finally {
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
        return (_jsx("div", { className: "marketplace", children: _jsxs("div", { className: "loading-state", children: [_jsx("div", { className: "spinner" }), _jsx("p", { children: "Discovering amazing services..." })] }) }));
    }
    return (_jsxs("div", { className: "marketplace", children: [_jsx("div", { className: "marketplace-header", children: _jsxs("div", { className: "header-content", children: [_jsx("h1", { children: "\uD83D\uDE80 Monetized MCP Services" }), _jsx("p", { children: "Discover and subscribe to premium MCP services created by our community" })] }) }), error && (_jsxs("div", { className: "error-banner", children: [_jsx("p", { children: error }), _jsx("button", { onClick: loadServices, children: "Retry" })] })), _jsxs("div", { className: "controls-bar", children: [_jsxs("div", { className: "filters", children: [_jsx("label", { children: "Tier:" }), _jsxs("select", { value: filterTier || "", onChange: (e) => setFilterTier(e.target.value || null), className: "filter-select", children: [_jsx("option", { value: "", children: "All Tiers" }), _jsx("option", { value: "STARTER", children: "Starter" }), _jsx("option", { value: "PRO", children: "Pro" }), _jsx("option", { value: "ENTERPRISE", children: "Enterprise" })] })] }), _jsxs("div", { className: "sorting", children: [_jsx("label", { children: "Sort by:" }), _jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "sort-select", children: [_jsx("option", { value: "newest", children: "Newest" }), _jsx("option", { value: "popular", children: "Most Popular" }), _jsx("option", { value: "price-low", children: "Lowest Price" })] })] }), _jsxs("div", { className: "result-count", children: [sortedServices.length, " service", sortedServices.length !== 1 ? "s" : "", " found"] })] }), sortedServices.length > 0 ? (_jsx("div", { className: "services-grid", children: sortedServices.map((service) => (_jsxs("div", { className: "service-card", children: [_jsxs("div", { className: "card-header", children: [_jsx("h3", { children: service.name }), service.tierName && (_jsx("span", { className: `tier-badge tier-${service.tierName.toLowerCase()}`, children: service.tierName }))] }), _jsx("p", { className: "description", children: service.description || "No description available" }), _jsxs("div", { className: "pricing-info", children: [service.pricingModel === "PER_CALL" && service.costPerCall && (_jsxs("div", { className: "price", children: [_jsx("span", { className: "price-label", children: "Per Call:" }), _jsx("span", { className: "price-value", children: service.costPerCall }), _jsx("span", { className: "price-unit", children: "credits" })] })), service.pricingModel === "PER_MONTH" &&
                                    service.costPerMonth && (_jsxs("div", { className: "price", children: [_jsx("span", { className: "price-label", children: "Monthly:" }), _jsxs("span", { className: "price-value", children: ["$", service.costPerMonth] })] }))] }), _jsxs("div", { className: "creator-info", children: [_jsx("span", { className: "creator-label", children: "By: Creator" }), _jsx("span", { className: "created-date", children: new Date(service.createdAt).toLocaleDateString() })] }), _jsxs("div", { className: "card-actions", children: [_jsx("button", { onClick: () => handleSubscribe(service.id), disabled: subscribing === service.id, className: "btn btn-subscribe", children: subscribing === service.id
                                        ? "Subscribing..."
                                        : "Subscribe Now" }), _jsx("button", { className: "btn btn-details", children: "Details \u2192" })] })] }, service.id))) })) : (_jsxs("div", { className: "empty-state", children: [_jsx("div", { className: "empty-icon", children: "\uD83D\uDD0D" }), _jsx("h2", { children: "No services match your filters" }), _jsx("p", { children: "Try adjusting your search or check back later for more options" }), _jsx("button", { onClick: () => setFilterTier(null), className: "btn btn-reset", children: "Reset Filters" })] }))] }));
};
export default MonetizedServicesMarketplace;
//# sourceMappingURL=MonetizedServicesMarketplace.js.map