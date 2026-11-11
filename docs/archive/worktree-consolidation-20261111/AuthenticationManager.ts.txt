import * as vscode from "vscode";
import crypto from "crypto";
import { ValorIDEAccountService } from "@services/account/ValorIDEAccountService";
import { ApiProvider } from "@shared/api";
import { buildApiHandler } from "@api/index";
import { 
  getSecret, 
  storeSecret, 
  updateGlobalState, 
  getAllExtensionState 
} from "../storage/state";

export class AuthenticationManager {
  private latestAnnouncementId = "april-18-2025_21:15::00";

  constructor(
    private context: vscode.ExtensionContext,
    private accountService: ValorIDEAccountService,
    private postMessageToWebview: (message: any) => Promise<void>,
    private postStateToWebview: () => Promise<void>
  ) {}

  async handleSignOut() {
    try {
      // Clear all authentication-related secrets
      await storeSecret(this.context, "valorideApiKey", undefined);
      await storeSecret(this.context, "jwtToken", undefined);

      // Clear all authentication-related global state
      await updateGlobalState(this.context, "userInfo", undefined);
      await updateGlobalState(this.context, "authenticatedPrincipal", undefined);
      await updateGlobalState(this.context, "isLoggedIn", false);

      // Reset API provider to default
      await updateGlobalState(this.context, "apiProvider", "openrouter");

      await this.postStateToWebview();
      vscode.window.showInformationMessage("Successfully logged out of ValorIDE");
    } catch (error) {
      vscode.window.showErrorMessage("Logout failed");
    }
  }

  async setUserInfo(info?: {
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
  }) {
    await updateGlobalState(this.context, "userInfo", info);
  }

  async validateAuthState(state: string | null): Promise<boolean> {
    const storedNonce = await getSecret(this.context, "authNonce");
    if (!state || state !== storedNonce) {
      return false;
    }
    await storeSecret(this.context, "authNonce", undefined); // Clear after use
    return true;
  }

  async handleAuthCallback(
    customToken: string,
    apiKey: string,
    authenticatedPrincipal?: any,
  ) {
    try {
      // Store API key for API calls
      await storeSecret(this.context, "valorideApiKey", apiKey);

      // Store JWT token for ThorAPI requests
      await storeSecret(this.context, "jwtToken", customToken);

      // Store authenticated principal in backend state
      if (authenticatedPrincipal) {
        await updateGlobalState(this.context, "userInfo", authenticatedPrincipal);
        await updateGlobalState(this.context, "authenticatedPrincipal", authenticatedPrincipal);
      }

      // Store authentication state flags
      await updateGlobalState(this.context, "isLoggedIn", true);

      // Send login success message to webview with all auth data
      await this.postMessageToWebview({
        type: "loginSuccess",
        token: customToken,
        authenticatedPrincipal: authenticatedPrincipal
          ? JSON.stringify(authenticatedPrincipal)
          : undefined,
      });

      const valorideProvider: ApiProvider = "valoride";
      await updateGlobalState(this.context, "apiProvider", valorideProvider);

      // Update API configuration with the new provider and API key
      const { apiConfiguration } = await getAllExtensionState(this.context);
      const updatedConfig = {
        ...apiConfiguration,
        apiProvider: valorideProvider,
        valorideApiKey: apiKey,
      };

      await this.postStateToWebview();
    } catch (error) {
      console.error("Failed to handle auth callback:", error);
      vscode.window.showErrorMessage("Failed to log in to ValorIDE");
    }
  }

  async handleAccountLogin() {
    // Generate nonce for state validation
    const nonce = crypto.randomBytes(32).toString("hex");
    await storeSecret(this.context, "authNonce", nonce);

    // Open browser for authentication with state param
    console.log("Login button clicked in account page");
    console.log("Opening auth page with state param");

    const authUrl = vscode.Uri.parse(`https://valkyrlabs.com/sign-up`);
    vscode.env.openExternal(authUrl);
  }

  async fetchUserCreditsData() {
    try {
      await Promise.all([
        this.accountService?.fetchBalance(),
        this.accountService?.fetchUsageTransactions(),
        this.accountService?.fetchPaymentTransactions(),
      ]);
    } catch (error) {
      console.error("Failed to fetch user credits data:", error);
    }
  }

  async handleDidShowAnnouncement() {
    await updateGlobalState(
      this.context,
      "lastShownAnnouncementId",
      this.latestAnnouncementId,
    );
    await this.postStateToWebview();
  }

  getLatestAnnouncementId(): string {
    return this.latestAnnouncementId;
  }
}
