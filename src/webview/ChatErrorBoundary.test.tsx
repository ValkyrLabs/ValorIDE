/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ChatErrorBoundary } from "../../webview-ui/src/components/chat/ChatErrorBoundary";
import { TaskServiceClient } from "../../webview-ui/src/services/grpc-client";

jest.mock("../../webview-ui/src/services/grpc-client", () => ({
  TaskServiceClient: { clearTask: jest.fn().mockResolvedValue(undefined) },
}));

const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("boom");
  }
  return <div>Recovered</div>;
};

describe("ChatErrorBoundary", () => {
  it("offers a Get Started recovery path that clears the current chat", async () => {
    const { rerender } = render(
      <ChatErrorBoundary errorTitle="Chat failed to render">
        <ProblemChild shouldThrow />
      </ChatErrorBoundary>,
    );

    const recoveryButton = screen.getByRole("button", {
      name: /get started/i,
    });
    fireEvent.click(recoveryButton);

    await waitFor(() =>
      expect(TaskServiceClient.clearTask).toHaveBeenCalledTimes(1),
    );

    rerender(
      <ChatErrorBoundary errorTitle="Chat failed to render">
        <ProblemChild shouldThrow={false} />
      </ChatErrorBoundary>,
    );

    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });
});
