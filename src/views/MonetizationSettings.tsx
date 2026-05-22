import React, { useState, useEffect } from "react";
import {
  ManagedMcpService,
  PricingModel,
  enableMonetization,
  updatePricing,
} from "@thorapi/services/monetization/ServiceMonetizationService";
import "./MonetizationSettings.css";

export const MONETIZATION_PRICING_UPDATED_EVENT =
  "valoride:monetization-pricing-updated";

interface MonetizationSettingsProps {
  applicationId: string;
  serviceId?: string;
  service?: ManagedMcpService;
  onSuccess?: (service: ManagedMcpService) => void;
  onError?: (error: Error) => void;
}

function validatePrice(costPerCall: number): string | null {
  if (!Number.isFinite(costPerCall) || costPerCall < 0.1) {
    return "Enter a valid price of at least 0.1 credits before saving.";
  }

  return null;
}

function notifyPricingUpdated(service: ManagedMcpService) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(MONETIZATION_PRICING_UPDATED_EVENT, {
      detail: {
        service,
        audit: {
          action: "creator_pricing_updated",
          serviceId: service.id,
          applicationId: service.applicationId,
          pricingModel: service.pricingModel,
          costPerCall: service.costPerCall,
          recordedAt: new Date().toISOString(),
        },
      },
    }),
  );
}

/**
 * Component to enable and configure monetization on MCP services.
 * Only accessible to RESELLER and PRO/ENTERPRISE users.
 */
export const MonetizationSettings: React.FC<MonetizationSettingsProps> = ({
  applicationId,
  serviceId,
  service,
  onSuccess,
  onError,
}) => {
  const [resolvedServiceId, setResolvedServiceId] = useState(
    service?.id ?? serviceId ?? "",
  );
  const [isMonetized, setIsMonetized] = useState(
    service?.isMonetized ?? false,
  );
  const [pricingModel, setPricingModel] = useState<PricingModel>(
    service?.pricingModel ?? "PER_CALL",
  );
  const [costPerCall, setCostPerCall] = useState(service?.costPerCall ?? 5.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setResolvedServiceId(service?.id ?? serviceId ?? "");
    setIsMonetized(service?.isMonetized ?? Boolean(serviceId));
    setPricingModel(service?.pricingModel ?? "PER_CALL");
    setCostPerCall(service?.costPerCall ?? 5.0);
  }, [service, serviceId, applicationId]);

  const handleSaveError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : fallback;
    setSuccess(false);
    setError(message);
    onError?.(err instanceof Error ? err : new Error(message));
  };

  const completeSuccessfulSave = (result: ManagedMcpService) => {
    setResolvedServiceId(result.id);
    setIsMonetized(result.isMonetized ?? true);
    setPricingModel(result.pricingModel ?? pricingModel);
    setCostPerCall(result.costPerCall ?? costPerCall);
    setSuccess(true);
    onSuccess?.(result);
    notifyPricingUpdated(result);

    // Auto-hide success message after 3s
    setTimeout(() => setSuccess(false), 3000);
  };

  const handleEnableMonetization = async () => {
    const validationError = validatePrice(costPerCall);
    if (validationError) {
      setError(validationError);
      setSuccess(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await enableMonetization(
        applicationId,
        pricingModel,
        costPerCall,
      );
      completeSuccessfulSave(result);
    } catch (err) {
      handleSaveError(err, "Failed to enable monetization");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricing = async () => {
    const validationError = validatePrice(costPerCall);
    if (validationError) {
      setError(validationError);
      setSuccess(false);
      return;
    }

    if (!resolvedServiceId) {
      setError(
        "Select a published MCP service before updating pricing. No service ID was provided.",
      );
      setSuccess(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updatePricing(
        resolvedServiceId,
        pricingModel,
        costPerCall,
      );
      completeSuccessfulSave(result);
    } catch (err) {
      handleSaveError(
        err,
        "Pricing was not saved. Check your permissions and try again.",
      );
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
        <div className="success-banner">
          ✓ Pricing persisted. Marketplace and earnings views can refresh now.
        </div>
      )}

      <div className="settings-form">
        {/* Pricing Model Selection */}
        <div className="form-group">
          <label>Pricing Model</label>
          <div className="radio-group">
            {(["PER_CALL", "PER_MONTH", "TIERED"] as PricingModel[]).map(
              (model) => (
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
              ),
            )}
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

        {isMonetized && (
          <div className="revenue-breakdown">
            <h4>Next best actions</h4>
            <p className="breakdown-note">
              Publish paid service, preview buyer card, then share listing once
              the saved price appears in marketplace refreshes.
            </p>
          </div>
        )}

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
          <input type="checkbox" id="agreeTerms" disabled={loading} />
          <label htmlFor="agreeTerms">
            I agree to the Monetization Terms & Service
          </label>
        </div>
      </div>
    </div>
  );
};

export default MonetizationSettings;
