import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useEffect, useState, memo } from "react";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";
import { validateApiConfiguration } from "@thorapi/utils/validate";
import { vscode } from "@thorapi/utils/vscode";
import ApiOptions from "@thorapi/components/settings/ApiOptions";
import SystemAlerts from "@thorapi/components/SystemAlerts";
import {
  readStoredPrincipal,
  hydrateStoredCredentials,
} from "@thorapi/utils/accessControl";
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
  const [hasStoredAuth, setHasStoredAuth] = useState(false);

  // Check for stored credentials on mount
  useEffect(() => {
    // Restore JWT & Principal from localStorage if they exist (for sticky auth)
    hydrateStoredCredentials("welcome-view-init");

    const storedPrincipal = readStoredPrincipal();
    const storedToken =
      sessionStorage.getItem("jwtToken") || localStorage.getItem("jwtToken");
    if (storedPrincipal && storedToken) {
      setHasStoredAuth(true);
      return;
    }
  }, []);

  const disableLetsGoButton = apiErrorMessage != null;

  const handleLogin = () => {
    vscode.postMessage({ type: "accountLoginClicked" });
  };

  const handleSubmit = () => {
    vscode.postMessage({ type: "apiConfiguration", apiConfiguration });
  };

  useEffect(() => {
    setApiErrorMessage(validateApiConfiguration(apiConfiguration));
  }, [apiConfiguration]);

  // If stored auth exists, parent App.tsx routes to the main interface
  if (hasStoredAuth) {
    return null;
  }

  return (
    <>
      <SystemAlerts />
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
            <img
              alt="ValorIDE"
              src="https://valkyrlabs.com/assets/valorIde-horizontal-DyPXHpke.png"
              style={{ maxWidth: 200, height: "auto", opacity: 0.95 }}
            />
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
                Train Your Digital Mind
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
              ValorIDE is an agentic coding environment powered by{" "}
              <strong>ValkyrAI GrayMatter</strong> — the intelligence layer
              purpose-built for developers. Choose your AI instincts, configure
              your memory, and vibe code at full speed.
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
                Start with ValkyrAI
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
              Create a free account to access ValkyrAI GrayMatter prompts,
              memory presets, and curated models. No credit card required.
            </p>
            <VSCodeButton
              appearance="primary"
              onClick={handleLogin}
              style={{ width: "100%" }}
            >
              Get Started for Free
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
              <VSCodeLink
                href="https://valkyrlabs.com/sign-in"
                style={{ fontSize: 11 }}
              >
                Sign in
              </VSCodeLink>
            </div>
          </div>

          {/* Own API key section */}
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
                Bring Your Own API Key
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
                  Connect your existing API key from Anthropic, OpenAI,
                  OpenRouter, or any compatible provider.
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
