import * as vscode from "vscode";
import { DEFAULT_CHAT_SETTINGS } from "@shared/ChatSettings";
import { DEFAULT_BROWSER_SETTINGS } from "@shared/BrowserSettings";
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "@shared/AutoApprovalSettings";
/*
    Storage
    https://dev.to/kompotkot/how-to-use-secretstorage-in-your-vscode-extensions-2hco
    https://www.eliostruyf.com/devhack-code-extension-storage-options/
    */
// global
export async function updateGlobalState(context, key, value) {
    await context.globalState.update(key, value);
}
export async function getGlobalState(context, key) {
    return await context.globalState.get(key);
}
// secrets
export async function storeSecret(context, key, value) {
    if (value) {
        await context.secrets.store(key, value);
    }
    else {
        await context.secrets.delete(key);
    }
}
export async function getSecret(context, key) {
    return await context.secrets.get(key);
}
// workspace
export async function updateWorkspaceState(context, key, value) {
    await context.workspaceState.update(key, value);
}
export async function getWorkspaceState(context, key) {
    return await context.workspaceState.get(key);
}
export async function getAllExtensionState(context) {
    const [storedApiProvider, apiModelId, apiKey, openRouterApiKey, valorideApiKey, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion, awsUseCrossRegionInference, awsBedrockUsePromptCache, awsBedrockEndpoint, awsProfile, awsUseProfile, vertexProjectId, vertexRegion, openAiBaseUrl, openAiApiKey, openAiModelId, openAiModelInfo, openAiHeaders, ollamaModelId, ollamaBaseUrl, ollamaApiOptionsCtxNum, lmStudioModelId, lmStudioBaseUrl, anthropicBaseUrl, geminiApiKey, geminiBaseUrl, openAiNativeApiKey, deepSeekApiKey, requestyApiKey, requestyModelId, requestyModelInfo, togetherApiKey, togetherModelId, qwenApiKey, doubaoApiKey, mistralApiKey, azureApiVersion, openRouterModelId, openRouterModelInfo, openRouterProviderSorting, lastShownAnnouncementId, customInstructions, taskHistory, autoApprovalSettings, browserSettings, chatSettings, vsCodeLmModelSelector, liteLlmBaseUrl, liteLlmModelId, liteLlmUsePromptCache, userInfo, previousModeApiProvider, previousModeModelId, previousModeModelInfo, previousModeVsCodeLmModelSelector, previousModeThinkingBudgetTokens, previousModeReasoningEffort, qwenApiLine, liteLlmApiKey, telemetrySetting, asksageApiKey, asksageApiUrl, xaiApiKey, thinkingBudgetTokens, reasoningEffort, sambanovaApiKey, 
    // Valkyrai pass-through
    valkyraiHost, valkyraiServiceId, valkyraiJwt, planActSeparateModelsSettingRaw, favoritedModelIds, globalValorIDERulesToggles, authenticatedPrincipal, isLoggedIn,] = await Promise.all([
        getGlobalState(context, "apiProvider"),
        getGlobalState(context, "apiModelId"),
        getSecret(context, "apiKey"),
        getSecret(context, "openRouterApiKey"),
        getSecret(context, "valorideApiKey"),
        getSecret(context, "awsAccessKey"),
        getSecret(context, "awsSecretKey"),
        getSecret(context, "awsSessionToken"),
        getGlobalState(context, "awsRegion"),
        getGlobalState(context, "awsUseCrossRegionInference"),
        getGlobalState(context, "awsBedrockUsePromptCache"),
        getGlobalState(context, "awsBedrockEndpoint"),
        getGlobalState(context, "awsProfile"),
        getGlobalState(context, "awsUseProfile"),
        getGlobalState(context, "vertexProjectId"),
        getGlobalState(context, "vertexRegion"),
        getGlobalState(context, "openAiBaseUrl"),
        getSecret(context, "openAiApiKey"),
        getGlobalState(context, "openAiModelId"),
        getGlobalState(context, "openAiModelInfo"),
        getGlobalState(context, "openAiHeaders"),
        getGlobalState(context, "ollamaModelId"),
        getGlobalState(context, "ollamaBaseUrl"),
        getGlobalState(context, "ollamaApiOptionsCtxNum"),
        getGlobalState(context, "lmStudioModelId"),
        getGlobalState(context, "lmStudioBaseUrl"),
        getGlobalState(context, "anthropicBaseUrl"),
        getSecret(context, "geminiApiKey"),
        getGlobalState(context, "geminiBaseUrl"),
        getSecret(context, "openAiNativeApiKey"),
        getSecret(context, "deepSeekApiKey"),
        getSecret(context, "requestyApiKey"),
        getGlobalState(context, "requestyModelId"),
        getGlobalState(context, "requestyModelInfo"),
        getSecret(context, "togetherApiKey"),
        getGlobalState(context, "togetherModelId"),
        getSecret(context, "qwenApiKey"),
        getSecret(context, "doubaoApiKey"),
        getSecret(context, "mistralApiKey"),
        getGlobalState(context, "azureApiVersion"),
        getGlobalState(context, "openRouterModelId"),
        getGlobalState(context, "openRouterModelInfo"),
        getGlobalState(context, "openRouterProviderSorting"),
        getGlobalState(context, "lastShownAnnouncementId"),
        getGlobalState(context, "customInstructions"),
        getGlobalState(context, "taskHistory"),
        getGlobalState(context, "autoApprovalSettings"),
        getGlobalState(context, "browserSettings"),
        getGlobalState(context, "chatSettings"),
        getGlobalState(context, "vsCodeLmModelSelector"),
        getGlobalState(context, "liteLlmBaseUrl"),
        getGlobalState(context, "liteLlmModelId"),
        getGlobalState(context, "liteLlmUsePromptCache"),
        getGlobalState(context, "userInfo"), // Replace 'any' with the correct type if known
        getGlobalState(context, "previousModeApiProvider"),
        getGlobalState(context, "previousModeModelId"),
        getGlobalState(context, "previousModeModelInfo"),
        getGlobalState(context, "previousModeVsCodeLmModelSelector"),
        getGlobalState(context, "previousModeThinkingBudgetTokens"),
        getGlobalState(context, "previousModeReasoningEffort"),
        getGlobalState(context, "qwenApiLine"),
        getSecret(context, "liteLlmApiKey"),
        getGlobalState(context, "telemetrySetting"),
        getSecret(context, "asksageApiKey"),
        getGlobalState(context, "asksageApiUrl"),
        getSecret(context, "xaiApiKey"),
        getGlobalState(context, "thinkingBudgetTokens"),
        getGlobalState(context, "reasoningEffort"),
        getSecret(context, "sambanovaApiKey"),
        // Valkyrai pass-through
        getGlobalState(context, "valkyraiHost"),
        getGlobalState(context, "valkyraiServiceId"),
        getSecret(context, "valkyraiJwt"),
        getGlobalState(context, "planActSeparateModelsSetting"),
        getGlobalState(context, "favoritedModelIds"),
        getGlobalState(context, "globalValorIDERulesToggles"),
        getGlobalState(context, "authenticatedPrincipal"),
        getGlobalState(context, "isLoggedIn"),
    ]);
    // Advanced settings are computed in controller when posting state to webview
    let apiProvider;
    if (storedApiProvider) {
        apiProvider = storedApiProvider;
    }
    else {
        // Either new user or legacy user that doesn't have the apiProvider stored in state
        // (If they're using OpenRouter or Bedrock, then apiProvider state will exist)
        if (apiKey) {
            apiProvider = "anthropic";
        }
        else {
            // New users should default to openrouter, since they've opted to use an API key instead of signing in
            apiProvider = "openrouter";
        }
    }
    const localValorIDERulesToggles = (await getWorkspaceState(context, "localValorIDERulesToggles"));
    const o3MiniReasoningEffort = vscode.workspace
        .getConfiguration("valoride.modelSettings.o3Mini")
        .get("reasoningEffort", "medium");
    const mcpMarketplaceEnabled = vscode.workspace
        .getConfiguration("valoride")
        .get("mcpMarketplace.enabled", true);
    // Plan/Act separate models setting is a boolean indicating whether the user wants to use different models for plan and act. Existing users expect this to be enabled, while we want new users to opt in to this being disabled by default.
    // On win11 state sometimes initializes as empty string instead of undefined
    let planActSeparateModelsSetting = undefined;
    if (planActSeparateModelsSettingRaw === true ||
        planActSeparateModelsSettingRaw === false) {
        planActSeparateModelsSetting = planActSeparateModelsSettingRaw;
    }
    else {
        // default to true for existing users
        if (storedApiProvider) {
            planActSeparateModelsSetting = true;
        }
        else {
            // default to false for new users
            planActSeparateModelsSetting = false;
        }
        // this is a special case where it's a new state, but we want it to default to different values for existing and new users.
        // persist so next time state is retrieved it's set to the correct value.
        await updateGlobalState(context, "planActSeparateModelsSetting", planActSeparateModelsSetting);
    }
    return {
        apiConfiguration: {
            apiProvider,
            apiModelId,
            apiKey,
            openRouterApiKey,
            valorideApiKey,
            awsAccessKey,
            awsSecretKey,
            awsSessionToken,
            awsRegion,
            awsUseCrossRegionInference,
            awsBedrockUsePromptCache,
            awsBedrockEndpoint,
            awsProfile,
            awsUseProfile,
            vertexProjectId,
            vertexRegion,
            openAiBaseUrl,
            openAiApiKey,
            openAiModelId,
            openAiModelInfo,
            openAiHeaders: openAiHeaders || {},
            ollamaModelId,
            ollamaBaseUrl,
            ollamaApiOptionsCtxNum,
            lmStudioModelId,
            lmStudioBaseUrl,
            anthropicBaseUrl,
            geminiApiKey,
            geminiBaseUrl,
            openAiNativeApiKey,
            deepSeekApiKey,
            requestyApiKey,
            requestyModelId,
            requestyModelInfo,
            togetherApiKey,
            togetherModelId,
            qwenApiKey,
            qwenApiLine,
            doubaoApiKey,
            mistralApiKey,
            azureApiVersion,
            openRouterModelId,
            openRouterModelInfo,
            openRouterProviderSorting,
            vsCodeLmModelSelector,
            o3MiniReasoningEffort,
            thinkingBudgetTokens,
            reasoningEffort,
            liteLlmBaseUrl,
            liteLlmModelId,
            liteLlmApiKey,
            liteLlmUsePromptCache,
            asksageApiKey,
            asksageApiUrl,
            xaiApiKey,
            sambanovaApiKey,
            // Valkyrai pass-through
            valkyraiHost,
            valkyraiServiceId,
            valkyraiJwt,
            favoritedModelIds,
        },
        lastShownAnnouncementId,
        customInstructions,
        taskHistory,
        autoApprovalSettings: autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS, // default value can be 0 or empty string
        globalValorIDERulesToggles: globalValorIDERulesToggles || {},
        localValorIDERulesToggles: localValorIDERulesToggles || {},
        browserSettings: { ...DEFAULT_BROWSER_SETTINGS, ...browserSettings }, // this will ensure that older versions of browserSettings (e.g. before remoteBrowserEnabled was added) are merged with the default values (false for remoteBrowserEnabled)
        chatSettings: chatSettings || DEFAULT_CHAT_SETTINGS,
        userInfo: userInfo || null,
        previousModeApiProvider,
        previousModeModelId,
        previousModeModelInfo,
        previousModeVsCodeLmModelSelector,
        previousModeThinkingBudgetTokens,
        previousModeReasoningEffort,
        mcpMarketplaceEnabled,
        telemetrySetting: telemetrySetting || "unset",
        planActSeparateModelsSetting,
        authenticatedPrincipal,
        isLoggedIn: isLoggedIn || false,
    };
}
export async function updateApiConfiguration(context, apiConfiguration) {
    const { apiProvider, apiModelId, apiKey, openRouterApiKey, awsAccessKey, awsSecretKey, awsSessionToken, awsRegion, awsUseCrossRegionInference, awsBedrockUsePromptCache, awsBedrockEndpoint, awsProfile, awsUseProfile, vertexProjectId, vertexRegion, openAiBaseUrl, openAiApiKey, openAiModelId, openAiModelInfo, openAiHeaders, ollamaModelId, ollamaBaseUrl, ollamaApiOptionsCtxNum, lmStudioModelId, lmStudioBaseUrl, anthropicBaseUrl, geminiApiKey, geminiBaseUrl, openAiNativeApiKey, deepSeekApiKey, requestyApiKey, requestyModelId, requestyModelInfo, togetherApiKey, togetherModelId, qwenApiKey, doubaoApiKey, mistralApiKey, azureApiVersion, openRouterModelId, openRouterModelInfo, openRouterProviderSorting, vsCodeLmModelSelector, liteLlmBaseUrl, liteLlmModelId, liteLlmApiKey, liteLlmUsePromptCache, qwenApiLine, asksageApiKey, asksageApiUrl, xaiApiKey, thinkingBudgetTokens, reasoningEffort, valorideApiKey, sambanovaApiKey, 
    // Valkyrai pass-through
    valkyraiHost, valkyraiServiceId, valkyraiJwt, favoritedModelIds, } = apiConfiguration;
    await updateGlobalState(context, "apiProvider", apiProvider);
    await updateGlobalState(context, "apiModelId", apiModelId);
    await storeSecret(context, "apiKey", apiKey);
    await storeSecret(context, "openRouterApiKey", openRouterApiKey);
    await storeSecret(context, "awsAccessKey", awsAccessKey);
    await storeSecret(context, "awsSecretKey", awsSecretKey);
    await storeSecret(context, "awsSessionToken", awsSessionToken);
    await updateGlobalState(context, "awsRegion", awsRegion);
    await updateGlobalState(context, "awsUseCrossRegionInference", awsUseCrossRegionInference);
    await updateGlobalState(context, "awsBedrockUsePromptCache", awsBedrockUsePromptCache);
    await updateGlobalState(context, "awsBedrockEndpoint", awsBedrockEndpoint);
    await updateGlobalState(context, "awsProfile", awsProfile);
    await updateGlobalState(context, "awsUseProfile", awsUseProfile);
    await updateGlobalState(context, "vertexProjectId", vertexProjectId);
    await updateGlobalState(context, "vertexRegion", vertexRegion);
    await updateGlobalState(context, "openAiBaseUrl", openAiBaseUrl);
    await storeSecret(context, "openAiApiKey", openAiApiKey);
    await updateGlobalState(context, "openAiModelId", openAiModelId);
    await updateGlobalState(context, "openAiModelInfo", openAiModelInfo);
    await updateGlobalState(context, "openAiHeaders", openAiHeaders || {});
    await updateGlobalState(context, "ollamaModelId", ollamaModelId);
    await updateGlobalState(context, "ollamaBaseUrl", ollamaBaseUrl);
    await updateGlobalState(context, "ollamaApiOptionsCtxNum", ollamaApiOptionsCtxNum);
    await updateGlobalState(context, "lmStudioModelId", lmStudioModelId);
    await updateGlobalState(context, "lmStudioBaseUrl", lmStudioBaseUrl);
    await updateGlobalState(context, "anthropicBaseUrl", anthropicBaseUrl);
    await storeSecret(context, "geminiApiKey", geminiApiKey);
    await updateGlobalState(context, "geminiBaseUrl", geminiBaseUrl);
    await storeSecret(context, "openAiNativeApiKey", openAiNativeApiKey);
    await storeSecret(context, "deepSeekApiKey", deepSeekApiKey);
    await storeSecret(context, "requestyApiKey", requestyApiKey);
    await storeSecret(context, "togetherApiKey", togetherApiKey);
    await storeSecret(context, "qwenApiKey", qwenApiKey);
    await storeSecret(context, "doubaoApiKey", doubaoApiKey);
    await storeSecret(context, "mistralApiKey", mistralApiKey);
    await storeSecret(context, "liteLlmApiKey", liteLlmApiKey);
    await storeSecret(context, "xaiApiKey", xaiApiKey);
    await updateGlobalState(context, "azureApiVersion", azureApiVersion);
    await updateGlobalState(context, "openRouterModelId", openRouterModelId);
    await updateGlobalState(context, "openRouterModelInfo", openRouterModelInfo);
    await updateGlobalState(context, "openRouterProviderSorting", openRouterProviderSorting);
    await updateGlobalState(context, "vsCodeLmModelSelector", vsCodeLmModelSelector);
    await updateGlobalState(context, "liteLlmBaseUrl", liteLlmBaseUrl);
    await updateGlobalState(context, "liteLlmModelId", liteLlmModelId);
    await updateGlobalState(context, "liteLlmUsePromptCache", liteLlmUsePromptCache);
    await updateGlobalState(context, "qwenApiLine", qwenApiLine);
    await updateGlobalState(context, "requestyModelId", requestyModelId);
    await updateGlobalState(context, "requestyModelInfo", requestyModelInfo);
    await updateGlobalState(context, "togetherModelId", togetherModelId);
    await storeSecret(context, "asksageApiKey", asksageApiKey);
    await updateGlobalState(context, "asksageApiUrl", asksageApiUrl);
    await updateGlobalState(context, "thinkingBudgetTokens", thinkingBudgetTokens);
    await updateGlobalState(context, "reasoningEffort", reasoningEffort);
    await storeSecret(context, "valorideApiKey", valorideApiKey);
    await storeSecret(context, "sambanovaApiKey", sambanovaApiKey);
    // Valkyrai pass-through
    await updateGlobalState(context, "valkyraiHost", valkyraiHost);
    await updateGlobalState(context, "valkyraiServiceId", valkyraiServiceId);
    await storeSecret(context, "valkyraiJwt", valkyraiJwt);
    await updateGlobalState(context, "favoritedModelIds", favoritedModelIds);
}
export async function resetExtensionState(context) {
    for (const key of context.globalState.keys()) {
        await context.globalState.update(key, undefined);
    }
    const secretKeys = [
        "apiKey",
        "openRouterApiKey",
        "awsAccessKey",
        "awsSecretKey",
        "awsSessionToken",
        "openAiApiKey",
        "geminiApiKey",
        "openAiNativeApiKey",
        "deepSeekApiKey",
        "requestyApiKey",
        "togetherApiKey",
        "qwenApiKey",
        "doubaoApiKey",
        "mistralApiKey",
        "valorideApiKey",
        "liteLlmApiKey",
        "asksageApiKey",
        "xaiApiKey",
        "sambanovaApiKey",
        "valkyraiJwt",
    ];
    for (const key of secretKeys) {
        await storeSecret(context, key, undefined);
    }
}
//# sourceMappingURL=state.js.map