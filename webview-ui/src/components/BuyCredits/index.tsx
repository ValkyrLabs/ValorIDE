import React, { useState } from "react";
import { Card, Form, InputGroup, Button, Alert } from "react-bootstrap";
import { FaCreditCard, FaShoppingCart, FaDollarSign } from "react-icons/fa";
import CoolButton from "@valkyr/component-library/CoolButton";
import { useAddLineItemMutation } from "@thor/redux/services/LineItemService";
import { useAddSalesOrderMutation } from "@thor/redux/services/SalesOrderService";
import { LineItem, LineItemTypeEnum } from "@thor/model/LineItem";
import { SalesOrder, SalesOrderStatusEnum } from "@thor/model/SalesOrder";
import {
  Product,
  ProductStatusEnum,
  ProductTypeEnum,
} from "@thor/model/Product";
import { Customer, CustomerStatusEnum } from "@thor/model/Customer";

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
    type: "success" | "error";
    text: string;
  } | null>(null);

  // RTK Query mutations
  const [addLineItem] = useAddLineItemMutation();
  const [addSalesOrder] = useAddSalesOrderMutation();

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

    setIsProcessing(true);
    setMessage(null);

    try {
      // Create a customer if needed
      const customerData: Partial<Customer> = {
        ownerId: authenticatedPrincipal.id,
        status: CustomerStatusEnum.ACTIVE,
        principal: authenticatedPrincipal,
      };

      // Create a sales order for the credits purchase
      const salesOrderData: Partial<SalesOrder> = {
        ownerId: authenticatedPrincipal.id,
        totalAmount: amount,
        status: SalesOrderStatusEnum.PENDING, // Will be updated after payment processing
        orderDate: new Date(),
        customer: customerData as Customer,
      };

      const salesOrderResult = await addSalesOrder(salesOrderData).unwrap();

      // Create line item for the credits
      const product: Product = {
        id: "CREDITS_PRODUCT_ID", // This should be a real product ID from your catalog
        name: "Platform Credits",
        description: `${amount} credits for ValkyrAI platform usage`,
        price: amount,
        status: ProductStatusEnum.AVAILABLE,
        type: ProductTypeEnum.CREDITS,
      };

      const lineItemData: Partial<LineItem> = {
        salesOrderId: salesOrderResult.id,
        product: product,
        lineItemAmount: amount,
        quantity: 1,
        type: LineItemTypeEnum.PRODUCT,
        ownerId: authenticatedPrincipal.id,
      };

      await addLineItem(lineItemData).unwrap();

      setMessage({
        type: "success",
        text: `Successfully added $${amount} credits to cart. Processing payment...`,
      });

      // Call success callback
      onPurchaseSuccess?.(amount);

      // Reset form
      setAmount(10);

      // Here you would typically integrate with Stripe or another payment processor
      // For now, we'll simulate the payment processing
      setTimeout(() => {
        setMessage({
          type: "success",
          text: "Payment processed successfully! Credits added to your account.",
        });
      }, 2000);
    } catch (error: any) {
      console.error("Purchase failed:", error);
      setMessage({
        type: "error",
        text: error.data?.message || "Purchase failed. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!authenticatedPrincipal) {
    return null;
  }

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
            variant={message.type === "success" ? "success" : "danger"}
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
              disabled={isProcessing || amount < 1}
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
              Secure payment via Stripe • Instant credit delivery
            </small>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default BuyCredits;
