import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import {
  getMarketplaceServices,
  subscribeToService
} from "@thorapi/services/monetization/ServiceMonetizationService";
import "./MonetizedServicesMarketplace.css";
import {
  buildMarketplaceFunnel,
  sortMarketplaceServices
} from "./monetizedMarketplaceFunnel";
const MonetizedServicesMarketplace = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscribing, setSubscribing] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [subscriptionType, setSubscriptionType] = useState("PAY_AS_YOU_GO");
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusTone, setStatusTone] = useState("success");
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load services";
      setError(message);
    } finally {
      setLoading(false);
    }
  };
  const handleSubscribe = async (serviceId, type = "PAY_AS_YOU_GO") => {
    setSubscribing(serviceId);
    try {
      await subscribeToService(serviceId, type);
      setStatusTone("success");
      setStatusMessage("Subscription activated. You can now use this service.");
      setSelectedService(null);
      loadServices();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to subscribe";
      setStatusTone("error");
      setStatusMessage(message);
    } finally {
      setSubscribing(null);
    }
  };
  const filteredServices = filterTier ? services.filter((s) => s.tierName === filterTier) : services;
  const sortedServices = sortMarketplaceServices(filteredServices, sortBy);
  const openServiceDetails = (service) => {
    const funnel = buildMarketplaceFunnel(service);
    setSelectedService(service);
    setSubscriptionType(funnel.recommendedSubscriptionType);
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { className: "marketplace", children: /* @__PURE__ */ jsxs("div", { className: "loading-state", children: [
      /* @__PURE__ */ jsx("div", { className: "spinner" }),
      /* @__PURE__ */ jsx("p", { children: "Discovering amazing services..." })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "marketplace", children: [
    /* @__PURE__ */ jsx("div", { className: "marketplace-header", children: /* @__PURE__ */ jsxs("div", { className: "header-content", children: [
      /* @__PURE__ */ jsx("h1", { children: "\u{1F680} Monetized MCP Services" }),
      /* @__PURE__ */ jsx("p", { children: "Compare creator proof, pricing, and plan fit before activating a paid MCP service." })
    ] }) }),
    error && /* @__PURE__ */ jsxs("div", { className: "error-banner", children: [
      /* @__PURE__ */ jsx("p", { children: error }),
      /* @__PURE__ */ jsx("button", { onClick: loadServices, children: "Retry" })
    ] }),
    statusMessage && /* @__PURE__ */ jsxs("div", { className: `status-banner ${statusTone}`, children: [
      /* @__PURE__ */ jsx("p", { children: statusMessage }),
      /* @__PURE__ */ jsx("button", { onClick: () => setStatusMessage(null), children: "Dismiss" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "controls-bar", children: [
      /* @__PURE__ */ jsxs("div", { className: "filters", children: [
        /* @__PURE__ */ jsx("label", { children: "Tier:" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: filterTier || "",
            onChange: (e) => setFilterTier(e.target.value || null),
            className: "filter-select",
            children: [
              /* @__PURE__ */ jsx("option", { value: "", children: "All Tiers" }),
              /* @__PURE__ */ jsx("option", { value: "STARTER", children: "Starter" }),
              /* @__PURE__ */ jsx("option", { value: "PRO", children: "Pro" }),
              /* @__PURE__ */ jsx("option", { value: "ENTERPRISE", children: "Enterprise" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "sorting", children: [
        /* @__PURE__ */ jsx("label", { children: "Sort by:" }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: sortBy,
            onChange: (e) => setSortBy(e.target.value),
            className: "sort-select",
            children: [
              /* @__PURE__ */ jsx("option", { value: "newest", children: "Newest" }),
              /* @__PURE__ */ jsx("option", { value: "popular", children: "Most Popular" }),
              /* @__PURE__ */ jsx("option", { value: "price-low", children: "Lowest Price" })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "result-count", children: [
        sortedServices.length,
        " service",
        sortedServices.length !== 1 ? "s" : "",
        " found"
      ] })
    ] }),
    sortedServices.length > 0 ? /* @__PURE__ */ jsx("div", { className: "services-grid", children: sortedServices.map((service) => /* @__PURE__ */ jsxs("div", { className: "service-card", children: [
      /* @__PURE__ */ jsxs("div", { className: "card-header", children: [
        /* @__PURE__ */ jsx("h3", { children: service.name }),
        service.tierName && /* @__PURE__ */ jsx(
          "span",
          {
            className: `tier-badge tier-${service.tierName.toLowerCase()}`,
            children: service.tierName
          }
        )
      ] }),
      /* @__PURE__ */ jsx("p", { className: "description", children: service.description || "No description available" }),
      /* @__PURE__ */ jsxs("div", { className: "pricing-info", children: [
        /* @__PURE__ */ jsx("div", { className: "price-summary", children: buildMarketplaceFunnel(service).priceLabel }),
        service.pricingModel === "PER_CALL" && service.costPerCall && /* @__PURE__ */ jsxs("div", { className: "price", children: [
          /* @__PURE__ */ jsx("span", { className: "price-label", children: "Per Call:" }),
          /* @__PURE__ */ jsx("span", { className: "price-value", children: service.costPerCall }),
          /* @__PURE__ */ jsx("span", { className: "price-unit", children: "credits" })
        ] }),
        service.pricingModel === "PER_MONTH" && service.costPerMonth && /* @__PURE__ */ jsxs("div", { className: "price", children: [
          /* @__PURE__ */ jsx("span", { className: "price-label", children: "Monthly:" }),
          /* @__PURE__ */ jsxs("span", { className: "price-value", children: [
            "$",
            service.costPerMonth
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "funnel-proof", children: buildMarketplaceFunnel(service).proofPoints.slice(0, 3).map((point) => /* @__PURE__ */ jsxs("span", { children: [
        "\u2713 ",
        point
      ] }, point)) }),
      /* @__PURE__ */ jsxs("div", { className: "creator-info", children: [
        /* @__PURE__ */ jsxs("span", { className: "creator-label", children: [
          "By: ",
          buildMarketplaceFunnel(service).creatorDisplayName
        ] }),
        /* @__PURE__ */ jsx("span", { className: "created-date", children: new Date(service.createdAt).toLocaleDateString() })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "card-actions", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => openServiceDetails(service),
            disabled: subscribing === service.id,
            className: "btn btn-subscribe",
            children: subscribing === service.id ? "Activating..." : buildMarketplaceFunnel(service).primaryCta
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-details",
            onClick: () => openServiceDetails(service),
            children: "Details \u2192"
          }
        )
      ] })
    ] }, service.id)) }) : /* @__PURE__ */ jsxs("div", { className: "empty-state", children: [
      /* @__PURE__ */ jsx("div", { className: "empty-icon", children: "\u{1F50D}" }),
      /* @__PURE__ */ jsx("h2", { children: "No services match your filters" }),
      /* @__PURE__ */ jsx("p", { children: "Try adjusting your search or check back later for more options" }),
      /* @__PURE__ */ jsx("button", { onClick: () => setFilterTier(null), className: "btn btn-reset", children: "Reset Filters" })
    ] }),
    selectedService && /* @__PURE__ */ jsx(
      "div",
      {
        className: "service-modal-backdrop",
        onClick: () => setSelectedService(null),
        children: /* @__PURE__ */ jsxs("div", { className: "service-modal", onClick: (e) => e.stopPropagation(), children: [
          /* @__PURE__ */ jsx("h2", { children: selectedService.name }),
          /* @__PURE__ */ jsx("p", { children: selectedService.description || "No description available" }),
          /* @__PURE__ */ jsxs("div", { className: "modal-hero", children: [
            /* @__PURE__ */ jsx("strong", { children: buildMarketplaceFunnel(selectedService).priceLabel }),
            /* @__PURE__ */ jsx("span", { children: "Checkout-safe MCP activation path" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "modal-meta", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              "Creator:",
              " ",
              buildMarketplaceFunnel(selectedService).creatorDisplayName
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              "Pricing Model: ",
              selectedService.pricingModel
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              "Est. Credits/Call:",
              " ",
              selectedService.costPerCall ?? "Not specified"
            ] })
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "modal-proof", children: buildMarketplaceFunnel(selectedService).proofPoints.map(
            (point) => /* @__PURE__ */ jsx("li", { children: point }, point)
          ) }),
          /* @__PURE__ */ jsx("label", { htmlFor: "subscriptionType", children: "Plan" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              id: "subscriptionType",
              value: subscriptionType,
              onChange: (e) => setSubscriptionType(e.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "PAY_AS_YOU_GO", children: "Pay as you go" }),
                /* @__PURE__ */ jsx("option", { value: "MONTHLY", children: "Monthly" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "modal-actions", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-details",
                onClick: () => setSelectedService(null),
                children: "Cancel"
              }
            ),
            buildMarketplaceFunnel(selectedService).detailHref && /* @__PURE__ */ jsx(
              "a",
              {
                className: "btn btn-details",
                href: buildMarketplaceFunnel(selectedService).detailHref ?? void 0,
                target: "_blank",
                rel: "noreferrer",
                children: "Hosted detail"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-subscribe",
                disabled: subscribing === selectedService.id,
                onClick: () => handleSubscribe(selectedService.id, subscriptionType),
                children: subscribing === selectedService.id ? "Subscribing..." : "Subscribe"
              }
            )
          ] })
        ] })
      }
    )
  ] });
};
var MonetizedServicesMarketplace_default = MonetizedServicesMarketplace;
export {
  MonetizedServicesMarketplace,
  MonetizedServicesMarketplace_default as default
};
//# sourceMappingURL=MonetizedServicesMarketplace.js.map
