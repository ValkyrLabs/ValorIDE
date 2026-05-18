import React, { useEffect } from "react";
import { useAddUsageTransactionMutation } from "@thorapi/redux/services/UsageTransactionService";
import { useGetAccountBalanceQuery } from "@thorapi/services/creditsApi";
import { UsageTransaction } from "@thorapi/model";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";

interface UsageTrackingMessage {
  type: "usage_tracking";
  action: "track_usage" | "request_balance";
  data: any;
}

/**
 * Component that handles usage tracking messages from the extension
 * and submits them via the generated TypeScript RTK Query clients
 */
export const UsageTrackingHandler: React.FC = () => {
  const [addUsageTransaction] = useAddUsageTransactionMutation();
  const { authenticatedUser } = useExtensionState();

  // Use the custom credits API endpoint for actual credit balance
  // GET /v1/credits/{accountId}/balance
  const { refetch: refetchAccountBalance } = useGetAccountBalanceQuery(
    authenticatedUser?.id ?? "",
    { skip: !authenticatedUser?.id },
  );

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      const message = event.data as UsageTrackingMessage;

      if (message.type === "usage_tracking") {
        switch (message.action) {
          case "track_usage":
            await handleTrackUsage(message.data);
            break;
          case "request_balance":
            await handleRequestBalance();
            break;
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [addUsageTransaction, refetchAccountBalance]);

  const waitForJwtToken = async (timeoutMs = 3000): Promise<string | null> => {
    // Try immediate read
    const read = (): string | null => {
      try {
        return (
          sessionStorage.getItem("jwtToken") ||
          localStorage.getItem("jwtToken") ||
          localStorage.getItem("authToken")
        );
      } catch {
        return null;
      }
    };
    let token = read();
    if (token) return token;
    // Wait for jwt-token-updated event
    return new Promise((resolve) => {
      let done = false;
      const onEvt = (e: Event) => {
        try {
          const detail = (e as CustomEvent)?.detail;
          if (detail?.token) {
            done = true;
            window.removeEventListener("jwt-token-updated", onEvt as any);
            resolve(detail.token as string);
          }
        } catch {
          /* ignore */
        }
      };
      window.addEventListener("jwt-token-updated", onEvt as any);
      setTimeout(() => {
        if (!done) {
          window.removeEventListener("jwt-token-updated", onEvt as any);
          resolve(read());
        }
      }, timeoutMs);
    });
  };

  const handleTrackUsage = async (data: {
    transactionId: string;
    usageTransaction: Partial<UsageTransaction>;
  }) => {
    try {
      // Ensure we have a JWT before attempting
      const token = await waitForJwtToken(3000);
      if (!token) {
        throw new Error("Missing JWT token");
      }
      const result = await addUsageTransaction(data.usageTransaction).unwrap();

      // Send success response back to extension
      sendResponseToExtension(data.transactionId, true, result);
    } catch (error) {
      console.error("Failed to submit usage transaction:", error);
      sendResponseToExtension(data.transactionId, false, error);
    }
  };

  const handleRequestBalance = async () => {
    try {
      if (!authenticatedUser?.id) {
        console.warn("Cannot fetch balance: no authenticated user");
        return;
      }

      const result = await refetchAccountBalance();

      // Send balance data back to extension
      if (window.parent && window.parent.postMessage) {
        window.parent.postMessage(
          {
            type: "usage_tracking_response",
            action: "balance_updated",
            data: result.data,
          },
          "*",
        );
      }
    } catch (error) {
      console.error("Failed to fetch account balance:", error);
    }
  };

  const sendResponseToExtension = (
    transactionId: string,
    success: boolean,
    data?: any,
  ) => {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage(
        {
          type: "usage_tracking_response",
          action: "transaction_submitted",
          data: {
            transactionId,
            success,
            result: data,
          },
        },
        "*",
      );
    }
  };

  // This component doesn't render anything visible
  return null;
};
