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

export type { GrayMatterSessionStatus, GrayMatterSessionState };
export { defaultGrayMatterCapabilities } from "@shared/GrayMatterSession";

export interface CreateGrayMatterSessionStateOptions {
  baseUrl: string;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  now?: () => Date;
  token?: string;
}

export const createGrayMatterSessionState = async ({
  baseUrl,
  fetch,
  now = () => new Date(),
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
    });
    const capabilities = await client.loadCapabilities();
    return {
      baseUrl: normalizedBaseUrl,
      capabilities,
      checkedAt,
      error: undefined,
      status: "ready",
    };
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
