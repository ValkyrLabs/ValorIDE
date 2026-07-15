import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BuyCredits from ".";

const mockCreateCartOrder = vi.fn();
const mockCreateCheckoutSession = vi.fn();
const mockRefreshBalance = vi.fn();
const mockRecordPaymentTransaction = vi.fn();

vi.mock("@valkyr/component-library/CoolButton", () => ({
  __esModule: true,
  default: ({ children, customStyle, ...props }: any) => (
    <button style={customStyle} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("react-bootstrap", () => {
  const Card = Object.assign(
    ({ children, ...props }: any) => <section {...props}>{children}</section>,
    {
      Header: ({ children }: any) => <header>{children}</header>,
      Body: ({ children }: any) => <div>{children}</div>,
    },
  );
  const Form = Object.assign(
    ({ children, ...props }: any) => <form {...props}>{children}</form>,
    {
      Group: ({ children, ...props }: any) => <div {...props}>{children}</div>,
      Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
      Control: (props: any) => <input {...props} />,
      Text: ({ children, ...props }: any) => <small {...props}>{children}</small>,
    },
  );
  const InputGroup = Object.assign(
    ({ children }: any) => <div>{children}</div>,
    {
      Text: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    },
  );

  return {
    __esModule: true,
    Alert: ({ children }: any) => <div role="alert">{children}</div>,
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Card,
    Form,
    InputGroup,
  };
});

vi.mock("../../redux/customBaseQuery", () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock("../../services/creditsApi", async () => {
  const actual = await vi.importActual<any>("../../services/creditsApi");
  return {
    ...actual,
    useCreateCartOrderMutation: () => [mockCreateCartOrder],
    useCreateCheckoutSessionMutation: () => [mockCreateCheckoutSession],
    useLazyGetAccountBalanceQuery: () => [mockRefreshBalance],
    useRecordPaymentTransactionMutation: () => [mockRecordPaymentTransaction],
  };
});

describe("BuyCredits", () => {
  beforeEach(() => {
    mockCreateCartOrder.mockReset();
    mockCreateCheckoutSession.mockReset();
    mockRefreshBalance.mockReset();
    mockRecordPaymentTransaction.mockReset();
    vi.spyOn(globalThis, "open").mockImplementation(() => null);
  });

  it("starts server-owned Stripe checkout instead of direct ledger booking", async () => {
    mockCreateCartOrder.mockReturnValue({
      unwrap: () => Promise.resolve({ orderId: "order-123" }),
    });
    mockCreateCheckoutSession.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          checkout_url: "https://checkout.stripe.com/session-123",
        }),
    });

    render(
      <BuyCredits
        authenticatedPrincipal={{ id: "principal-123", username: "casey" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Buy \$10 Credits/i }));

    await waitFor(() => {
      expect(mockCreateCartOrder).toHaveBeenCalledWith({
        lineItems: [
          {
            sku: "prod_ThB4xwTOkam2P3",
            quantity: 2,
            type: "product",
          },
        ],
      });
      expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "order-123",
          currency: "usd",
          mode: "payment",
        }),
      );
      expect(globalThis.open).toHaveBeenCalledWith(
        "https://checkout.stripe.com/session-123",
        "_blank",
        "noopener,noreferrer",
      );
    });

    expect(mockRecordPaymentTransaction).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Stripe checkout opened. Return here after payment/i),
    ).toBeInTheDocument();
  });
});
