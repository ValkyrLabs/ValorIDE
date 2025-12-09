import React, { useState } from "react";
import { Badge, Spinner, Modal } from "react-bootstrap";
import { FaCreditCard, FaDollarSign } from "react-icons/fa";
import { useGetAccountBalanceQuery } from "../../services/creditsApi";
import LoadingSpinner from "../LoadingSpinner";
import { Principal } from "@thor/model";
import { useAccessControl } from "../../utils/accessControl";
import HelpTooltip from "../HelpTooltip";
import BuyCredits from "../BuyCredits";

interface CurrentBalanceProps {
  principalOverride?: Principal | string | null;
  style?: React.CSSProperties;
  className?: string;
}

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
  } = useGetAccountBalanceQuery(accountId);

  // Get current balance from the account
  const currentBalance = accountBalance?.currentBalance || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 10) {
      return "#06ffa5";
    } // Green
    if (balance > 5) {
      return "#ffd700";
    } // Yellow
    return "#ff6300"; // Orange/Red
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
        <Badge bg="info" style={{ fontSize: "0.9rem" }}>
          <FaDollarSign className="me-1" />
          Error
        </Badge>
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
        title="Click to buy credits"
      >
        <Badge
          className="d-flex align-items-center"
          style={{
            backgroundColor: `${getBalanceColor(currentBalance)}20`,
            color: getBalanceColor(currentBalance),
          }}
        >
          <FaCreditCard className="me-1" />
          <h3 className="mb-0">{formatCurrency(currentBalance)}</h3>
        </Badge>
        <HelpTooltip topic="credits" size="sm" />
      </div>

      {/* Buy Credits Modal */}
      <Modal
        show={showBuyCredits}
        onHide={() => setShowBuyCredits(false)}
        centered
        size="lg"
        contentClassName="bg-dark border border-info"
      >
        <Modal.Header
          closeButton
          closeVariant="white"
          style={{
            background: "linear-gradient(135deg, #06ffa515, #06ffa505)",
            borderBottom: "1px solid #06ffa530",
          }}
        >
          <Modal.Title style={{ color: "#06ffa5" }}>
            <FaCreditCard className="me-2" />
            Buy Credits
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: "rgba(8, 10, 14, 0.95)" }}>
          <BuyCredits
            authenticatedPrincipal={resolvedPrincipal}
            onPurchaseSuccess={() => setShowBuyCredits(false)}
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default CurrentBalance;
