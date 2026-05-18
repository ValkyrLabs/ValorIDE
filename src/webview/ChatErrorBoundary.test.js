import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatErrorBoundary } from "../../webview-ui/src/components/chat/ChatErrorBoundary";
import { TaskServiceClient } from "../../webview-ui/src/services/grpc-client";
jest.mock("../../webview-ui/src/services/grpc-client", () => ({
  TaskServiceClient: { clearTask: jest.fn().mockResolvedValue(undefined) },
}));
const ProblemChild = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("boom");
  }
  return _jsx("div", { children: "Recovered" });
};
describe("ChatErrorBoundary", () => {
  it("offers a Get Started recovery path that clears the current chat", async () => {
    const { rerender } = render(
      _jsx(ChatErrorBoundary, {
        errorTitle: "Chat failed to render",
        children: _jsx(ProblemChild, { shouldThrow: true }),
      }),
    );
    const recoveryButton = screen.getByRole("button", {
      name: /get started/i,
    });
    fireEvent.click(recoveryButton);
    await waitFor(() =>
      expect(TaskServiceClient.clearTask).toHaveBeenCalledTimes(1),
    );
    rerender(
      _jsx(ChatErrorBoundary, {
        errorTitle: "Chat failed to render",
        children: _jsx(ProblemChild, { shouldThrow: false }),
      }),
    );
    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });
});
//# sourceMappingURL=ChatErrorBoundary.test.js.map
