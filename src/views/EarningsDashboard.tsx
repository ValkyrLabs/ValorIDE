import React, { useState, useEffect } from "react";
import {
  CreatorEarnings,
  getMonthlyEarnings,
  getTotalEarnings,
  getCreatorServices,
  ManagedMcpService,
} from "@/services/monetization/ServiceMonetizationService";
import "./EarningsDashboard.css";

/**
 * Creator earnings dashboard.
 * Shows real-time earnings, monthly breakdown, and payout status.
 * Requires RESELLER or PRO/ENTERPRISE plan.
 */
export const EarningsDashboard: React.FC = () => {
  const [services, setServices] = useState<ManagedMcpService[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] =
    useState<CreatorEarnings | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch {
        // No data for this month yet
        setMonthlyEarnings(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load earnings";
      setError(message);
    } finally {
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

  const getPayoutStatusColor = (status?: string) => {
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
    return (
      <div className="earnings-dashboard">
        <div className="loading-spinner">Loading earnings...</div>
      </div>
    );
  }

  return (
    <div className="earnings-dashboard">
      <div className="dashboard-header">
        <h2>💰 Creator Earnings</h2>
        <p className="dashboard-subtitle">
          Track your MCP service revenue and manage payouts
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Total Earnings Card */}
      <div className="earnings-card total-card">
        <div className="card-content">
          <h3>Total All-Time Earnings</h3>
          <div className="total-amount">${totalEarnings.toFixed(2)}</div>
          <p className="card-subtitle">
            {services.length} monetized service
            {services.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="monthly-section">
        <div className="month-selector">
          <button onClick={handlePrevMonth} className="nav-btn">
            ← Previous
          </button>
          <div className="month-display">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-input"
            />
          </div>
          <button onClick={handleNextMonth} className="nav-btn">
            Next →
          </button>
        </div>

        {monthlyEarnings ? (
          <div className="monthly-card">
            <div className="month-header">
              <h3>Month of {selectedMonth}</h3>
              <span
                className={`payout-badge ${getPayoutStatusColor(monthlyEarnings.payoutStatus)}`}
              >
                {monthlyEarnings.payoutStatus || "PENDING"}
              </span>
            </div>

            <div className="monthly-stats">
              <div className="stat-box">
                <span className="stat-label">Total Earned</span>
                <div className="stat-value">
                  ${monthlyEarnings.totalEarned.toFixed(2)}
                </div>
              </div>
              <div className="stat-box">
                <span className="stat-label">Invocations</span>
                <div className="stat-value">
                  {monthlyEarnings.totalInvocations}
                </div>
              </div>
              <div className="stat-box">
                <span className="stat-label">Avg per Call</span>
                <div className="stat-value">
                  $
                  {monthlyEarnings.totalInvocations > 0
                    ? (
                        monthlyEarnings.totalEarned /
                        monthlyEarnings.totalInvocations
                      ).toFixed(3)
                    : "0.00"}
                </div>
              </div>
            </div>

            {monthlyEarnings.payoutStatus === "PAID" && (
              <div className="payout-info">
                <span>✓ Payout processed</span>
              </div>
            )}
          </div>
        ) : (
          <div className="no-data">
            <p>No earnings data for {selectedMonth}</p>
          </div>
        )}
      </div>

      {/* Services Breakdown */}
      <div className="services-section">
        <h3>Your Monetized Services</h3>
        {services.length > 0 ? (
          <div className="services-grid">
            {services.map((service) => (
              <div key={service.id} className="service-card">
                <h4>{service.name}</h4>
                <div className="service-details">
                  <p className="service-status">
                    <span className="badge">
                      {service.pricingModel === "PER_CALL"
                        ? "Per Call"
                        : service.pricingModel}
                    </span>
                  </p>
                  {service.costPerCall && (
                    <p className="service-price">
                      <strong>{service.costPerCall}</strong> credits/call
                    </p>
                  )}
                  <p className="service-date">
                    Created {new Date(service.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button className="view-analytics-btn">View Analytics →</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-services">
            <p>
              No monetized services yet. Start monetizing your MCP services!
            </p>
          </div>
        )}
      </div>

      {/* Payout Settings */}
      <div className="payout-section">
        <h3>Payout Settings</h3>
        <div className="payout-card">
          <p>
            💳 <strong>Stripe Connect</strong>
          </p>
          <p className="secondary">Bank transfer to your account</p>
          <button className="btn btn-secondary">Configure Stripe</button>
        </div>
        <div className="payout-card">
          <p>
            🔐 <strong>Crypto Wallet</strong>
          </p>
          <p className="secondary">Direct USDC or Solana transfer</p>
          <button className="btn btn-secondary">Configure Wallet</button>
        </div>

        <div className="minimum-notice">
          <strong>ℹ️ Minimum Payout:</strong> Payouts process monthly when you
          have at least $10 in pending earnings.
        </div>
      </div>
    </div>
  );
};

export default EarningsDashboard;
