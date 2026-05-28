import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import BuyCredits from "./index";

const mockCreateCheckoutSession = vi.fn();
const mockRecordPaymentTransaction = vi.fn();
const mockPostMessage = vi.fn();
const mockWindowOpen = vi.fn();

vi.mock("../../redux/services/CheckoutService", () => ({
  useCreateCheckoutSessionMutation: () => [mockCreateCheckoutSession],
}));

vi.mock("../../services/creditsApi", () => ({
  useRecordPaymentTransactionMutation: () => [mockRecordPaymentTransaction],
}));

vi.mock("@thorapi/utils/vscode", () => ({
  vscode: {
    postMessage: mockPostMessage,
  },
}));

describe("BuyCredits", () => {
  beforeEach(() => {
    mockCreateCheckoutSession.mockReset();
    mockRecordPaymentTransaction.mockReset();
    mockPostMessage.mockReset();
    mockWindowOpen.mockReset();
    mockCreateCheckoutSession.mockReturnValue({
      unwrap: () =>
        Promise.resolve({ checkout_url: "https://checkout.stripe.test/session" }),
    });
    vi.stubGlobal("open", mockWindowOpen);
  });

  it("opens Stripe checkout and does not call direct ledger payment mutation", async () => {
    render(<BuyCredits authenticatedPrincipal={{ id: "acct-123" }} />);

    fireEvent.click(screen.getByRole("button", { name: /Buy \$10 Credits/i }));

    await waitFor(() => {
      expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    });
    expect(mockRecordPaymentTransaction).not.toHaveBeenCalled();
    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "openInBrowser",
      url: "https://checkout.stripe.test/session",
    });
    expect(mockWindowOpen).toHaveBeenCalledWith(
      "https://checkout.stripe.test/session",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
