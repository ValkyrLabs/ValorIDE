import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeButton, VSCodeCheckbox, VSCodeDropdown, VSCodeLink, VSCodeOption, VSCodeRadio, VSCodeRadioGroup, VSCodeTextField, } from "@vscode/webview-ui-toolkit/react";
import { Fragment, memo, useCallback, useEffect, useMemo, useState, } from "react";
import { FaChevronDown, FaChevronRight, FaCheck, FaTimes } from "react-icons/fa";
import ThinkingBudgetSlider from "./ThinkingBudgetSlider";
import { useEvent, useInterval } from "react-use";
import styled from "styled-components";
import { anthropicDefaultModelId, anthropicModels, azureOpenAiDefaultApiVersion, bedrockDefaultModelId, bedrockModels, deepSeekDefaultModelId, deepSeekModels, geminiDefaultModelId, geminiModels, mistralDefaultModelId, mistralModels, openAiModelInfoSaneDefaults, openAiNativeDefaultModelId, openAiNativeModels, openRouterDefaultModelId, openRouterDefaultModelInfo, requestyDefaultModelId, requestyDefaultModelInfo, mainlandQwenModels, internationalQwenModels, mainlandQwenDefaultModelId, internationalQwenDefaultModelId, vertexDefaultModelId, vertexModels, askSageModels, askSageDefaultModelId, askSageDefaultURL, xaiDefaultModelId, xaiModels, sambanovaModels, sambanovaDefaultModelId, doubaoModels, doubaoDefaultModelId, liteLlmModelInfoSaneDefaults, } from "@shared/api";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { vscode } from "@/utils/vscode";
import { getAsVar, VSC_DESCRIPTION_FOREGROUND } from "@/utils/vscStyles";
import VSCodeButtonLink from "@/components/common/VSCodeButtonLink";
import OpenRouterModelPicker, { ModelDescriptionMarkdown, OPENROUTER_MODEL_PICKER_Z_INDEX, } from "./OpenRouterModelPicker";
import { ValorIDEAccountInfoCard } from "./ValorIDEAccountInfoCard";
import RequestyModelPicker from "./RequestyModelPicker";
import LlmDetailsModelPicker from "./LlmDetailsModelPicker";
import { useGetLlmDetailssQuery } from "@/thor/redux/services/LlmDetailsService";
// This is necessary to ensure dropdown opens downward, important for when this is used in popup
const DROPDOWN_Z_INDEX = OPENROUTER_MODEL_PICKER_Z_INDEX + 2; // Higher than the OpenRouterModelPicker's and ModelSelectorTooltip's z-index
export const DropdownContainer = styled.div `
  position: relative;
  z-index: ${(props) => props.zIndex || DROPDOWN_Z_INDEX};

  // Force dropdowns to open downward
  & vscode-dropdown::part(listbox) {
    position: absolute !important;
    top: 100% !important;
    bottom: auto !important;
  }
`;
const ApiOptions = ({ showModelOptions, apiErrorMessage, modelIdErrorMessage, isPopup, saveImmediately = false, // Default to false
 }) => {
    // Use full context state for immediate save payload
    const extensionState = useExtensionState();
    const { apiConfiguration, setApiConfiguration, uriScheme } = extensionState;
    const [ollamaModels, setOllamaModels] = useState([]);
    const [lmStudioModels, setLmStudioModels] = useState([]);
    const [vsCodeLmModels, setVsCodeLmModels] = useState([]);
    const [anthropicBaseUrlSelected, setAnthropicBaseUrlSelected] = useState(!!apiConfiguration?.anthropicBaseUrl);
    const [geminiBaseUrlSelected, setGeminiBaseUrlSelected] = useState(!!apiConfiguration?.geminiBaseUrl);
    const [azureApiVersionSelected, setAzureApiVersionSelected] = useState(!!apiConfiguration?.azureApiVersion);
    const [awsEndpointSelected, setAwsEndpointSelected] = useState(!!apiConfiguration?.awsBedrockEndpoint);
    const [modelConfigurationSelected, setModelConfigurationSelected] = useState(false);
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [providerSortingSelected, setProviderSortingSelected] = useState(!!apiConfiguration?.openRouterProviderSorting);
    const [reasoningEffortSelected, setReasoningEffortSelected] = useState(!!apiConfiguration?.reasoningEffort);
    const handleInputChange = (field) => (event) => {
        const newValue = event.target.value;
        // Update local state
        setApiConfiguration({
            ...apiConfiguration,
            [field]: newValue,
        });
        // If the field is the provider AND saveImmediately is true, save it immediately using the full context state
        if (saveImmediately && field === "apiProvider") {
            // Use apiConfiguration from the full extensionState context to send the most complete data
            const currentFullApiConfig = extensionState.apiConfiguration;
            vscode.postMessage({
                type: "apiConfiguration",
                apiConfiguration: {
                    ...currentFullApiConfig, // Send the most complete config available
                    apiProvider: newValue, // Override with the new provider
                },
            });
        }
    };
    const { selectedProvider, selectedModelId, selectedModelInfo } = useMemo(() => {
        return normalizeApiConfiguration(apiConfiguration);
    }, [apiConfiguration]);
    // Poll ollama/lmstudio models
    const requestLocalModels = useCallback(() => {
        if (selectedProvider === "ollama") {
            vscode.postMessage({
                type: "requestOllamaModels",
                text: apiConfiguration?.ollamaBaseUrl,
            });
        }
        else if (selectedProvider === "lmstudio") {
            vscode.postMessage({
                type: "requestLmStudioModels",
                text: apiConfiguration?.lmStudioBaseUrl,
            });
        }
        else if (selectedProvider === "vscode-lm") {
            vscode.postMessage({ type: "requestVsCodeLmModels" });
        }
    }, [
        selectedProvider,
        apiConfiguration?.ollamaBaseUrl,
        apiConfiguration?.lmStudioBaseUrl,
    ]);
    useEffect(() => {
        if (selectedProvider === "ollama" ||
            selectedProvider === "lmstudio" ||
            selectedProvider === "vscode-lm") {
            requestLocalModels();
        }
    }, [selectedProvider, requestLocalModels]);
    useInterval(requestLocalModels, selectedProvider === "ollama" ||
        selectedProvider === "lmstudio" ||
        selectedProvider === "vscode-lm"
        ? 2000
        : null);
    const handleMessage = useCallback((event) => {
        const message = event.data;
        if (message.type === "ollamaModels" && message.ollamaModels) {
            setOllamaModels(message.ollamaModels);
        }
        else if (message.type === "lmStudioModels" && message.lmStudioModels) {
            setLmStudioModels(message.lmStudioModels);
        }
        else if (message.type === "vsCodeLmModels" && message.vsCodeLmModels) {
            setVsCodeLmModels(message.vsCodeLmModels);
        }
    }, []);
    useEvent("message", handleMessage);
    // Valkyrai LlmDetails
    const { data: llmDetailsList } = useGetLlmDetailssQuery();
    // Workaround for VSCodeDropdown dynamic options selection bug:
    // create a stable key based on option ids so the dropdown remounts
    // when the available options change, preserving the selected value.
    const valkyraiOptionsKey = useMemo(() => JSON.stringify((llmDetailsList || []).map((m) => m.id || "")), [llmDetailsList]);
    const valkyraiModels = useMemo(() => {
        const models = {};
        (llmDetailsList || []).forEach((m) => {
            if (!m.id)
                return;
            models[m.id] = {
                maxTokens: m.maxTokens,
                contextWindow: m.contextWindow,
                supportsImages: m.supportsImages,
                supportsPromptCache: !!m.supportsPromptCache,
                inputPrice: m.inputPrice,
                outputPrice: m.outputPrice,
                description: m.description || `${m.provider} ${m.name}${m.version ? ` (${m.version})` : ""}`,
            };
        });
        return models;
    }, [llmDetailsList]);
    /*
    VSCodeDropdown has an open bug where dynamically rendered options don't auto select the provided value prop. You can see this for yourself by comparing  it with normal select/option elements, which work as expected.
    https://github.com/microsoft/vscode-webview-ui-toolkit/issues/433
  
    In our case, when the user switches between providers, we recalculate the selectedModelId depending on the provider, the default model for that provider, and a modelId that the user may have selected. Unfortunately, the VSCodeDropdown component wouldn't select this calculated value, and would default to the first "Select a model..." option instead, which makes it seem like the model was cleared out when it wasn't.
  
    As a workaround, we create separate instances of the dropdown for each provider, and then conditionally render the one that matches the current provider.
    */
    const createDropdown = (models) => {
        return (_jsxs(VSCodeDropdown, { id: "model-id", value: selectedModelId, onChange: handleInputChange("apiModelId"), style: { width: "100%" }, children: [_jsx(VSCodeOption, { value: "", children: "Select a model..." }), Object.keys(models).map((modelId) => (_jsx(VSCodeOption, { value: modelId, style: {
                        whiteSpace: "normal",
                        wordWrap: "break-word",
                        maxWidth: "100%",
                    }, children: modelId }, modelId)))] }));
    };
    return (_jsxs("div", { style: {
            display: "flex",
            flexDirection: "column",
            gap: 5,
            marginBottom: isPopup ? -10 : 0,
        }, children: [_jsxs(DropdownContainer, { className: "dropdown-container", children: [_jsx("label", { htmlFor: "api-provider", children: _jsx("span", { style: { fontWeight: 500 }, children: "API Provider" }) }), _jsxs(VSCodeDropdown, { id: "api-provider", value: selectedProvider, onChange: handleInputChange("apiProvider"), style: {
                            minWidth: 130,
                            position: "relative",
                        }, children: [_jsx(VSCodeOption, { value: "valkyrai", children: "Valkyrai (LLM Details)" }), _jsx(VSCodeOption, { value: "valoride", children: "ValorIDE" }), _jsx(VSCodeOption, { value: "openrouter", children: "OpenRouter" }), _jsx(VSCodeOption, { value: "anthropic", children: "Anthropic" }), _jsx(VSCodeOption, { value: "bedrock", children: "Amazon Bedrock" }), _jsx(VSCodeOption, { value: "openai", children: "OpenAI Compatible" }), _jsx(VSCodeOption, { value: "vertex", children: "GCP Vertex AI" }), _jsx(VSCodeOption, { value: "gemini", children: "Google Gemini" }), _jsx(VSCodeOption, { value: "deepseek", children: "DeepSeek" }), _jsx(VSCodeOption, { value: "mistral", children: "Mistral" }), _jsx(VSCodeOption, { value: "openai-native", children: "OpenAI" }), _jsx(VSCodeOption, { value: "vscode-lm", children: "VS Code LM API" }), _jsx(VSCodeOption, { value: "requesty", children: "Requesty" }), _jsx(VSCodeOption, { value: "together", children: "Together" }), _jsx(VSCodeOption, { value: "qwen", children: "Alibaba Qwen" }), _jsx(VSCodeOption, { value: "doubao", children: "Bytedance Doubao" }), _jsx(VSCodeOption, { value: "lmstudio", children: "LM Studio" }), _jsx(VSCodeOption, { value: "ollama", children: "Ollama" }), _jsx(VSCodeOption, { value: "litellm", children: "LiteLLM" }), _jsx(VSCodeOption, { value: "asksage", children: "AskSage" }), _jsx(VSCodeOption, { value: "xai", children: "xAI" }), _jsx(VSCodeOption, { value: "sambanova", children: "SambaNova" })] })] }), selectedProvider === "valoride" && (_jsx("div", { style: { marginBottom: 14, marginTop: 4 }, children: _jsx(ValorIDEAccountInfoCard, {}) })), selectedProvider === "valkyrai" && (_jsx("div", { style: { marginBottom: 14, marginTop: 4 }, children: _jsx(LlmDetailsModelPicker, {}) })), selectedProvider === "asksage" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.asksageApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("asksageApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "AskSage API Key" }) }), _jsx("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: "This key is stored locally and only used to make API requests from this extension." }), _jsx(VSCodeTextField, { value: apiConfiguration?.asksageApiUrl || askSageDefaultURL, style: { width: "100%" }, type: "url", onInput: handleInputChange("asksageApiUrl"), placeholder: "Enter AskSage API URL...", children: _jsx("span", { style: { fontWeight: 500 }, children: "AskSage API URL" }) })] })), selectedProvider === "anthropic" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.apiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("apiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Anthropic API Key" }) }), _jsx(VSCodeCheckbox, { checked: anthropicBaseUrlSelected, onChange: (e) => {
                            const isChecked = e.target.checked === true;
                            setAnthropicBaseUrlSelected(isChecked);
                            if (!isChecked) {
                                setApiConfiguration({
                                    ...apiConfiguration,
                                    anthropicBaseUrl: "",
                                });
                            }
                        }, children: "Use custom base URL" }), anthropicBaseUrlSelected && (_jsx(VSCodeTextField, { value: apiConfiguration?.anthropicBaseUrl || "", style: { width: "100%", marginTop: 3 }, type: "url", onInput: handleInputChange("anthropicBaseUrl"), placeholder: "Default: https://api.anthropic.com" })), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.apiKey && (_jsx(VSCodeLink, { href: "https://console.anthropic.com/settings/keys", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get an Anthropic API key by signing up here." }))] })] })), selectedProvider === "openai-native" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.openAiNativeApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("openAiNativeApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "OpenAI API Key" }) }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.openAiNativeApiKey && (_jsx(VSCodeLink, { href: "https://platform.openai.com/api-keys", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get an OpenAI API key by signing up here." }))] })] })), selectedProvider === "deepseek" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.deepSeekApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("deepSeekApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "DeepSeek API Key" }) }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.deepSeekApiKey && (_jsx(VSCodeLink, { href: "https://www.deepseek.com/", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get a DeepSeek API key by signing up here." }))] })] })), selectedProvider === "qwen" && (_jsxs("div", { children: [_jsxs(DropdownContainer, { className: "dropdown-container", style: { position: "inherit" }, children: [_jsx("label", { htmlFor: "qwen-line-provider", children: _jsx("span", { style: { fontWeight: 500, marginTop: 5 }, children: "Alibaba API Line" }) }), _jsxs(VSCodeDropdown, { id: "qwen-line-provider", value: apiConfiguration?.qwenApiLine || "china", onChange: handleInputChange("qwenApiLine"), style: {
                                    minWidth: 130,
                                    position: "relative",
                                }, children: [_jsx(VSCodeOption, { value: "china", children: "China API" }), _jsx(VSCodeOption, { value: "international", children: "International API" })] })] }), _jsx("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: "Please select the appropriate API interface based on your location. If you are in China, choose the China API interface. Otherwise, choose the International API interface." }), _jsx(VSCodeTextField, { value: apiConfiguration?.qwenApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("qwenApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Qwen API Key" }) }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.qwenApiKey && (_jsx(VSCodeLink, { href: "https://bailian.console.aliyun.com/", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get a Qwen API key by signing up here." }))] })] })), selectedProvider === "doubao" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.doubaoApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("doubaoApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Doubao API Key" }) }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.doubaoApiKey && (_jsx(VSCodeLink, { href: "https://console.volcengine.com/home", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get a Doubao API key by signing up here." }))] })] })), selectedProvider === "mistral" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.mistralApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("mistralApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Mistral API Key" }) }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.mistralApiKey && (_jsx(VSCodeLink, { href: "https://console.mistral.ai/codestral", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get a Mistral API key by signing up here." }))] })] })), selectedProvider === "openrouter" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.openRouterApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("openRouterApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "OpenRouter API Key" }) }), !apiConfiguration?.openRouterApiKey && (_jsx(VSCodeButtonLink, { href: getOpenRouterAuthUrl(uriScheme), style: { margin: "5px 0 0 0" }, appearance: "secondary", children: "Get OpenRouter API Key" })), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: "5px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", " "] })] })), selectedProvider === "bedrock" && (_jsxs("div", { style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                }, children: [_jsxs(VSCodeRadioGroup, { value: apiConfiguration?.awsUseProfile ? "profile" : "credentials", onChange: (e) => {
                            const value = e.target?.value;
                            const useProfile = value === "profile";
                            setApiConfiguration({
                                ...apiConfiguration,
                                awsUseProfile: useProfile,
                            });
                        }, children: [_jsx(VSCodeRadio, { value: "credentials", children: "AWS Credentials" }), _jsx(VSCodeRadio, { value: "profile", children: "AWS Profile" })] }), apiConfiguration?.awsUseProfile ? (_jsx(VSCodeTextField, { value: apiConfiguration?.awsProfile || "", style: { width: "100%" }, onInput: handleInputChange("awsProfile"), placeholder: "Enter profile name (default if empty)", children: _jsx("span", { style: { fontWeight: 500 }, children: "AWS Profile Name" }) })) : (_jsxs(_Fragment, { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.awsAccessKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("awsAccessKey"), placeholder: "Enter Access Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "AWS Access Key" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.awsSecretKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("awsSecretKey"), placeholder: "Enter Secret Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "AWS Secret Key" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.awsSessionToken || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("awsSessionToken"), placeholder: "Enter Session Token...", children: _jsx("span", { style: { fontWeight: 500 }, children: "AWS Session Token" }) })] })), _jsxs(DropdownContainer, { zIndex: DROPDOWN_Z_INDEX - 1, className: "dropdown-container", children: [_jsx("label", { htmlFor: "aws-region-dropdown", children: _jsx("span", { style: { fontWeight: 500 }, children: "AWS Region" }) }), _jsxs(VSCodeDropdown, { id: "aws-region-dropdown", value: apiConfiguration?.awsRegion || "", style: { width: "100%" }, onChange: handleInputChange("awsRegion"), children: [_jsx(VSCodeOption, { value: "", children: "Select a region..." }), _jsx(VSCodeOption, { value: "us-east-1", children: "us-east-1" }), _jsx(VSCodeOption, { value: "us-east-2", children: "us-east-2" }), _jsx(VSCodeOption, { value: "us-west-2", children: "us-west-2" }), _jsx(VSCodeOption, { value: "ap-south-1", children: "ap-south-1" }), _jsx(VSCodeOption, { value: "ap-northeast-1", children: "ap-northeast-1" }), _jsx(VSCodeOption, { value: "ap-northeast-2", children: "ap-northeast-2" }), _jsx(VSCodeOption, { value: "ap-northeast-3", children: "ap-northeast-3" }), _jsx(VSCodeOption, { value: "ap-southeast-1", children: "ap-southeast-1" }), _jsx(VSCodeOption, { value: "ap-southeast-2", children: "ap-southeast-2" }), _jsx(VSCodeOption, { value: "ca-central-1", children: "ca-central-1" }), _jsx(VSCodeOption, { value: "eu-central-1", children: "eu-central-1" }), _jsx(VSCodeOption, { value: "eu-central-2", children: "eu-central-2" }), _jsx(VSCodeOption, { value: "eu-west-1", children: "eu-west-1" }), _jsx(VSCodeOption, { value: "eu-west-2", children: "eu-west-2" }), _jsx(VSCodeOption, { value: "eu-west-3", children: "eu-west-3" }), _jsx(VSCodeOption, { value: "eu-north-1", children: "eu-north-1" }), _jsx(VSCodeOption, { value: "sa-east-1", children: "sa-east-1" }), _jsx(VSCodeOption, { value: "us-gov-east-1", children: "us-gov-east-1" }), _jsx(VSCodeOption, { value: "us-gov-west-1", children: "us-gov-west-1" })] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsx(VSCodeCheckbox, { checked: awsEndpointSelected, onChange: (e) => {
                                    const isChecked = e.target.checked === true;
                                    setAwsEndpointSelected(isChecked);
                                    if (!isChecked) {
                                        setApiConfiguration({
                                            ...apiConfiguration,
                                            awsBedrockEndpoint: "",
                                        });
                                    }
                                }, children: "Use custom VPC endpoint" }), awsEndpointSelected && (_jsx(VSCodeTextField, { value: apiConfiguration?.awsBedrockEndpoint || "", style: { width: "100%", marginTop: 3, marginBottom: 5 }, type: "url", onInput: handleInputChange("awsBedrockEndpoint"), placeholder: "Enter VPC Endpoint URL (optional)" })), _jsx(VSCodeCheckbox, { checked: apiConfiguration?.awsUseCrossRegionInference || false, onChange: (e) => {
                                    const isChecked = e.target.checked === true;
                                    setApiConfiguration({
                                        ...apiConfiguration,
                                        awsUseCrossRegionInference: isChecked,
                                    });
                                }, children: "Use cross-region inference" }), selectedModelInfo.supportsPromptCache && (_jsx(_Fragment, { children: _jsx(VSCodeCheckbox, { checked: apiConfiguration?.awsBedrockUsePromptCache || false, onChange: (e) => {
                                        const isChecked = e.target.checked === true;
                                        setApiConfiguration({
                                            ...apiConfiguration,
                                            awsBedrockUsePromptCache: isChecked,
                                        });
                                    }, children: "Use prompt caching" }) }))] }), _jsx("p", { style: {
                            fontSize: "12px",
                            marginTop: "5px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: apiConfiguration?.awsUseProfile ? (_jsx(_Fragment, { children: "Using AWS Profile credentials from ~/.aws/credentials. Leave profile name empty to use the default profile. These credentials are only used locally to make API requests from this extension." })) : (_jsx(_Fragment, { children: "Authenticate by either providing the keys above or use the default AWS credential providers, i.e. ~/.aws/credentials or environment variables. These credentials are only used locally to make API requests from this extension." })) })] })), apiConfiguration?.apiProvider === "vertex" && (_jsxs("div", { style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                }, children: [_jsx(VSCodeTextField, { value: apiConfiguration?.vertexProjectId || "", style: { width: "100%" }, onInput: handleInputChange("vertexProjectId"), placeholder: "Enter Project ID...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Google Cloud Project ID" }) }), _jsxs(DropdownContainer, { zIndex: DROPDOWN_Z_INDEX - 1, className: "dropdown-container", children: [_jsx("label", { htmlFor: "vertex-region-dropdown", children: _jsx("span", { style: { fontWeight: 500 }, children: "Google Cloud Region" }) }), _jsxs(VSCodeDropdown, { id: "vertex-region-dropdown", value: apiConfiguration?.vertexRegion || "", style: { width: "100%" }, onChange: handleInputChange("vertexRegion"), children: [_jsx(VSCodeOption, { value: "", children: "Select a region..." }), _jsx(VSCodeOption, { value: "us-east5", children: "us-east5" }), _jsx(VSCodeOption, { value: "us-central1", children: "us-central1" }), _jsx(VSCodeOption, { value: "europe-west1", children: "europe-west1" }), _jsx(VSCodeOption, { value: "europe-west4", children: "europe-west4" }), _jsx(VSCodeOption, { value: "asia-southeast1", children: "asia-southeast1" })] })] }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: "5px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["To use Google Cloud Vertex AI, you need to", _jsx(VSCodeLink, { href: "https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-valoride#before_you_begin", style: { display: "inline", fontSize: "inherit" }, children: "1) create a Google Cloud account › enable the Vertex AI API › enable the desired Claude models," }), " ", _jsx(VSCodeLink, { href: "https://cloud.google.com/docs/authentication/provide-credentials-adc#google-idp", style: { display: "inline", fontSize: "inherit" }, children: "2) install the Google Cloud CLI › configure Application Default Credentials." })] })] })), selectedProvider === "gemini" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.geminiApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("geminiApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Gemini API Key" }) }), _jsx(VSCodeCheckbox, { checked: geminiBaseUrlSelected, onChange: (e) => {
                            const isChecked = e.target.checked === true;
                            setGeminiBaseUrlSelected(isChecked);
                            if (!isChecked) {
                                setApiConfiguration({
                                    ...apiConfiguration,
                                    geminiBaseUrl: "",
                                });
                            }
                        }, children: "Use custom base URL" }), geminiBaseUrlSelected && (_jsx(VSCodeTextField, { value: apiConfiguration?.geminiBaseUrl || "", style: { width: "100%", marginTop: 3 }, type: "url", onInput: handleInputChange("geminiBaseUrl"), placeholder: "Default: https://generativelanguage.googleapis.com" })), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.geminiApiKey && (_jsx(VSCodeLink, { href: "https://aistudio.google.com/apikey", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get a Gemini API key by signing up here." }))] }), selectedProvider === "gemini" &&
                        selectedModelId === "gemini-2.5-pro" && (_jsx(ThinkingBudgetSlider, { apiConfiguration: apiConfiguration, setApiConfiguration: setApiConfiguration, maxBudget: selectedModelInfo.thinkingConfig?.maxBudget }))] })), selectedProvider === "openai" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.openAiBaseUrl || "", style: { width: "100%", marginBottom: 10 }, type: "url", onInput: handleInputChange("openAiBaseUrl"), placeholder: "Enter base URL...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Base URL" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.openAiApiKey || "", style: { width: "100%", marginBottom: 10 }, type: "password", onInput: handleInputChange("openAiApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "API Key" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.openAiModelId || "", style: { width: "100%", marginBottom: 10 }, onInput: handleInputChange("openAiModelId"), placeholder: "Enter Model ID...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model ID" }) }), (() => {
                        const headerEntries = Object.entries(apiConfiguration?.openAiHeaders ?? {});
                        return (_jsxs("div", { style: { marginBottom: 10 }, children: [_jsxs("div", { style: {
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }, children: [_jsx("span", { style: { fontWeight: 500 }, children: "Custom Headers" }), _jsx(VSCodeButton, { onClick: () => {
                                                const currentHeaders = {
                                                    ...(apiConfiguration?.openAiHeaders || {}),
                                                };
                                                const headerCount = Object.keys(currentHeaders).length;
                                                const newKey = `header${headerCount + 1}`;
                                                currentHeaders[newKey] = "";
                                                handleInputChange("openAiHeaders")({
                                                    target: {
                                                        value: currentHeaders,
                                                    },
                                                });
                                            }, children: "Add Header" })] }), _jsx("div", { children: headerEntries.map(([key, value], index) => (_jsxs("div", { style: { display: "flex", gap: 5, marginTop: 5 }, children: [_jsx(VSCodeTextField, { value: key, style: { width: "40%" }, placeholder: "Header name", onInput: (e) => {
                                                    const currentHeaders = apiConfiguration?.openAiHeaders ?? {};
                                                    const newValue = e.target.value;
                                                    if (newValue && newValue !== key) {
                                                        const { [key]: _, ...rest } = currentHeaders;
                                                        handleInputChange("openAiHeaders")({
                                                            target: {
                                                                value: {
                                                                    ...rest,
                                                                    [newValue]: value,
                                                                },
                                                            },
                                                        });
                                                    }
                                                } }), _jsx(VSCodeTextField, { value: value, style: { width: "40%" }, placeholder: "Header value", onInput: (e) => {
                                                    handleInputChange("openAiHeaders")({
                                                        target: {
                                                            value: {
                                                                ...(apiConfiguration?.openAiHeaders ?? {}),
                                                                [key]: e.target.value,
                                                            },
                                                        },
                                                    });
                                                } }), _jsx(VSCodeButton, { appearance: "secondary", onClick: () => {
                                                    const { [key]: _, ...rest } = apiConfiguration?.openAiHeaders ?? {};
                                                    handleInputChange("openAiHeaders")({
                                                        target: {
                                                            value: rest,
                                                        },
                                                    });
                                                }, children: "Remove" })] }, index))) })] }));
                    })(), _jsx(VSCodeCheckbox, { checked: azureApiVersionSelected, onChange: (e) => {
                            const isChecked = e.target.checked === true;
                            setAzureApiVersionSelected(isChecked);
                            if (!isChecked) {
                                setApiConfiguration({
                                    ...apiConfiguration,
                                    azureApiVersion: "",
                                });
                            }
                        }, children: "Set Azure API version" }), azureApiVersionSelected && (_jsx(VSCodeTextField, { value: apiConfiguration?.azureApiVersion || "", style: { width: "100%", marginTop: 3 }, onInput: handleInputChange("azureApiVersion"), placeholder: `Default: ${azureOpenAiDefaultApiVersion}` })), _jsxs("div", { style: {
                            color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
                            display: "flex",
                            margin: "10px 0",
                            cursor: "pointer",
                            alignItems: "center",
                        }, onClick: () => setModelConfigurationSelected((val) => !val), children: [modelConfigurationSelected ? (_jsx(FaChevronDown, { style: { marginRight: "4px" } })) : (_jsx(FaChevronRight, { style: { marginRight: "4px" } })), _jsx("span", { style: {
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                }, children: "Model Configuration" })] }), modelConfigurationSelected && (_jsxs(_Fragment, { children: [_jsx(VSCodeCheckbox, { checked: !!apiConfiguration?.openAiModelInfo?.supportsImages, onChange: (e) => {
                                    const isChecked = e.target.checked === true;
                                    const modelInfo = apiConfiguration?.openAiModelInfo
                                        ? apiConfiguration.openAiModelInfo
                                        : { ...openAiModelInfoSaneDefaults };
                                    modelInfo.supportsImages = isChecked;
                                    setApiConfiguration({
                                        ...apiConfiguration,
                                        openAiModelInfo: modelInfo,
                                    });
                                }, children: "Supports Images" }), _jsx(VSCodeCheckbox, { checked: !!apiConfiguration?.openAiModelInfo?.supportsImages, onChange: (e) => {
                                    const isChecked = e.target.checked === true;
                                    let modelInfo = apiConfiguration?.openAiModelInfo
                                        ? apiConfiguration.openAiModelInfo
                                        : { ...openAiModelInfoSaneDefaults };
                                    modelInfo.supportsImages = isChecked;
                                    setApiConfiguration({
                                        ...apiConfiguration,
                                        openAiModelInfo: modelInfo,
                                    });
                                }, children: "Supports browser use" }), _jsx(VSCodeCheckbox, { checked: !!apiConfiguration?.openAiModelInfo?.isR1FormatRequired, onChange: (e) => {
                                    const isChecked = e.target.checked === true;
                                    let modelInfo = apiConfiguration?.openAiModelInfo
                                        ? apiConfiguration.openAiModelInfo
                                        : { ...openAiModelInfoSaneDefaults };
                                    modelInfo = { ...modelInfo, isR1FormatRequired: isChecked };
                                    setApiConfiguration({
                                        ...apiConfiguration,
                                        openAiModelInfo: modelInfo,
                                    });
                                }, children: "Enable R1 messages format" }), _jsxs("div", { style: { display: "flex", gap: 10, marginTop: "5px" }, children: [_jsx(VSCodeTextField, { value: apiConfiguration?.openAiModelInfo?.contextWindow
                                            ? apiConfiguration.openAiModelInfo.contextWindow.toString()
                                            : openAiModelInfoSaneDefaults.contextWindow?.toString(), style: { flex: 1 }, onInput: (input) => {
                                            const modelInfo = apiConfiguration?.openAiModelInfo
                                                ? apiConfiguration.openAiModelInfo
                                                : { ...openAiModelInfoSaneDefaults };
                                            modelInfo.contextWindow = Number(input.target.value);
                                            setApiConfiguration({
                                                ...apiConfiguration,
                                                openAiModelInfo: modelInfo,
                                            });
                                        }, children: _jsx("span", { style: { fontWeight: 500 }, children: "Context Window Size" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.openAiModelInfo?.maxTokens
                                            ? apiConfiguration.openAiModelInfo.maxTokens.toString()
                                            : openAiModelInfoSaneDefaults.maxTokens?.toString(), style: { flex: 1 }, onInput: (input) => {
                                            const modelInfo = apiConfiguration?.openAiModelInfo
                                                ? apiConfiguration.openAiModelInfo
                                                : { ...openAiModelInfoSaneDefaults };
                                            modelInfo.maxTokens = input.target.value;
                                            setApiConfiguration({
                                                ...apiConfiguration,
                                                openAiModelInfo: modelInfo,
                                            });
                                        }, children: _jsx("span", { style: { fontWeight: 500 }, children: "Max Output Tokens" }) })] }), _jsxs("div", { style: { display: "flex", gap: 10, marginTop: "5px" }, children: [_jsx(VSCodeTextField, { value: apiConfiguration?.openAiModelInfo?.inputPrice
                                            ? apiConfiguration.openAiModelInfo.inputPrice.toString()
                                            : openAiModelInfoSaneDefaults.inputPrice?.toString(), style: { flex: 1 }, onInput: (input) => {
                                            const modelInfo = apiConfiguration?.openAiModelInfo
                                                ? apiConfiguration.openAiModelInfo
                                                : { ...openAiModelInfoSaneDefaults };
                                            modelInfo.inputPrice = input.target.value;
                                            setApiConfiguration({
                                                ...apiConfiguration,
                                                openAiModelInfo: modelInfo,
                                            });
                                        }, children: _jsx("span", { style: { fontWeight: 500 }, children: "Input Price / 1M tokens" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.openAiModelInfo?.outputPrice
                                            ? apiConfiguration.openAiModelInfo.outputPrice.toString()
                                            : openAiModelInfoSaneDefaults.outputPrice?.toString(), style: { flex: 1 }, onInput: (input) => {
                                            const modelInfo = apiConfiguration?.openAiModelInfo
                                                ? apiConfiguration.openAiModelInfo
                                                : { ...openAiModelInfoSaneDefaults };
                                            modelInfo.outputPrice = input.target.value;
                                            setApiConfiguration({
                                                ...apiConfiguration,
                                                openAiModelInfo: modelInfo,
                                            });
                                        }, children: _jsx("span", { style: { fontWeight: 500 }, children: "Output Price / 1M tokens" }) })] }), _jsx("div", { style: { display: "flex", gap: 10, marginTop: "5px" }, children: _jsx(VSCodeTextField, { value: apiConfiguration?.openAiModelInfo?.temperature
                                        ? apiConfiguration.openAiModelInfo.temperature.toString()
                                        : openAiModelInfoSaneDefaults.temperature?.toString(), onInput: (input) => {
                                        const modelInfo = apiConfiguration?.openAiModelInfo
                                            ? apiConfiguration.openAiModelInfo
                                            : { ...openAiModelInfoSaneDefaults };
                                        // Check if the input ends with a decimal point or has trailing zeros after decimal
                                        const value = input.target.value;
                                        const shouldPreserveFormat = value.endsWith(".") ||
                                            (value.includes(".") && value.endsWith("0"));
                                        modelInfo.temperature =
                                            value === ""
                                                ? openAiModelInfoSaneDefaults.temperature
                                                : shouldPreserveFormat
                                                    ? value // Keep as string to preserve decimal format
                                                    : parseFloat(value);
                                        setApiConfiguration({
                                            ...apiConfiguration,
                                            openAiModelInfo: modelInfo,
                                        });
                                    }, children: _jsx("span", { style: { fontWeight: 500 }, children: "Temperature" }) }) })] })), _jsx("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: _jsxs("span", { style: { color: "var(--vscode-errorForeground)" }, children: ["(", _jsx("span", { style: { fontWeight: 500 }, children: "Note:" }), " ValorIDE uses complex prompts and works best with Claude models. Less capable models may not work as expected.)"] }) })] })), selectedProvider === "requesty" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.requestyApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("requestyApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "API Key" }) }), !apiConfiguration?.requestyApiKey && (_jsx("a", { href: "https://app.requesty.ai/manage-api", children: "Get API Key" }))] })), selectedProvider === "together" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.togetherApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("togetherApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "API Key" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.togetherModelId || "", style: { width: "100%" }, onInput: handleInputChange("togetherModelId"), placeholder: "Enter Model ID...", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model ID" }) }), _jsx("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: _jsxs("span", { style: { color: "var(--vscode-errorForeground)" }, children: ["(", _jsx("span", { style: { fontWeight: 500 }, children: "Note:" }), " ValorIDE uses complex prompts and works best with Claude models. Less capable models may not work as expected.)"] }) })] })), selectedProvider === "vscode-lm" && (_jsx("div", { children: _jsxs(DropdownContainer, { zIndex: DROPDOWN_Z_INDEX - 2, className: "dropdown-container", children: [_jsx("label", { htmlFor: "vscode-lm-model", children: _jsx("span", { style: { fontWeight: 500 }, children: "Language Model" }) }), vsCodeLmModels.length > 0 ? (_jsxs(VSCodeDropdown, { id: "vscode-lm-model", value: apiConfiguration?.vsCodeLmModelSelector
                                ? `${apiConfiguration.vsCodeLmModelSelector.vendor ?? ""}/${apiConfiguration.vsCodeLmModelSelector.family ?? ""}`
                                : "", onChange: (e) => {
                                const value = e.target.value;
                                if (!value) {
                                    return;
                                }
                                const [vendor, family] = value.split("/");
                                handleInputChange("vsCodeLmModelSelector")({
                                    target: {
                                        value: { vendor, family },
                                    },
                                });
                            }, style: { width: "100%" }, children: [_jsx(VSCodeOption, { value: "", children: "Select a model..." }), vsCodeLmModels.map((model) => (_jsxs(VSCodeOption, { value: `${model.vendor}/${model.family}`, children: [model.vendor, " - ", model.family] }, `${model.vendor}/${model.family}`)))] })) : (_jsx("p", { style: {
                                fontSize: "12px",
                                marginTop: "5px",
                                color: "var(--vscode-descriptionForeground)",
                            }, children: "The VS Code Language Model API allows you to run models provided by other VS Code extensions (including but not limited to GitHub Copilot). The easiest way to get started is to install the Copilot extension from the VS Marketplace and enabling Claude 3.7 Sonnet." })), _jsx("p", { style: {
                                fontSize: "12px",
                                marginTop: "5px",
                                color: "var(--vscode-errorForeground)",
                                fontWeight: 500,
                            }, children: "Note: This is a very experimental integration and may not work as expected." })] }) })), selectedProvider === "lmstudio" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.lmStudioBaseUrl || "", style: { width: "100%" }, type: "url", onInput: handleInputChange("lmStudioBaseUrl"), placeholder: "Default: http://localhost:1234", children: _jsx("span", { style: { fontWeight: 500 }, children: "Base URL (optional)" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.lmStudioModelId || "", style: { width: "100%" }, onInput: handleInputChange("lmStudioModelId"), placeholder: "e.g. meta-llama-3.1-8b-instruct", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model ID" }) }), lmStudioModels.length > 0 && (_jsx(VSCodeRadioGroup, { value: lmStudioModels.includes(apiConfiguration?.lmStudioModelId || "")
                            ? apiConfiguration?.lmStudioModelId
                            : "", onChange: (e) => {
                            const value = e.target?.value;
                            // need to check value first since radio group returns empty string sometimes
                            if (value) {
                                handleInputChange("lmStudioModelId")({
                                    target: { value },
                                });
                            }
                        }, children: lmStudioModels.map((model) => (_jsx(VSCodeRadio, { value: model, checked: apiConfiguration?.lmStudioModelId === model, children: model }, model))) })), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: "5px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["LM Studio allows you to run models locally on your computer. For instructions on how to get started, see their", _jsx(VSCodeLink, { href: "https://lmstudio.ai/docs", style: { display: "inline", fontSize: "inherit" }, children: "quickstart guide." }), "You will also need to start LM Studio's", " ", _jsx(VSCodeLink, { href: "https://lmstudio.ai/docs/basics/server", style: { display: "inline", fontSize: "inherit" }, children: "local server" }), " ", "feature to use it with this extension.", " ", _jsxs("span", { style: { color: "var(--vscode-errorForeground)" }, children: ["(", _jsx("span", { style: { fontWeight: 500 }, children: "Note:" }), " ValorIDE uses complex prompts and works best with Claude models. Less capable models may not work as expected.)"] })] })] })), selectedProvider === "litellm" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.liteLlmApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("liteLlmApiKey"), placeholder: "Default: noop", children: _jsx("span", { style: { fontWeight: 500 }, children: "API Key" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.liteLlmBaseUrl || "", style: { width: "100%" }, type: "url", onInput: handleInputChange("liteLlmBaseUrl"), placeholder: "Default: http://localhost:4000", children: _jsx("span", { style: { fontWeight: 500 }, children: "Base URL (optional)" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.liteLlmModelId || "", style: { width: "100%" }, onInput: handleInputChange("liteLlmModelId"), placeholder: "e.g. gpt-4", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model ID" }) }), _jsx("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            marginTop: 10,
                            marginBottom: 10,
                        }, children: selectedModelInfo.supportsPromptCache && (_jsxs(_Fragment, { children: [_jsx(VSCodeCheckbox, { checked: apiConfiguration?.liteLlmUsePromptCache || false, onChange: (e) => {
                                        const isChecked = e.target.checked === true;
                                        setApiConfiguration({
                                            ...apiConfiguration,
                                            liteLlmUsePromptCache: isChecked,
                                        });
                                    }, style: {
                                        fontWeight: 500,
                                        color: "var(--vscode-charts-green)",
                                    }, children: "Use prompt caching (GA)" }), _jsx("p", { style: {
                                        fontSize: "12px",
                                        marginTop: 3,
                                        color: "var(--vscode-charts-green)",
                                    }, children: "Prompt caching requires a supported provider and model" })] })) }), _jsxs(_Fragment, { children: [_jsx(ThinkingBudgetSlider, { apiConfiguration: apiConfiguration, setApiConfiguration: setApiConfiguration }), _jsxs("p", { style: {
                                    fontSize: "12px",
                                    marginTop: "5px",
                                    color: "var(--vscode-descriptionForeground)",
                                }, children: ["Extended thinking is available for models as Sonnet-3-7, o3-mini, Deepseek R1, etc. More info on", " ", _jsx(VSCodeLink, { href: "https://docs.litellm.ai/docs/reasoning_content", style: { display: "inline", fontSize: "inherit" }, children: "thinking mode configuration" })] })] }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: "5px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["LiteLLM provides a unified interface to access various LLM providers' models. See their", " ", _jsx(VSCodeLink, { href: "https://docs.litellm.ai/docs/", style: { display: "inline", fontSize: "inherit" }, children: "quickstart guide" }), " ", "for more information."] })] })), selectedProvider === "ollama" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.ollamaBaseUrl || "", style: { width: "100%" }, type: "url", onInput: handleInputChange("ollamaBaseUrl"), placeholder: "Default: http://localhost:11434", children: _jsx("span", { style: { fontWeight: 500 }, children: "Base URL (optional)" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.ollamaModelId || "", style: { width: "100%" }, onInput: handleInputChange("ollamaModelId"), placeholder: "e.g. llama3.1", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model ID" }) }), _jsx(VSCodeTextField, { value: apiConfiguration?.ollamaApiOptionsCtxNum || "32768", style: { width: "100%" }, onInput: handleInputChange("ollamaApiOptionsCtxNum"), placeholder: "e.g. 32768", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model Context Window" }) }), ollamaModels.length > 0 && (_jsx(VSCodeRadioGroup, { value: ollamaModels.includes(apiConfiguration?.ollamaModelId || "")
                            ? apiConfiguration?.ollamaModelId
                            : "", onChange: (e) => {
                            const value = e.target?.value;
                            // need to check value first since radio group returns empty string sometimes
                            if (value) {
                                handleInputChange("ollamaModelId")({
                                    target: { value },
                                });
                            }
                        }, children: ollamaModels.map((model) => (_jsx(VSCodeRadio, { value: model, checked: apiConfiguration?.ollamaModelId === model, children: model }, model))) })), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: "5px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["Ollama allows you to run models locally on your computer. For instructions on how to get started, see their", _jsx(VSCodeLink, { href: "https://github.com/ollama/ollama/blob/main/README.md", style: { display: "inline", fontSize: "inherit" }, children: "quickstart guide." }), _jsxs("span", { style: { color: "var(--vscode-errorForeground)" }, children: ["(", _jsx("span", { style: { fontWeight: 500 }, children: "Note:" }), " ValorIDE uses complex prompts and works best with Claude models. Less capable models may not work as expected.)"] })] })] })), selectedProvider === "xai" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.xaiApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("xaiApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "X AI API Key" }) }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.xaiApiKey && (_jsx(VSCodeLink, { href: "https://x.ai", style: { display: "inline", fontSize: "inherit" }, children: "You can get an X AI API key by signing up here." }))] })] })), selectedProvider === "sambanova" && (_jsxs("div", { children: [_jsx(VSCodeTextField, { value: apiConfiguration?.sambanovaApiKey || "", style: { width: "100%" }, type: "password", onInput: handleInputChange("sambanovaApiKey"), placeholder: "Enter API Key...", children: _jsx("span", { style: { fontWeight: 500 }, children: "SambaNova API Key" }) }), _jsxs("p", { style: {
                            fontSize: "12px",
                            marginTop: 3,
                            color: "var(--vscode-descriptionForeground)",
                        }, children: ["This key is stored locally and only used to make API requests from this extension.", !apiConfiguration?.sambanovaApiKey && (_jsx(VSCodeLink, { href: "https://docs.sambanova.ai/cloud/docs/get-started/overview", style: {
                                    display: "inline",
                                    fontSize: "inherit",
                                }, children: "You can get a SambaNova API key by signing up here." }))] })] })), apiErrorMessage && (_jsx("p", { style: {
                    margin: "-10px 0 4px 0",
                    fontSize: 12,
                    color: "var(--vscode-errorForeground)",
                }, children: apiErrorMessage })), (selectedProvider === "openrouter" || selectedProvider === "valoride") &&
                showModelOptions && (_jsxs(_Fragment, { children: [_jsx(VSCodeCheckbox, { style: { marginTop: -10 }, checked: providerSortingSelected, onChange: (e) => {
                            const isChecked = e.target.checked === true;
                            setProviderSortingSelected(isChecked);
                            if (!isChecked) {
                                setApiConfiguration({
                                    ...apiConfiguration,
                                    openRouterProviderSorting: "",
                                });
                            }
                        }, children: "Sort underlying provider routing" }), providerSortingSelected && (_jsxs("div", { style: { marginBottom: -6 }, children: [_jsx(DropdownContainer, { className: "dropdown-container", zIndex: OPENROUTER_MODEL_PICKER_Z_INDEX + 1, children: _jsxs(VSCodeDropdown, { style: { width: "100%", marginTop: 3 }, value: apiConfiguration?.openRouterProviderSorting, onChange: (e) => {
                                        setApiConfiguration({
                                            ...apiConfiguration,
                                            openRouterProviderSorting: e.target.value,
                                        });
                                    }, children: [_jsx(VSCodeOption, { value: "", children: "Default" }), _jsx(VSCodeOption, { value: "price", children: "Price" }), _jsx(VSCodeOption, { value: "throughput", children: "Throughput" }), _jsx(VSCodeOption, { value: "latency", children: "Latency" })] }) }), _jsxs("p", { style: {
                                    fontSize: "12px",
                                    marginTop: 3,
                                    color: "var(--vscode-descriptionForeground)",
                                }, children: [!apiConfiguration?.openRouterProviderSorting &&
                                        "Default behavior is to load balance requests across providers (like AWS, Google Vertex, Anthropic), prioritizing price while considering provider uptime", apiConfiguration?.openRouterProviderSorting === "price" &&
                                        "Sort providers by price, prioritizing the lowest cost provider", apiConfiguration?.openRouterProviderSorting ===
                                        "throughput" &&
                                        "Sort providers by throughput, prioritizing the provider with the highest throughput (may increase cost)", apiConfiguration?.openRouterProviderSorting === "latency" &&
                                        "Sort providers by response time, prioritizing the provider with the lowest latency"] })] }))] })), selectedProvider !== "openrouter" &&
                selectedProvider !== "valoride" &&
                selectedProvider !== "openai" &&
                selectedProvider !== "ollama" &&
                selectedProvider !== "lmstudio" &&
                selectedProvider !== "vscode-lm" &&
                selectedProvider !== "litellm" &&
                selectedProvider !== "requesty" &&
                showModelOptions && (_jsxs(_Fragment, { children: [_jsxs(DropdownContainer, { zIndex: DROPDOWN_Z_INDEX - 2, className: "dropdown-container", children: [_jsx("label", { htmlFor: "model-id", children: _jsx("span", { style: { fontWeight: 500 }, children: "Model" }) }), selectedProvider === "anthropic" &&
                                createDropdown(anthropicModels), selectedProvider === "bedrock" && createDropdown(bedrockModels), selectedProvider === "vertex" && createDropdown(vertexModels), selectedProvider === "gemini" && createDropdown(geminiModels), selectedProvider === "openai-native" &&
                                createDropdown(openAiNativeModels), selectedProvider === "deepseek" &&
                                createDropdown(deepSeekModels), selectedProvider === "qwen" &&
                                createDropdown(apiConfiguration?.qwenApiLine === "china"
                                    ? mainlandQwenModels
                                    : internationalQwenModels), selectedProvider === "doubao" && createDropdown(doubaoModels), selectedProvider === "mistral" && createDropdown(mistralModels), selectedProvider === "asksage" && createDropdown(askSageModels), selectedProvider === "xai" && createDropdown(xaiModels), selectedProvider === "sambanova" &&
                                createDropdown(sambanovaModels)] }), ((selectedProvider === "anthropic" &&
                        selectedModelId === "claude-3-7-sonnet-20250219") ||
                        (selectedProvider === "bedrock" &&
                            selectedModelId ===
                                "anthropic.claude-3-7-sonnet-20250219-v1:0") ||
                        (selectedProvider === "vertex" &&
                            selectedModelId === "claude-3-7-sonnet@20250219")) && (_jsx(ThinkingBudgetSlider, { apiConfiguration: apiConfiguration, setApiConfiguration: setApiConfiguration })), selectedProvider === "xai" &&
                        selectedModelId.includes("3-mini") && (_jsxs(_Fragment, { children: [_jsx(VSCodeCheckbox, { style: { marginTop: 0 }, checked: reasoningEffortSelected, onChange: (e) => {
                                    const isChecked = e.target.checked === true;
                                    setReasoningEffortSelected(isChecked);
                                    if (!isChecked) {
                                        setApiConfiguration({
                                            ...apiConfiguration,
                                            reasoningEffort: "",
                                        });
                                    }
                                }, children: "Modify reasoning effort" }), reasoningEffortSelected && (_jsxs("div", { children: [_jsx("label", { htmlFor: "reasoning-effort-dropdown", children: _jsx("span", { style: {}, children: "Reasoning Effort" }) }), _jsx(DropdownContainer, { className: "dropdown-container", zIndex: DROPDOWN_Z_INDEX - 100, children: _jsxs(VSCodeDropdown, { id: "reasoning-effort-dropdown", style: { width: "100%", marginTop: 3 }, value: apiConfiguration?.reasoningEffort || "high", onChange: (e) => {
                                                setApiConfiguration({
                                                    ...apiConfiguration,
                                                    reasoningEffort: e.target.value,
                                                });
                                            }, children: [_jsx(VSCodeOption, { value: "low", children: "low" }), _jsx(VSCodeOption, { value: "high", children: "high" })] }) }), _jsx("p", { style: {
                                            fontSize: "12px",
                                            marginTop: 3,
                                            marginBottom: 0,
                                            color: "var(--vscode-descriptionForeground)",
                                        }, children: "High effort may produce more thorough analysis but takes longer and uses more tokens." })] }))] })), _jsx(ModelInfoView, { selectedModelId: selectedModelId, modelInfo: selectedModelInfo, isDescriptionExpanded: isDescriptionExpanded, setIsDescriptionExpanded: setIsDescriptionExpanded, isPopup: isPopup })] })), (selectedProvider === "openrouter" || selectedProvider === "valoride") &&
                showModelOptions && _jsx(OpenRouterModelPicker, { isPopup: isPopup }), selectedProvider === "requesty" && showModelOptions && (_jsx(RequestyModelPicker, { isPopup: isPopup })), modelIdErrorMessage && (_jsx("p", { style: {
                    margin: "-10px 0 4px 0",
                    fontSize: 12,
                    color: "var(--vscode-errorForeground)",
                }, children: modelIdErrorMessage }))] }));
};
export function getOpenRouterAuthUrl(uriScheme) {
    return `https://openrouter.ai/auth?callback_url=${uriScheme || "vscode"}://valkyrlabsinc.valoride-dev/openrouter`;
}
export const formatPrice = (price) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(price);
};
// Returns an array of formatted tier strings
const formatTiers = (tiers) => {
    if (!tiers || tiers.length === 0) {
        return [];
    }
    return tiers.map((tier, index, arr) => {
        const prevLimit = index > 0 ? arr[index - 1].tokenLimit : 0;
        return (_jsxs("span", { style: { paddingLeft: "15px" }, children: [formatPrice(tier.price), "/million tokens (", tier.tokenLimit === Number.POSITIVE_INFINITY ? (_jsxs("span", { children: ["> ", prevLimit.toLocaleString()] })) : (_jsxs("span", { children: ["<= ", tier.tokenLimit.toLocaleString()] })), " tokens)", index < arr.length - 1 && _jsx("br", {})] }, index));
    });
};
export const ModelInfoView = ({ selectedModelId, modelInfo, isDescriptionExpanded, setIsDescriptionExpanded, isPopup, }) => {
    const isGemini = Object.keys(geminiModels).includes(selectedModelId);
    const hasThinkingConfig = !!modelInfo.thinkingConfig;
    // Create elements for tiered pricing separately
    const inputPriceElement = modelInfo.inputPriceTiers ? (_jsxs(Fragment, { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Input price:" }), _jsx("br", {}), formatTiers(modelInfo.inputPriceTiers)] }, "inputPriceTiers")) : modelInfo.inputPrice !== undefined && modelInfo.inputPrice > 0 ? (_jsxs("span", { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Input price:" }), " ", formatPrice(modelInfo.inputPrice), "/million tokens"] }, "inputPrice")) : null;
    // --- Output Price Logic ---
    let outputPriceElement = null;
    if (hasThinkingConfig &&
        modelInfo.outputPrice !== undefined &&
        modelInfo.thinkingConfig?.outputPrice !== undefined) {
        // Display both standard and thinking budget prices
        outputPriceElement = (_jsxs(Fragment, { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Output price (Standard):" }), " ", formatPrice(modelInfo.outputPrice), "/million tokens", _jsx("br", {}), _jsx("span", { style: { fontWeight: 500 }, children: "Output price (Thinking Budget > 0):" }), " ", formatPrice(modelInfo.thinkingConfig.outputPrice), "/million tokens"] }, "outputPriceConditional"));
    }
    else if (modelInfo.outputPriceTiers) {
        // Display tiered output pricing
        outputPriceElement = (_jsxs(Fragment, { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Output price:" }), _jsx("span", { style: { fontStyle: "italic" }, children: " (based on input tokens)" }), _jsx("br", {}), formatTiers(modelInfo.outputPriceTiers)] }, "outputPriceTiers"));
    }
    else if (modelInfo.outputPrice !== undefined && modelInfo.outputPrice > 0) {
        // Display single standard output price
        outputPriceElement = (_jsxs("span", { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Output price:" }), " ", formatPrice(modelInfo.outputPrice), "/million tokens"] }, "outputPrice"));
    }
    // --- End Output Price Logic ---
    const infoItems = [
        modelInfo.description && (_jsx(ModelDescriptionMarkdown, { markdown: modelInfo.description, isExpanded: isDescriptionExpanded, setIsExpanded: setIsDescriptionExpanded, isPopup: isPopup }, "description")),
        _jsx(ModelInfoSupportsItem, { isSupported: modelInfo.supportsImages ?? false, supportsLabel: "Supports images", doesNotSupportLabel: "Does not support images" }, "supportsImages"),
        _jsx(ModelInfoSupportsItem, { isSupported: modelInfo.supportsImages ?? false, supportsLabel: "Supports browser use", doesNotSupportLabel: "Does not support browser use" }, "supportsBrowserUse"),
        !isGemini && (_jsx(ModelInfoSupportsItem, { isSupported: modelInfo.supportsPromptCache, supportsLabel: "Supports prompt caching", doesNotSupportLabel: "Does not support prompt caching" }, "supportsPromptCache")),
        modelInfo.maxTokens !== undefined && modelInfo.maxTokens > 0 && (_jsxs("span", { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Max output:" }), " ", modelInfo.maxTokens?.toLocaleString(), " tokens"] }, "maxTokens")),
        inputPriceElement, // Add the generated input price block
        modelInfo.supportsPromptCache && modelInfo.cacheWritesPrice && (_jsxs("span", { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Cache writes price:" }), " ", formatPrice(modelInfo.cacheWritesPrice || 0), "/million tokens"] }, "cacheWritesPrice")),
        modelInfo.supportsPromptCache && modelInfo.cacheReadsPrice && (_jsxs("span", { children: [_jsx("span", { style: { fontWeight: 500 }, children: "Cache reads price:" }), " ", formatPrice(modelInfo.cacheReadsPrice || 0), "/million tokens"] }, "cacheReadsPrice")),
        outputPriceElement, // Add the generated output price block
        isGemini && (_jsxs("span", { style: { fontStyle: "italic" }, children: ["* Free up to", " ", selectedModelId && selectedModelId.includes("flash") ? "15" : "2", " ", "requests per minute. After that, billing depends on prompt size.", " ", _jsx(VSCodeLink, { href: "https://ai.google.dev/pricing", style: { display: "inline", fontSize: "inherit" }, children: "For more info, see pricing details." })] }, "geminiInfo")),
    ].filter(Boolean);
    return (_jsx("p", { style: {
            fontSize: "12px",
            marginTop: "2px",
            color: "var(--vscode-descriptionForeground)",
        }, children: infoItems.map((item, index) => (_jsxs(Fragment, { children: [item, index < infoItems.length - 1 && _jsx("br", {})] }, index))) }));
};
const ModelInfoSupportsItem = ({ isSupported, supportsLabel, doesNotSupportLabel, }) => (_jsxs("span", { style: {
        fontWeight: 500,
        color: isSupported
            ? "var(--vscode-charts-green)"
            : "var(--vscode-errorForeground)",
    }, children: [isSupported ? (_jsx(FaCheck, { style: {
                marginRight: 4,
                marginBottom: 1,
                fontSize: 11,
                fontWeight: 700,
                display: "inline-block",
                verticalAlign: "bottom",
            } })) : (_jsx(FaTimes, { style: {
                marginRight: 4,
                marginBottom: -1,
                fontSize: 13,
                fontWeight: 700,
                display: "inline-block",
                verticalAlign: "bottom",
            } })), isSupported ? supportsLabel : doesNotSupportLabel] }));
export function normalizeApiConfiguration(apiConfiguration) {
    const provider = apiConfiguration?.apiProvider || "anthropic";
    const modelId = apiConfiguration?.apiModelId;
    const getProviderData = (models, defaultId) => {
        let selectedModelId;
        let selectedModelInfo;
        if (modelId && modelId in models) {
            selectedModelId = modelId;
            selectedModelInfo = models[modelId];
        }
        else {
            selectedModelId = defaultId;
            selectedModelInfo = models[defaultId];
        }
        return {
            selectedProvider: provider,
            selectedModelId,
            selectedModelInfo,
        };
    };
    switch (provider) {
        case "valkyrai":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.valkyraiServiceId || "",
                selectedModelInfo: openAiModelInfoSaneDefaults,
            };
        case "anthropic":
            return getProviderData(anthropicModels, anthropicDefaultModelId);
        case "bedrock":
            return getProviderData(bedrockModels, bedrockDefaultModelId);
        case "vertex":
            return getProviderData(vertexModels, vertexDefaultModelId);
        case "gemini":
            return getProviderData(geminiModels, geminiDefaultModelId);
        case "openai-native":
            return getProviderData(openAiNativeModels, openAiNativeDefaultModelId);
        case "deepseek":
            return getProviderData(deepSeekModels, deepSeekDefaultModelId);
        case "qwen":
            const qwenModels = apiConfiguration?.qwenApiLine === "china"
                ? mainlandQwenModels
                : internationalQwenModels;
            const qwenDefaultId = apiConfiguration?.qwenApiLine === "china"
                ? mainlandQwenDefaultModelId
                : internationalQwenDefaultModelId;
            return getProviderData(qwenModels, qwenDefaultId);
        case "doubao":
            return getProviderData(doubaoModels, doubaoDefaultModelId);
        case "mistral":
            return getProviderData(mistralModels, mistralDefaultModelId);
        case "asksage":
            return getProviderData(askSageModels, askSageDefaultModelId);
        case "openrouter":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.openRouterModelId || openRouterDefaultModelId,
                selectedModelInfo: apiConfiguration?.openRouterModelInfo || openRouterDefaultModelInfo,
            };
        case "requesty":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.requestyModelId || requestyDefaultModelId,
                selectedModelInfo: apiConfiguration?.requestyModelInfo || requestyDefaultModelInfo,
            };
        case "valoride":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.openRouterModelId || openRouterDefaultModelId,
                selectedModelInfo: apiConfiguration?.openRouterModelInfo || openRouterDefaultModelInfo,
            };
        case "openai":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.openAiModelId || "",
                selectedModelInfo: apiConfiguration?.openAiModelInfo || openAiModelInfoSaneDefaults,
            };
        case "ollama":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.ollamaModelId || "",
                selectedModelInfo: openAiModelInfoSaneDefaults,
            };
        case "lmstudio":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.lmStudioModelId || "",
                selectedModelInfo: openAiModelInfoSaneDefaults,
            };
        case "vscode-lm":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.vsCodeLmModelSelector
                    ? `${apiConfiguration.vsCodeLmModelSelector.vendor}/${apiConfiguration.vsCodeLmModelSelector.family}`
                    : "",
                selectedModelInfo: {
                    ...openAiModelInfoSaneDefaults,
                    supportsImages: false, // VSCode LM API currently doesn't support images
                },
            };
        case "litellm":
            return {
                selectedProvider: provider,
                selectedModelId: apiConfiguration?.liteLlmModelId || "",
                selectedModelInfo: liteLlmModelInfoSaneDefaults,
            };
        case "xai":
            return getProviderData(xaiModels, xaiDefaultModelId);
        case "sambanova":
            return getProviderData(sambanovaModels, sambanovaDefaultModelId);
        default:
            return getProviderData(anthropicModels, anthropicDefaultModelId);
    }
}
export default memo(ApiOptions);
//# sourceMappingURL=ApiOptions.js.map