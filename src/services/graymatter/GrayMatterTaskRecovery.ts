import type { AgentGrayMatterContext } from "../agentic/AgentContextAssembler";
import type { GrayMatterSessionState } from "@shared/GrayMatterSession";

export const GRAYMATTER_DISCOVERY_WAIT_MS = 2_000;

export interface GrayMatterTaskSession {
  pending: boolean;
  session?: GrayMatterSessionState;
}

/** Use fast discovery before deciding that a cached failure still applies. */
export async function waitForGrayMatterTaskSession(
  refresh: Promise<GrayMatterSessionState>,
  previous?: GrayMatterSessionState,
  waitMs = GRAYMATTER_DISCOVERY_WAIT_MS,
): Promise<GrayMatterTaskSession> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      refresh.then((session) => ({ pending: false, session })),
      new Promise<GrayMatterTaskSession>((resolve) => {
        timer = setTimeout(
          () =>
            resolve({
              pending: true,
              session: previous?.status === "ready" ? previous : undefined,
            }),
          waitMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

/** Receipt quality controls prompt use; it does not revoke discovered access. */
export function shouldDegradeGrayMatterAccess(
  context: Pick<AgentGrayMatterContext, "status" | "policyState">,
): boolean {
  if (["unauthenticated", "forbidden", "quota"].includes(context.status))
    return true;
  if (context.status !== "unavailable") return false;
  return (
    !context.policyState || ["denied", "quota"].includes(context.policyState)
  );
}

export function grayMatterPolicyMessage(
  policyState: AgentGrayMatterContext["policyState"],
): string | undefined {
  switch (policyState) {
    case "retry_required":
      return "GrayMatter is connected, but the retrieved memory was too uncertain for this task. Refine the request and retry. No memory was added.";
    case "clarification_required":
    case "conflicting":
      return "GrayMatter is connected, but the retrieved memories conflict or need clarification. Clarify the request before retrying. No memory was added.";
    case "partial":
    case "stale":
      return "GrayMatter is connected, but the retrieved memory is incomplete or outdated. Retry with a narrower request. No memory was added.";
    case "unavailable":
      return "GrayMatter responded, but its memory receipt could not be verified. No memory was added. Retry; check GrayMatter's receipt response if this continues.";
    default:
      return undefined;
  }
}
