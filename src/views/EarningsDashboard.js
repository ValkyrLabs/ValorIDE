import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { getMonthlyEarnings, getTotalEarnings, getCreatorServices, } from "@/services/monetization/ServiceMonetizationService";
import "./EarningsDashboard.css";
/**
 * Creator earnings dashboard.
 * Shows real-time earnings, monthly breakdown, and payout status.
 * Requires RESELLER or PRO/ENTERPRISE plan.
 */
export const EarningsDashboard = () => {
    const [services, setServices] = useState([]);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [monthlyEarnings, setMonthlyEarnings] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadData();
    }, [selectedMonth]);
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Load services
            const servicesData = await getCreatorServices();
            setServices(servicesData);
            // Load total earnings
            const totalsData = await getTotalEarnings();
            setTotalEarnings(totalsData.totalAllTimeEarnings);
            // Load monthly earnings
            try {
                const monthlyData = await getMonthlyEarnings(selectedMonth);
                setMonthlyEarnings(monthlyData);
            }
            catch {
                // No data for this month yet
                setMonthlyEarnings(null);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load earnings";
            setError(message);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePrevMonth = () => {
        const date = new Date(selectedMonth + "-01");
        date.setMonth(date.getMonth() - 1);
        setSelectedMonth(date.toISOString().slice(0, 7));
    };
    const handleNextMonth = () => {
        const date = new Date(selectedMonth + "-01");
        date.setMonth(date.getMonth() + 1);
        setSelectedMonth(date.toISOString().slice(0, 7));
    };
    const getPayoutStatusColor = (status) => {
        switch (status) {
            case "PAID":
                return "status-paid";
            case "PROCESSING":
                return "status-processing";
            case "FAILED":
                return "status-failed";
            default:
                return "status-pending";
        }
    };
    if (loading) {
        return (_jsx("div", { className: "earnings-dashboard", children: _jsx("div", { className: "loading-spinner", children: "Loading earnings..." }) }));
    }
    return (_jsxs("div", { className: "earnings-dashboard", children: [_jsxs("div", { className: "dashboard-header", children: [_jsx("h2", { children: "\uD83D\uDCB0 Creator Earnings" }), _jsx("p", { className: "dashboard-subtitle", children: "Track your MCP service revenue and manage payouts" })] }), error && _jsx("div", { className: "error-message", children: error }), _jsx("div", { className: "earnings-card total-card", children: _jsxs("div", { className: "card-content", children: [_jsx("h3", { children: "Total All-Time Earnings" }), _jsxs("div", { className: "total-amount", children: ["$", totalEarnings.toFixed(2)] }), _jsxs("p", { className: "card-subtitle", children: [services.length, " monetized service", services.length !== 1 ? "s" : ""] })] }) }), _jsxs("div", { className: "monthly-section", children: [_jsxs("div", { className: "month-selector", children: [_jsx("button", { onClick: handlePrevMonth, className: "nav-btn", children: "\u2190 Previous" }), _jsx("div", { className: "month-display", children: _jsx("input", { type: "month", value: selectedMonth, onChange: (e) => setSelectedMonth(e.target.value), className: "month-input" }) }), _jsx("button", { onClick: handleNextMonth, className: "nav-btn", children: "Next \u2192" })] }), monthlyEarnings ? (_jsxs("div", { className: "monthly-card", children: [_jsxs("div", { className: "month-header", children: [_jsxs("h3", { children: ["Month of ", selectedMonth] }), _jsx("span", { className: `payout-badge ${getPayoutStatusColor(monthlyEarnings.payoutStatus)}`, children: monthlyEarnings.payoutStatus || "PENDING" })] }), _jsxs("div", { className: "monthly-stats", children: [_jsxs("div", { className: "stat-box", children: [_jsx("span", { className: "stat-label", children: "Total Earned" }), _jsxs("div", { className: "stat-value", children: ["$", monthlyEarnings.totalEarned.toFixed(2)] })] }), _jsxs("div", { className: "stat-box", children: [_jsx("span", { className: "stat-label", children: "Invocations" }), _jsx("div", { className: "stat-value", children: monthlyEarnings.totalInvocations })] }), _jsxs("div", { className: "stat-box", children: [_jsx("span", { className: "stat-label", children: "Avg per Call" }), _jsxs("div", { className: "stat-value", children: ["$", monthlyEarnings.totalInvocations > 0
                                                        ? (monthlyEarnings.totalEarned /
                                                            monthlyEarnings.totalInvocations).toFixed(3)
                                                        : "0.00"] })] })] }), monthlyEarnings.payoutStatus === "PAID" && (_jsx("div", { className: "payout-info", children: _jsx("span", { children: "\u2713 Payout processed" }) }))] })) : (_jsx("div", { className: "no-data", children: _jsxs("p", { children: ["No earnings data for ", selectedMonth] }) }))] }), _jsxs("div", { className: "services-section", children: [_jsx("h3", { children: "Your Monetized Services" }), services.length > 0 ? (_jsx("div", { className: "services-grid", children: services.map((service) => (_jsxs("div", { className: "service-card", children: [_jsx("h4", { children: service.name }), _jsxs("div", { className: "service-details", children: [_jsx("p", { className: "service-status", children: _jsx("span", { className: "badge", children: service.pricingModel === "PER_CALL"
                                                    ? "Per Call"
                                                    : service.pricingModel }) }), service.costPerCall && (_jsxs("p", { className: "service-price", children: [_jsx("strong", { children: service.costPerCall }), " credits/call"] })), _jsxs("p", { className: "service-date", children: ["Created ", new Date(service.createdAt).toLocaleDateString()] })] }), _jsx("button", { className: "view-analytics-btn", children: "View Analytics \u2192" })] }, service.id))) })) : (_jsx("div", { className: "no-services", children: _jsx("p", { children: "No monetized services yet. Start monetizing your MCP services!" }) }))] }), _jsxs("div", { className: "payout-section", children: [_jsx("h3", { children: "Payout Settings" }), _jsxs("div", { className: "payout-card", children: [_jsxs("p", { children: ["\uD83D\uDCB3 ", _jsx("strong", { children: "Stripe Connect" })] }), _jsx("p", { className: "secondary", children: "Bank transfer to your account" }), _jsx("button", { className: "btn btn-secondary", children: "Configure Stripe" })] }), _jsxs("div", { className: "payout-card", children: [_jsxs("p", { children: ["\uD83D\uDD10 ", _jsx("strong", { children: "Crypto Wallet" })] }), _jsx("p", { className: "secondary", children: "Direct USDC or Solana transfer" }), _jsx("button", { className: "btn btn-secondary", children: "Configure Wallet" })] }), _jsxs("div", { className: "minimum-notice", children: [_jsx("strong", { children: "\u2139\uFE0F Minimum Payout:" }), " Payouts process monthly when you have at least $10 in pending earnings."] })] })] }));
};
export default EarningsDashboard;
//# sourceMappingURL=EarningsDashboard.js.map