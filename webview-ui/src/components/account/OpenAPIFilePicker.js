import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState, useEffect } from "react";
import { VSCodeButton, VSCodeProgressRing, } from "@vscode/webview-ui-toolkit/react";
import { vscode } from "../../utils/vscode";
const OpenAPIFilePicker = ({ onFileSelected, }) => {
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState({ type: null, message: "" });
    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            const validExtensions = [".yaml", ".yml", ".json"];
            const fileExtension = file.name
                .toLowerCase()
                .substring(file.name.lastIndexOf("."));
            if (!validExtensions.includes(fileExtension)) {
                setUploadStatus({
                    type: "error",
                    message: "Please select a valid OpenAPI spec file (.yaml, .yml, or .json)",
                });
                return;
            }
            setSelectedFile(file);
            setUploadStatus({ type: null, message: "" });
            onFileSelected?.(file);
        }
    };
    const handleUpload = async () => {
        if (!selectedFile)
            return;
        setIsUploading(true);
        setUploadStatus({ type: null, message: "" });
        try {
            // Validate file size (max 10MB)
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            if (selectedFile.size > MAX_FILE_SIZE) {
                throw new Error(`File size exceeds maximum limit of 10MB. Current size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
            }
            // Read file content
            const fileContent = await selectedFile.text();
            // Validate that it's a valid OpenAPI spec
            const fileName = selectedFile.name.toLowerCase();
            const isJson = fileName.endsWith(".json");
            const isYaml = fileName.endsWith(".yaml") || fileName.endsWith(".yml");
            if (!isJson && !isYaml) {
                throw new Error("Invalid file extension. Please select a .json, .yaml, or .yml file.");
            }
            // Parse and validate the content
            let parsedContent;
            try {
                if (isJson) {
                    parsedContent = JSON.parse(fileContent);
                }
                else {
                    // For YAML files, do basic validation (non-empty, not obviously broken)
                    if (!fileContent || fileContent.trim().length === 0) {
                        throw new Error("File is empty.");
                    }
                    // Basic YAML structure validation - should start with openapi or swagger key
                    if (!fileContent.includes("openapi:") &&
                        !fileContent.includes("swagger:") &&
                        !fileContent.includes('"openapi"') &&
                        !fileContent.includes('"swagger"')) {
                        throw new Error("File does not appear to be an OpenAPI specification (missing 'openapi' or 'swagger' key).");
                    }
                    parsedContent = fileContent;
                }
                // Verify it has OpenAPI structure
                if (isJson && !parsedContent.openapi && !parsedContent.swagger) {
                    throw new Error("Invalid OpenAPI spec: missing 'openapi' or 'swagger' version field.");
                }
            }
            catch (parseError) {
                const message = parseError instanceof Error
                    ? parseError.message
                    : "File format validation failed";
                throw new Error(`Invalid file format: ${message}`);
            }
            // Show uploading status
            setUploadStatus({
                type: null,
                message: `Uploading ${selectedFile.name}...`,
            });
            // Send to extension for processing
            vscode.postMessage({
                type: "uploadOpenAPISpec",
                filename: selectedFile.name,
                fileContent: fileContent,
                fileSize: selectedFile.size,
            });
            // Wait for response from extension (listener below)
            // The success message will be shown via uploadOpenAPISpecResult message
        }
        catch (error) {
            console.error("Upload validation failed:", error);
            setUploadStatus({
                type: "error",
                message: error instanceof Error
                    ? error.message
                    : "Upload failed. Please check the file and try again.",
            });
            setIsUploading(false);
        }
    };
    const handleClear = () => {
        setSelectedFile(null);
        setUploadStatus({ type: null, message: "" });
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    // Listen for upload result from extension
    useEffect(() => {
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === "uploadOpenAPISpecResult") {
                if (message.success) {
                    setUploadStatus({
                        type: "success",
                        message: `✅ Successfully uploaded and processed ${message.filename || selectedFile?.name || "file"}. Ready to import into application generator.`,
                    });
                    // Clear the selected file and input after successful upload
                    setTimeout(() => {
                        handleClear();
                    }, 2000);
                }
                else {
                    setUploadStatus({
                        type: "error",
                        message: message.error ||
                            "Upload failed. The server could not process the file.",
                    });
                }
                setIsUploading(false);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [selectedFile]);
    return (_jsxs("div", { className: "openapi-file-picker", children: [_jsxs("div", { className: "file-picker-header", style: { marginBottom: "16px" }, children: [_jsx("h3", { children: "Import Application from OpenAPI" }), _jsx("p", { style: {
                            fontSize: "14px",
                            color: "var(--vscode-descriptionForeground)",
                            marginTop: "8px",
                        }, children: "Select a local OpenAPI spec file (.yaml, .yml, or .json) to upload to the generator." })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: ".yaml,.yml,.json", onChange: handleFileChange, style: { display: "none" } }), _jsx("div", { className: "file-picker-controls", style: { marginBottom: "16px" }, children: _jsxs("div", { style: { display: "flex", gap: "12px", alignItems: "center" }, children: [_jsx(VSCodeButton, { appearance: "secondary", onClick: handleFileSelect, disabled: isUploading, children: "Select File" }), selectedFile && (_jsxs(_Fragment, { children: [_jsx(VSCodeButton, { appearance: "primary", onClick: handleUpload, disabled: isUploading, children: isUploading ? (_jsxs(_Fragment, { children: [_jsx(VSCodeProgressRing, { style: {
                                                    width: "16px",
                                                    height: "16px",
                                                    marginRight: "8px",
                                                } }), "Uploading..."] })) : ("Upload") }), _jsx(VSCodeButton, { appearance: "secondary", onClick: handleClear, disabled: isUploading, children: "Clear" })] }))] }) }), selectedFile && (_jsxs("div", { className: "selected-file-info", style: {
                    padding: "12px",
                    border: "1px solid var(--vscode-panel-border)",
                    borderRadius: "4px",
                    marginBottom: "16px",
                    backgroundColor: "var(--vscode-editor-background)",
                }, children: [_jsx("div", { style: { fontWeight: "bold", marginBottom: "4px" }, children: "Selected File:" }), _jsxs("div", { style: { fontSize: "14px" }, children: [_jsxs("div", { children: ["Name: ", selectedFile.name] }), _jsxs("div", { children: ["Size: ", (selectedFile.size / 1024).toFixed(2), " KB"] }), _jsxs("div", { children: ["Type: ", selectedFile.type || "Unknown"] })] })] })), uploadStatus.type && (_jsxs("div", { className: `upload-status status-${uploadStatus.type}`, style: {
                    padding: "1em",
                    margin: "1em",
                    border: `1px solid ${uploadStatus.type === "success" ? "var(--vscode-charts-green)" : "var(--vscode-errorForeground)"}`,
                    borderRadius: 10,
                    backgroundColor: uploadStatus.type === "success"
                        ? "var(--vscode-badge-background)"
                        : "var(--vscode-inputValidation-errorBackground)",
                    color: uploadStatus.type === "success"
                        ? "var(--vscode-badge-foreground)"
                        : "var(--vscode-errorForeground)",
                    fontSize: "14px",
                }, children: [uploadStatus.type === "success" ? "✅" : "❌", " ", uploadStatus.message] }))] }));
};
export default OpenAPIFilePicker;
//# sourceMappingURL=OpenAPIFilePicker.js.map