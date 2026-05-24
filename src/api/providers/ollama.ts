import { Anthropic } from "@anthropic-ai/sdk";
import { Message, Ollama } from "ollama";
import { ApiHandler } from "../";
import { ApiHandlerOptions, ModelInfo } from "../../shared/api";
import { convertToOllamaMessages } from "../transform/ollama-format";
import { ApiStream } from "../transform/stream";
import { withRetry } from "../retry";
import {
  getOllamaModelInfo,
  resolveOllamaRequestTimeoutMs,
  streamOllamaChatResponse,
} from "./ollama-runtime";

/**
 * Enhanced Ollama Handler with improved timeout, streaming, and configuration support
 * Supports:
 * - Configurable request timeouts (default: 60000ms)
 * - Advanced model options (temperature, top_p, top_k, repeat_penalty, etc.)
 * - Keep-alive configuration for persistent connections
 * - Comprehensive token statistics tracking
 * - Better streaming with chunk optimization
 * - Improved error handling and logging
 */
export class OllamaHandler implements ApiHandler {
  private options: ApiHandlerOptions;
  private client: Ollama;
  private readonly clientCache: Map<string, Ollama> = new Map();

  constructor(options: ApiHandlerOptions) {
    this.options = options;
    const baseUrl = this.options.ollamaBaseUrl || "http://localhost:11434";

    // Initialize client with enhanced configuration
    this.client = this.createOllamaClient(baseUrl);
  }

  /**
   * Create or retrieve cached Ollama client with proper configuration
   */
  private createOllamaClient(baseUrl: string): Ollama {
    if (this.clientCache.has(baseUrl)) {
      return this.clientCache.get(baseUrl)!;
    }

    // Create custom fetch with proper keep-alive and streaming support
    const customFetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const modifiedInit: RequestInit = {
        ...init,
        // Enable keep-alive for connection pooling
        headers: {
          ...(init?.headers as Record<string, string>),
          Connection: "keep-alive",
          // Disable compression for faster streaming
          "Accept-Encoding": "identity",
        },
      };
      return fetch(input, modifiedInit);
    };

    const client = new Ollama({
      host: baseUrl,
      fetch: customFetch,
    });

