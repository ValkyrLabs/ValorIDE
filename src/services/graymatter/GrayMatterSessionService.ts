import {
  GrayMatterCapabilities,
  GrayMatterClient,
  GrayMatterClientError,
} from "./GrayMatterClient";
import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";
import type {
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
      status: clientError?.kind ?? "unavailable",
    };
  }
};
