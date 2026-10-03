import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useEffect, useState, memo } from "react";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import { validateApiConfiguration } from "@thorapi/utils/validate";
import { vscode } from "@thorapi/utils/vscode";
import ApiOptions from "@thorapi/components/settings/ApiOptions";
import type { ExtensionMessage } from "@shared/ExtensionMessage";
import {
  FaBrain,
  FaRocket,
  FaCode,
  FaChevronRight,
  FaKey,
} from "react-icons/fa";

// Feature bullets shown on the welcome screen
const FEATURES = [
  "Create, edit, and refactor files with full context awareness",
  "Explore complex codebases and write documentation",
  "Write & fix tests, add features, and squash bugs",
  "Control a browser to test your apps in real time",
  "Run terminal commands with fine-grained permission controls",
  "Extend capabilities with MCP tools and custom integrations",
];

const WelcomeView = memo(() => {
  const { apiConfiguration } = useExtensionState();
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [showApiOptions, setShowApiOptions] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [localResult, setLocalResult] = useState<{
    success: boolean;
    text: string;
  }>();

  useEffect(() => {
    const listener = (event: MessageEvent<ExtensionMessage>) => {
      if (event.data.type !== "grayMatterSetupResult") return;
      setLocalBusy(false);
      setLocalResult({
        success: event.data.success === true,
        text: event.data.text ?? "Local setup finished.",
      });
      if (event.data.success) setShowApiOptions(true);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  const disableLetsGoButton = apiErrorMessage != null;

  const handleSignup = () => {
    vscode.postMessage({
      type: "showAccountViewClicked",
      accountTab: "signup",
    });
  };

  const handleLogin = () => {
    vscode.postMessage({ type: "showAccountViewClicked", accountTab: "login" });
  };

  const handleSubmit = () => {
    vscode.postMessage({ type: "apiConfiguration", apiConfiguration });
  };

  useEffect(() => {
    setApiErrorMessage(validateApiConfiguration(apiConfiguration));
  }, [apiConfiguration]);

  return (
    <>
      <div
        className="fixed inset-0 flex flex-col overflow-auto"
        style={{ background: "var(--vscode-editor-background)" }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            padding: "24px 20px 40px",
            width: "100%",
          }}
        >
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 24, fontWeight: 700 }}>ValorIDE</span>
          </div>

          {/* Hero */}
          <div
            style={{
              background: "var(--vscode-panel-background)",
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: 8,
              padding: "20px 22px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <FaBrain size={22} color="var(--vscode-focusBorder, #06ffa5)" />
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--vscode-foreground)",
                }}
              >
                Set up your coding workspace
              </h2>
            </div>
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 13,
                lineHeight: 1.6,
                color: "var(--vscode-descriptionForeground)",
              }}
            >
              Choose hosted GrayMatter or run GrayMatter Lite on your Mac. Then
              choose the coding model you want to use.
            </p>

            <ul
              style={{
                margin: "0 0 4px",
                padding: "0 0 0 4px",
                listStyle: "none",
              }}
            >
              {FEATURES.map((f) => (
                <li
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    fontSize: 12,
                    color: "var(--vscode-foreground)",
                    marginBottom: 5,
                    lineHeight: 1.5,
                  }}
                >
                  <FaChevronRight
                    size={9}
                    style={{
                      marginTop: 3,
                      flexShrink: 0,
                      color: "var(--vscode-focusBorder, #06ffa5)",
                    }}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Primary CTA */}
          <div
            style={{
              background: "var(--vscode-panel-background)",
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: 8,
              padding: "18px 22px",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <FaRocket size={15} color="var(--vscode-focusBorder, #06ffa5)" />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--vscode-foreground)",
                }}
              >
                GrayMatter Cloud · Recommended
              </span>
            </div>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                color: "var(--vscode-descriptionForeground)",
                lineHeight: 1.5,
              }}
            >
              Use hosted memory at valkyrlabs.com with your ValkyrAI account.
              Create a free account or sign in to continue.
            </p>
            <VSCodeButton
              appearance="primary"
              onClick={handleSignup}
              style={{ width: "100%" }}
            >
              Set up hosted GrayMatter
            </VSCodeButton>
            <div
              style={{
                marginTop: 10,
                textAlign: "center",
                fontSize: 11,
                color: "var(--vscode-descriptionForeground)",
              }}
            >
              Already have an account?{" "}
              <button
                type="button"
                onClick={handleLogin}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--vscode-textLink-foreground)",
                  cursor: "pointer",
                  fontSize: 11,
                  padding: 0,
                }}
              >
                Sign in
              </button>
            </div>
          </div>

          <div
            style={{
              background: "var(--vscode-panel-background)",
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: 8,
              padding: "18px 22px",
              marginBottom: 12,
            }}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>
              Local GrayMatter Lite
            </h3>
            <p
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                color: "var(--vscode-descriptionForeground)",
              }}
            >
              Keep memory on this machine. No valkyrlabs.com signup is needed.
              Setup starts Lite from its source folder and connects its MCP
              memory tools. The first source build may download missing
              toolchains; installed Lite works offline.
            </p>
            <VSCodeButton
              appearance="secondary"
              disabled={localBusy}
              onClick={() => {
                setLocalBusy(true);
                setLocalResult(undefined);
                vscode.postMessage({ type: "setupLocalGrayMatter" });
              }}
              style={{ width: "100%" }}
            >
              {localBusy
                ? "Setting up local memory…"
                : "Connect Local GrayMatter Lite"}
            </VSCodeButton>
            {localResult && (
              <p
                role={localResult.success ? "status" : "alert"}
                style={{ fontSize: 12, lineHeight: 1.5 }}
              >
                {localResult.text}
              </p>
            )}
          </div>

          {/* Model configuration is available without a hosted account. */}
          <div
            style={{
              background: "var(--vscode-panel-background)",
              border: "1px solid var(--vscode-panel-border)",
              borderRadius: 8,
              padding: "14px 22px",
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setShowApiOptions((v) => !v)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                width: "100%",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--vscode-foreground)",
              }}
            >
              <FaKey size={13} style={{ opacity: 0.7 }} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Choose a local model or your own provider
              </span>
              <FaChevronRight
                size={10}
                style={{
                  marginLeft: "auto",
                  opacity: 0.5,
                  transform: showApiOptions ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.15s",
                }}
              />
            </button>

            {showApiOptions && (
              <div style={{ marginTop: 14 }}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: 12,
                    color: "var(--vscode-descriptionForeground)",
                    lineHeight: 1.5,
                  }}
                >
                  Use Ollama or LM Studio locally, or connect your API key from
                  Anthropic, OpenAI, OpenRouter, or another provider.
                </p>
                <ApiOptions showModelOptions={false} />
                <VSCodeButton
                  onClick={handleSubmit}
                  disabled={disableLetsGoButton}
                  style={{ marginTop: 12, width: "100%" }}
                >
                  <FaCode size={12} style={{ marginRight: 6 }} />
                  Start Coding
                </VSCodeButton>
              </div>
            )}
          </div>

          {/* Footer links */}
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "var(--vscode-descriptionForeground)",
            }}
          >
            <VSCodeLink
              href="https://valkyrlabs.com/v1/Products/ValorIDE/getting-started"
              style={{ fontSize: 11 }}
            >
              Getting Started Guide
            </VSCodeLink>
            {" · "}
            <VSCodeLink
              href="https://valkyrlabs.com/v1/docs/Legal/privacy"
              style={{ fontSize: 11 }}
            >
              Privacy Policy
            </VSCodeLink>
            {" · "}
            <VSCodeLink
              href="https://github.com/valkyrlabs/valoride"
              style={{ fontSize: 11 }}
            >
              GitHub
            </VSCodeLink>
          </div>
        </div>
      </div>
    </>
  );
});

export default WelcomeView;
