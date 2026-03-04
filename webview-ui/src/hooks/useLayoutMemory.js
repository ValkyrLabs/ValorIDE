import { useCallback, useEffect, useRef, useState } from "react";
import { userPreferenceService } from "../services/UserPreferenceService";
export function useLayoutMemory(key, defaults) {
    const [state, setState] = useState(defaults);
    const [loaded, setLoaded] = useState(false);
    const stateRef = useRef(defaults);
    const saveTimeoutRef = useRef(null);
    // Keep ref in sync with state
    useEffect(() => {
        stateRef.current = state;
    }, [state]);
    // Load once
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const saved = await userPreferenceService.getCustomPrefsKey(key);
                if (mounted) {
                    if (saved) {
                        const merged = { ...defaults, ...saved };
                        setState(merged);
                        stateRef.current = merged;
                    }
                    else {
                        setState(defaults);
                        stateRef.current = defaults;
                    }
                }
            }
            catch {
                if (mounted) {
                    setState(defaults);
                    stateRef.current = defaults;
                }
            }
            finally {
                if (mounted) {
                    setLoaded(true);
                }
            }
        })();
        return () => {
            mounted = false;
        };
    }, [key]);
    const save = useCallback((patch) => {
        const next = { ...stateRef.current, ...patch };
        setState(next);
        stateRef.current = next;
        // Debounce the persistence to avoid excessive writes during drag/resize
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            userPreferenceService.setCustomPrefsKey(key, next).catch(() => {
                // Silently ignore persistence errors
            });
            saveTimeoutRef.current = null;
        }, 500);
    }, [key]);
    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);
    return { state, setState: save, loaded };
}
//# sourceMappingURL=useLayoutMemory.js.map