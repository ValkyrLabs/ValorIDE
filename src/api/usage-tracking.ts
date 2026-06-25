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
  costPerOutputToken?: number,
): Promise<void> {
  try {
    // Get the visible webview instance to access the usage tracking service
    const webviewProvider = WebviewProvider.getVisibleInstance();
    if (!webviewProvider) {
      console.warn("No visible webview instance available for usage tracking");
      return;
    }

    const usageTrackingService = webviewProvider.getUsageTrackingService();

    // Calculate credits based on provider and model
    let credits = 0;

    switch (provider.toLowerCase()) {
      case "openai":
        await usageTrackingService.trackOpenAIUsage(
          model,
          inputTokens,
          outputTokens,
          costPerInputToken,
          costPerOutputToken,
        );
        return;

      case "anthropic":
        await usageTrackingService.trackAnthropicUsage(
          model,
          inputTokens,
          outputTokens,
          costPerInputToken,
          costPerOutputToken,
        );
        return;

      default:
        // For other providers, calculate credits manually or use default rates
        const inputCost = costPerInputToken || 0.00001; // Default fallback
        const outputCost = costPerOutputToken || 0.00002; // Default fallback
        credits = inputTokens * inputCost + outputTokens * outputCost;

        await usageTrackingService.trackGenericUsage(
          provider,
          model,
          inputTokens,
          outputTokens,
          credits,
        );
        break;
    }
  } catch (error) {
    console.error("Failed to track API usage:", error);
    // Don't throw - usage tracking should not break the main functionality
  }
}

/**
 * Get pricing information for different models
 * This could be moved to a configuration file or fetched from an API
 */
export function getModelPricing(
  provider: string,
  model: string,
): { inputCost: number; outputCost: number } {
  const pricing: Record<
    string,
    Record<string, { inputCost: number; outputCost: number }>
  > = {
    openai: {
      "gpt-5.5": { inputCost: 0.000005, outputCost: 0.00003 },
      "gpt-5.4": { inputCost: 0.0000025, outputCost: 0.000015 },
      "gpt-5.4-mini": { inputCost: 0.00000075, outputCost: 0.0000045 },
      "gpt-5.4-nano": { inputCost: 0.0000002, outputCost: 0.00000125 },
    },
    anthropic: {
      "claude-opus-4-8": {
        inputCost: 0.000005,
        outputCost: 0.000025,
      },
      "claude-sonnet-4-6": {
        inputCost: 0.000003,
        outputCost: 0.000015,
      },
      "claude-haiku-4-5-20251001": {
        inputCost: 0.000001,
        outputCost: 0.000005,
      },
    },
    gemini: {
      "gemini-3-pro-preview": { inputCost: 0.000002, outputCost: 0.000018 },
      "gemini-1.5-pro": { inputCost: 0.00000125, outputCost: 0.000005 },
      "gemini-1.5-flash": { inputCost: 0.000000075, outputCost: 0.0000003 },
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
  outputTokens: number,
): Promise<void> {
  const pricing = getModelPricing(provider, model);
  await trackApiUsage(
    provider,
    model,
    inputTokens,
    outputTokens,
    pricing.inputCost,
    pricing.outputCost,
  );
}
