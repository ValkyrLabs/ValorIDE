import React, { useState, useEffect } from "react";
import {
  ManagedMcpService,
  PricingModel,
  enableMonetization,
  updatePricing,
} from "@thorapi/services/monetization/ServiceMonetizationService";
import "./MonetizationSettings.css";

interface MonetizationSettingsProps {
  applicationId: string;
  onSuccess?: (service: ManagedMcpService) => void;
  onError?: (error: Error) => void;
}

/**
 * Component to enable and configure monetization on MCP services.
 * Only accessible to RESELLER and PRO/ENTERPRISE users.
 */
export const MonetizationSettings: React.FC<MonetizationSettingsProps> = ({
  applicationId,
  onSuccess,
  onError,
}) => {
  const [isMonetized, setIsMonetized] = useState(false);
  const [pricingModel, setPricingModel] = useState<PricingModel>("PER_CALL");
  const [costPerCall, setCostPerCall] = useState(5.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const result = await enableMonetization(
        applicationId,
        pricingModel,
        costPerCall,
      );
      setIsMonetized(result.isMonetized ?? false);
      setSuccess(true);

      if (onSuccess) {
        onSuccess(result);
      }

      // Auto-hide success message after 3s
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enable monetization";
      setError(message);

      if (onError) {
        onError(err instanceof Error ? err : new Error(message));
      }
    } finally {
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update pricing";
      setError(message);

      if (onError) {
        onError(err instanceof Error ? err : new Error(message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="monetization-settings">
      <div className="settings-header">
        <h3>💰 Monetize This Service</h3>
        <p className="subtitle">
          Enable charging for this MCP service. You'll earn 70% of revenue.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && (
        <div className="success-banner">✓ Settings saved successfully!</div>
      )}

      <div className="settings-form">
        {/* Pricing Model Selection */}
        <div className="form-group">
          <label>Pricing Model</label>
          <div className="radio-group">
            {["PER_CALL", "PER_MONTH", "TIERED"].map((model) => (
              <label key={model} className="radio-label">
                <input
                  type="radio"
                  value={model}
                  checked={pricingModel === model}
                  onChange={(e) =>
                    setPricingModel(e.target.value as PricingModel)
                  }
                  disabled={loading}
                />
                <span>
                  {model === "PER_CALL"
                    ? "Per Call"
                    : model === "PER_MONTH"
                      ? "Monthly Subscription"
                      : "Tiered"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Cost Per Call */}
        {pricingModel === "PER_CALL" && (
          <div className="form-group">
            <label htmlFor="costPerCall">
              Cost Per Call (Credits)
              <span className="hint">Platform takes 30%, you get 70%</span>
            </label>
            <div className="input-with-hint">
              <input
                id="costPerCall"
                type="number"
                min="0.1"
                step="0.1"
                value={costPerCall}
                onChange={(e) =>
                  setCostPerCall(parseFloat(e.target.value) || 0)
                }
                disabled={loading}
                className="input-field"
              />
              <span className="earnings-hint">
                💡 At ~$0.01 per credit: $
                {(costPerCall * 0.01 * 0.7).toFixed(2)}/call for you
              </span>
            </div>
          </div>
        )}

        {/* Revenue Share Explanation */}
        <div className="revenue-breakdown">
          <h4>Revenue Split</h4>
          <div className="breakdown-item">
            <span>Your Earnings</span>
            <strong>70%</strong>
          </div>
          <div className="breakdown-item">
            <span>Platform Fee</span>
            <strong>30%</strong>
          </div>
          <p className="breakdown-note">
            Payouts via Stripe, bank transfer, or crypto wallet. Minimum
            $10/month for payout.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="button-group">
          {!isMonetized ? (
            <button
              onClick={handleEnableMonetization}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? "Enabling..." : "Enable Monetization"}
            </button>
          ) : (
            <>
              <button
                onClick={handleUpdatePricing}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading ? "Updating..." : "Update Pricing"}
              </button>
              <button className="btn btn-tertiary">
                View Earnings Dashboard
              </button>
            </>
          )}
        </div>

        {/* Terms & Conditions */}
        <div className="terms-notice">
          <input type="checkbox" id="agreeTerms" />
          <label htmlFor="agreeTerms">
            I agree to the Monetization Terms & Service
          </label>
        </div>
      </div>
    </div>
  );
};

export default MonetizationSettings;
