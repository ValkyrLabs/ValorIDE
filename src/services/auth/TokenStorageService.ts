import * as vscode from "vscode";
import { Logger } from "../logging/Logger";
import { getValkyraiBasePath } from "@utils/serverValkyraiHost";
import {
  getValkyrLabsRtkApiClient,
  ValkyrLabsApiError,
} from "../valkyrai/ValkyrLabsRtkApi";
import {
  buildAuthTokensFromResponse,
  extractAuthenticatedUser,
  withAuthResponseCookies,
} from "./authResponse";
import { extractTenantContext } from "./tenantContext";
import {
  credentialOrigin,
  registerCredentialOrigin,
  assertCredentialDestination,
  clearCredentialOrigins,
  getCredentialRevision,
} from "@shared/CredentialOrigin";
import {
  BACKEND_CREDENTIAL_KEYS,
  readBoundCredential,
  writeBoundCredential,
} from "./OriginBoundCredentials";

export interface AuthTokens {
  jwtToken: string;
  /** Captured request origin at issuance, not a value inferred from JWT claims. */
  issuanceOrigin?: string;
  apiKey?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthenticatedUser {
  id: string;
  username?: string;
  email?: string;
  [key: string]: any;
}

export interface StoredAuthState {
  tokens: AuthTokens;
  user: AuthenticatedUser;
  timestamp: number;
}

export interface TokenValidationResult {
  definitive: boolean;
  error?: string;
  user?: AuthenticatedUser;
  valid: boolean;
}

export const validateAuthSession = async (
  client: ReturnType<typeof getValkyrLabsRtkApiClient>,
  baseUrl: string,
  tokens: AuthTokens,
): Promise<TokenValidationResult> => {
  try {
    if (
      !tokens.issuanceOrigin ||
      credentialOrigin(baseUrl) !== tokens.issuanceOrigin
    ) {
      return {
        definitive: false,
        valid: false,
        error: "Sign in at this backend to bind the session to its origin.",
      };
    }
    assertCredentialDestination(tokens.jwtToken, baseUrl);
    const response = await client.request<any>({
      url: `${baseUrl}/auth/me`,
      headers: {
        Authorization: `Bearer ${tokens.jwtToken}`,
        jwtSession: tokens.jwtToken,
      },
    });

    if (response.status === 200 && response.data?.authenticated === true) {
      return {
        definitive: true,
        valid: true,
        user:
          extractAuthenticatedUser(response.data) ||
          response.data.authenticatedPrincipalObject,
      };
    }

    return { definitive: true, valid: false };
  } catch (error) {
    Logger.log(`Token validation failed: ${error}`);
    const definitive =
      error instanceof ValkyrLabsApiError &&
      (error.status === 401 || error.status === 403);
    return {
      definitive,
      error: error instanceof Error ? error.message : String(error),
      valid: false,
    };
  }
};

/**
 * Secure token storage service for persistent authentication
 * Uses VSCode secrets for secure storage with fallback to localStorage
 */
export class TokenStorageService {
  private static instance: TokenStorageService;
  private context: vscode.ExtensionContext;
  private mutation: Promise<void> = Promise.resolve();

  private enqueueMutation(operation: () => Promise<void>): Promise<void> {
    const pending = this.mutation.then(operation, operation);
    this.mutation = pending.catch(() => undefined);
    return pending;
  }

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(
    context?: vscode.ExtensionContext,
  ): TokenStorageService {
    if (!TokenStorageService.instance) {
      if (!context) {
        throw new Error(
          "TokenStorageService requires context for initialization",
        );
      }
      TokenStorageService.instance = new TokenStorageService(context);
    }
    return TokenStorageService.instance;
  }

  /**
   * Store authentication tokens securely
   */
  async storeAuthTokens(
    tokens: AuthTokens,
    user?: AuthenticatedUser,
  ): Promise<void> {
    const revision = getCredentialRevision();
    return this.enqueueMutation(async () => {
      if (revision !== getCredentialRevision())
        throw new Error(
          "Sign-in was superseded by an account or backend change.",
        );
      await this.persistAuthTokens(tokens, user);
      if (revision !== getCredentialRevision())
        throw new Error(
          "Sign-in was superseded by an account or backend change.",
        );
    });
  }