    this.clientCache.set(baseUrl, client);
    return client;
  }

  /**
   * Get request timeout from options (milliseconds)
   * Default: 600000ms (10 minutes), configurable up to 60 minutes.
   * This guards only stream initialization. Once Ollama starts streaming,
   * slow-but-steady local generation is allowed to continue.
   */
  private getRequestTimeout(): number {
    return resolveOllamaRequestTimeoutMs(this.options.ollamaRequestTimeout);
  }

  getApiStreamStartTimeoutMs(): number {
    return this.getRequestTimeout();
  }

  /**
   * Build Ollama-specific options from handler configuration
   */
  private buildOllamaOptions(): Record<string, any> {
    const options: Record<string, any> = {
      num_ctx: Number(this.options.ollamaApiOptionsCtxNum) || 32768,
    };

    this.parseTemperatureOption(options);
    this.parseTopPOption(options);
    this.parseTopKOption(options);
    this.parseRepeatPenaltyOption(options);
    this.parseNumPredictOption(options);
    this.parseMirostatOption(options);

    return options;
  }

  private parseTemperatureOption(options: Record<string, any>): void {
    if (this.options.ollamaTemperature !== undefined) {
      const temp = Number.parseFloat(this.options.ollamaTemperature);
      if (!Number.isNaN(temp) && temp >= 0 && temp <= 2) {
        options.temperature = temp;
      }
    }
  }

  private parseTopPOption(options: Record<string, any>): void {
    if (this.options.ollamaTopP !== undefined) {
      const topP = Number.parseFloat(this.options.ollamaTopP);
      if (!Number.isNaN(topP) && topP > 0 && topP <= 1) {
        options.top_p = topP;
      }
    }
  }

  private parseTopKOption(options: Record<string, any>): void {
    if (this.options.ollamaTopK !== undefined) {
      const topK = Number.parseInt(this.options.ollamaTopK, 10);
      if (!Number.isNaN(topK) && topK > 0) {
        options.top_k = topK;
      }
    }
  }

  private parseRepeatPenaltyOption(options: Record<string, any>): void {
    if (this.options.ollamaRepeatPenalty !== undefined) {
      const penalty = Number.parseFloat(this.options.ollamaRepeatPenalty);
      if (!Number.isNaN(penalty) && penalty > 0) {
        options.repeat_penalty = penalty;
      }
    }
  }

  private parseNumPredictOption(options: Record<string, any>): void {
    if (this.options.ollamaNumPredict !== undefined) {
      const numPredict = Number.parseInt(this.options.ollamaNumPredict, 10);
      if (!Number.isNaN(numPredict)) {
        options.num_predict = numPredict;
      }
    }
  }

  private parseMirostatOption(options: Record<string, any>): void {
    if (this.options.ollamaMirostat !== undefined) {
      const mirostat = Number.parseInt(this.options.ollamaMirostat, 10);
      if (!Number.isNaN(mirostat) && [0, 1, 2].includes(mirostat)) {
        options.mirostat = mirostat;
      }
    }
  }

  @withRetry({ retryAllErrors: true, maxRetries: 3 })
  async *createMessage(
    systemPrompt: string,
    messages: Anthropic.Messages.MessageParam[],
  ): ApiStream {
    const ollamaMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...convertToOllamaMessages(messages),
    ];

    const modelId = this.getModel().id;
    const timeout = this.getRequestTimeout();
    const ollamaOptions = this.buildOllamaOptions();

    try {
      console.debug(
        `[Ollama] Starting request for model: ${modelId}, timeout: ${timeout}ms`,
      );

      const stream = await this.createStreamWithTimeout(
        modelId,
        ollamaMessages,
        ollamaOptions,
        timeout,
      );
      yield* streamOllamaChatResponse(stream, {
        modelId,
        contextWindow: this.getModel().info.contextWindow,
      });
    } catch (error: any) {
      throw this.enhanceFinalError(error, modelId);
    }
  }

  private async createStreamWithTimeout(
    modelId: string,
    ollamaMessages: Message[],
    ollamaOptions: Record<string, any>,
    timeout: number,
  ): Promise<AsyncIterable<any>> {
    // Initialize the stream directly without timeout race condition on initial request
    // This prevents timing out during stream setup
    try {
      console.debug(
        `[Ollama] Initiating streaming request for model: ${modelId}`,
      );

      let timeoutHandle: NodeJS.Timeout | undefined;
      const stream = await Promise.race([
        this.client.chat({
          model: modelId,
          messages: ollamaMessages,
          stream: true,
          options: ollamaOptions,
          keep_alive: this.options.ollamaKeepAlive || "30m",
        }),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(
            () => {
              const error: any = new Error(
                `Ollama stream initialization timed out after ${timeout}ms`,
              );
              error.code = "OLLAMA_INIT_TIMEOUT";
              reject(error);
            },
            Math.max(timeout, 30000),
          ); // At least 30s for initialization
        }),
      ]);

      if (timeoutHandle) clearTimeout(timeoutHandle);

      return stream;
    } catch (error: any) {
      console.error(
        `[Ollama] Stream initialization error for ${modelId}:`,
        error,
      );
      throw this.enhanceOllamaError(error, modelId);
    }
  }

  /**
   * Enhance Ollama API errors with context and debugging info
   */
  private enhanceOllamaError(error: any, modelId: string): Error {
    const enhanced: any = {
      message: error.message || "Ollama API request failed",
      originalError: error,
      modelId,
      timestamp: new Date().toISOString(),
    };

    // Handle connection errors
    if (
      error.code === "ECONNREFUSED" ||
      error.message?.includes("Connection refused")
    ) {
      return new Error(
        `Ollama server is not running at ${this.options.ollamaBaseUrl || "http://localhost:11434"}. ` +
          `Please start Ollama service. (${error.message})`,
      );
    }

    // Handle model not found errors
    if (
      error.status === 404 ||
      error.message?.includes("model not found") ||
      error.message?.includes("model does not exist")
    ) {
      return new Error(
        `Ollama model '${modelId}' not found. ` +
          `Please run 'ollama pull ${modelId}' first.`,
      );
    }

    // Handle memory/OOM errors
    if (
      error.message?.includes("out of memory") ||
      error.message?.includes("OOM") ||
      error.status === 502
    ) {
      return new Error(
        `Ollama ran out of memory. Try using a smaller model or increase available system memory.`,
      );
    }

    console.error("[Ollama] Enhanced error context:", enhanced);
    return new Error(
      `Ollama API error (${error.status || "unknown"}): ${enhanced.message}`,
    );
  }

  /**
   * Enhance final error with actionable guidance
   */
  private enhanceFinalError(error: any, modelId: string): Error {
    // If it's already a well-formed error, pass through
    if (error.message?.includes("Ollama")) {
      return error;
    }

    const statusCode = error.status || error.statusCode;
    const baseError = error.message || "Unknown error";
    const statusInfo = statusCode ? ` (${statusCode})` : "";

    return new Error(
      `Ollama request failed for model '${modelId}'. Error: ${baseError}${statusInfo}. ` +
        `Check your Ollama configuration and system resources.`,
    );
  }

  getModel(): { id: string; info: ModelInfo } {
    return {
      id: this.options.ollamaModelId || "",
      info: getOllamaModelInfo(
        this.options.ollamaModelId,
        this.options.ollamaApiOptionsCtxNum,
      ),
    };
  }
}
