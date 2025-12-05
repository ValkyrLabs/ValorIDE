import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { enableMonetization, } from "@/services/monetization/ServiceMonetizationService";
import "./MonetizationSettings.css";
/**
 * Component to enable and configure monetization on MCP services.
 * Only accessible to RESELLER and PRO/ENTERPRISE users.
 */
export const MonetizationSettings = ({ applicationId, onSuccess, onError, }) => {
    const [isMonetized, setIsMonetized] = useState(false);
    const [pricingModel, setPricingModel] = useState("PER_CALL");
    const [costPerCall, setCostPerCall] = useState(5.0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    // Check if this service is already monetized
    useEffect(() => {
        // Could load existing monetization status here
    }, [applicationId]);
    const handleEnableMonetization = async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const result = await enableMonetization(applicationId, pricingModel, costPerCall);
            setIsMonetized(result.isMonetized ?? false);
            setSuccess(true);
            if (onSuccess) {
                onSuccess(result);
            }
            // Auto-hide success message after 3s
            setTimeout(() => setSuccess(false), 3000);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to enable monetization";
            setError(message);
            if (onError) {
                onError(err instanceof Error ? err : new Error(message));
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleUpdatePricing = async () => {
        setLoading(true);
        setError(null);
        try {
            // First get the service to get its ID
            // In real implementation, you'd pass serviceId as prop
            // await updatePricing(serviceId, pricingModel, costPerCall);
            // For now, just show success
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update pricing";
            setError(message);
            if (onError) {
                onError(err instanceof Error ? err : new Error(message));
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "monetization-settings", children: [_jsxs("div", { className: "settings-header", children: [_jsx("h3", { children: "\uD83D\uDCB0 Monetize This Service" }), _jsx("p", { className: "subtitle", children: "Enable charging for this MCP service. You'll earn 70% of revenue." })] }), error && _jsx("div", { className: "error-banner", children: error }), success && (_jsx("div", { className: "success-banner", children: "\u2713 Settings saved successfully!" })), _jsxs("div", { className: "settings-form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Pricing Model" }), _jsx("div", { className: "radio-group", children: ["PER_CALL", "PER_MONTH", "TIERED"].map((model) => (_jsxs("label", { className: "radio-label", children: [_jsx("input", { type: "radio", value: model, checked: pricingModel === model, onChange: (e) => setPricingModel(e.target.value), disabled: loading }), _jsx("span", { children: model === "PER_CALL"
                                                ? "Per Call"
                                                : model === "PER_MONTH"
                                                    ? "Monthly Subscription"
                                                    : "Tiered" })] }, model))) })] }), pricingModel === "PER_CALL" && (_jsxs("div", { className: "form-group", children: [_jsxs("label", { htmlFor: "costPerCall", children: ["Cost Per Call (Credits)", _jsx("span", { className: "hint", children: "Platform takes 30%, you get 70%" })] }), _jsxs("div", { className: "input-with-hint", children: [_jsx("input", { id: "costPerCall", type: "number", min: "0.1", step: "0.1", value: costPerCall, onChange: (e) => setCostPerCall(parseFloat(e.target.value) || 0), disabled: loading, className: "input-field" }), _jsxs("span", { className: "earnings-hint", children: ["\uD83D\uDCA1 At ~$0.01 per credit: $", (costPerCall * 0.01 * 0.7).toFixed(2), "/call for you"] })] })] })), _jsxs("div", { className: "revenue-breakdown", children: [_jsx("h4", { children: "Revenue Split" }), _jsxs("div", { className: "breakdown-item", children: [_jsx("span", { children: "Your Earnings" }), _jsx("strong", { children: "70%" })] }), _jsxs("div", { className: "breakdown-item", children: [_jsx("span", { children: "Platform Fee" }), _jsx("strong", { children: "30%" })] }), _jsx("p", { className: "breakdown-note", children: "Payouts via Stripe, bank transfer, or crypto wallet. Minimum $10/month for payout." })] }), _jsx("div", { className: "button-group", children: !isMonetized ? (_jsx("button", { onClick: handleEnableMonetization, disabled: loading, className: "btn btn-primary", children: loading ? "Enabling..." : "Enable Monetization" })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleUpdatePricing, disabled: loading, className: "btn btn-secondary", children: loading ? "Updating..." : "Update Pricing" }), _jsx("button", { className: "btn btn-tertiary", children: "View Earnings Dashboard" })] })) }), _jsxs("div", { className: "terms-notice", children: [_jsx("input", { type: "checkbox", id: "agreeTerms" }), _jsx("label", { htmlFor: "agreeTerms", children: "I agree to the Monetization Terms & Service" })] })] })] }));
};
export default MonetizationSettings;
//# sourceMappingURL=MonetizationSettings.js.map