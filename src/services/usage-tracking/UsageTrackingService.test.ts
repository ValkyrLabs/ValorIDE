import { UsageTrackingService } from "./UsageTrackingService";

describe("UsageTrackingService", () => {
  it("posts the originating account and stable idempotency key", async () => {
    let receiveMessage: ((message: unknown) => void) | undefined;
    const postMessage = jest.fn(async () => true);
    const service = UsageTrackingService.getInstance();
    service.setWebview({
      webview: {
        onDidReceiveMessage: (listener: (message: unknown) => void) => {
          receiveMessage = listener;
          return { dispose: jest.fn() };
        },
        postMessage,
      },
    } as any);

    const tracked = service.trackUsage(
      {
        completionTokens: 5,
        credits: 0.01,
        model: "claude-sonnet-5",
        modelProvider: "anthropic",
        promptTokens: 10,
      },
      {
        accountId: "account-7",
        idempotencyKey: "usage:task-1:4",
      },
    );

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "track_usage",
        data: expect.objectContaining({
          accountId: "account-7",
          transactionId: "usage:task-1:4",
        }),
      }),
    );
    receiveMessage?.({
      action: "transaction_submitted",
      data: { success: true, transactionId: "usage:task-1:4" },
      type: "usage_tracking_response",
    });
    await expect(tracked).resolves.toBe(true);
  });
});
