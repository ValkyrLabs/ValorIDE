import React, { useRef, useState } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "../../utils/vscode";

interface OpenAPIFilePickerProps {
  onFileSelected?: (file: File) => void;
}

const OpenAPIFilePicker: React.FC<OpenAPIFilePickerProps> = ({
  onFileSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validExtensions = [".yaml", ".yml", ".json"];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."));
      
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
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      // Read file content
      const fileContent = await selectedFile.text();
      
      // Validate that it's a valid OpenAPI spec (basic validation)
      let parsedContent;
      try {
        if (selectedFile.name.toLowerCase().endsWith('.json')) {
          parsedContent = JSON.parse(fileContent);
        } else {
          // For YAML files, we'll send the raw content and let the backend parse it
          parsedContent = fileContent;
        }
      } catch (parseError) {
        throw new Error("Invalid file format. Please ensure the file contains valid JSON or YAML.");
      }

      // Send to extension for processing
      vscode.postMessage({
        type: "uploadOpenAPISpec",
        filename: selectedFile.name,
        fileContent: fileContent,
        fileSize: selectedFile.size,
      });

      setUploadStatus({
        type: "success",
        message: `Successfully uploaded ${selectedFile.name}`,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
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

  return (
    <div className="openapi-file-picker">
      <div className="file-picker-header" style={{ marginBottom: "16px" }}>
        <h3>Upload OpenAPI Specification</h3>
        <p style={{ 
          fontSize: "14px", 
          color: "var(--vscode-descriptionForeground)",
          marginTop: "8px" 
        }}>
          Select a local OpenAPI spec file (.yaml, .yml, or .json) to upload to the generator
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".yaml,.yml,.json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div className="file-picker-controls" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <VSCodeButton
            appearance="secondary"
            onClick={handleFileSelect}
            disabled={isUploading}
          >
            Select File
          </VSCodeButton>
          
          {selectedFile && (
            <>
              <VSCodeButton
                appearance="primary"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <VSCodeProgressRing style={{ width: "16px", height: "16px", marginRight: "8px" }} />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </VSCodeButton>
              
              <VSCodeButton
                appearance="secondary"
                onClick={handleClear}
                disabled={isUploading}
              >
                Clear
              </VSCodeButton>
            </>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="selected-file-info" style={{
          padding: "12px",
          border: "1px solid var(--vscode-panel-border)",
          borderRadius: "4px",
          marginBottom: "16px",
          backgroundColor: "var(--vscode-editor-background)"
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
            Selected File:
          </div>
          <div style={{ fontSize: "14px" }}>
            <div>Name: {selectedFile.name}</div>
            <div>Size: {(selectedFile.size / 1024).toFixed(2)} KB</div>
            <div>Type: {selectedFile.type || "Unknown"}</div>
          </div>
        </div>
      )}

      {uploadStatus.type && (
        <div className={`upload-status status-${uploadStatus.type}`} style={{
          padding: "12px",
          border: `1px solid ${uploadStatus.type === "success" ? "var(--vscode-charts-green)" : "var(--vscode-errorForeground)"}`,
          borderRadius: "4px",
          backgroundColor: uploadStatus.type === "success" 
            ? "var(--vscode-terminal-ansiGreen)" 
            : "var(--vscode-inputValidation-errorBackground)",
          color: uploadStatus.type === "success" 
            ? "var(--vscode-charts-green)" 
            : "var(--vscode-errorForeground)",
          fontSize: "14px"
        }}>
          {uploadStatus.type === "success" ? "✅" : "❌"} {uploadStatus.message}
        </div>
      )}
    </div>
  );
};

export default OpenAPIFilePicker;
