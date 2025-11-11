import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CommunicationService } from "../../../src/services/communication/CommunicationService";
// Create a resilient, no-op fallback that satisfies the shape of CommunicationService
function createNoopCommunicationService(reason) {
    const noop = {
        ready: false,
        error: null,
        connect: () => {
            if (typeof console !== "undefined") {
                console.warn("CommunicationService noop: connect() skipped.", reason || "No reason provided");
            }
        },
        disconnect: () => {
            /* no-op */
        },
        sendMessage: (_type, _payload) => {
            if (typeof console !== "undefined") {
                console.warn("CommunicationService noop: sendMessage() ignored.");
            }
        },
        on: (_event, _listener) => {
            /* no-op */
            return noop;
        },
        off: (_event, _listener) => {
            /* no-op */
            return noop;
        },
        addListener: (_event, _listener) => {
            /* no-op */
            return noop;
        },
        removeListener: (_event, _listener) => {
            /* no-op */
            return noop;
        },
        once: (_event, _listener) => {
            /* no-op */
            return noop;
        },
        emit: (_event, ..._args) => {
            /* no-op */
            return false;
        },
        listenerCount: (_event) => 0,
    };
    // Mark this instance so UI can show a non-intrusive offline banner
    noop.isNoop = true;
    return noop;
}
const CommunicationServiceContext = createContext(null);
export const CommunicationServiceProvider = ({ role, children }) => {
    const createdRef = useRef(false);
    const [communicationService, setCommunicationService] = useState(() => {
        try {
            // If environment doesn’t support it, return noop early
            const supported = typeof CommunicationService.isSupported === "function"
                ? CommunicationService.isSupported()
                : typeof window !== "undefined" && typeof window.addEventListener === "function";
            if (!supported) {
                return createNoopCommunicationService("Not running in a browser context");
            }
            const svc = new CommunicationService({ role });
            try {
                const cfg = window?.__valorideTelecomConfig;
                if (cfg?.turnServers) {
                    const toServers = (arr) => arr.map((e) => {
                        if (!e)
                            return undefined;
                        if (typeof e === 'string')
                            return { urls: e };
                        if (e.urls)
                            return { urls: e.urls, username: e.username, credential: e.credential };
                        return undefined;
                    }).filter(Boolean);
                    svc.configureIceServers(toServers(cfg.turnServers));
                }
                if (typeof cfg?.p2pEnabled === 'boolean') {
                    try {
                        svc.setP2PEnabled?.(!!cfg.p2pEnabled);
                    }
                    catch { }
                }
                // Future: if (cfg?.bonjour) { /* enable local discovery */ }
            }
            catch { }
            return svc;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (typeof console !== "undefined") {
                console.error("Failed to initialize CommunicationService:", message);
            }
            return createNoopCommunicationService(message);
        }
    });
    useEffect(() => {
        // Connect once, defensively
        if (createdRef.current) {
            return undefined;
        }
        createdRef.current = true;
        try {
            communicationService.connect();
        }
        catch (err) {
            if (typeof console !== "undefined") {
                console.error("CommunicationService connect() failed:", err);
            }
            // Swap in a noop to avoid cascading failures
            setCommunicationService(createNoopCommunicationService(err instanceof Error ? err.message : String(err)));
        }
        return () => {
            try {
                communicationService.disconnect();
            }
            catch (err) {
                if (typeof console !== "undefined") {
                    console.warn("CommunicationService disconnect() error (ignored):", err);
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (_jsx(CommunicationServiceContext.Provider, { value: communicationService, children: children }));
};
// Never throw; always return a safe instance. Log once when context is missing.
let warnedNoProvider = false;
export const useCommunicationService = () => {
    const context = useContext(CommunicationServiceContext);
    if (!context) {
        if (!warnedNoProvider && typeof console !== "undefined") {
            console.warn("useCommunicationService used without a CommunicationServiceProvider; using no-op fallback.");
            warnedNoProvider = true;
        }
        return createNoopCommunicationService("No provider available");
    }
    return context;
};
//# sourceMappingURL=CommunicationServiceContext.js.map