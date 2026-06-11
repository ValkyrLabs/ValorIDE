import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import BuyCredits from "./index";

const mockCreateCheckoutSession = vi.fn();
const mockPostMessage = vi.fn();

vi.mock("../../services/creditsApi", () => ({
  useCreateCreditCheckoutSessionMutation: () => [mockCreateCheckoutSession],
}));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: mockPostMessage,
  },
}));

describe("BuyCredits", () => {
  beforeEach(() => {
    mockCreateCheckoutSession.mockReset();
    mockPostMessage.mockReset();
    mockCreateCheckoutSession.mockReturnValue({
      unwrap: () =>
        Promise.resolve({ checkout_url: "https://checkout.stripe.test/session" }),
    });
  });

  it("opens Stripe checkout through the credit checkout session endpoint", async () => {
    render(<BuyCredits authenticatedPrincipal={{ id: "acct-123" }} />);

    fireEvent.click(screen.getByRole("button", { name: /Buy \$10 Credits/i }));

    await waitFor(() => {
      expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 1000,
        creditsAmountCents: 1000,
        currency: "usd",
        productType: "credits",
        sku: "valoride-credits-usd-10",
      }),
    );
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "https://checkout.stripe.test/session",
    });
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "creditCheckoutEvent",
        telemetryEvent: "valoride_credit_checkout_opened",
      }),
    );
  });
});
