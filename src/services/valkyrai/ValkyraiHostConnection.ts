import { normalizeValkyraiHost } from "@utils/serverValkyraiHost";
import {
  getValkyrLabsRtkApiClient,
  type ValkyrLabsRtkApiClient,
} from "./ValkyrLabsRtkApi";

export async function testValkyraiHostConnection(
  host: string,
  client: ValkyrLabsRtkApiClient = getValkyrLabsRtkApiClient(),
  token?: string,
): Promise<{
  host: string;
  success: boolean;
  requiresAuth?: boolean;
  error?: string;
}> {
  const normalizedHost = normalizeValkyraiHost(host);
  try {
    if (!host.trim()) throw new Error("Host URL is required.");
    const parsed = new URL(host.trim());
    const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(
      parsed.hostname,
    );
    if (
      parsed.protocol !== "https:" &&
      !(parsed.protocol === "http:" && isLocal)
    ) {
      throw new Error("HTTPS is required for ValkyrAI hosts.");
    }
    if (parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error(
        "Enter an API base URL without credentials, query or fragment.",
      );
    }

    // A random HTTP error or HTML page does not establish a working API.
    // The controller supplies a token only for the already-selected backend.
    const response = await client.request<Record<string, unknown>>({
      url: `${normalizedHost}/api-docs`,
      maxResponseBytes: 8 * 1024 * 1024,
      acceptHttpErrors: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (response.status === 401 || response.status === 403) {
      return { host: normalizedHost, success: true, requiresAuth: true };
    }
    const schema = response.data;
    if (
      response.status < 200 ||
      response.status >= 300 ||
      !schema ||
      typeof schema !== "object" ||
      !(
        (typeof schema.openapi === "string" &&
          /^3\.\d+\.\d+/.test(schema.openapi)) ||
        schema.swagger === "2.0"
      ) ||
      !schema.paths ||
      typeof schema.paths !== "object" ||
      Array.isArray(schema.paths)
    ) {
      throw new Error(
        response.status >= 400
          ? `Backend test failed (HTTP ${response.status}).`
          : "This URL did not return a valid ValkyrAI API schema.",
      );
    }
    return { host: normalizedHost, success: true };
  } catch (error) {
    return {
      host: normalizedHost,
      success: false,
      error: error instanceof Error ? error.message : "Unable to reach host.",
    };
  }
}
