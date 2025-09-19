import * as vscode from "vscode";
import axios from "axios";
import { Logger } from "../logging/Logger";

export interface AuthTokens {
  jwtToken: string;
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

/**
 * Secure token storage service for persistent authentication
 * Uses VSCode secrets for secure storage with fallback to localStorage
 */
export class TokenStorageService {
  private static instance: TokenStorageService;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public static getInstance(context?: vscode.ExtensionContext): TokenStorageService {
    if (!TokenStorageService.instance) {
      if (!context) {
        throw new Error("TokenStorageService requires context for initialization");
      }
      TokenStorageService.instance = new TokenStorageService(context);
    }
    return TokenStorageService.instance;
  }

  /**
   * Store authentication tokens securely
   */
  async storeAuthTokens(tokens: AuthTokens, user?: AuthenticatedUser): Promise<void> {
    try {
      // Store JWT token in VSCode secrets (primary storage)
      await this.context.secrets.store("jwtToken", tokens.jwtToken);
      
      if (tokens.apiKey) {
        await this.context.secrets.store("valorideApiKey", tokens.apiKey);
      }

      if (tokens.refreshToken) {
        await this.context.secrets.store("refreshToken", tokens.refreshToken);
      }

      // Store complete auth state for restoration
      const authState: StoredAuthState = {
        tokens,
        user: user || {} as AuthenticatedUser,
        timestamp: Date.now()
      };

      await this.context.secrets.store("authState", JSON.stringify(authState));

      // Also store in localStorage if persistence is enabled (for webview access)
      try {
        const persistSetting = vscode.workspace.getConfiguration("valoride").get<boolean>("persistJwt", true);
        if (persistSetting) {
          // This would be handled by the webview context, but we can set a flag
          await this.context.globalState.update("authPersistenceEnabled", true);
        }
      } catch (error) {
        Logger.log(`Warning: Could not update localStorage persistence: ${error}`);
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
    try {
      const authStateStr = await this.context.secrets.get("authState");
      if (!authStateStr) {
        return null;
      }

      const authState: StoredAuthState = JSON.parse(authStateStr);
      
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
  async validateTokens(tokens: AuthTokens): Promise<{ valid: boolean; user?: AuthenticatedUser }> {
    try {
      // Make a test API call to validate the JWT token
      const baseUrl = process.env.REACT_APP_BASE_PATH || "http://localhost:8080/v1";
      const response = await axios.get(`${baseUrl}/auth/validate`, {
        headers: {
          "Authorization": `Bearer ${tokens.jwtToken}`,
        },
        timeout: 10000
      });

      if (response.status === 200 && response.data.valid) {
        return {
          valid: true,
          user: response.data.user
        };
      }

      return { valid: false };
    } catch (error) {
      Logger.log(`Token validation failed: ${error}`);
      return { valid: false };
    }
  }

  /**
   * Refresh expired tokens if refresh token is available
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens | null> {
    try {
      const baseUrl = process.env.REACT_APP_BASE_PATH || "http://localhost:8080/v1";
      const response = await axios.post(`${baseUrl}/auth/refresh`, {
        refreshToken
      }, {
        timeout: 10000
      });

      if (response.status === 200 && response.data.token) {
        const newTokens: AuthTokens = {
          jwtToken: response.data.token,
          apiKey: response.data.apiKey,
          refreshToken: response.data.refreshToken || refreshToken,
          expiresAt: response.data.expiresAt
        };

        return newTokens;
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
    try {
      await this.context.secrets.delete("jwtToken");
      await this.context.secrets.delete("valorideApiKey");
      await this.context.secrets.delete("refreshToken");
      await this.context.secrets.delete("authState");
      await this.context.globalState.update("authPersistenceEnabled", undefined);
      
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
      return vscode.workspace.getConfiguration("valoride").get<boolean>("persistJwt", true);
    } catch {
      return true; // Default to enabled
    }
  }

  /**
   * Get individual token from secure storage
   */
  async getJwtToken(): Promise<string | undefined> {
    return await this.context.secrets.get("jwtToken");
  }

  async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get("valorideApiKey");
  }
}
