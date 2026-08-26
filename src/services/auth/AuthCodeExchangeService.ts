import axios from "axios";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { AuthenticatedUser, AuthTokens } from "./TokenStorageService";

export interface AuthCodeExchangeResult {
  tokens: AuthTokens;
  user?: AuthenticatedUser;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export class AuthCodeExchangeService {
  async exchangeCode(
    code: string,
    state: string,
  ): Promise<AuthCodeExchangeResult> {
    const baseUrl = getValkyraiBasePath();
    const response = await axios.post(
      `${baseUrl}/auth/valoride/code-exchange`,
      { code, state },
      { timeout: 10000 },
    );

    const data = response.data || {};
    const jwtToken = readString(data.jwtToken) || readString(data.token);
    if (!jwtToken) {
      throw new Error("Auth code exchange did not return a session token");
    }

    return {
      tokens: {
        jwtToken,
        apiKey: readString(data.apiKey),
        refreshToken: readString(data.refreshToken),
        expiresAt:
          typeof data.expiresAt === "number" ? data.expiresAt : undefined,
      },
      user: data.user || data.authenticatedPrincipal,
    };
  }
}
