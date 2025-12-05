import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import styled from "styled-components";
import { LINKS } from "@/constants";
const AddLocalServerForm = ({ onServerAdded }) => {
    return (_jsxs(FormContainer, { children: [_jsxs("div", { className: "text-[var(--vscode-foreground)]", children: ["Add a local MCP server by configuring it in", " ", _jsx("code", { children: "valoride_mcp_settings.json" }), ". You'll need to specify the server name, command, arguments, and any required environment variables in the JSON configuration. Learn more", _jsx(VSCodeLink, { href: LINKS.DOCUMENTATION.LOCAL_MCP_SERVER_DOCS, style: { display: "inline" }, children: "here." })] }), _jsx(VSCodeButton, { appearance: "primary", style: { width: "100%", marginBottom: "5px", marginTop: 8 }, onClick: () => {
                    vscode.postMessage({ type: "openMcpSettings" });
                }, children: "Open valoride_mcp_settings.json" })] }));
};
const FormContainer = styled.div `
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
export default AddLocalServerForm;
//# sourceMappingURL=AddLocalServerForm.js.map