/** @jest-environment jsdom */

import React from "react";
import "@testing-library/jest-dom";
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
  beforeEach(() => {
    jest.clearAllMocks();
  });
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

    rerender(
      <ChatErrorBoundary errorTitle="Chat failed to render">
        <ProblemChild shouldThrow={false} />
      </ChatErrorBoundary>,
    );

    expect(await screen.findByText("Recovered")).toBeInTheDocument();
    expect(TaskServiceClient.clearTask).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed recovery visible and allows another attempt", async () => {
    (TaskServiceClient.clearTask as jest.Mock).mockRejectedValueOnce(
      new Error("offline"),
    );
    render(
      <ChatErrorBoundary>
        <ProblemChild shouldThrow />
      </ChatErrorBoundary>,
    );
    fireEvent.click(screen.getByRole("button", { name: /get started/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not close this chat",
    );
    expect(screen.getByRole("button", { name: /get started/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /reload view/i }),
    ).toBeInTheDocument();
  });
});
