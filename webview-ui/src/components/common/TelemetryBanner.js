import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { memo, useState } from "react";
import styled from "styled-components";
import { vscode } from "@/utils/vscode";
const BannerContainer = styled.div `
  background-color: var(--vscode-banner-background);
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 6px;
`;
const ButtonContainer = styled.div `
  display: flex;
  gap: 8px;
  width: 100%;

  & > vscode-button {
    flex: 1;
  }
`;
const TelemetryBanner = () => {
    const [hasChosen, setHasChosen] = useState(false);
    const handleAllow = () => {
        setHasChosen(true);
        vscode.postMessage({
            type: "telemetrySetting",
            telemetrySetting: "enabled",
        });
    };
    const handleDeny = () => {
        setHasChosen(true);
        vscode.postMessage({
            type: "telemetrySetting",
            telemetrySetting: "disabled",
        });
    };
    const handleOpenSettings = () => {
        vscode.postMessage({ type: "openSettings" });
    };
    return (_jsxs(BannerContainer, { children: [_jsxs("div", { children: [_jsx("strong", { children: "Help Improve ValorIDE" }), _jsxs("div", { style: { marginTop: 4 }, children: ["Send anonymous error and usage data to help us fix bugs and improve the extension. No code, prompts, or personal information is ever sent.", _jsxs("div", { style: { marginTop: 4 }, children: ["You can always change this in", " ", _jsx(VSCodeLink, { href: "#", onClick: handleOpenSettings, children: "settings" }), "."] })] })] }), _jsxs(ButtonContainer, { children: [_jsx(VSCodeButton, { appearance: "primary", onClick: handleAllow, disabled: hasChosen, children: "Allow" }), _jsx(VSCodeButton, { appearance: "secondary", onClick: handleDeny, disabled: hasChosen, children: "Deny" })] })] }));
};
export default memo(TelemetryBanner);
//# sourceMappingURL=TelemetryBanner.js.map