import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useState } from "react";
import { Badge, Modal } from "react-bootstrap";
import { FaCreditCard, FaDollarSign } from "react-icons/fa";
import { useGetAccountBalanceQuery } from "../../services/creditsApi";
import LoadingSpinner from "../LoadingSpinner";
import { useAccessControl } from "../../utils/accessControl";
import HelpTooltip from "../HelpTooltip";
import BuyCredits from "../BuyCredits";
const CurrentBalance = ({ principalOverride, style, className = "" }) => {
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
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };
  const getBalanceColor = (balance) => {
    if (balance > 10) {
      return "#06ffa5";
    } // Green
    if (balance > 5) {
      return "#ffd700";
    } // Yellow
    return "#ff6300"; // Orange/Red
  };
  if (isLoading) {
    return _jsx("div", {
      className: `d-flex align-items-center ${className}`,
      style: style,
      children: _jsx(LoadingSpinner, { size: "sm" }),
    });
  }
  if (error) {
    return _jsxs("div", {
      className: `d-flex align-items-center gap-1 ${className}`,
      style: style,
      children: [
        _jsxs(Badge, {
          bg: "info",
          style: { fontSize: "0.9rem" },
          children: [_jsx(FaDollarSign, { className: "me-1" }), "Error"],
        }),
        _jsx(HelpTooltip, { topic: "credits", size: "sm" }),
      ],
    });
  }
  return _jsxs(_Fragment, {
    children: [
      _jsxs("div", {
        className: `d-flex align-items-center gap-1 ${className}`,
        style: { ...style, cursor: "pointer" },
        onClick: () => setShowBuyCredits(true),
        title: "Click to buy credits",
        children: [
          _jsxs(Badge, {
            className: "d-flex align-items-center",
            style: {
              backgroundColor: `${getBalanceColor(currentBalance)}20`,
              color: getBalanceColor(currentBalance),
            },
            children: [
              _jsx(FaCreditCard, { className: "me-1" }),
              _jsx("h3", {
                className: "mb-0",
                children: formatCurrency(currentBalance),
              }),
            ],
          }),
          _jsx(HelpTooltip, { topic: "credits", size: "sm" }),
        ],
      }),
      _jsxs(Modal, {
        show: showBuyCredits,
        onHide: () => setShowBuyCredits(false),
        centered: true,
        size: "lg",
        contentClassName: "bg-dark border border-info",
        children: [
          _jsx(Modal.Header, {
            closeButton: true,
            closeVariant: "white",
            style: {
              background: "linear-gradient(135deg, #06ffa515, #06ffa505)",
              borderBottom: "1px solid #06ffa530",
            },
            children: _jsxs(Modal.Title, {
              style: { color: "#06ffa5" },
              children: [
                _jsx(FaCreditCard, { className: "me-2" }),
                "Buy Credits",
              ],
            }),
          }),
          _jsx(Modal.Body, {
            style: { background: "rgba(8, 10, 14, 0.95)" },
            children: _jsx(BuyCredits, {
              authenticatedPrincipal: resolvedPrincipal,
              onPurchaseSuccess: () => setShowBuyCredits(false),
            }),
          }),
        ],
      }),
    ],
  });
};
export default CurrentBalance;
//# sourceMappingURL=index.js.map
