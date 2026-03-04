export const COMMAND_OUTPUT_TIMEOUT_MS = 2000;
const COMMAND_OUTPUT_FALLBACK = {
    response: "yesButtonClicked",
    text: "",
    images: [],
};
/**
 * Race an ask() promise with a timeout to prevent stalls.
 * Returns the ask result if it arrives first; otherwise returns a safe auto-approval.
 */
export async function awaitAskWithTimeout(askPromise, timeoutMs = COMMAND_OUTPUT_TIMEOUT_MS, fallback = COMMAND_OUTPUT_FALLBACK) {
    return Promise.race([
        askPromise,
        new Promise((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
    ]);
}
//# sourceMappingURL=askWithTimeout.js.map