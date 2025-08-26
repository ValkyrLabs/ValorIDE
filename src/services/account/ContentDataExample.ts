/**
 * Example usage of the fetchContentData method
 * This demonstrates how to use the ValorIDEAccountService to fetch data from the ContentData endpoint
 */

import { ValorIDEAccountService } from "./ValorIDEAccountService";
import { ExtensionMessage } from "@shared/ExtensionMessage";

/**
 * Example function showing how to use the fetchContentData method
 * @param accountService - Instance of ValorIDEAccountService
 * @returns Promise<any | undefined> - The content data from the endpoint
 */
export async function exampleFetchContentData(
  accountService: ValorIDEAccountService
): Promise<any | undefined> {
  try {
    console.log("Fetching content data from http://localhost:8080/ContentData...");
    
    // Call the fetchContentData method
    const contentData = await accountService.fetchContentData();
    
    if (contentData) {
      console.log("Successfully fetched content data:", contentData);
      return contentData;
    } else {
      console.log("No content data received or request failed");
      return undefined;
    }
  } catch (error) {
    console.error("Error in example fetch content data:", error);
    return undefined;
  }
}

/**
 * Example of how to create and use the ValorIDEAccountService
 * This would typically be done in your extension's main code
 */
export function createAccountServiceExample(): ValorIDEAccountService {
  // Example postMessageToWebview function
  const postMessageToWebview = async (message: ExtensionMessage): Promise<void> => {
    console.log("Posting message to webview:", message);
    // In real usage, this would send the message to the webview
  };

  // Example getValorIDEApiKey function
  const getValorIDEApiKey = async (): Promise<string | undefined> => {
    // In real usage, this would retrieve the JWT token from VSCode's secure storage
    // For this example, we'll return undefined to show error handling
    console.log("Retrieving ValorIDE API key from secure storage...");
    return undefined; // Replace with actual token retrieval
  };

  return new ValorIDEAccountService(postMessageToWebview, getValorIDEApiKey);
}

/**
 * Complete example showing the full workflow
 */
export async function completeContentDataExample(): Promise<void> {
  console.log("=== ContentData API Example ===");
  
  // Create the account service
  const accountService = createAccountServiceExample();
  
  // Fetch content data
  const result = await exampleFetchContentData(accountService);
  
  if (result) {
    console.log("Content data fetched successfully!");
    console.log("Data structure:", JSON.stringify(result, null, 2));
  } else {
    console.log("Failed to fetch content data. Check your JWT token and endpoint availability.");
  }
  
  console.log("=== Example Complete ===");
}
