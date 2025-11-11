import { useEffect, useRef } from "react";
/**
 * Runs `effectRef.current()` after `delay` ms whenever any of the `deps` change,
 * but cancels/re-schedules if they change again before the delay.
 */
export function useDebounceEffect(effect, delay, deps) {
    const callbackRef = useRef(effect);
    const timeoutRef = useRef(null);
    // Keep callbackRef current
    useEffect(() => {
        callbackRef.current = effect;
    }, [effect]);
    useEffect(() => {
        // Clear any queued call
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        // Schedule a new call
        timeoutRef.current = setTimeout(() => {
            // always call the *latest* version of effect
            callbackRef.current();
        }, delay);
        // Cleanup on unmount or next effect
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
        // We want to re‐schedule if any item in `deps` changed,
        // or if `delay` changed.
    }, [delay, ...deps]);
}
//# sourceMappingURL=useDebounceEffect.js.map