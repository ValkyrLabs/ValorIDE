import React, { useState, useEffect, useMemo } from "react";
import { Alert, Modal } from "react-bootstrap";
import {
  FaExclamationTriangle,
  FaSadTear,
  FaDollarSign,
  FaTimes,
  FaCreditCard,
} from "react-icons/fa";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import {
  useGetAccountBalanceQuery,
  isInsufficientFunds,
} from "@thorapi/services/creditsApi";
import { getApiMetrics } from "@shared/getApiMetrics";
import BuyCredits from "@thorapi/components/BuyCredits";
import { vscode } from "@thorapi/utils/vscode";
import CoolButton from "../CoolButton";
import { CREDIT_INTENT_EVENT, CreditIntent } from "@thorapi/types/creditIntent";
import { useDispatch, useSelector } from "react-redux";
import {
  clearAccountBalancePrompt,
  clearCreditIntent,
  clearLastError,
} from "../../redux/slices/apiErrorsSlice";
type AlertSeverity = "warning" | "danger" | "info" | "neutral";

interface SystemAlert {
  id: string;
  type: "budget" | "blocker";
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  dismissed?: boolean;
}

const firstFiniteNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string" && value.trim()
          ? Number(value)
          : Number.NaN;
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return undefined;
};

const stripTags = (value: string): string =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const decodeHtmlEntities = (value: string): string => {
  if (typeof document === "undefined") {
    return value;
  }
  const textArea = document.createElement("textarea");
  textArea.innerHTML = value;
  return textArea.value;
};

