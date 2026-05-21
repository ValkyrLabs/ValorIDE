import axios from "axios";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { AuthenticatedUser, AuthTokens } from "./TokenStorageService";

export interface AuthCodeExchangeResult {
  tokens: AuthTokens;
  user?: AuthenticatedUser;
}

export class ValorideAuthCodeExchangeService {
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

    const token = response.data?.token || response.data?.jwtToken;
    if (!token) {
      throw new Error(
        "ValorIDE auth code exchange response did not include a JWT token",
      );
    }

    return {
      tokens: {
        jwtToken: token,
        apiKey: response.data?.apiKey,
        refreshToken: response.data?.refreshToken,
        expiresAt: response.data?.expiresAt,
      },
      user: response.data?.user || response.data?.authenticatedPrincipal,
    };
  }
}
