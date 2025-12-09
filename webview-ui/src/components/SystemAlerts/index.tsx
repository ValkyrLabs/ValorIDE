import React, { useState, useEffect, useMemo } from "react";
import { Alert, Modal } from "react-bootstrap";
import {
  FaExclamationTriangle,
  FaSadTear,
  FaDollarSign,
  FaTimes,
  FaCreditCard,
} from "react-icons/fa";
import { useExtensionState } from "@/context/ExtensionStateContext";
import {
  useGetAccountBalanceQuery,
  isInsufficientFunds,
} from "@/services/creditsApi";
import { getApiMetrics } from "@shared/getApiMetrics";
import BuyCredits from "@/components/BuyCredits";

interface SystemAlert {
  id: string;
  type: "budget" | "blocker";
  severity: "warning" | "danger";
  title: string;
  message: string;
  timestamp: number;
  dismissed?: boolean;
}

const SystemAlerts: React.FC = () => {
  const {
    valorideMessages,
    jwtToken,
    advancedSettings,
    authenticatedUser,
    userInfo,
  } = useExtensionState() as any;
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);

  const accountId = useMemo(() => {
    const rawId = authenticatedUser?.id ?? userInfo?.id;
    if (rawId === null || rawId === undefined) {
      return "";
    }
    try {
      return String(rawId).trim();
    } catch {
      return "";
    }
  }, [authenticatedUser?.id, userInfo?.id]);

  const shouldFetchBalance = Boolean(jwtToken && accountId);

  // Get balance data for budget alerts using the new creditsApi
  const { data: balanceData } = useGetAccountBalanceQuery(accountId, {
    skip: !shouldFetchBalance,
  });

  // Calculate current API metrics
  const apiMetrics = useMemo(
    () => getApiMetrics(valorideMessages || []),
    [valorideMessages],
  );

  const budgetAlerts = useMemo(
    () =>
      advancedSettings?.budgetAlerts || {
        depletedThreshold: 0,
        criticalThreshold: 1,
        lowThreshold: 5,
        alertThreshold: 10,
      },
    [advancedSettings?.budgetAlerts],
  );

  // Calculate effective balance using the new creditsApi AccountBalance
  const effectiveBalance = useMemo(() => {
    const rawBalance = balanceData?.currentBalance ?? 0;
    return Math.max(0, rawBalance - (apiMetrics.totalCost || 0));
  }, [balanceData, apiMetrics.totalCost]);

  // Check for budget alerts
  useEffect(() => {
    if (!jwtToken || effectiveBalance === undefined) return;

    const budgetThresholds = [
      {
        threshold: budgetAlerts.depletedThreshold,
        severity: "danger" as const,
        title: "Budget Depleted",
      },
      {
        threshold: budgetAlerts.criticalThreshold,
        severity: "danger" as const,
        title: "Critical Budget Alert",
      },
      {
        threshold: budgetAlerts.lowThreshold,
        severity: "warning" as const,
        title: "Low Budget Warning",
      },
      {
        threshold: budgetAlerts.alertThreshold,
        severity: "warning" as const,
        title: "Budget Alert",
      },
    ].sort((a, b) => a.threshold - b.threshold);

    for (const { threshold, severity, title } of budgetThresholds) {
      if (effectiveBalance <= threshold) {
        const alertId = `budget-${threshold}`;
        if (!dismissedAlerts.has(alertId)) {
          const newAlert: SystemAlert = {
            id: alertId,
            type: "budget",
            severity,
            title,
            message:
              effectiveBalance <= 0
                ? "Your account balance has been depleted. Buy credits to continue using ValorIDE services."
                : `Your account balance is low ($${effectiveBalance.toFixed(2)}). Consider adding credits to avoid service interruption.`,
            timestamp: Date.now(),
          };

          setAlerts((prev) => {
            const existing = prev.find((a) => a.id === alertId);
            if (!existing) {
              return [...prev, newAlert];
            }
            return prev;
          });
        }
        break; // Only show the most severe alert
      }
    }
  }, [budgetAlerts, effectiveBalance, jwtToken, dismissedAlerts]);

  // Check for blocker alerts (error states)
  useEffect(() => {
    if (!valorideMessages?.length) return;

    const lastMessage = valorideMessages[valorideMessages.length - 1];

    // Check for insufficient funds errors
    if (lastMessage?.type === "ask" && lastMessage.ask === "api_req_failed") {
      const errorText = lastMessage.text || "";
      if (
        isInsufficientFunds({ status: 402, data: { message: errorText } }) ||
        errorText.toLowerCase().includes("insufficient") ||
        errorText.toLowerCase().includes("credit") ||
        errorText.toLowerCase().includes("balance")
      ) {
        const alertId = `blocker-insufficient-funds-${lastMessage.ts}`;
        if (!dismissedAlerts.has(alertId)) {
          const newAlert: SystemAlert = {
            id: alertId,
            type: "budget",
            severity: "danger",
            title: "Insufficient Credits",
            message:
              "You don't have enough credits to complete this request. Please add credits to continue.",
            timestamp: Date.now(),
          };

          setAlerts((prev) => {
            const existing = prev.find((a) => a.id === alertId);
            if (!existing) {
              return [...prev, newAlert];
            }
            return prev;
          });

          // Auto-open buy credits modal for insufficient funds
          setShowBuyCreditsModal(true);
          return;
        }
      }
    }

    // Check for API failures or error states
    if (lastMessage?.type === "ask" && lastMessage.ask === "api_req_failed") {
      const alertId = `blocker-api-failed-${lastMessage.ts}`;
      if (!dismissedAlerts.has(alertId)) {
        const newAlert: SystemAlert = {
          id: alertId,
          type: "blocker",
          severity: "danger",
          title: "API Request Failed",
          message:
            "ValorIDE encountered an error processing your request. This may be due to network issues or service limitations.",
          timestamp: Date.now(),
        };

        setAlerts((prev) => {
          const existing = prev.find((a) => a.id === alertId);
          if (!existing) {
            return [...prev, newAlert];
          }
          return prev;
        });
      }
    }

    // Check for mistake limit reached
    if (
      lastMessage?.type === "ask" &&
      lastMessage.ask === "mistake_limit_reached"
    ) {
      const alertId = `blocker-mistakes-${lastMessage.ts}`;
      if (!dismissedAlerts.has(alertId)) {
        const newAlert: SystemAlert = {
          id: alertId,
          type: "blocker",
          severity: "warning",
          title: "Mistake Limit Reached",
          message:
            "ValorIDE has made several correction attempts. Please review the task or provide additional guidance.",
          timestamp: Date.now(),
        };

        setAlerts((prev) => {
          const existing = prev.find((a) => a.id === alertId);
          if (!existing) {
            return [...prev, newAlert];
          }
          return prev;
        });
      }
    }
  }, [valorideMessages, dismissedAlerts]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...Array.from(prev), alertId]));
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const handlePurchaseSuccess = (amount: number) => {
    setShowBuyCreditsModal(false);
    // Dismiss budget alerts after successful purchase
    setDismissedAlerts((prev) => {
      const newSet = new Set(Array.from(prev));
      alerts
        .filter((a) => a.type === "budget")
        .forEach((a) => newSet.add(a.id));
      return newSet;
    });
    setAlerts((prev) => prev.filter((a) => a.type !== "budget"));
  };

  const activeAlerts = alerts.filter((alert) => !dismissedAlerts.has(alert.id));

  const shouldShowBuyCreditsModal =
    showBuyCreditsModal &&
    typeof balanceData?.currentBalance === "number" &&
    balanceData.currentBalance <= budgetAlerts.criticalThreshold;

  if (activeAlerts.length === 0 && !shouldShowBuyCreditsModal) return null;

  return (
    <>
      <div
        style={{
          backgroundColor: "white",
          /*position: 'fixed',
        top: '10px',
        right: '10px',*/
          zIndex: 9999,
          maxWidth: "350px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {activeAlerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={alert.severity === "danger" ? "danger" : "warning"}
            /* hate the style, try bare*/
            style={{
              margin: 0,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              border: `1px solid var(--vscode-${alert.severity === "danger" ? "errorForeground" : "warningForeground"})`,
              backgroundColor: "white",
              color: `var(--vscode-${alert.severity === "danger" ? "errorForeground" : "warningForeground"})`,
              fontSize: "14px",
              borderRadius: "6px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}
            >
              <div style={{ marginTop: "2px" }}>
                {alert.type === "budget" ? (
                  <FaDollarSign size={16} />
                ) : (
                  <FaSadTear size={16} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                  {alert.title}
                </div>
                <div style={{ fontSize: "13px", lineHeight: "1.4" }}>
                  {alert.message}
                </div>
                {alert.type === "budget" && (
                  <button
                    onClick={() => setShowBuyCreditsModal(true)}
                    style={{
                      marginTop: "8px",
                      padding: "6px 14px",
                      backgroundColor: "#06ffa5",
                      color: "#000",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 8px rgba(6, 255, 165, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(6, 255, 165, 0.4)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(6, 255, 165, 0.2)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <FaCreditCard size={12} />
                    Buy Credits
                  </button>
                )}
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "2px",
                  borderRadius: "4px",
                  opacity: 0.7,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "0.7";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <FaTimes size={18} />
              </button>
            </div>
          </Alert>
        ))}
      </div>

      {/* Buy Credits Modal */}
      <Modal
        show={shouldShowBuyCreditsModal}
        onHide={() => setShowBuyCreditsModal(false)}
        centered
        size="sm"
      >
        <Modal.Header
          closeButton
          style={{ borderBottom: "1px solid #06ffa530" }}
        >
          <Modal.Title style={{ color: "#06ffa5", fontSize: "18px" }}>
            <FaCreditCard className="me-2" />
            Add Credits
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: 0 }}>
          <BuyCredits
            authenticatedPrincipal={authenticatedUser}
            onPurchaseSuccess={handlePurchaseSuccess}
            style={{ border: "none", boxShadow: "none" }}
          />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default SystemAlerts;