const cleanApiErrorMessage = (
  message: string | undefined,
  endpointName?: string,
): string => {
  const raw = typeof message === "string" ? message.trim() : "";
  if (!raw) {
    return "ValorIDE encountered an error processing your request.";
  }

  const endpointSuffix = endpointName ? ` (${endpointName})` : "";
  const withoutEndpoint =
    endpointSuffix && raw.endsWith(endpointSuffix)
      ? raw.slice(0, -endpointSuffix.length).trim()
      : raw;
  const looksLikeHtml =
    /<!doctype\s+html/i.test(withoutEndpoint) ||
    /<\/?(html|head|body|title|h1|p)\b/i.test(withoutEndpoint);

  if (!looksLikeHtml) {
    return decodeHtmlEntities(raw);
  }

  const scrubbed = withoutEndpoint
    .replace(/<!doctype[^>]*>/gi, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
  const pieces = ["title", "h1", "p"]
    .map((tag) => {
      const match = scrubbed.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
      return match ? decodeHtmlEntities(stripTags(match[1])) : "";
    })
    .filter(Boolean);
  const uniquePieces = pieces.filter(
    (piece, index) =>
      pieces.findIndex((candidate) => candidate.toLowerCase() === piece.toLowerCase()) ===
      index,
  );

  if (uniquePieces.length > 0) {
    return uniquePieces.join(" — ");
  }

  const stripped = decodeHtmlEntities(stripTags(scrubbed));
  return stripped || "ValorIDE encountered an HTML error response.";
};

const SystemAlerts: React.FC = () => {
  const dispatch = useDispatch();
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
  const apiErrors = useSelector((state: any) => state?.apiErrors);
  const creditLabel = (value: number) => {
    const rounded = Math.max(0, Math.round(value));
    return `${rounded.toLocaleString()} ${rounded === 1 ? "credit" : "credits"}`;
  };

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
  const {
    data: balanceData,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
    isSuccess: didLoadBalance,
  } = useGetAccountBalanceQuery(accountId, {
    skip: !shouldFetchBalance,
  });
  const hasValidatedBalance = Boolean(
    shouldFetchBalance &&
      didLoadBalance &&
      !isBalanceLoading &&
      !isBalanceFetching &&
      typeof balanceData?.currentBalance === "number",
  );

  // Calculate current API metrics
  const apiMetrics = useMemo(
    () => getApiMetrics(valorideMessages || []),
    [valorideMessages],
  );

  const activeInsufficientFundsMessage = useMemo(() => {
    if (!valorideMessages?.length) {
      return false;
    }

    const lastMessage = valorideMessages[valorideMessages.length - 1];
    if (lastMessage?.type !== "ask" || lastMessage.ask !== "api_req_failed") {
      return false;
    }

    const errorText = lastMessage.text || "";
    return (
      isInsufficientFunds({ status: 402, data: { message: errorText } }) ||
      errorText.toLowerCase().includes("insufficient") ||
      errorText.toLowerCase().includes("credit") ||
      errorText.toLowerCase().includes("balance")
    );
  }, [valorideMessages]);

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
    if (!hasValidatedBalance) {
      return undefined;
    }
    const rawBalance = balanceData?.currentBalance ?? 0;
    return Math.max(0, rawBalance - (apiMetrics.totalCost || 0));
  }, [apiMetrics.totalCost, balanceData?.currentBalance, hasValidatedBalance]);

  // Check for budget alerts
  useEffect(() => {
    if (
      !jwtToken ||
      effectiveBalance === undefined ||
      !hasValidatedBalance ||
      activeInsufficientFundsMessage
    ) {
      return;
    }

    const budgetThresholds = [
      {
        threshold: budgetAlerts.depletedThreshold,
        severity: "neutral" as const,
        title: "Credits need a top-up",
      },
      {
        threshold: budgetAlerts.criticalThreshold,
        severity: "danger" as const,
        title: "Critical Budget Alert",
      },
      {
        threshold: budgetAlerts.lowThreshold,
        severity: "info" as const,
        title: "Low Balance",
      },
      {
        threshold: budgetAlerts.alertThreshold,
        severity: "info" as const,
        title: "Heads up",
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
                ? "You are out of credits for now. Add credits when you are ready to keep using ValorIDE services."
                : `Your credits are getting low (${creditLabel(effectiveBalance)}). Add credits soon for uninterrupted access.`,
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
  }, [
    budgetAlerts,
    effectiveBalance,
    hasValidatedBalance,
    jwtToken,
    dismissedAlerts,
    activeInsufficientFundsMessage,
  ]);

  // Check for API errors from RTK Query
  useEffect(() => {
    const apiError = apiErrors?.lastError;
    if (!apiError) return;

    const alertId = `api-${apiError.id}`;
    if (dismissedAlerts.has(alertId)) return;

    const isInsufficientCredits =
      apiError?.data?.error === "INSUFFICIENT_CREDITS" ||
      apiError?.data?.error === "INSUFFICIENT_FUNDS";
    const apiRequiredCredits =
      firstFiniteNumber(
        apiErrors?.creditIntent?.requiredCredits,
        apiError?.data?.requiredCredits,
        apiError?.data?.requiredBalance,
      ) ?? 1;

    if (
      isInsufficientCredits &&
      (!hasValidatedBalance ||
        effectiveBalance === undefined ||
        effectiveBalance >= apiRequiredCredits)
    ) {
      return;
    }

    let errorTitle = "API Error";
    if (isInsufficientCredits) {
      errorTitle = "Insufficient Credits";
    } else if (apiError.endpointName) {
      errorTitle = `API Error — ${apiError.endpointName}`;
    }

    const newAlert: SystemAlert = {
      id: alertId,
      type: "blocker",
      severity: "danger",
      title: errorTitle,
      message: isInsufficientCredits
        ? "You don't have enough credits to complete this request. Please add credits to continue."
        : cleanApiErrorMessage(apiError.message, apiError.endpointName),
      timestamp: Date.now(),
    };

    setAlerts((prev) => {
      const existing = prev.find((a) => a.id === alertId);
      if (!existing) {
        return [...prev, newAlert];
      }
      return prev;
    });
  }, [
    apiErrors?.creditIntent?.requiredCredits,
    apiErrors?.lastError,
    dismissedAlerts,
    effectiveBalance,
    hasValidatedBalance,
  ]);

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
          const requiredCredits = Math.max(1, Math.ceil((apiMetrics.totalCost || 0) + 1));
          if (
            !hasValidatedBalance ||
            effectiveBalance === undefined ||
            effectiveBalance >= requiredCredits
          ) {
            return;
          }
          const intent: CreditIntent = {
            actionName: "Continue current request",
            requiredCredits,
            currentBalance: balanceData?.currentBalance ?? 0,
            originView: "chat",
            resumeLabel: "Return to chat",
            messageTs: Number(lastMessage.ts || Date.now()),
          };

          window.dispatchEvent(
            new CustomEvent(CREDIT_INTENT_EVENT, {
              detail: intent,
            }),
          );

          const newAlert: SystemAlert = {
            id: alertId,
            type: "budget",
            severity: "neutral",
            title: "Credits need a top-up",
            message:
              "This request needs more credits. Add credits when you are ready, then return to continue.",
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
  }, [
    valorideMessages,
    dismissedAlerts,
    apiMetrics.totalCost,
    balanceData?.currentBalance,
    effectiveBalance,
    hasValidatedBalance,
  ]);

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set([...Array.from(prev), alertId]));
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
    if (alertId.startsWith("api-")) {
      dispatch(clearLastError());
    }
    if (
      alertId.startsWith("budget-") ||
      alertId.startsWith("blocker-insufficient-funds-")
    ) {
      dispatch(clearAccountBalancePrompt());
      dispatch(clearCreditIntent());
      setShowBuyCreditsModal(false);
    }
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
    hasValidatedBalance &&
    typeof balanceData?.currentBalance === "number" &&
    balanceData.currentBalance <
      (apiErrors?.creditIntent?.requiredCredits ??
        budgetAlerts.criticalThreshold);

  const hasVisibleAlerts = activeAlerts.length > 0 || shouldShowBuyCreditsModal;
  if (!hasVisibleAlerts) return null;

  const alertBg = (severity: AlertSeverity) => {
    switch (severity) {
      case "danger":
        return "var(--vscode-inputValidation-errorBackground, #5a1d1d)";
      case "info":
        return "var(--vscode-inputValidation-infoBackground, #1e3a5f)";
      case "neutral":
        return "var(--vscode-editorWidget-background, #2b2b2b)";
      default:
        return "var(--vscode-inputValidation-warningBackground, #352a05)";
    }
  };
  const alertFg = (severity: AlertSeverity) => {
    switch (severity) {
      case "danger":
        return "var(--vscode-inputValidation-errorForeground, #f48771)";
      case "info":
        return "var(--vscode-notificationsInfoIcon-foreground, #75beff)";
      case "neutral":
        return "var(--vscode-foreground, #d4d4d4)";
      default:
        return "var(--vscode-inputValidation-warningForeground, #cca700)";
    }
  };
  const alertBorder = (severity: AlertSeverity) => {
    switch (severity) {
      case "danger":
        return "1px solid var(--vscode-inputValidation-errorBorder, #f48771)";
      case "info":
        return "1px solid var(--vscode-notificationsInfoIcon-foreground, #3794ff)";
      case "neutral":
        return "1px solid var(--vscode-panel-border, #5f5f5f)";
      default:
        return "1px solid var(--vscode-inputValidation-warningBorder, #cca700)";
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 48,
          left: 12,
          right: 12,
          zIndex: 9999,
          width: "auto",
          maxWidth: "none",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          pointerEvents: "auto",
        }}
      >
        {activeAlerts.map((alert) => (
          <Alert
            key={alert.id}
            variant={
              alert.severity === "danger"
                ? "danger"
                : alert.severity === "info"
                  ? "info"
                  : alert.severity === "neutral"
                    ? "secondary"
                    : "warning"
            }
            style={{
              margin: 0,
              boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
              border: alertBorder(alert.severity),
              backgroundColor: alertBg(alert.severity),
              color: alertFg(alert.severity),
              fontSize: "13px",
              borderRadius: "6px",
              padding: alert.type === "budget" ? "16px 18px" : "18px 20px",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}
            >
              <div style={{ marginTop: "2px", flex: "0 0 auto" }}>
                {alert.type === "budget" ? (
                  alert.severity === "neutral" ? (
                    <FaCreditCard size={16} />
                  ) : alert.severity === "info" ? (
                    <FaExclamationTriangle size={16} />
                  ) : (
                    <FaDollarSign size={16} />
                  )
                ) : (
                  <FaSadTear size={16} />
                )}
              </div>
              <div style={{ flex: 1, paddingRight: "12px" }}>
                <div style={{ fontWeight: 600, marginBottom: "6px" }}>
                  {alert.title}
                </div>
                <div style={{ fontSize: "13px", lineHeight: "1.55" }}>
                  {alert.message}
                </div>
                {alert.type === "budget" && (
                  <CoolButton
                    onClick={() => {
                      // Use VSCode wrapper; fall back to opening a new tab in browser
                      vscode.postMessage({
                        type: "openInBrowser",
                        url: "https://valkyrlabs.com/buy-credits",
                      });

                      // If there's no VS Code webview API (dev server / browser), open in a new tab
                      if (
                        typeof (window as any)?.acquireVsCodeApi !== "function"
                      ) {
                        window.open(
                          "https://valkyrlabs.com/buy-credits",
                          "_blank",
                        );
                      }
                    }}
                    style={{
                      marginTop: "12px",
                      padding: "9px 14px",
                      width: "100%",
                      backgroundColor: "#0f5132",
                      color: "#fff",
                      border: "1px solid #198754",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.2s ease",
                      boxShadow: "0 2px 8px rgba(15, 81, 50, 0.25)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(15, 81, 50, 0.45)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 2px 8px rgba(15, 81, 50, 0.25)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <FaCreditCard size={12} />
                    Buy Credits
                  </CoolButton>
                )}
              </div>
              <CoolButton
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
              </CoolButton>
            </div>
          </Alert>
        ))}
      </div>

      {/* Buy Credits Modal */}
      <Modal
        show={shouldShowBuyCreditsModal}
        onHide={() => setShowBuyCreditsModal(false)}
        centered
        fullscreen
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
