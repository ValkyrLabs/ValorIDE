import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BuyCredits from "./index";

const mockCreateCheckoutSession = vi.fn();
const mockPostMessage = vi.fn();

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: (message: any) => mockPostMessage(message),
  },
}));

vi.mock("../../services/creditsApi", () => ({
  useCreateCreditCheckoutSessionMutation: () => [mockCreateCheckoutSession],
}));

vi.mock("@valkyr/component-library/CoolButton", () => ({
  __esModule: true,
  default: ({ children, customStyle, ...props }: any) => (
    <button style={customStyle} {...props}>
      {children}
    </button>
  ),
}), { virtual: true });

vi.mock("react-bootstrap", () => {
  const Card = ({ children, ...props }: any) => <section {...props}>{children}</section>;
  Card.Header = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  Card.Body = ({ children, ...props }: any) => <div {...props}>{children}</div>;

  const Form = ({ children, ...props }: any) => <form {...props}>{children}</form>;
  Form.Group = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  Form.Label = ({ children, ...props }: any) => <label {...props}>{children}</label>;
  Form.Text = ({ children, ...props }: any) => <small {...props}>{children}</small>;
  Form.Control = (props: any) => <input aria-label="Amount (USD)" {...props} />;

  const InputGroup = ({ children, ...props }: any) => <div {...props}>{children}</div>;
  InputGroup.Text = ({ children, ...props }: any) => <span {...props}>{children}</span>;

  const Button = ({ children, ...props }: any) => <button {...props}>{children}</button>;
  const Alert = ({ children, ...props }: any) => <div role="alert" {...props}>{children}</div>;

  return { __esModule: true, Card, Form, InputGroup, Button, Alert };
}, { virtual: true });

const principal = { id: "principal-123" };

beforeEach(() => {
  mockCreateCheckoutSession.mockReset();
  mockPostMessage.mockReset();
  vi.stubGlobal("crypto", { randomUUID: () => "checkout-idempotency-key" });
});

describe("BuyCredits", () => {
  it("starts Stripe Checkout instead of booking direct payment credits", async () => {
    mockCreateCheckoutSession.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ checkout_url: "https://checkout.stripe.test/session" }),
    });

    render(<BuyCredits authenticatedPrincipal={principal} />);

    fireEvent.click(screen.getByRole("button", { name: /buy \$10 credits/i }));

    await waitFor(() => expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1));
    expect(mockCreateCheckoutSession.mock.calls[0][0]).toMatchObject({
      amountCents: 1000,
      creditsAmountCents: 1000,
      currency: "usd",
      itemName: "ValorIDE $10 Credit Top-up",
      productType: "credits",
      sku: "valoride-credits-usd-10",
    });
    expect(mockCreateCheckoutSession.mock.calls[0][0]).not.toHaveProperty("payment");

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "https://checkout.stripe.test/session",
    });
    expect(screen.getByText(/Stripe Checkout opened/i)).toBeInTheDocument();
    expect(screen.getByText(/Credits post after webhook reconciliation/i)).toBeInTheDocument();
  });

  it("surfaces checkout start failures without claiming credits were added", async () => {
    mockCreateCheckoutSession.mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ data: { error: "stripe_unavailable" } }),
    });

    render(<BuyCredits authenticatedPrincipal={principal} />);

    fireEvent.click(screen.getByRole("button", { name: /buy \$10 credits/i }));

    await waitFor(() =>
      expect(screen.getByText(/Checkout could not be started/i)).toBeInTheDocument(),
    );
    expect(mockPostMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "openInBrowser" }),
    );
    expect(screen.queryByText(/Successfully added/i)).not.toBeInTheDocument();
  });

  it("lets users refresh balance after returning from checkout", async () => {
    const onPurchaseSuccess = vi.fn();
    mockCreateCheckoutSession.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ checkout_url: "https://checkout.stripe.test/session" }),
    });

    render(
      <BuyCredits
        authenticatedPrincipal={principal}
        onPurchaseSuccess={onPurchaseSuccess}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /buy \$10 credits/i }));
    await screen.findByText(/Stripe Checkout opened/i);

    fireEvent.click(
      screen.getByRole("button", {
        name: /I completed checkout — refresh balance/i,
      }),
    );

    expect(onPurchaseSuccess).toHaveBeenCalledWith(10);
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "creditCheckoutEvent",
        telemetryEvent: "valoride_credit_checkout_refresh_requested",
      }),
    );
  });
});
