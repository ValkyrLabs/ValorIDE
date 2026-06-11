import React, { useState } from "react";
import { FaCreditCard, FaDollarSign } from "react-icons/fa";
import { useGetAccountBalanceQuery } from "../../services/creditsApi";
import LoadingSpinner from "../LoadingSpinner";
import { Principal } from "@thorapi/model";
import { useAccessControl } from "../../utils/accessControl";
import HelpTooltip from "../HelpTooltip";
import BuyCredits from "../BuyCredits";

interface CurrentBalanceProps {
  principalOverride?: Principal | string | null;
  style?: React.CSSProperties;
  className?: string;
}

type BalanceGuidance = {
  status: "ready" | "watch" | "low" | "depleted";
  label: string;
  detail: string;
  actionLabel: string;
  color: string;
};

export const getCreditBalanceGuidance = (
  balance: number,
): BalanceGuidance => {
  if (balance <= 0) {
    return {
      status: "depleted",
      label: "Credits depleted",
      detail: "Add credits to continue premium agents and generated app runs.",
      actionLabel: "Buy credits",
      color: "#ff4d4f",
    };
  }

  if (balance < 5) {
    const needed = Math.max(0, 5 - balance);
    return {
      status: "low",
      label: "Low credits",
      detail: `${needed.toFixed(2)} credits restores the starter safety buffer.`,
      actionLabel: "Top up",
      color: "#ff9f1c",
    };
  }

  if (balance < 15) {
    return {
      status: "watch",
      label: "Plan ahead",
      detail: "Enough for light usage; top up before larger agent workflows.",
      actionLabel: "Add credits",
      color: "#ffd700",
    };
  }

  return {
    status: "ready",
    label: "Credit ready",
    detail: "Balance is ready for typical ValorIDE agent work.",
    actionLabel: "Add credits",
    color: "#06ffa5",
  };
};

const CurrentBalance: React.FC<CurrentBalanceProps> = ({
  principalOverride,
  style,
  className = "",
}) => {
  const { principal: resolvedPrincipal } = useAccessControl(principalOverride);
  const [showBuyCredits, setShowBuyCredits] = useState(false);

  // Must check for principal before calling hooks
  const principalId = resolvedPrincipal?.id;
  if (!principalId) {
    return null;
  }

  // Convert to string if needed - creditsApi expects string accountId
  const accountId =
    typeof principalId === "string" ? principalId : String(principalId);

  // Query balance data from creditsApi - participates in RTK cache invalidation
  const {
    data: accountBalance,
    isLoading,
    error,
    refetch,
  } = useGetAccountBalanceQuery(accountId);

  // Get current balance from the account
  const currentBalance = accountBalance?.currentBalance || 0;
  const balanceGuidance = getCreditBalanceGuidance(currentBalance);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className={`d-flex align-items-center ${className}`} style={style}>
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`d-flex align-items-center gap-1 ${className}`}
        style={style}
      >
        <span className="badge bg-info" style={{ fontSize: "0.9rem" }}>
          <FaDollarSign className="me-1" />
          Balance unavailable
        </span>
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          onClick={() => refetch?.()}
          aria-label="Retry credit balance"
        >
          Retry
        </button>
        <HelpTooltip topic="credits" size="sm" />
      </div>
    );
  }

  return (
    <>
      <div
        className={`d-flex align-items-center gap-1 ${className}`}
        style={{ ...style, cursor: "pointer" }}
        onClick={() => setShowBuyCredits(true)}
        title={`${balanceGuidance.label}: ${balanceGuidance.detail}`}
        aria-label={`${balanceGuidance.label}. ${balanceGuidance.detail}`}
      >
        <span
          className="badge d-flex align-items-center"
          style={{
            backgroundColor: `${balanceGuidance.color}20`,
            color: balanceGuidance.color,
          }}
        >
          <FaCreditCard className="me-1" />
          <h3 className="mb-0">{formatCurrency(currentBalance)}</h3>
        </span>
        <div className="d-flex flex-column lh-sm">
          <span style={{ color: balanceGuidance.color, fontWeight: 700 }}>
            {balanceGuidance.label}
          </span>
          <small className="text-muted">{balanceGuidance.detail}</small>
        </div>
        <button
          type="button"
          className={`btn btn-sm ${
            balanceGuidance.status === "ready"
              ? "btn-outline-info"
              : "btn-outline-warning"
          }`}
          onClick={(event) => {
            event.stopPropagation();
            setShowBuyCredits(true);
          }}
        >
          {balanceGuidance.actionLabel}
        </button>
        <HelpTooltip topic="credits" size="sm" />
      </div>

      {showBuyCredits && (
        <section className="bg-dark border border-info">
          <div
            style={{
              background: "linear-gradient(135deg, #06ffa515, #06ffa505)",
              borderBottom: "1px solid #06ffa530",
            }}
          >
            <h2 className="h6 mb-0">
              <FaCreditCard />
              Buy Credits
            </h2>
          </div>
          <div style={{ background: "rgba(8, 10, 14, 0.95)" }}>
            <BuyCredits
              authenticatedPrincipal={resolvedPrincipal}
              onPurchaseSuccess={() => setShowBuyCredits(false)}
            />
          </div>
        </section>
      )}
    </>
  );
};

export default CurrentBalance;
