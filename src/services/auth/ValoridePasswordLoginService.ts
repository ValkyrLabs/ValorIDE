import axios, { AxiosError, AxiosResponseHeaders } from "axios";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { AuthenticatedUser, AuthTokens } from "./TokenStorageService";
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
        throw new Error("Login response did not include a JWT token.");
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
