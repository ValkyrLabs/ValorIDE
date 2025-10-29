import React, { useEffect } from 'react';
import { useAddUsageTransactionMutation } from '../../thor/redux/services/UsageTransactionService';

/**
 * Fires a one-time $0.01 debit when the webview starts up
 * and a JWT is already present (auto-login sessions).
 * Guarded by sessionStorage to avoid duplicate charges per session.
 */
const StartupDebit: React.FC = () => {
  const [addUsageTransaction] = useAddUsageTransactionMutation();

  useEffect(() => {
    const alreadyCharged = (() => {
      try { return sessionStorage.getItem('valoride.startupDebit.sent') === 'true'; } catch { return false; }
    })();
    if (alreadyCharged) {
      return undefined;
    }

    // Detect existing token at startup
    let token: string | null = null;
    try {
      token = sessionStorage.getItem('jwtToken') || localStorage.getItem('jwtToken') || localStorage.getItem('authToken');
    } catch { /* ignore */ }

    if (!token) {
      return undefined; // No auto-login token; normal login flow will handle debit.
    }

    const sendDebit = async () => {
      try {
        const debit = {
          spentAt: new Date(),
          credits: 0.01,
          modelProvider: 'valoride',
          model: 'auto-connect',
          promptTokens: 0,
          completionTokens: 0,
        } as any;
        await addUsageTransaction(debit).unwrap();
        try { sessionStorage.setItem('valoride.startupDebit.sent', 'true'); } catch { /* ignore */ }
      } catch (e) {
        // Log but do not disrupt UI
        console.warn('StartupDebit: failed to send auto-connect debit', e);
      }
    };

    // small delay allows store/middleware to fully mount
    const t = setTimeout(sendDebit, 250);
    return () => clearTimeout(t);
  }, [addUsageTransaction]);

  return null;
};

export default StartupDebit;
