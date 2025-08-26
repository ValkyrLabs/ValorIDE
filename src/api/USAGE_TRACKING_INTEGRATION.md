# API Usage Tracking Integration Guide

This guide explains how to integrate API usage tracking into ValorIDE API providers using the existing ThorAPI backend system.

## Overview

The usage tracking system consists of:

1. **Extension-side UsageTrackingService** - Collects usage data and sends to webview
2. **Webview UsageTrackingHandler** - Receives messages and submits via RTQ to ThorAPI backend
3. **ThorAPI Backend Services** - UsageTransaction and BalanceResponse models with full CRUD operations
4. **API Integration Utilities** - Helper functions for easy integration

## Architecture

```
API Provider → trackApiUsage() → UsageTrackingService → WebView → RTQ → ThorAPI Backend
```

## Integration Steps

### 1. Import the Usage Tracking Utility

```typescript
import { trackApiUsageWithPricing } from "../usage-tracking";
```

### 2. Track Usage in API Providers

When your API provider receives usage information (typically in the stream), call the tracking function:

```typescript
// Example from OpenAI provider
if (chunk.usage) {
  // Yield usage to the stream (existing functionality)
  yield {
    type: "usage",
    inputTokens: chunk.usage.prompt_tokens || 0,
    outputTokens: chunk.usage.completion_tokens || 0,
  };

  // Track usage for billing/analytics (NEW)
  await trackApiUsageWithPricing(
    'openai',
    modelId,
    chunk.usage.prompt_tokens || 0,
    chunk.usage.completion_tokens || 0
  );
}
```

### 3. Manual Usage Tracking

For providers that don't provide usage in the stream, you can track manually:

```typescript
import { trackApiUsage, getModelPricing } from "../usage-tracking";

// After API call completion
const pricing = getModelPricing('anthropic', 'claude-3-5-sonnet-20241022');
await trackApiUsage(
  'anthropic',
  'claude-3-5-sonnet-20241022',
  estimatedInputTokens,
  estimatedOutputTokens,
  pricing.inputCost,
  pricing.outputCost
);
```

## Available Functions

### `trackApiUsageWithPricing(provider, model, inputTokens, outputTokens)`

Automatically looks up pricing and tracks usage. Recommended for most use cases.

**Parameters:**
- `provider`: string - Provider name (e.g., 'openai', 'anthropic', 'gemini')
- `model`: string - Model identifier
- `inputTokens`: number - Number of input tokens
- `outputTokens`: number - Number of output tokens

### `trackApiUsage(provider, model, inputTokens, outputTokens, inputCost?, outputCost?)`

Track usage with custom pricing.

### `getModelPricing(provider, model)`

Get pricing information for a specific model.

**Returns:** `{ inputCost: number; outputCost: number }`

## Supported Providers

The system includes built-in pricing for:

- **OpenAI**: GPT-4o, GPT-4o-mini, GPT-4-turbo, GPT-4, GPT-3.5-turbo, o1-preview, o1-mini
- **Anthropic**: Claude-3.5-sonnet, Claude-3.5-haiku, Claude-3-opus, Claude-3-sonnet, Claude-3-haiku
- **Google**: Gemini-1.5-pro, Gemini-1.5-flash

For unsupported providers/models, default fallback pricing is used.

## Data Flow

1. **API Provider** calls `trackApiUsage()` with usage data
2. **UsageTrackingService** creates a transaction ID and sends message to webview
3. **UsageTrackingHandler** (React component) receives message and calls RTQ service
4. **RTQ Service** (UsageTransactionService) submits to ThorAPI backend
5. **ThorAPI Backend** stores in database with full audit trail
6. **Response** flows back through the chain to confirm success

## Error Handling

- Usage tracking failures are logged but don't break API functionality
- Timeouts are handled gracefully (10-second default)
- Missing webview instances are handled with warnings

## Backend Integration

The system uses existing ThorAPI models:

### UsageTransaction Model
```typescript
{
  spentAt: Date;
  credits: number;
  modelProvider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  // Plus standard ThorAPI audit fields (id, ownerId, createdDate, etc.)
}
```

### BalanceResponse Model
```typescript
{
  currentBalance: number;
  // Plus standard ThorAPI audit fields
}
```

## Example Integration

Here's a complete example for a new API provider:

```typescript
import { trackApiUsageWithPricing } from "../usage-tracking";

export class MyApiHandler implements ApiHandler {
  async *createMessage(systemPrompt: string, messages: MessageParam[]): ApiStream {
    const modelId = this.options.modelId ?? "";
    
    // Make API call
    const stream = await this.client.chat.completions.create({
      model: modelId,
      messages: convertedMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      // Handle content
      if (chunk.choices[0]?.delta?.content) {
        yield {
          type: "text",
          text: chunk.choices[0].delta.content,
        };
      }

      // Handle usage and track it
      if (chunk.usage) {
        const inputTokens = chunk.usage.prompt_tokens || 0;
        const outputTokens = chunk.usage.completion_tokens || 0;

        // Yield usage info (existing pattern)
        yield {
          type: "usage",
          inputTokens,
          outputTokens,
        };

        // Track usage for billing (NEW)
        await trackApiUsageWithPricing(
          'my-provider',
          modelId,
          inputTokens,
          outputTokens
        );
      }
    }
  }
}
```

## Configuration

### Adding New Model Pricing

Update the pricing table in `src/api/usage-tracking.ts`:

```typescript
const pricing = {
  'my-provider': {
    'my-model-v1': { inputCost: 0.000001, outputCost: 0.000002 },
    'my-model-v2': { inputCost: 0.000002, outputCost: 0.000004 },
  },
  // ... existing providers
};
```

### Environment Variables

The system uses the existing ThorAPI authentication and configuration. No additional environment variables are required.

## Testing

To test the integration:

1. Make API calls through ValorIDE
2. Check browser console for usage tracking logs
3. Verify data appears in ThorAPI backend (UsageTransaction table)
4. Check for any error messages in the extension console

## Troubleshooting

**Common Issues:**

1. **"No visible webview instance"** - Ensure ValorIDE webview is open and visible
2. **"Timeout waiting for response"** - Check ThorAPI backend connectivity
3. **"Failed to submit usage transaction"** - Verify ThorAPI authentication and permissions

**Debug Steps:**

1. Check extension console for error messages
2. Verify webview is properly initialized
3. Test ThorAPI backend connectivity
4. Check network requests in browser dev tools

## Future Enhancements

- Real-time balance updates in UI
- Usage analytics dashboard
- Cost alerts and budgeting
- Usage export functionality
- Integration with external billing systems
