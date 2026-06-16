import {
  GrayMatterCapabilities,
  GrayMatterClient,
  GrayMatterClientError,
} from "./GrayMatterClient";
import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";
import type {
  GrayMatterRecovery,
  GrayMatterSessionState,
  GrayMatterSessionStatus,
} from "@shared/GrayMatterSession";
import { defaultGrayMatterCapabilities } from "@shared/GrayMatterSession";
import { TenantContext } from "../auth/tenantContext";

export type { GrayMatterSessionStatus, GrayMatterSessionState };
export { defaultGrayMatterCapabilities } from "@shared/GrayMatterSession";

export interface CreateGrayMatterSessionStateOptions {
  baseUrl: string;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  getTenantContext?: () =>
    | Promise<TenantContext | undefined>
    | TenantContext
    | undefined;
  now?: () => Date;
  tenantContext?: TenantContext;
  token?: string;
}

export const buildGrayMatterRecovery = (
  status: GrayMatterSessionStatus,
  backendBaseUrl: string,
): GrayMatterRecovery | undefined => {
  if (status === "ready") {
    return undefined;
  }

  const recoveryBase = {
    backendBaseUrl,
    command: "valoride.accountButtonClicked" as const,
    reason: status,
  };

  if (status === "quota") {
    return {
      ...recoveryBase,
      actions: [
        {
          id: "buy_credits",
          command: "valoride.accountButtonClicked",
          label: "Open ValorIDE account and credits",
          primary: true,
        },
        {
          id: "open_account",
          command: "valoride.accountButtonClicked",
          label: "Open ValorIDE account",
        },
      ],
      message:
        "This ValorIDE account needs credits before GrayMatter memory, schema, and swarm operations can continue.",
      retryable: true,
    };
  }

  if (status === "forbidden") {
    return {
      ...recoveryBase,
      actions: [
        {
          id: "open_account",
          command: "valoride.accountButtonClicked",
          label: "Open ValorIDE account",
          primary: true,
        },
      ],
      message:
        "ValorIDE is signed in, but this principal is missing GrayMatter permissions on the selected backend.",
      retryable: true,
    };
  }

  if (status === "unauthenticated") {
    return {
      ...recoveryBase,
      actions: [
        {
          id: "open_account",
          command: "valoride.accountButtonClicked",
          label: "Open ValorIDE sign-in",
          primary: true,
        },
      ],
      message:
        "Sign in to ValorIDE with the application panel. GrayMatter uses the same backend session.",
      retryable: true,
    };
  }

  return {
    ...recoveryBase,
    actions: [
      {
        id: "open_account",
        command: "valoride.accountButtonClicked",
        label: "Open ValorIDE account",
        primary: true,
      },
    ],
    message:
      "GrayMatter capability discovery is unavailable on the selected ValorIDE backend.",
    retryable: false,
  };
};

export const createGrayMatterSessionState = async ({
  baseUrl,
  fetch,
  getTenantContext,
  now = () => new Date(),
  tenantContext,
  token,
}: CreateGrayMatterSessionStateOptions): Promise<GrayMatterSessionState> => {
  const normalizedBaseUrl = normalizeValkyraiHost(baseUrl);
  const checkedAt = now().toISOString();

  if (!token) {
    return {
      baseUrl: normalizedBaseUrl,
      capabilities: defaultGrayMatterCapabilities,
      checkedAt,
      error: "GrayMatter authentication is required.",
      recovery: buildGrayMatterRecovery(
        "unauthenticated",
        normalizedBaseUrl,
      ),
      status: "unauthenticated",
    };
  }

  try {
    const client = new GrayMatterClient({
      baseUrl: normalizedBaseUrl,
      fetch,
      getAuthToken: () => token,
      getTenantContext: getTenantContext ?? (() => tenantContext),
    });
    const discovery = await client.loadDiscovery();
    const sessionState: GrayMatterSessionState = {
      baseUrl: normalizedBaseUrl,
      capabilities: discovery.capabilities,
      checkedAt,
      error: undefined,
      status: "ready",
    };

    if (discovery.controlSurface) {
      sessionState.controlSurface = discovery.controlSurface;
    }

    return sessionState;
  } catch (error) {
    const clientError =
      error instanceof GrayMatterClientError ? error : undefined;
    return {
      baseUrl: normalizedBaseUrl,
      capabilities: defaultGrayMatterCapabilities,
      checkedAt,
      error:
        error instanceof Error
          ? error.message
          : "GrayMatter capability discovery failed.",
      recovery: buildGrayMatterRecovery(
        clientError?.kind ?? "unavailable",
        normalizedBaseUrl,
      ),
      status: clientError?.kind ?? "unavailable",
    };
  }
};
