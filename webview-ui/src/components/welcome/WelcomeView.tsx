import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useEffect, useState, memo } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { validateApiConfiguration } from "@/utils/validate";
import { vscode } from "@/utils/vscode";
import ApiOptions from "@/components/settings/ApiOptions";
import Image from "react-bootstrap/Image";
import valorIdeHorizontal from "../../assets/valorIde-horizontal.png";

const WelcomeView = memo(() => {
  const { apiConfiguration } = useExtensionState();
  const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(
    undefined,
  );
  const [showApiOptions, setShowApiOptions] = useState(false);

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

  return (
    <div className="fixed inset-0 p-0 flex flex-col">
      <div className="h-full px-5 overflow-auto">
        <div style={{ padding: "0 20px", flexShrink: 0 }}>
          <div style={{ padding: "0 20px", flexShrink: 0 }}>
            <a href="https://valkyrlabs.com/valoride">
              <img
                alt="Valkyr Labs"
                src="https://valkyrlabs.com/assets/valorIde-horizontal-DyPXHpke.png"
              />
            </a>

          </div>
          <p>
            <h2>Agentic Coder, Powered by ThorAPI</h2>
            <VSCodeLink href="https://valkyrlabs.com/v1/docs/Products/ValorIDE/valoride-documentation" style={{ display: "inline" }}>
              English Documentation
            </VSCodeLink>
            <VSCodeLink href="https://valkyrlabs.com/thorapi" style={{ display: "inline" }}>
              ThorAPI Full-Stack CodeGen
            </VSCodeLink>
          </p>

        </div>
        <p>
          I can do all kinds of tasks thanks to breakthroughs in{" "}
          <VSCodeLink
            href="https://www.anthropic.com/"
            className="inline"
          >

            Claude Sonnet's
          </VSCodeLink>
          agentic coding capabilities and access to tools that let me create &
          edit files, explore complex projects, use a browser, and execute
          terminal commands <i>(with your permission, of course)</i>. I can even
          use MCP to create new tools and extend my own capabilities.
        </p>

        <p className="text-[var(--vscode-descriptionForeground)]">
          Sign up for an account to get started for free, or use an API key that
          provides access to models like Claude 3.7 Sonnet.
        </p>

        <VSCodeButton
          appearance="primary"
          onClick={handleLogin}
          className="w-full mt-1"
        >
          Get Started for Free
        </VSCodeButton>

        {!showApiOptions && (
          <VSCodeButton
            appearance="secondary"
            onClick={() => setShowApiOptions(!showApiOptions)}
            className="mt-2.5 w-full"
          >
            Use your own API key
          </VSCodeButton>
        )}

        <div className="mt-4.5">
          {showApiOptions && (
            <div>
              <ApiOptions showModelOptions={false} />
              <VSCodeButton
                onClick={handleSubmit}
                disabled={disableLetsGoButton}
                className="mt-0.75"
              >
                Let's go!
              </VSCodeButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default WelcomeView;
