import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CommunicationService, CommunicationRole } from "../../../src/services/communication/CommunicationService";

// Create a resilient, no-op fallback that satisfies the shape of CommunicationService
function createNoopCommunicationService(reason?: string): CommunicationService {
  const noop = {
    ready: false,
    error: null as Error | null,
    connect: () => {
      if (typeof console !== "undefined") {
        console.warn("CommunicationService noop: connect() skipped.", reason || "No reason provided");
      }
    },
    disconnect: () => {
      /* no-op */
    },
    sendMessage: (_type: string, _payload: any) => {
      if (typeof console !== "undefined") {
        console.warn("CommunicationService noop: sendMessage() ignored.");
      }
    },
    on: (_event: string, _listener: (...args: any[]) => void) => {
      /* no-op */
      return noop as any;
    },
    off: (_event: string, _listener: (...args: any[]) => void) => {
      /* no-op */
      return noop as any;
    },
    addListener: (_event: string, _listener: (...args: any[]) => void) => {
      /* no-op */
      return noop as any;
    },
    removeListener: (_event: string, _listener: (...args: any[]) => void) => {
      /* no-op */
      return noop as any;
    },
    once: (_event: string, _listener: (...args: any[]) => void) => {
      /* no-op */
      return noop as any;
    },
    emit: (_event: string, ..._args: any[]) => {
      /* no-op */
      return false;
    },
    listenerCount: (_event: string) => 0,
  } as unknown as CommunicationService;

  // Mark this instance so UI can show a non-intrusive offline banner
  (noop as any).isNoop = true;

  return noop;
}

const CommunicationServiceContext = createContext<CommunicationService | null>(null);

export const CommunicationServiceProvider: React.FC<{ role: CommunicationRole; children: React.ReactNode }> = ({ role, children }) => {
  const createdRef = useRef(false);
  const [communicationService, setCommunicationService] = useState<CommunicationService>(() => {
    try {
      // If environment doesn’t support it, return noop early
      const supported = typeof (CommunicationService as any).isSupported === "function"
        ? (CommunicationService as any).isSupported()
        : typeof window !== "undefined" && typeof (window as any).addEventListener === "function";
      if (!supported) {
        return createNoopCommunicationService("Not running in a browser context");
      }
      return new CommunicationService({ role });
    } catch (err: any) {
      const message = err instanceof Error ? err.message : String(err);
      if (typeof console !== "undefined") {
        console.error("Failed to initialize CommunicationService:", message);
      }
      return createNoopCommunicationService(message);
    }
  });

  useEffect(() => {
    // Connect once, defensively
    if (createdRef.current) return;
    createdRef.current = true;
    try {
      communicationService.connect();
    } catch (err: any) {
      if (typeof console !== "undefined") {
        console.error("CommunicationService connect() failed:", err);
      }
      // Swap in a noop to avoid cascading failures
      setCommunicationService(createNoopCommunicationService(
        err instanceof Error ? err.message : String(err),
      ));
    }
    return () => {
      try {
        communicationService.disconnect();
      } catch (err: any) {
        if (typeof console !== "undefined") {
          console.warn("CommunicationService disconnect() error (ignored):", err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <CommunicationServiceContext.Provider value={communicationService}>
      {children}
    </CommunicationServiceContext.Provider>
  );
};

// Never throw; always return a safe instance. Log once when context is missing.
let warnedNoProvider = false;
export const useCommunicationService = (): CommunicationService => {
  const context = useContext(CommunicationServiceContext);
  if (!context) {
    if (!warnedNoProvider && typeof console !== "undefined") {
      console.warn(
        "useCommunicationService used without a CommunicationServiceProvider; using no-op fallback.",
      );
      warnedNoProvider = true;
    }
    return createNoopCommunicationService("No provider available");
  }
  return context;
};
