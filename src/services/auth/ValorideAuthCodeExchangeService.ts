import axios from "axios";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { AuthenticatedUser, AuthTokens } from "./TokenStorageService";
import {
  buildAuthTokensFromResponse,
  extractAuthenticatedUser,
} from "./authResponse";

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

    const tokens = buildAuthTokensFromResponse(response.data, response.headers);
    if (!tokens) {
      throw new Error(
        "ValorIDE auth code exchange response did not include a JWT token",
      );
    }

    return {
      tokens,
      user: extractAuthenticatedUser(response.data),
    };
  }
}