  private async persistAuthTokens(
    tokens: AuthTokens,
    user?: AuthenticatedUser,
  ): Promise<void> {
    try {
      const origin = tokens.issuanceOrigin;
      if (!origin || credentialOrigin(getValkyraiBasePath()) !== origin)
        throw new Error(
          "The backend changed during sign-in. Retry at the selected destination.",
        );
      // Store JWT token in VSCode secrets (primary storage)
      await writeBoundCredential(
        this.context,
        "jwtToken",
        tokens.jwtToken,
        origin,
      );

      if (tokens.apiKey) {
        await writeBoundCredential(
          this.context,
          "valorideApiKey",
          tokens.apiKey,
          origin,
        );
      }

      if (tokens.refreshToken) {
        await writeBoundCredential(
          this.context,
          "refreshToken",
          tokens.refreshToken,
          origin,
        );
      }

      const tenantContext = extractTenantContext(user);
      if (tenantContext.tenantId) {
        await this.context.secrets.store(
          "tenantContext",
          JSON.stringify(tenantContext),
        );
      } else {
        await this.context.secrets.delete("tenantContext");
      }

      // Store complete auth state for restoration
      const authState: StoredAuthState = {
        tokens,
        user: user || ({} as AuthenticatedUser),
        timestamp: Date.now(),
      };

      await this.context.secrets.store("authState", JSON.stringify(authState));

      // Also store in localStorage if persistence is enabled (for webview access)
      try {
        const persistSetting = vscode.workspace
          .getConfiguration("valoride")
          .get<boolean>("persistJwt", true);
        if (persistSetting) {
          // This would be handled by the webview context, but we can set a flag
          await this.context.globalState.update("authPersistenceEnabled", true);
        }
      } catch (error) {
        Logger.log(
          `Warning: Could not update localStorage persistence: ${error}`,
        );
      }

      Logger.log("Authentication tokens stored successfully");
    } catch (error) {
      Logger.log(`Error storing authentication tokens: ${error}`);
      throw error;
    }
  }

  /**
   * Retrieve stored authentication tokens
   */
  async getStoredAuthTokens(): Promise<StoredAuthState | null> {
    const revision = getCredentialRevision();
    try {
      const authStateStr = await this.context.secrets.get("authState");
      if (!authStateStr) {
        const jwtToken = await readBoundCredential(this.context, "jwtToken");
        if (!jwtToken) {
          return null;
        }

        // Migrate installations that predate the canonical authState record.
        // Keeping the JWT in SecretStorage still requires live `/auth/me`
        // validation before the extension restores an authenticated session.
        const user =
          (this.context.globalState.get("authenticatedPrincipal") as
            | AuthenticatedUser
            | undefined) ||
          (this.context.globalState.get("userInfo") as
            | AuthenticatedUser
            | undefined) ||
          ({} as AuthenticatedUser);
        const migrated: StoredAuthState = {
          timestamp: Date.now(),
          tokens: {
            jwtToken,
            issuanceOrigin: credentialOrigin(getValkyraiBasePath()),
          },
          user,
        };
        if (revision !== getCredentialRevision()) return null;
        await this.context.secrets.store("authState", JSON.stringify(migrated));
        Logger.log("Migrated legacy JWT into stored authentication state");
        return revision === getCredentialRevision() ? migrated : null;
      }

      const authState: StoredAuthState = JSON.parse(authStateStr);
      if (
        revision !== getCredentialRevision() ||
        !authState.tokens?.issuanceOrigin ||
        authState.tokens.issuanceOrigin !==
          credentialOrigin(getValkyraiBasePath())
      )
        return null;
      // Canonical state is a recovery copy, not authority to rebind a token.
      if (
        (await readBoundCredential(
          this.context,
          "jwtToken",
          getValkyraiBasePath(),
          authState.tokens.jwtToken,
        )) !== authState.tokens.jwtToken ||
        revision !== getCredentialRevision()
      )
        return null;
      if (authState.tokens.refreshToken)
        await readBoundCredential(this.context, "refreshToken");

      // Validate token age (optional - tokens may have their own expiration)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      if (Date.now() - authState.timestamp > maxAge) {
        Logger.log("Stored authentication tokens are too old, clearing");
        await this.clearStoredTokens();
        return null;
      }

      return authState;
    } catch (error) {
      Logger.log(`Error retrieving stored authentication tokens: ${error}`);
      return null;
    }
  }

