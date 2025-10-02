import { WebviewProvider } from "../core/webview";
import { UsageTrackingService } from "../services/usage-tracking/UsageTrackingService";

/**
 * Utility function to track API usage from API providers
 */
export async function trackApiUsage(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costPerInputToken?: number,
  costPerOutputToken?: number
): Promise<void> {
  try {
    // Get the visible webview instance to access the usage tracking service
    const webviewProvider = WebviewProvider.getVisibleInstance();
    if (!webviewProvider) {
      console.warn('No visible webview instance available for usage tracking');
      return;
    }

    const usageTrackingService = webviewProvider.getUsageTrackingService();
    
    // Calculate credits based on provider and model
    let credits = 0;
    
    switch (provider.toLowerCase()) {
      case 'openai':
        await usageTrackingService.trackOpenAIUsage(
          model,
          inputTokens,
          outputTokens,
          costPerInputToken,
          costPerOutputToken
        );
        return;
        
      case 'anthropic':
        await usageTrackingService.trackAnthropicUsage(
          model,
          inputTokens,
          outputTokens,
          costPerInputToken,
          costPerOutputToken
        );
        return;
        
      default:
        // For other providers, calculate credits manually or use default rates
        const inputCost = costPerInputToken || 0.00001; // Default fallback
        const outputCost = costPerOutputToken || 0.00002; // Default fallback
        credits = (inputTokens * inputCost) + (outputTokens * outputCost);
        
        await usageTrackingService.trackGenericUsage(
          provider,
          model,
          inputTokens,
          outputTokens,
          credits
        );
        break;
    }
  } catch (error) {
    console.error('Failed to track API usage:', error);
    // Don't throw - usage tracking should not break the main functionality
  }
}

/**
 * Get pricing information for different models
 * This could be moved to a configuration file or fetched from an API
 */
export function getModelPricing(provider: string, model: string): { inputCost: number; outputCost: number } {
  const pricing: Record<string, Record<string, { inputCost: number; outputCost: number }>> = {
    openai: {
      'gpt-4o': { inputCost: 0.0000025, outputCost: 0.00001 },
      'gpt-4o-mini': { inputCost: 0.00000015, outputCost: 0.0000006 },
      'gpt-4-turbo': { inputCost: 0.00001, outputCost: 0.00003 },
      'gpt-4': { inputCost: 0.00003, outputCost: 0.00006 },
      'gpt-3.5-turbo': { inputCost: 0.0000005, outputCost: 0.0000015 },
      'o1-preview': { inputCost: 0.000015, outputCost: 0.00006 },
      'o1-mini': { inputCost: 0.000003, outputCost: 0.000012 },
    },
    anthropic: {
      'claude-sonnet-4-5-20250929': { inputCost: 0.000003, outputCost: 0.000015 }, // Claude Sonnet 4.5
      'claude-3-5-sonnet-20241022': { inputCost: 0.000003, outputCost: 0.000015 },
      'claude-3-5-haiku-20241022': { inputCost: 0.000001, outputCost: 0.000005 },
      'claude-3-opus-20240229': { inputCost: 0.000015, outputCost: 0.000075 },
      'claude-3-sonnet-20240229': { inputCost: 0.000003, outputCost: 0.000015 },
      'claude-3-haiku-20240307': { inputCost: 0.00000025, outputCost: 0.00000125 },
    },
    gemini: {
      'gemini-1.5-pro': { inputCost: 0.00000125, outputCost: 0.000005 },
      'gemini-1.5-flash': { inputCost: 0.000000075, outputCost: 0.0000003 },
    },
  };

  const providerPricing = pricing[provider.toLowerCase()];
  if (!providerPricing) {
    // Default fallback pricing
    return { inputCost: 0.00001, outputCost: 0.00002 };
  }

  const modelPricing = providerPricing[model.toLowerCase()];
  if (!modelPricing) {
    // Default fallback pricing for unknown models
    return { inputCost: 0.00001, outputCost: 0.00002 };
  }

  return modelPricing;
}

/**
 * Track usage with automatic pricing lookup
 */
export async function trackApiUsageWithPricing(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const pricing = getModelPricing(provider, model);
  await trackApiUsage(
    provider,
    model,
    inputTokens,
    outputTokens,
    pricing.inputCost,
    pricing.outputCost
  );
}
