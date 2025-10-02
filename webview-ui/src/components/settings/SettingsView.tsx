import {
  VSCodeButton,
  VSCodeCheckbox,
  VSCodeLink,
  VSCodeTextArea,
} from "@vscode/webview-ui-toolkit/react";
import { memo, useCallback, useEffect, useState } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { validateApiConfiguration, validateModelId } from "@/utils/validate";
import { vscode } from "@/utils/vscode";
import SettingsButton from "@/components/common/SettingsButton";
import ApiOptions from "./ApiOptions";
import { TabButton } from "../mcp/configuration/McpConfigurationView";
import { useEvent } from "react-use";
import { ExtensionMessage } from "@shared/ExtensionMessage";
import BrowserSettingsSection from "./BrowserSettingsSection";
import { VscSettingsGear } from "react-icons/vsc";
import { FaStar, FaShareAlt, FaCheck, FaTag } from "react-icons/fa";
import StatusBadge from "@/components/common/StatusBadge";
import OfflineBanner from "@/components/common/OfflineBanner";
import SystemAlerts from "@/components/SystemAlerts";
import { useCommunicationService } from "@/context/CommunicationServiceContext";

const { IS_DEV } = process.env;

type SettingsViewProps = {
  onDone: () => void;
};

const SettingsView = ({ onDone }: SettingsViewProps) => {
  const {
    apiConfiguration,
    version,
    customInstructions,
    setCustomInstructions,
    openRouterModels,
    telemetrySetting,
    setTelemetrySetting,
    chatSettings,
    planActSeparateModelsSetting,
    setPlanActSeparateModelsSetting,
  } = useExtensionState();
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [modelIdErrorMessage, setModelIdErrorMessage] = useState<
    string | undefined
  >(undefined);
  const [pendingTabChange, setPendingTabChange] = useState<
    "plan" | "act" | null
  >(null);

  // Local-only setting: Remember login (persist JWT to localStorage)
  const [persistJwt, setPersistJwt] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("valoride.persistJwt");
      return v === null ? true : v === "true";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("valoride.persistJwt", String(persistJwt)); } catch { /* ignore */ }
  }, [persistJwt]);

  const handleSubmit = (withoutDone: boolean = false) => {
    const apiValidationResult = validateApiConfiguration(apiConfiguration);
    const modelIdValidationResult = validateModelId(
      apiConfiguration,
      openRouterModels,
    );

    // setApiErrorMessage(apiValidationResult)
    // setModelIdErrorMessage(modelIdValidationResult)

    let apiConfigurationToSubmit = apiConfiguration;
    if (!apiValidationResult && !modelIdValidationResult) {
      // vscode.postMessage({ type: "apiConfiguration", apiConfiguration })
      // vscode.postMessage({
      // 	type: "customInstructions",
      // 	text: customInstructions,
      // })
      // vscode.postMessage({
      // 	type: "telemetrySetting",
      // 	text: telemetrySetting,
      // })
      // console.log("handleSubmit", withoutDone)
      // vscode.postMessage({
      // 	type: "separateModeSetting",
      // 	text: separateModeSetting,
      // })
    } else {
      // if the api configuration is invalid, we don't save it
      apiConfigurationToSubmit = undefined;
    }

    vscode.postMessage({
      type: "updateSettings",
      planActSeparateModelsSetting,
      customInstructionsSetting: customInstructions,
      telemetrySetting,
      apiConfiguration: apiConfigurationToSubmit,
    });

    if (!withoutDone) {
      onDone();
    }
  };

  useEffect(() => {
    setApiErrorMessage(undefined);
    setModelIdErrorMessage(undefined);
  }, [apiConfiguration]);

  // validate as soon as the component is mounted
  /*
    useEffect will use stale values of variables if they are not included in the dependency array. 
    so trying to use useEffect with a dependency array of only one value for example will use any 
    other variables' old values. In most cases you don't want this, and should opt to use react-use 
    hooks.
    
        // uses someVar and anotherVar
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [someVar])
  If we only want to run code once on mount we can use react-use's useEffectOnce or useMount
    */

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;
      switch (message.type) {
        case "didUpdateSettings":
          if (pendingTabChange) {
            vscode.postMessage({
              type: "togglePlanActMode",
              chatSettings: {
                mode: pendingTabChange,
              },
            });
            setPendingTabChange(null);
          }
          break;
        case "scrollToSettings":
          setTimeout(() => {
            const elementId = message.text;
            if (elementId) {
              const element = document.getElementById(elementId);
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });

                element.style.transition = "background-color 0.5s ease";
                element.style.backgroundColor =
                  "var(--vscode-textPreformat-background)";

                setTimeout(() => {
                  element.style.backgroundColor = "transparent";
                }, 1200);
              }
            }
          }, 300);
          break;
      }
    },
    [pendingTabChange],
  );

  useEvent("message", handleMessage);

  const handleResetState = () => {
    vscode.postMessage({ type: "resetState" });
  };

  const handleTabChange = (tab: "plan" | "act") => {
    if (tab === chatSettings.mode) {
      return;
    }
    setPendingTabChange(tab);
    handleSubmit(true);
  };

  const communicationService = useCommunicationService() as any;
  const [peers, setPeers] = useState<string[]>([]);
  const [phase, setPhase] = useState<string | undefined>(undefined);
  const ready = !!communicationService?.ready;
  const hasError = !!communicationService?.error;
  const hubConnected = !!communicationService?.hubConnected;
  const thorConnected = !!communicationService?.thorConnected;
  useEffect(() => {
    if (!communicationService) return;
    const handlePresence = (list: string[]) => setPeers(list);
    const handleStatus = (s: any) => setPhase(s?.phase);
    communicationService.on?.("presence", handlePresence);
    communicationService.on?.("status", handleStatus);
    return () => {
      communicationService.off?.("presence", handlePresence);
      communicationService.off?.("status", handleStatus);
    };
  }, [communicationService]);

  const value = ready
    ? hubConnected && thorConnected
      ? "Online (Hub+Server)"
      : hubConnected
        ? "Online (Local)"
        : "Online (Server)"
    : hasError
      ? "Error"
      : phase === "connecting" ? "Connecting..." : "Offline";
  const kind = ready ? "ok" : hasError ? "error" : "warn";

  const [copied, setCopied] = useState(false);
  const handleStar = () => {
    vscode.postMessage({ type: "openInBrowser", url: "https://github.com/valkyrlabs/valoride" });
  };
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        "https://marketplace.visualstudio.com/items?itemName=ValkyrLabsInc.valoride-dev",
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Fallback: open in browser if clipboard blocked
      vscode.postMessage({
        type: "openInBrowser",
        url: "https://marketplace.visualstudio.com/items?itemName=ValkyrLabsInc.valoride-dev",
      });
    }
  };

  return (
    <>
      <SystemAlerts />
      <div className="fixed top-0 left-0 right-0 bottom-0 pt-[10px] pr-0 pb-0 pl-5 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-[13px] pr-[17px]">
          <h3 className="text-[var(--vscode-foreground)] m-0">Settings</h3>
          <div className="flex items-center gap-2">
            <VSCodeButton appearance="secondary" onClick={handleStar} title="Star us on GitHub">
              <span className="flex items-center gap-2"><FaStar /> </span>
            </VSCodeButton>
            <VSCodeButton appearance="secondary" onClick={handleShare} title="Copy Marketplace link to clipboard">
              <span className="flex items-center gap-2"><FaShareAlt size={18} /> {copied ? <FaCheck size={18} /> : <FaTag />}</span>
            </VSCodeButton>
            <StatusBadge label="P2P" value={value} kind={kind as any} title={hasError ? String(communicationService.error) : undefined} />
            <div className="flex items-center gap-2" title="Store and load the JWT in local storage to avoid logging in every time">
              <VSCodeCheckbox checked={persistJwt} onChange={(e: any) => setPersistJwt(!!e?.target?.checked)}>
                Remember login
              </VSCodeCheckbox>
            </div>
            <VSCodeButton onClick={() => handleSubmit(false)}>Save</VSCodeButton>
          </div>
        </div>
        <div className="grow overflow-y-scroll pr-2 flex flex-col">

          {/**
          <OfflineBanner />
           */}
          {peers.length > 0 && (
            <div className="border border-solid border-[var(--vscode-panel-border)] rounded-md p-[10px] mb-3 bg-[var(--vscode-panel-background)] text-[var(--vscode-foreground)]">
              <div className="mb-2 font-semibold">Active instances</div>
              <div className="flex flex-wrap gap-2">
                {peers.map((id) => (
                  <span key={id} style={{
                    border: "1px solid var(--vscode-panel-border)",
                    borderRadius: 6,
                    padding: "2px 6px",
                    fontSize: 12,
                    background: "var(--vscode-editor-background)",
                  }}>{id}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tabs container */}
          {planActSeparateModelsSetting ? (
            <div className="border border-solid border-[var(--vscode-panel-border)] rounded-md p-[10px] mb-5 bg-[var(--vscode-panel-background)]">
              <div className="flex gap-[1px] mb-[10px] -mt-2 border-0 border-b border-solid border-[var(--vscode-panel-border)]">
                <TabButton
                  isActive={chatSettings.mode === "plan"}
                  onClick={() => handleTabChange("plan")}
                >
                  Plan Mode
                </TabButton>
                <TabButton
                  isActive={chatSettings.mode === "act"}
                  onClick={() => handleTabChange("act")}
                >
                  Act Mode
                </TabButton>
              </div>

              {/* Content container */}
              <div className="-mb-3">
                <ApiOptions
                  key={chatSettings.mode}
                  showModelOptions={true}
                  apiErrorMessage={apiErrorMessage}
                  modelIdErrorMessage={modelIdErrorMessage}
                />
              </div>
            </div>
          ) : (
            <ApiOptions
              key={"single"}
              showModelOptions={true}
              apiErrorMessage={apiErrorMessage}
              modelIdErrorMessage={modelIdErrorMessage}
            />
          )}

          <div className="mb-[5px]">
            <VSCodeTextArea
              value={customInstructions ?? ""}
              className="w-full"
              resize="vertical"
              rows={4}
              placeholder={
                'e.g. "Run unit tests at the end", "Use TypeScript with async/await", "Speak in Spanish"'
              }
              onInput={(e: any) => setCustomInstructions(e.target?.value ?? "")}
            >
              <span className="font-medium">Custom Instructions</span>
            </VSCodeTextArea>
            <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
              These instructions are added to the end of the system prompt sent
              with every request.
            </p>
          </div>

          <div className="mb-[5px]">
            <VSCodeCheckbox
              className="mb-[5px]"
              checked={planActSeparateModelsSetting}
              onChange={(e: any) => {
                const checked = e.target.checked === true;
                setPlanActSeparateModelsSetting(checked);
              }}
            >
              Use different models for Plan and Act modes
            </VSCodeCheckbox>
            <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
              Switching between Plan and Act mode will persist the API and model
              used in the previous mode. This may be helpful e.g. when using a
              strong reasoning model to architect a plan for a cheaper coding
              model to act on.
            </p>
          </div>

          <div className="mb-[5px]">
            <VSCodeCheckbox
              className="mb-[5px]"
              checked={telemetrySetting === "enabled"}
              onChange={(e: any) => {
                const checked = e.target.checked === true;
                setTelemetrySetting(checked ? "enabled" : "disabled");
              }}
            >
              Allow anonymous error and usage reporting
            </VSCodeCheckbox>
            <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
              Help improve ValorIDE by sending anonymous usage data and error
              reports. No code, prompts, or personal information are ever sent.
              See our{" "}
              <VSCodeLink
                href="https://valkyrlabs.com/v1/docs/Legal/privacy/"
                className="text-inherit"
              >
                telemetry overview
              </VSCodeLink>{" "}
              and{" "}
              <VSCodeLink
                href="https://valkyrlabs.com/v1/docs/Legal/privacy"
                className="text-inherit"
              >
                privacy policy
              </VSCodeLink>{" "}
              for more details.
            </p>
          </div>

          {/* Browser Settings Section */}
          <BrowserSettingsSection />

          <div className="mt-auto pr-2 flex justify-center">
            <SettingsButton
              onClick={() =>
                vscode.postMessage({ type: "openExtensionSettings" })
              }
              className="mt-0 mr-0 mb-4 ml-0"
            >
              <VscSettingsGear />
              Advanced Settings
            </SettingsButton>
          </div>

          {IS_DEV && (
            <>
              <div className="mt-[10px] mb-1">Debug</div>
              <VSCodeButton
                onClick={handleResetState}
                className="mt-[5px] w-auto"
              >
                Reset State
              </VSCodeButton>
              <p className="text-xs mt-[5px] text-[var(--vscode-descriptionForeground)]">
                This will reset all global state and secret storage in the
                extension.
              </p>
            </>
          )}

          <div className="text-center text-[var(--vscode-descriptionForeground)] text-xs leading-[1.2] px-0 py-0 pr-2 pb-[15px] mt-auto">
            <p className="break-words m-0 p-0">
              If you have any questions or feedback, feel free to open an issue at{" "}
              <VSCodeLink
                href="https://github.com/valkyrlabs/valoride"
                className="inline"
              >
                https://github.com/valkyrlabs/valoride
              </VSCodeLink>
            </p>
            <p className="italic mt-[10px] mb-0 p-0">v{version}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(SettingsView);
