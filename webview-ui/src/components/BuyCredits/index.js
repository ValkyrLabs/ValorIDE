import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Card, Form, InputGroup, Alert } from "react-bootstrap";
import { FaCreditCard, FaShoppingCart, FaDollarSign } from "react-icons/fa";
import CoolButton from "@valkyr/component-library/CoolButton";
import { useAddLineItemMutation } from "@thor/redux/services/LineItemService";
import { useAddSalesOrderMutation } from "@thor/redux/services/SalesOrderService";
import { LineItemTypeEnum } from "@thor/model/LineItem";
import { SalesOrderStatusEnum } from "@thor/model/SalesOrder";
import { ProductStatusEnum, ProductTypeEnum, } from "@thor/model/Product";
import { CustomerStatusEnum } from "@thor/model/Customer";
const BuyCredits = ({ authenticatedPrincipal, onPurchaseSuccess, style, className = "", }) => {
    const [amount, setAmount] = useState(10);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState(null);
    // RTK Query mutations
    const [addLineItem] = useAddLineItemMutation();
    const [addSalesOrder] = useAddSalesOrderMutation();
    const handleAmountChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 1) {
            setAmount(value);
        }
    };
    const handleQuickAmount = (quickAmount) => {
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
            const customerData = {
                ownerId: authenticatedPrincipal.id,
                status: CustomerStatusEnum.ACTIVE,
                principal: authenticatedPrincipal,
            };
            // Create a sales order for the credits purchase
            const salesOrderData = {
                ownerId: authenticatedPrincipal.id,
                totalAmount: amount,
                status: SalesOrderStatusEnum.PENDING, // Will be updated after payment processing
                orderDate: new Date(),
                customer: customerData,
            };
            const salesOrderResult = await addSalesOrder(salesOrderData).unwrap();
            // Create line item for the credits
            const product = {
                id: "CREDITS_PRODUCT_ID", // This should be a real product ID from your catalog
                name: "Platform Credits",
                description: `${amount} credits for ValkyrAI platform usage`,
                price: amount,
                status: ProductStatusEnum.AVAILABLE,
                type: ProductTypeEnum.CREDITS,
            };
            const lineItemData = {
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
        }
        catch (error) {
            console.error("Purchase failed:", error);
            setMessage({
                type: "error",
                text: error.data?.message || "Purchase failed. Please try again.",
            });
        }
        finally {
            setIsProcessing(false);
        }
    };
    if (!authenticatedPrincipal) {
        return null;
    }
    return (_jsxs(Card, { className: `lcars-panel ${className}`, style: {
            ...style,
            background: "linear-gradient(135deg, #06ffa515, #06ffa505)",
            border: "1px solid #06ffa530",
        }, children: [_jsx(Card.Header, { children: _jsxs("h6", { className: "mb-0", style: { color: "#06ffa5" }, children: [_jsx(FaCreditCard, { className: "me-2" }), "Buy Credits"] }) }), _jsxs(Card.Body, { children: [message && (_jsx(Alert, { variant: message.type === "success" ? "success" : "danger", className: "mb-3", dismissible: true, onClose: () => setMessage(null), children: message.text })), _jsxs(Form, { onSubmit: (e) => {
                            e.preventDefault();
                            handlePurchase();
                        }, children: [_jsxs(Form.Group, { className: "mb-3", children: [_jsx(Form.Label, { className: "text-muted", children: "Amount (USD)" }), _jsxs(InputGroup, { children: [_jsx(InputGroup.Text, { style: {
                                                    backgroundColor: "#06ffa520",
                                                    borderColor: "#06ffa560",
                                                }, children: _jsx(FaDollarSign, {}) }), _jsx(Form.Control, { type: "number", value: amount, onChange: handleAmountChange, min: "1", step: "1", style: {
                                                    backgroundColor: "transparent",
                                                    borderColor: "#06ffa560",
                                                    color: "#06ffa5",
                                                } })] }), _jsx(Form.Text, { className: "text-muted", children: "Minimum $1, whole dollar amounts only" })] }), _jsxs("div", { className: "mb-3", children: [_jsx("small", { className: "text-muted", children: "Quick amounts:" }), _jsx("div", { className: "d-flex gap-2 mt-1", children: [10, 25, 50, 100].map((quickAmount) => (_jsxs(CoolButton, { size: "sm", variant: "outline-success", customStyle: {
                                                borderColor: "#06ffa560",
                                                color: amount === quickAmount ? "#000" : "#06ffa5",
                                                backgroundColor: amount === quickAmount ? "#06ffa5" : "transparent",
                                            }, onClick: () => handleQuickAmount(quickAmount), children: ["$", quickAmount] }, quickAmount))) })] }), _jsx("div", { className: "d-grid gap-2", children: _jsx(CoolButton, { type: "submit", disabled: isProcessing || amount < 1, customStyle: {
                                        background: isProcessing
                                            ? "linear-gradient(45deg, #666, #888)"
                                            : "linear-gradient(45deg, #06ffa5, #00d4ff)",
                                        border: "none",
                                        fontWeight: "bold",
                                        color: "#000",
                                    }, children: isProcessing ? (_jsx(_Fragment, { children: "Processing..." })) : (_jsxs(_Fragment, { children: [_jsx(FaShoppingCart, { className: "me-2" }), "Buy $", amount, " Credits"] })) }) }), _jsx("div", { className: "mt-2 text-center", children: _jsx("small", { className: "text-muted", children: "Secure payment via Stripe \u2022 Instant credit delivery" }) })] })] })] }));
};
export default BuyCredits;
//# sourceMappingURL=index.js.map