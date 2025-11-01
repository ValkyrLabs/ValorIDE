import * as vscode from "vscode";
import { TokenStorageService, StoredAuthState } from "./TokenStorageService";
import { Logger } from "../logging/Logger";
import { updateGlobalState, storeSecret } from "../../core/storage/state";

export interface AuthRestorationResult {
  success: boolean;
  user?: any;
  tokens?: any;
  error?: string;
}

/**
 * Handles authentication restoration during extension startup
 */
export class StartupAuthService {
  private static instance: StartupAuthService;
  private context: vscode.ExtensionContext;
  private tokenStorage: TokenStorageService;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.tokenStorage = TokenStorageService.getInstance(context);
  }

  public static getInstance(context?: vscode.ExtensionContext): StartupAuthService {
    if (!StartupAuthService.instance) {
      if (!context) {
        throw new Error("StartupAuthService requires context for initialization");
      }
      StartupAuthService.instance = new StartupAuthService(context);
    }
    return StartupAuthService.instance;
  }

  /**
   * Attempt to restore authentication from stored tokens
   */
  async restoreAuthentication(): Promise<AuthRestorationResult> {
    try {
      Logger.log("Attempting to restore authentication from stored tokens...");

      // Check if auth persistence is enabled
      const persistenceEnabled = await this.tokenStorage.isAuthPersistenceEnabled();
      if (!persistenceEnabled) {
        Logger.log("Authentication persistence is disabled");
        return { success: false, error: "Authentication persistence disabled" };
      }

      // Get stored auth state
      const storedAuth = await this.tokenStorage.getStoredAuthTokens();
      if (!storedAuth) {
        Logger.log("No stored authentication tokens found");
        return { success: false, error: "No stored tokens" };
      }

      Logger.log("Found stored authentication tokens, validating...");

      // Validate tokens with backend
      const validation = await this.tokenStorage.validateTokens(storedAuth.tokens);
      if (!validation.valid) {
        // Try to refresh tokens if we have a refresh token
        if (storedAuth.tokens.refreshToken) {
          Logger.log("Tokens invalid, attempting to refresh...");
          const refreshedTokens = await this.tokenStorage.refreshTokens(storedAuth.tokens.refreshToken);
          
          if (refreshedTokens) {
            Logger.log("Tokens refreshed successfully");
            
            // Store refreshed tokens
            await this.tokenStorage.storeAuthTokens(refreshedTokens, storedAuth.user);
            
            // Update extension state with refreshed auth
            await this.updateExtensionAuthState(refreshedTokens, storedAuth.user);
            
            return {
              success: true,
              tokens: refreshedTokens,
              user: storedAuth.user
            };
          }
        }

        Logger.log("Token validation failed and refresh not possible, clearing stored tokens");
        await this.tokenStorage.clearStoredTokens();
        return { success: false, error: "Invalid tokens" };
      }

      Logger.log("Stored tokens are valid, restoring authentication state");

      // Update extension state with validated auth
      await this.updateExtensionAuthState(storedAuth.tokens, validation.user || storedAuth.user);

      return {
        success: true,
        tokens: storedAuth.tokens,
        user: validation.user || storedAuth.user
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.log(`Error during authentication restoration: ${errorMessage}`);
      
      // Clear potentially corrupted tokens
      try {
        await this.tokenStorage.clearStoredTokens();
      } catch (clearError) {
        Logger.log(`Error clearing tokens: ${clearError}`);
      }

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update extension state with authenticated user info
   */
  private async updateExtensionAuthState(tokens: any, user: any): Promise<void> {
    try {
      // Store tokens in VSCode secrets for other services
      await storeSecret(this.context, "jwtToken", tokens.jwtToken);
      if (tokens.apiKey) {
        await storeSecret(this.context, "valorideApiKey", tokens.apiKey);
      }

      // Update global state with user info
      await updateGlobalState(this.context, "userInfo", user);
      await updateGlobalState(this.context, "authenticatedPrincipal", user);
      await updateGlobalState(this.context, "isLoggedIn", true);

      // Set API provider to valoride if we have tokens
      if (tokens.apiKey) {
        await updateGlobalState(this.context, "apiProvider", "valoride");
      }

      Logger.log("Extension authentication state updated successfully");
    } catch (error) {
      Logger.log(`Error updating extension auth state: ${error}`);
      throw error;
    }
  }

  /**
   * Handle successful login by storing tokens securely
   */
  async handleSuccessfulLogin(tokens: any, user: any): Promise<void> {
    try {
      await this.tokenStorage.storeAuthTokens(tokens, user);
      await this.updateExtensionAuthState(tokens, user);
      Logger.log("Successful login handled and tokens stored");
    } catch (error) {
      Logger.log(`Error handling successful login: ${error}`);
      throw error;
    }
  }

  /**
   * Handle logout by clearing all stored tokens
   */
  async handleLogout(): Promise<void> {
    try {
      await this.tokenStorage.clearStoredTokens();
      
      // Clear extension state
      await updateGlobalState(this.context, "userInfo", undefined);
      await updateGlobalState(this.context, "authenticatedPrincipal", undefined);
      await updateGlobalState(this.context, "isLoggedIn", false);
      await storeSecret(this.context, "jwtToken", undefined);
      await storeSecret(this.context, "valorideApiKey", undefined);

      Logger.log("Logout handled and all tokens cleared");
    } catch (error) {
      Logger.log(`Error handling logout: ${error}`);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated (has valid tokens)
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const storedAuth = await this.tokenStorage.getStoredAuthTokens();
      if (!storedAuth) {
        return false;
      }

      const validation = await this.tokenStorage.validateTokens(storedAuth.tokens);
      return validation.valid;
    } catch {
      return false;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<any | null> {
    try {
      const storedAuth = await this.tokenStorage.getStoredAuthTokens();
      if (!storedAuth) {
        return null;
      }

      const validation = await this.tokenStorage.validateTokens(storedAuth.tokens);
      if (!validation.valid) {
        return null;
      }

      return validation.user || storedAuth.user;
    } catch {
      return null;
    }
  }
}
