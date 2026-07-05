import React, { useEffect } from "react";
import { useRecordUsageTransactionMutation } from "@thorapi/services/creditsApi";
import { readStoredPrincipal } from "@thorapi/utils/accessControl";

const storageKey = (accountId: string, suffix: string) =>
  `valoride.startupDebit.${accountId}.${suffix}`;

const createStartupDebitIdempotencyKey = (accountId: string): string => {
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `auto-connect-${accountId}-${randomPart}`;
};

const readSessionValue = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionValue = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

export const hasStartupDebitBeenSent = (accountId: string): boolean =>
  readSessionValue(storageKey(accountId, "sent")) === "true";

export const getOrCreateStartupDebitReceipt = (
  accountId: string,
): { idempotencyKey: string; spentAt: string } => {
  const idempotencyStorageKey = storageKey(accountId, "idempotencyKey");
  const spentAtStorageKey = storageKey(accountId, "spentAt");

  const existingIdempotencyKey = readSessionValue(idempotencyStorageKey);
  const existingSpentAt = readSessionValue(spentAtStorageKey);
  if (existingIdempotencyKey && existingSpentAt) {
    return {
      idempotencyKey: existingIdempotencyKey,
      spentAt: existingSpentAt,
    };
  }

  const receipt = {
    idempotencyKey: createStartupDebitIdempotencyKey(accountId),
    spentAt: new Date().toISOString(),
  };
  writeSessionValue(idempotencyStorageKey, receipt.idempotencyKey);
  writeSessionValue(spentAtStorageKey, receipt.spentAt);
  return receipt;
};

export const markStartupDebitSent = (accountId: string): void => {
  writeSessionValue(storageKey(accountId, "sent"), "true");
};

/**
 * Fires a one-time 1 credit debit when the webview starts up
 * and a JWT is already present (auto-login sessions).
 * Guarded by sessionStorage to avoid duplicate charges per session.
 */
const StartupDebit: React.FC = () => {
  const [recordUsageTransaction] = useRecordUsageTransactionMutation();

  useEffect(() => {
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
    if (hasStartupDebitBeenSent(accountId)) {
      return undefined;
    }

    const sendDebit = async () => {
      try {
        const receipt = getOrCreateStartupDebitReceipt(accountId);
        const debit = {
          spentAt: receipt.spentAt,
          credits: 1,
          modelProvider: "valoride",
          model: "auto-connect",
          promptTokens: 0,
          completionTokens: 0,
        } as any;
        await recordUsageTransaction({
          accountId,
          usage: debit,
          idempotencyKey: receipt.idempotencyKey,
        }).unwrap();
        markStartupDebitSent(accountId);
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
