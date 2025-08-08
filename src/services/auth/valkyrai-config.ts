import * as vscode from "vscode"

export interface ValkyrAIAuthConfig {
	token?: string
	environment: string
	apiEndpoint: string
}

export class ValkyrAIAuthConfig {
	private static readonly CONFIG_SECTION = "valkyrai"
	private static readonly TOKEN_KEY = "valkyrai-token"

	static getConfig(): ValkyrAIAuthConfig {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION)
		return {
			environment: config.get("environment", "production"),
			apiEndpoint: config.get("apiEndpoint", "https://api.valkyrai.com"),
		}
	}

	static async setToken(context: vscode.ExtensionContext, token: string) {
		await context.secrets.store(this.TOKEN_KEY, token)
	}

	static async getToken(context: vscode.ExtensionContext): Promise<string | undefined> {
		return await context.secrets.get(this.TOKEN_KEY)
	}

	static async clearToken(context: vscode.ExtensionContext) {
		await context.secrets.delete(this.TOKEN_KEY)
	}

	static async updateConfig(settings: Partial<ValkyrAIAuthConfig>) {
		const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION)

		if (settings.environment) {
			await config.update("environment", settings.environment, true)
		}

		if (settings.apiEndpoint) {
			await config.update("apiEndpoint", settings.apiEndpoint, true)
		}
	}
}
