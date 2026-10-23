/**
 * One timeout policy for Valkyr Labs API traffic in every runtime.
 *
 * ValkyrAI's bounded ThorAPI generator may run for up to 15 minutes before it
 * returns the generated archive. Keep one minute of transport/serialization
 * headroom and prohibit endpoint-specific timeout overrides so the webview and
 * extension host cannot disagree about whether the same request is still live.
 */
export const VALKYR_LABS_API_TIMEOUT_MS = 16 * 60_000;
