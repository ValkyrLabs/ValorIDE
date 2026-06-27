import axios, { AxiosError, AxiosResponseHeaders } from "axios";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { AuthenticatedUser, AuthTokens } from "./TokenStorageService";
import { Logger } from "../logging/Logger";
import {
  buildAuthTokensFromResponse,
  extractAuthenticatedUser,
} from "./authResponse";

export interface PasswordLoginCredentials {
  username: string;
  password: string;
}

export interface PasswordLoginResult {
  tokens: AuthTokens;
  user?: AuthenticatedUser;
}

const XSRF_HEADER_NAME = "X-XSRF-TOKEN";

const extractSetCookieHeader = (headers: AxiosResponseHeaders | any): string => {
  const raw = headers?.["set-cookie"];
  if (Array.isArray(raw)) {
    return raw.map((cookie) => String(cookie).split(";")[0]).join("; ");
  }
  return raw ? String(raw).split(";")[0] : "";
};

const extractCsrfToken = (headers: AxiosResponseHeaders | any, body: any) =>
  headers?.["x-xsrf-token"] ||
  headers?.["x-csrf-token"] ||
  body?.token ||
  body?.csrfToken;

const extractErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : String(error);
  }

  const axiosError = error as AxiosError<any>;
  const data = axiosError.response?.data;
  const message =
    typeof data === "string"
      ? data
      : data?.message || data?.error || axiosError.message;
  return String(message || "Login failed.");
};

const getCaseInsensitiveHeader = (
  headers: AxiosResponseHeaders | any,
  key: string,
) => {
  if (!headers) {
    return undefined;
  }

  const direct = headers[key];
  if (direct !== undefined) {
    return direct;
  }

  const lowerKey = key.toLowerCase();
  const matchingKey = Object.keys(headers).find(
    (candidate) => candidate.toLowerCase() === lowerKey,
  );
  return matchingKey ? headers[matchingKey] : undefined;
};

const describeObjectKeys = (value: unknown): string => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return typeof value;
  }

  const keys = Object.keys(value as Record<string, unknown>).sort();
  if (keys.length === 0) {
    return "(none)";
  }

  const shownKeys = keys.slice(0, 20);
  return keys.length > shownKeys.length
    ? `${shownKeys.join(", ")} (+${keys.length - shownKeys.length} more)`
    : shownKeys.join(", ");
};

const describeCookieNames = (headers: AxiosResponseHeaders | any): string => {
  const rawSetCookie = getCaseInsensitiveHeader(headers, "set-cookie");
  const cookies = Array.isArray(rawSetCookie)
    ? rawSetCookie
    : rawSetCookie
      ? [rawSetCookie]
      : [];
  const names = new Set<string>();

  for (const cookieHeader of cookies.map(String)) {
    const cookieNamePattern = /(?:^|,\s*)([^=;,\s]+)=/g;
    let match: RegExpExecArray | null;
    while ((match = cookieNamePattern.exec(cookieHeader))) {
      names.add(match[1]);
    }
  }

  return names.size ? Array.from(names).sort().join(", ") : "(none)";
};

const describeAuthResponse = (
  responseStatus: number,
  body: unknown,
  headers: AxiosResponseHeaders | any,
) => {
  const headerNames = headers ? Object.keys(headers).sort() : [];
  const bodyKeys = describeObjectKeys(body);
  const nestedKeys = ["data", "result", "auth", "session", "tokens"]
    .map((container) => {
      const value =
        body && typeof body === "object"
          ? (body as Record<string, unknown>)[container]
          : undefined;
      return value ? `${container}: ${describeObjectKeys(value)}` : undefined;
    })
    .filter(Boolean)
    .join("; ");

  return [
    `status=${responseStatus}`,
    `bodyKeys=${bodyKeys}`,
    nestedKeys ? `nestedKeys=${nestedKeys}` : undefined,
    `headerNames=${headerNames.length ? headerNames.join(", ") : "(none)"}`,
    `setCookieNames=${describeCookieNames(headers)}`,
  ]
    .filter(Boolean)
    .join("; ");
};

export class ValoridePasswordLoginService {
  async login({
    username,
    password,
  }: PasswordLoginCredentials): Promise<PasswordLoginResult> {
    const baseUrl = getValkyraiBasePath().replace(/\/+$/, "");
    const csrfResponse = await axios.get(`${baseUrl}/auth/csrf`, {
      headers: { Accept: "application/json" },
      timeout: 10000,
    });
    const csrfToken = extractCsrfToken(
      csrfResponse.headers,
      csrfResponse.data,
    );
    const cookieHeader = extractSetCookieHeader(csrfResponse.headers);

    try {
      const response = await axios.post(
        `${baseUrl}/auth/login`,
        { username, password },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(csrfToken ? { [XSRF_HEADER_NAME]: csrfToken } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          timeout: 15000,
        },
      );

      const tokens = buildAuthTokensFromResponse(
        response.data,
        response.headers,
      );
      if (!tokens) {
        const diagnostics = describeAuthResponse(
          response.status,
          response.data,
          response.headers,
        );
        Logger.warn(`Password login response missing JWT. ${diagnostics}`);
        throw new Error(
          `Login response did not include a JWT token. ${diagnostics}`,
        );
      }

      return {
        tokens,
        user: extractAuthenticatedUser(response.data),
      };
    } catch (error) {
      throw new Error(extractErrorMessage(error));
    }
  }
}
