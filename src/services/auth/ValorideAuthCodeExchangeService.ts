import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import { getValkyrLabsRtkApiClient } from "../valkyrai/ValkyrLabsRtkApi";
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
    const response = await getValkyrLabsRtkApiClient().request<any>({
      url: `${baseUrl}/auth/valoride/code-exchange`,
      method: "POST",
      json: { code, state },
    });

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
