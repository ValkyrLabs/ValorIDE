import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { useEffect, useState, memo } from "react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { validateApiConfiguration } from "@/utils/validate";
import { vscode } from "@/utils/vscode";
import ApiOptions from "@/components/settings/ApiOptions";
import SystemAlerts from "@/components/SystemAlerts";
import {
  readStoredPrincipal,
  hydrateStoredCredentials,
} from "@/utils/accessControl";
const WelcomeView = memo(() => {
  const { apiConfiguration } = useExtensionState();
  const [apiErrorMessage, setApiErrorMessage] = useState(undefined);
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
      // Skip welcome if authenticated
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
  // If stored auth exists, user should already be logged in - don't show welcome
  // This prevents accidental welcome screen flicker
  if (hasStoredAuth) {
    // Return empty, as the parent App.tsx will route to the main chat interface instead
    return null;
  }
  return _jsxs(_Fragment, {
    children: [
      _jsx(SystemAlerts, {}),
      _jsx("div", {
        className: "fixed inset-0 p-0 flex flex-col",
        children: _jsxs("div", {
          className: "h-full px-5 overflow-auto",
          children: [
            _jsxs("div", {
              style: { padding: "0 20px", flexShrink: 0 },
              children: [
                _jsx("div", {
                  style: { padding: "0 20px", flexShrink: 0 },
                  children: _jsx("a", {
                    href: "https://valkyrlabs.com/valoride",
                    children: _jsx("img", {
                      alt: "Valkyr Labs",
                      src: "https://valkyrlabs.com/assets/valorIde-horizontal-DyPXHpke.png",
                    }),
                  }),
                }),
                _jsxs("p", {
                  children: [
                    _jsx("h2", {
                      children: "Agentic Coder, Powered by ThorAPI",
                    }),
                    _jsx(VSCodeLink, {
                      href: "https://valkyrlabs.com/v1/docs/Products/ValorIDE",
                      style: { display: "inline" },
                      children: "English Documentation",
                    }),
                    _jsx(VSCodeLink, {
                      href: "https://valkyrlabs.com/thorapi",
                      style: { display: "inline" },
                      children: "ThorAPI Full-Stack CodeGen",
                    }),
                  ],
                }),
              ],
            }),
            _jsxs("p", {
              children: [
                "I can do all kinds of tasks thanks to breakthroughs in",
                " ",
                _jsx(VSCodeLink, {
                  href: "https://valkyrlabs.com/v1/Products/ValorIDE/getting-started",
                  className: "inline",
                  children: "Help Getting Started",
                }),
                "agentic coding capabilities and access to tools that let me create & edit files, explore complex projects, use a browser, and execute terminal commands ",
                _jsx("i", { children: "(with your permission, of course)" }),
                ". I can even use MCP to create new tools and extend my own capabilities.",
              ],
            }),
            _jsx("p", {
              className: "text-[var(--vscode-descriptionForeground)]",
              children: "Sign up for an account to get started for free",
            }),
            _jsx(VSCodeButton, {
              appearance: "primary",
              onClick: handleLogin,
              className: "w-full mt-1",
              children: "Get Started for Free",
            }),
            !showApiOptions &&
              _jsx(VSCodeButton, {
                appearance: "secondary",
                onClick: () => setShowApiOptions(!showApiOptions),
                className: "mt-2.5 w-full",
                children: "Use your own API key",
              }),
            _jsx("div", {
              className: "mt-4.5",
              children:
                showApiOptions &&
                _jsxs("div", {
                  children: [
                    _jsx(ApiOptions, { showModelOptions: false }),
                    _jsx(VSCodeButton, {
                      onClick: handleSubmit,
                      disabled: disableLetsGoButton,
                      className: "mt-0.75",
                      children: "Let's go!",
                    }),
                  ],
                }),
            }),
          ],
        }),
      }),
    ],
  });
});
export default WelcomeView;
//# sourceMappingURL=WelcomeView.js.map
