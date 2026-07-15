import React, { useState } from "react";
import { Card, Form, InputGroup, Button, Alert } from "react-bootstrap";
import { FaCreditCard, FaShoppingCart, FaDollarSign } from "react-icons/fa";
import CoolButton from "@valkyr/component-library/CoolButton";
import {
  buildValorIdeCheckoutUrls,
  buildValorIdeCreditCartOrder,
  getCheckoutUrl,
  normalizeCreditCheckoutDollars,
  VALORIDE_CREDIT_PACKAGE,
  useCreateCartOrderMutation,
  useCreateCheckoutSessionMutation,
  useLazyGetAccountBalanceQuery,
} from "../../services/creditsApi";

interface BuyCreditsProps {
  authenticatedPrincipal?: any;
  onPurchaseSuccess?: (amount: number) => void;
  style?: React.CSSProperties;
  className?: string;
}

const BuyCredits: React.FC<BuyCreditsProps> = ({
  authenticatedPrincipal,
  onPurchaseSuccess,
  style,
  className = "",
}) => {
  const [amount, setAmount] = useState<number>(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [pendingCheckoutAccountId, setPendingCheckoutAccountId] = useState<
    string | null
  >(null);

  // RTK Query mutations
  const [createCartOrder] = useCreateCartOrderMutation();
  const [createCheckoutSession] = useCreateCheckoutSessionMutation();
  const [refreshAccountBalance] = useLazyGetAccountBalanceQuery();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= VALORIDE_CREDIT_PACKAGE.dollars) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (quickAmount: number) => {
    setAmount(quickAmount);
  };

  const handlePurchase = async () => {
    if (!authenticatedPrincipal || amount < 1) {
      setMessage({ type: "error", text: "Please enter a valid amount" });
      return;
    }

    // Get the account ID from the principal
    // Try multiple possible field names since it might be serialized differently
    let accountId =
      authenticatedPrincipal.id ||
      authenticatedPrincipal.principalId ||
      authenticatedPrincipal.ownerId ||
      authenticatedPrincipal.userId;

    // If still not found, try to extract from JWT token
    if (!accountId) {
      const token = sessionStorage.getItem("jwtToken");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          accountId = payload.sub || payload.userId || payload.principalId;
        } catch (e) {
          // Failed to parse JWT
        }
      }
    }

    if (!accountId) {
      console.error(
        "Could not determine account ID. Principal:",
        authenticatedPrincipal,
      );
      setMessage({
        type: "error",
        text: "Unable to determine account ID. Please log in again.",
      });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const checkoutAmount = normalizeCreditCheckoutDollars(amount);
      const idempotencyKey =
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const order = await createCartOrder(
        buildValorIdeCreditCartOrder(checkoutAmount),
      ).unwrap();
      const orderId = order.orderId ?? order.id;

      if (!orderId) {
        throw new Error("Checkout order was not created.");
      }

      const checkoutSession = await createCheckoutSession({
        orderId,
        ...buildValorIdeCheckoutUrls(),
        currency: "usd",
        mode: "payment",
        idempotencyKey,
      }).unwrap();
      const checkoutUrl = getCheckoutUrl(checkoutSession);

      if (!checkoutUrl) {
        throw new Error(
          checkoutSession.error || "Stripe checkout URL was not returned.",
        );
      }

      globalThis.open?.(checkoutUrl, "_blank", "noopener,noreferrer");
      setPendingCheckoutAccountId(accountId as string);

      setMessage({
        type: "info",
        text: "Stripe checkout opened. Return here after payment and refresh your balance if credits are still reconciling.",
      });
    } catch (error: any) {
      console.error("Purchase failed:", error);
      setMessage({
        type: "error",
        text:
          error.data?.message ||
          error.data?.error ||
          error.message ||
          "Checkout could not be started. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefreshBalance = async () => {
    if (!pendingCheckoutAccountId) {
      return;
    }

    setIsProcessing(true);
    try {
      await refreshAccountBalance(pendingCheckoutAccountId, false).unwrap();
      setMessage({
        type: "success",
        text: "Balance refreshed. If credits are still pending, Stripe reconciliation may still be finishing.",
      });
      onPurchaseSuccess?.(amount);
    } catch (error: any) {
      setMessage({
        type: "error",
        text:
          error.data?.message ||
          error.data?.error ||
          "Balance refresh failed. Please try again shortly.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!authenticatedPrincipal) {
    return null;
  }

  const disablePurchase =
    isProcessing || amount < VALORIDE_CREDIT_PACKAGE.dollars;

  return (
    <Card
      className={`lcars-panel ${className}`}
      style={{
        ...style,
        background: "linear-gradient(135deg, #06ffa515, #06ffa505)",
        border: "1px solid #06ffa530",
      }}
    >
      <Card.Header>
        <h6 className="mb-0" style={{ color: "#06ffa5" }}>
          <FaCreditCard className="me-2" />
          Buy Credits
        </h6>
      </Card.Header>
      <Card.Body>
        {message && (
          <Alert
            variant={
              message.type === "success"
                ? "success"
                : message.type === "info"
                  ? "info"
                  : "danger"
            }
            className="mb-3"
            dismissible
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        <Form
          onSubmit={(e) => {
            e.preventDefault();
            handlePurchase();
          }}
        >
          <Form.Group className="mb-3">
            <Form.Label className="text-muted">Amount (USD)</Form.Label>
            <InputGroup>
              <InputGroup.Text
                style={{
                  backgroundColor: "#06ffa520",
                  borderColor: "#06ffa560",
                }}
              >
                <FaDollarSign />
              </InputGroup.Text>
              <Form.Control
                type="number"
                value={amount}
                onChange={handleAmountChange}
                min={VALORIDE_CREDIT_PACKAGE.dollars}
                step={VALORIDE_CREDIT_PACKAGE.dollars}
                style={{
                  backgroundColor: "transparent",
                  borderColor: "#06ffa560",
                  color: "#06ffa5",
                }}
              />
            </InputGroup>
            <Form.Text className="text-muted">
              Minimum ${VALORIDE_CREDIT_PACKAGE.dollars}, server-priced credit
              packages only
            </Form.Text>
          </Form.Group>

          {/* Quick Amount Buttons */}
          <div className="mb-3">
            <small className="text-muted">Quick amounts:</small>
            <div className="d-flex gap-2 mt-1">
              {[10, 25, 50, 100].map((quickAmount) => (
                <CoolButton
                  key={quickAmount}
                  size="sm"
                  variant="outline-success"
                  customStyle={{
                    borderColor: "#06ffa560",
                    color: amount === quickAmount ? "#000" : "#06ffa5",
                    backgroundColor:
                      amount === quickAmount ? "#06ffa5" : "transparent",
                  }}
                  onClick={() => handleQuickAmount(quickAmount)}
                >
                  ${quickAmount}
                </CoolButton>
              ))}
            </div>
          </div>

          <div className="d-grid gap-2">
            <CoolButton
              type="submit"
              disabled={disablePurchase}
              customStyle={
                {
                  background: isProcessing
                    ? "linear-gradient(45deg, #666, #888)"
                    : "#0f5132",
                  border: "1px solid #198754",
                  fontWeight: "bold",
                  color: "#fff",
                  width: "100%",
                } as React.CSSProperties
              }
            >
              {isProcessing ? (
                <>Processing...</>
              ) : (
                <>
                  <FaShoppingCart className="me-2" />
                  Buy ${amount} Credits
                </>
              )}
            </CoolButton>
          </div>

          {pendingCheckoutAccountId && (
            <div className="d-grid gap-2 mt-2">
              <Button
                type="button"
                variant="outline-success"
                disabled={isProcessing}
                onClick={handleRefreshBalance}
              >
                Refresh balance
              </Button>
            </div>
          )}

          <div className="mt-2 text-center">
            <small className="text-muted">
              Secure payment via Stripe • Credits post after webhook
              reconciliation
            </small>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default BuyCredits;
