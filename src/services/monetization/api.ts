/**
 * Service Monetization API Client
 *
 * Integrates with ThorAPI backend generated services.
 * All endpoints route through the ValkyrAI backend with automatic JWT token injection.
 */

import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import type * as vscode from "vscode";
import { getValkyrLabsRtkApiClient } from "../valkyrai/ValkyrLabsRtkApi";

let extensionContext: vscode.ExtensionContext | null = null;

interface ApiRequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, boolean | number | string | null | undefined>;
}

/**
 * Initialize the API client with extension context for secure token access
 */
export function initializeApi(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

const request = async <T = any>(
  method: string,
  path: string,
  data?: unknown,
  config: ApiRequestConfig = {},
) => {
  const headers: Record<string, string> = { ...(config.headers ?? {}) };
  try {
    const token = await extensionContext?.secrets.get("jwtToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn(
      "Failed to retrieve auth token from extension context:",
      error,
    );
  }
  const url = new URL(path, getValkyraiBasePath()).toString();
  try {
    return await getValkyrLabsRtkApiClient().request<T>({
      url,
      method,
      headers,
      params: config.params,
      ...(data === undefined || data === null ? {} : { json: data }),
    });
  } catch (error) {
    console.error(
      "ThorAPI Monetization Error:",
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
};

/**
 * Exported API object compatible with ServiceMonetizationService
 * Routes all requests through ThorAPI-generated endpoints
 */
export const api = {
  get: <T = any>(url: string, config?: ApiRequestConfig) =>
    request<T>("GET", url, undefined, config),
  post: <T = any>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    request<T>("POST", url, data, config),
  patch: <T = any>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    request<T>("PATCH", url, data, config),
  put: <T = any>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    request<T>("PUT", url, data, config),
  delete: <T = any>(url: string, config?: ApiRequestConfig) =>
    request<T>("DELETE", url, undefined, config),
};
