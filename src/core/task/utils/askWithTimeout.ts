import type { ValorIDEAskResponse } from "@shared/WebviewMessage";

export const COMMAND_OUTPUT_TIMEOUT_MS = 2000;
const COMMAND_OUTPUT_FALLBACK = {
  response: "yesButtonClicked" as ValorIDEAskResponse,
  text: "",
  images: [] as string[] | undefined,
};

/**
 * Race an ask() promise with a timeout to prevent stalls.
 * Returns the ask result if it arrives first; otherwise returns a safe auto-approval.
 */
export async function awaitAskWithTimeout<
  T extends {
    response: ValorIDEAskResponse;
    text?: string;
    images?: string[];
  },
>(
  askPromise: Promise<T>,
  timeoutMs: number = COMMAND_OUTPUT_TIMEOUT_MS,
  fallback: T = COMMAND_OUTPUT_FALLBACK as T,
): Promise<T> {
  return Promise.race([
    askPromise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}
