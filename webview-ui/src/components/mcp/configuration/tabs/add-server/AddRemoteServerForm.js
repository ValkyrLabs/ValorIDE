import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useRef, useState } from "react";
import { vscode } from "@/utils/vscode";
import { VSCodeButton, VSCodeLink, VSCodeTextField, } from "@vscode/webview-ui-toolkit/react";
import { useEvent } from "react-use";
import { LINKS } from "@/constants";
const AddRemoteServerForm = ({ onServerAdded, }) => {
    const [serverName, setServerName] = useState("");
    const [serverUrl, setServerUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [showConnectingMessage, setShowConnectingMessage] = useState(false);
    // Store submitted values to check if the server was added
    const submittedValues = useRef(null);
    const handleMessage = useCallback((event) => {
        const message = event.data;
        if (message.type === "addRemoteServerResult" &&
            isSubmitting &&
            submittedValues.current &&
            message.addRemoteServerResult?.serverName ===
                submittedValues.current.name) {
            if (message.addRemoteServerResult.success) {
                // Handle success
                setIsSubmitting(false);
                setServerName("");
                setServerUrl("");
                submittedValues.current = null;
                onServerAdded();
                setShowConnectingMessage(false);
            }
            else {
                // Handle error
                setIsSubmitting(false);
                setError(message.addRemoteServerResult.error || "Failed to add server");
                setShowConnectingMessage(false);
            }
        }
    }, [isSubmitting, onServerAdded]);
    useEvent("message", handleMessage);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!serverName.trim()) {
            setError("Server name is required");
            return;
        }
        if (!serverUrl.trim()) {
            setError("Server URL is required");
            return;
        }
        try {
            new URL(serverUrl);
        }
        catch (err) {
            setError("Invalid URL format");
            return;
        }
        setError("");
        submittedValues.current = { name: serverName.trim() };
        setIsSubmitting(true);
        setShowConnectingMessage(true);
        vscode.postMessage({
            type: "addRemoteServer",
            serverName: serverName.trim(),
            serverUrl: serverUrl.trim(),
        });
    };
    return (_jsxs("div", { className: "p-4 px-5", children: [_jsxs("div", { className: "text-[var(--vscode-foreground)] mb-2", children: ["Add a remote MCP server by providing a name and its URL endpoint. Learn more", " ", _jsx(VSCodeLink, { href: LINKS.DOCUMENTATION.REMOTE_MCP_SERVER_DOCS, style: { display: "inline" }, children: "here." })] }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("div", { className: "mb-2", children: _jsx(VSCodeTextField, { value: serverName, onChange: (e) => {
                                setServerName(e.target.value);
                                setError("");
                            }, disabled: isSubmitting, className: "w-full", placeholder: "mcp-server", children: "Server Name" }) }), _jsx("div", { className: "mb-2", children: _jsx(VSCodeTextField, { value: serverUrl, onChange: (e) => {
                                setServerUrl(e.target.value);
                                setError("");
                            }, disabled: isSubmitting, placeholder: "https://example.com/mcp-server", className: "w-full mr-4", children: "Server URL" }) }), error && (_jsx("div", { className: "mb-3 text-[var(--vscode-errorForeground)]", children: error })), _jsxs("div", { className: "flex items-center mt-3 w-full", children: [_jsx(VSCodeButton, { type: "submit", disabled: isSubmitting, className: "w-full", children: isSubmitting ? "Adding..." : "Add Server" }), showConnectingMessage && (_jsx("div", { className: "ml-3 text-[var(--vscode-notificationsInfoIcon-foreground)] text-sm", children: "Connecting to server... This may take a few seconds." }))] }), _jsx(VSCodeButton, { appearance: "secondary", style: { width: "100%", marginBottom: "5px", marginTop: 15 }, onClick: () => {
                            vscode.postMessage({ type: "openMcpSettings" });
                        }, children: "Edit Configuration" })] })] }));
};
export default AddRemoteServerForm;
//# sourceMappingURL=AddRemoteServerForm.js.map