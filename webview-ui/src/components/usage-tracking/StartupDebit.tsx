import React, { useEffect } from "react";
import { useRecordUsageTransactionMutation } from "@thorapi/services/creditsApi";
import { readStoredPrincipal } from "@thorapi/utils/accessControl";

/**
 * Fires a one-time 1 credit debit when the webview starts up
 * and a JWT is already present (auto-login sessions).
 * Guarded by sessionStorage to avoid duplicate charges per session.
 */
const StartupDebit: React.FC = () => {
  const [recordUsageTransaction] = useRecordUsageTransactionMutation();

  useEffect(() => {
    const alreadyCharged = (() => {
      try {
        return sessionStorage.getItem("valoride.startupDebit.sent") === "true";
      } catch {
        return false;
      }
    })();
    if (alreadyCharged) {
      return undefined;
    }

    // Detect existing token at startup
    let token: string | null = null;
    try {
      token =
        sessionStorage.getItem("jwtToken") ||
        localStorage.getItem("jwtToken") ||
        localStorage.getItem("authToken");
    } catch {
      /* ignore */
    }

    if (!token) {
      return undefined; // No auto-login token; normal login flow will handle debit.
    }

    const principal = readStoredPrincipal();
    const accountId =
      principal?.id !== undefined && principal?.id !== null
        ? String(principal.id)
        : principal?.username || principal?.email || "";
    if (!accountId) {
      return undefined;
    }

    const sendDebit = async () => {
      try {
        const debit = {
          spentAt: new Date().toISOString(),
          credits: 1,
          modelProvider: "valoride",
          model: "auto-connect",
          promptTokens: 0,
          completionTokens: 0,
        } as any;
        await recordUsageTransaction({
          accountId,
          usage: debit,
          idempotencyKey: `auto-connect-${accountId}`,
        }).unwrap();
        try {
          sessionStorage.setItem("valoride.startupDebit.sent", "true");
        } catch {
          /* ignore */
        }
      } catch (e) {
        // Log but do not disrupt UI
        console.warn("StartupDebit: failed to send auto-connect debit", e);
      }
    };

    // small delay allows store/middleware to fully mount
    const t = setTimeout(sendDebit, 250);
    return () => clearTimeout(t);
  }, [recordUsageTransaction]);

  return null;
};

export default StartupDebit;
