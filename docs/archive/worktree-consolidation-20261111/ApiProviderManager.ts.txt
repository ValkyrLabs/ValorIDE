import axios from "axios";
import type { AxiosRequestConfig } from "axios";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs/promises";
import { ApiProvider, ModelInfo } from "@shared/api";
import { buildApiHandler } from "@api/index";
import { 
  getSecret, 
  storeSecret, 
  updateGlobalState, 
  getAllExtensionState 
} from "../storage/state";
import { fileExistsAtPath } from "@utils/fs";
import { GlobalFileNames } from "../storage/disk";

export class ApiProviderManager {
  constructor(
    private context: vscode.ExtensionContext,
    private postMessageToWebview: (message: any) => Promise<void>,
    private postStateToWebview: () => Promise<void>
  ) {}

  // OpenRouter
  async handleOpenRouterCallback(code: string) {
    let apiKey: string;
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/auth/keys",
        { code },
      );
      if (response.data && response.data.key) {
        apiKey = response.data.key;
      } else {
        throw new Error("Invalid response from OpenRouter API");
      }
    } catch (error) {
      console.error("Error exchanging code for API key:", error);
      throw error;
    }

    const openrouter: ApiProvider = "openrouter";
    await updateGlobalState(this.context, "apiProvider", openrouter);
    await storeSecret(this.context, "openRouterApiKey", apiKey);
    await this.postStateToWebview();
  }

  private async ensureCacheDirectoryExists(): Promise<string> {
    const cacheDir = path.join(this.context.globalStorageUri.fsPath, "cache");
    await fs.mkdir(cacheDir, { recursive: true });
    return cacheDir;
  }

  async readOpenRouterModels(): Promise<Record<string, ModelInfo> | undefined> {
    const openRouterModelsFilePath = path.join(
      await this.ensureCacheDirectoryExists(),
      GlobalFileNames.openRouterModels,
    );
    const fileExists = await fileExistsAtPath(openRouterModelsFilePath);
    if (fileExists) {
      const fileContents = await fs.readFile(openRouterModelsFilePath, "utf8");
      return JSON.parse(fileContents);
    }
    return undefined;
  }

  async refreshOpenRouterModels() {
    const openRouterModelsFilePath = path.join(
      await this.ensureCacheDirectoryExists(),
      GlobalFileNames.openRouterModels,
    );

    let models: Record<string, ModelInfo> = {};
    try {
      const response = await axios.get("https://openrouter.ai/api/v1/models");
      if (response.data?.data) {
        const rawModels = response.data.data;
        const parsePrice = (price: any) => {
          if (price) {
            return parseFloat(price) * 1_000_000;
          }
          return undefined;
        };
        for (const rawModel of rawModels) {
          const modelInfo: ModelInfo = {
            maxTokens: rawModel.top_provider?.max_completion_tokens,
            contextWindow: rawModel.context_length,
            supportsImages: rawModel.architecture?.modality?.includes("image"),
            supportsPromptCache: false,
            inputPrice: parsePrice(rawModel.pricing?.prompt),
            outputPrice: parsePrice(rawModel.pricing?.completion),
            description: rawModel.description,
          };

          switch (rawModel.id) {
            case "anthropic/claude-3-7-sonnet":
            case "anthropic/claude-3-7-sonnet:beta":
            case "anthropic/claude-3.7-sonnet":
            case "anthropic/claude-3.7-sonnet:beta":
            case "anthropic/claude-3.7-sonnet:thinking":
            case "anthropic/claude-3.5-sonnet":
            case "anthropic/claude-3.5-sonnet:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 3.75;
              modelInfo.cacheReadsPrice = 0.3;
              break;
            case "anthropic/claude-3.5-sonnet-20240620":
            case "anthropic/claude-3.5-sonnet-20240620:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 3.75;
              modelInfo.cacheReadsPrice = 0.3;
              break;
            case "anthropic/claude-3-5-haiku":
            case "anthropic/claude-3-5-haiku:beta":
            case "anthropic/claude-3-5-haiku-20241022":
            case "anthropic/claude-3-5-haiku-20241022:beta":
            case "anthropic/claude-3.5-haiku":
            case "anthropic/claude-3.5-haiku:beta":
            case "anthropic/claude-3.5-haiku-20241022":
            case "anthropic/claude-3.5-haiku-20241022:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 1.25;
              modelInfo.cacheReadsPrice = 0.1;
              break;
            case "anthropic/claude-3-opus":
            case "anthropic/claude-3-opus:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 18.75;
              modelInfo.cacheReadsPrice = 1.5;
              break;
            case "anthropic/claude-3-haiku":
            case "anthropic/claude-3-haiku:beta":
              modelInfo.supportsPromptCache = true;
              modelInfo.cacheWritesPrice = 0.3;
              modelInfo.cacheReadsPrice = 0.03;
              break;
            case "deepseek/deepseek-chat":
              modelInfo.supportsPromptCache = true;
              modelInfo.inputPrice = 0;
              modelInfo.cacheWritesPrice = 0.14;
              modelInfo.cacheReadsPrice = 0.014;
              break;
          }

          models[rawModel.id] = modelInfo;
        }
      } else {
        console.error("Invalid response from OpenRouter API");
      }
      await fs.writeFile(openRouterModelsFilePath, JSON.stringify(models));
      console.log("OpenRouter models fetched and saved", models);
    } catch (error) {
      console.error("Error fetching OpenRouter models:", error);
    }

    await this.postMessageToWebview({
      type: "openRouterModels",
      openRouterModels: models,
    });
    return models;
  }

  async refreshRequestyModels() {
    const parsePrice = (price: any) => {
      if (price) {
        return parseFloat(price) * 1_000_000;
      }
      return undefined;
    };

    let models: Record<string, ModelInfo> = {};
    try {
      const apiKey = await getSecret(this.context, "requestyApiKey");
      const headers = {
        Authorization: `Bearer ${apiKey}`,
      };
      const response = await axios.get("https://router.requesty.ai/v1/models", {
        headers,
      });
      if (response.data?.data) {
        for (const model of response.data.data) {
          const modelInfo: ModelInfo = {
            maxTokens: model.max_output_tokens || undefined,
            contextWindow: model.context_window,
            supportsImages: model.supports_vision || undefined,
            supportsPromptCache: model.supports_caching || undefined,
            inputPrice: parsePrice(model.input_price),
            outputPrice: parsePrice(model.output_price),
            cacheWritesPrice: parsePrice(model.caching_price),
            cacheReadsPrice: parsePrice(model.cached_price),
            description: model.description,
          };
          models[model.id] = modelInfo;
        }
        console.log("Requesty models fetched", models);
      } else {
        console.error("Invalid response from Requesty API");
      }
    } catch (error) {
      console.error("Error fetching Requesty models:", error);
    }

    await this.postMessageToWebview({
      type: "requestyModels",
      requestyModels: models,
    });
    return models;
  }

  // VSCode LM API
  async getVsCodeLmModels() {
    try {
      const models = await vscode.lm.selectChatModels({});
      return models || [];
    } catch (error) {
      console.error("Error fetching VS Code LM models:", error);
      return [];
    }
  }

  // Ollama
  async getOllamaModels(baseUrl?: string) {
    try {
      if (!baseUrl) {
        baseUrl = "http://localhost:11434";
      }
      if (!URL.canParse(baseUrl)) {
        return [];
      }
      const response = await axios.get(`${baseUrl}/api/tags`);
      const modelsArray =
        response.data?.models?.map((model: any) => model.name) || [];
      const models = [...new Set<string>(modelsArray)];
      return models;
    } catch (error) {
      return [];
    }
  }

  // LM Studio
  async getLmStudioModels(baseUrl?: string) {
    try {
      if (!baseUrl) {
        baseUrl = "http://localhost:1234";
      }
      if (!URL.canParse(baseUrl)) {
        return [];
      }
      const response = await axios.get(`${baseUrl}/v1/models`);
      const modelsArray =
        response.data?.data?.map((model: any) => model.id) || [];
      const models = [...new Set<string>(modelsArray)];
      return models;
    } catch (error) {
      return [];
    }
  }

  // OpenAI
  async getOpenAiModels(baseUrl?: string, apiKey?: string) {
    try {
      if (!baseUrl) {
        return [];
      }

      if (!URL.canParse(baseUrl)) {
        return [];
      }

      const config: AxiosRequestConfig = {};
      if (apiKey) {
        config["headers"] = { Authorization: `Bearer ${apiKey}` };
      }

      const response = await axios.get(`${baseUrl}/models`, config);
      const modelsArray =
        response.data?.data?.map((model: any) => model.id) || [];
      const models = [...new Set<string>(modelsArray)];
      return models;
    } catch (error) {
      return [];
    }
  }

  async toggleFavoriteModel(modelId: string) {
    const { apiConfiguration } = await getAllExtensionState(this.context);
    const favoritedModelIds = apiConfiguration.favoritedModelIds || [];

    // Toggle favorite status
    const updatedFavorites = favoritedModelIds.includes(modelId)
      ? favoritedModelIds.filter((id) => id !== modelId)
      : [...favoritedModelIds, modelId];

    await updateGlobalState(
      this.context,
      "favoritedModelIds",
      updatedFavorites,
    );

    return !favoritedModelIds.includes(modelId);
  }
}
