/**
 * One timeout policy for ordinary Valkyr Labs API traffic in every runtime.
 * Long-running jobs must return an asynchronous receipt instead of extending
 * this transport deadline at individual call sites.
 */
export const VALKYR_LABS_API_TIMEOUT_MS = 30_000;
