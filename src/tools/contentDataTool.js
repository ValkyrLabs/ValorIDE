/**
 * MCP Tool for fetching ContentData from the backend API
 * This tool can be used within ValorIDE to fetch data from the ContentData endpoint
 */
import { ValorIDEAccountService } from "../services/account/ValorIDEAccountService";
/**
 * ContentData MCP Tool
 * Provides a simple interface to fetch data from the ContentData endpoint
 */
export class ContentDataTool {
    accountService;
    constructor(postMessageToWebview, getValorIDEApiKey) {
        this.accountService = new ValorIDEAccountService(postMessageToWebview, getValorIDEApiKey);
    }
    /**
     * Fetch content data from the backend API
     * @returns Promise<any> - The content data or error information
     */
    async fetchContentData() {
        try {
            const contentData = await this.accountService.fetchContentData();
            if (contentData) {
                return {
                    success: true,
                    data: contentData
                };
            }
            else {
                return {
                    success: false,
                    error: "No data received from ContentData endpoint"
                };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            return {
                success: false,
                error: `Failed to fetch ContentData: ${errorMessage}`
            };
        }
    }
    /**
     * Get tool definition for MCP registration
     */
    static getToolDefinition() {
        return {
            name: "fetch_content_data",
            description: "Fetch data from the ContentData endpoint using JWT authentication",
            inputSchema: {
                type: "object",
                properties: {},
                required: []
            }
        };
    }
}
/**
 * Factory function to create the ContentData tool
 * This would be used in the main extension code to register the tool
 */
export function createContentDataTool(postMessageToWebview, getValorIDEApiKey) {
    return new ContentDataTool(postMessageToWebview, getValorIDEApiKey);
}
/**
 * Example usage function that demonstrates how to use the tool
 */
export async function exampleUsage() {
    // This would typically be called from the extension's main code
    console.log("Example: Using ContentData Tool");
    // Mock functions for demonstration
    const mockPostMessage = async (message) => {
        console.log("Mock: Posting message to webview:", message.type);
    };
    const mockGetApiKey = async () => {
        console.log("Mock: Getting API key from secure storage");
        return undefined; // In real usage, this would return the actual JWT token
    };
    // Create and use the tool
    const tool = createContentDataTool(mockPostMessage, mockGetApiKey);
    const result = await tool.fetchContentData();
    console.log("Tool result:", result);
}
//# sourceMappingURL=contentDataTool.js.map