  /**
   * Validate stored tokens with the backend
   */
  async validateTokens(tokens: AuthTokens): Promise<TokenValidationResult> {
    // `/auth/me` is the canonical authenticated-session probe exposed by
    // ValkyrAI. The former `/auth/validate` route does not exist in the
    // production backend, so every restart incorrectly classified a live
    // token as invalid and erased it.
    return validateAuthSession(
      getValkyrLabsRtkApiClient(),
      getValkyraiBasePath(),
      tokens,
    );
  }

  /**
   * Refresh expired tokens if refresh token is available
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const baseUrl = getValkyraiBasePath();
      if (
        (await readBoundCredential(this.context, "refreshToken", baseUrl)) !==
        refreshToken
      )
        return null;
      assertCredentialDestination(refreshToken, baseUrl);
      const response = await getValkyrLabsRtkApiClient().request<any>({
        url: `${baseUrl}/auth/refresh`,
        method: "POST",
        json: { refreshToken },
      });

      const newTokens = buildAuthTokensFromResponse(
        response.data,
        withAuthResponseCookies(response.headers, response.setCookies),
      );
      if (response.status === 200 && newTokens) {
        return {
          ...newTokens,
          issuanceOrigin: credentialOrigin(baseUrl),
          refreshToken: newTokens.refreshToken || refreshToken,
        };
      }

      return null;
    } catch (error) {
      Logger.log(`Token refresh failed: ${error}`);
      return null;
    }
  }

  /**
   * Clear all stored authentication tokens
   */
  async clearStoredTokens(): Promise<void> {
    clearCredentialOrigins();
    return this.enqueueMutation(() => this.removeStoredTokens());
  }

  private async removeStoredTokens(): Promise<void> {
    try {
      for (const key of BACKEND_CREDENTIAL_KEYS)
        await writeBoundCredential(this.context, key, undefined);
      await this.context.secrets.delete("authState");
      await this.context.secrets.delete("tenantContext");
      await this.context.secrets.delete("authNonce");
      await this.context.secrets.delete("authNonceOrigin");
      await this.context.globalState.update(
        "authPersistenceEnabled",
        undefined,
      );

      Logger.log("All stored authentication tokens cleared");
    } catch (error) {
      Logger.log(`Error clearing stored tokens: ${error}`);
      throw error;
    }
  }

  /**
   * Check if authentication persistence is enabled
   */
  async isAuthPersistenceEnabled(): Promise<boolean> {
    try {
      return vscode.workspace
        .getConfiguration("valoride")
        .get<boolean>("persistJwt", true);
    } catch {
      return true; // Default to enabled
    }
  }

  /**
   * Get individual token from secure storage
   */
  async getJwtToken(): Promise<string | undefined> {
    const directToken = await readBoundCredential(this.context, "jwtToken");
    if (directToken) {
      return directToken;
    }

    // Account authentication stores one canonical authState alongside the
    // convenience jwtToken slot. Recover from that state so extension-host
    // commands cannot report "sign in" while the Account webview is already
    // authenticated. Repairing the convenience slot keeps later reads cheap.
    const authState = await this.getStoredAuthTokens();
    const recoveredToken = authState?.tokens?.jwtToken;
    if (recoveredToken) {
      await writeBoundCredential(
        this.context,
        "jwtToken",
        recoveredToken,
        authState?.tokens.issuanceOrigin,
      );
      Logger.log("Recovered JWT token from stored authentication state");
    }
    return recoveredToken;
  }

  async getApiKey(): Promise<string | undefined> {
    return readBoundCredential(this.context, "valorideApiKey");
  }
}
