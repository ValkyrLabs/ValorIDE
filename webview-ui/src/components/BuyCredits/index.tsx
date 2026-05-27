import React, { useState } from "react";
import { Card, Form, InputGroup, Button, Alert } from "react-bootstrap";
import { FaCreditCard, FaShoppingCart, FaDollarSign } from "react-icons/fa";
import CoolButton from "@valkyr/component-library/CoolButton";
import { vscode } from "@thorapi/utils/vscode";
import { useCreateCreditCheckoutSessionMutation } from "../../services/creditsApi";

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

  // RTK Query mutations
  const [createCreditCheckoutSession] = useCreateCreditCheckoutSessionMutation();

  const trackCheckoutEvent = (
    state: "started" | "opened" | "failed" | "refresh_requested",
    extra: Record<string, unknown> = {},
  ) => {
    vscode.postMessage({
      type: "creditCheckoutEvent",
      telemetryEvent: `valoride_credit_checkout_${state}`,
      telemetryProperties: {
        amountCents: Math.round(amount * 100),
        creditsAmountCents: Math.round(amount * 100),
        currency: "usd",
        productType: "credits",
        source: "valoride",
        state,
        surface: "BuyCredits",
        ...extra,
      },
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1) {
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
    trackCheckoutEvent("started");

    try {
      const idempotencyKey =
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      const amountCents = Math.round(amount * 100);

      const checkout = await createCreditCheckoutSession({
        successUrl:
          "https://valkyrlabs.com/checkout/success?source=valoride&product=credits&session_id={CHECKOUT_SESSION_ID}",
        cancelUrl:
          "https://valkyrlabs.com/buy-credits?source=valoride&status=cancelled",
        currency: "usd",
        amountCents,
        creditsAmountCents: amountCents,
        itemName: `ValorIDE $${amount} Credit Top-up`,
        productType: "credits",
        sku: `valoride-credits-usd-${amount}`,
        idempotencyKey,
      }).unwrap();

      const checkoutUrl = checkout.checkout_url || checkout.url;
      if (!checkoutUrl) {
        throw new Error(checkout.error || "Checkout did not return a URL.");
      }

      vscode.postMessage({ type: "openInBrowser", url: checkoutUrl });
      trackCheckoutEvent("opened");

      setMessage({
        type: "info",
        text: "Stripe Checkout opened in your browser. After payment, return here and refresh your balance while the webhook reconciles credits.",
      });
    } catch (error: any) {
      console.error("Purchase failed:", error);
      trackCheckoutEvent("failed", {
        errorCode: error?.data?.error || error?.message || "checkout_failed",
      });
      setMessage({
        type: "error",
        text:
          error.data?.message ||
          error.message ||
          "Checkout could not be started. No credits were booked; please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!authenticatedPrincipal) {
    return null;
  }

  const disablePurchase = isProcessing || amount < 1;

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
            {message.type === "info" && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline-info"
                  onClick={() => {
                    trackCheckoutEvent("refresh_requested");
                    onPurchaseSuccess?.(amount);
                  }}
                >
                  I completed checkout — refresh balance
                </Button>
              </div>
            )}
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
                min="1"
                step="1"
                style={{
                  backgroundColor: "transparent",
                  borderColor: "#06ffa560",
                  color: "#06ffa5",
                }}
              />
            </InputGroup>
            <Form.Text className="text-muted">
              Minimum $1, whole dollar amounts only
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
                    : "linear-gradient(45deg, #06ffa5, #00d4ff)",
                  border: "none",
                  fontWeight: "bold",
                  color: "#000",
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

          <div className="mt-2 text-center">
            <small className="text-muted">
              Secure Stripe Checkout • Credits post after webhook reconciliation
            </small>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default BuyCredits;
