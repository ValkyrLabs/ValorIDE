import React, { useState, useEffect, useCallback } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
import AddToProjectModal from "./AddToProjectModal";
import StartServerModal from "./StartServerModal";
import SystemAlerts from "@/components/SystemAlerts";
import { useExtensionState } from "@/context/ExtensionStateContext";
import "./FileExplorer.css";

interface FileItem {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileItem[];
  isExpanded?: boolean;
  isNew?: boolean;
}

interface FileExplorerProps {
  onFileSelect?: (filePath: string) => void;
  highlightNewFiles?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  onFileSelect,
  highlightNewFiles = true,
  autoRefresh = false,
  refreshInterval = 2000,
}) => {
  const { advancedSettings, thorapiFolderPath } = useExtensionState();
  const configuredThorapiFolder =
    advancedSettings?.thorapi?.outputFolder?.trim() || "thorapi";
  const resolvedThorapiFolder = thorapiFolderPath?.trim();
  const folderDisplayPath = resolvedThorapiFolder || configuredThorapiFolder;
  const showConfigHint =
    !!resolvedThorapiFolder &&
    resolvedThorapiFolder !== configuredThorapiFolder;

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [newFiles, setNewFiles] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<{ path: string; name: string } | null>(null);
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState<{ path: string; name: string; type: "spring-boot" | "nestjs" | "typescript" } | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Request thorapi folder contents specifically
      const requestId = `file-explorer-${Date.now()}`;
      console.log(
        "FileExplorer: Requesting thorapi folder contents with ID:",
        requestId,
      );
      vscode.postMessage({
        type: "getThorapiFolderContents",
        mentionsRequestId: requestId,
      });
    } catch (err) {
      console.error("FileExplorer: Error in fetchFiles:", err);
      setError(err instanceof Error ? err.message : "Failed to load files");
      setLoading(false);
    }
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const message = event.data;
      console.log("FileExplorer: Received message:", message.type, message);

      if (message.type === "workspaceFiles") {
        console.log(
          "FileExplorer: Processing workspaceFiles message with files:",
          message.files,
        );

        if (message.error) {
          console.error(
            "FileExplorer: Error in workspaceFiles response:",
            message.error,
          );
          setError(message.error);
          setLoading(false);
          return;
        }

        const previousPaths = new Set(getAllFilePaths(files));
        const newFileStructure = message.files || [];
        const currentPaths = new Set(getAllFilePaths(newFileStructure));

        console.log("FileExplorer: New file structure:", newFileStructure);

        // Find newly added files
        if (highlightNewFiles && previousPaths.size > 0) {
          const currentPathsArray = Array.from(currentPaths);
          const addedFiles = new Set(
            currentPathsArray.filter((path) => !previousPaths.has(path)),
          );

          if (addedFiles.size > 0) {
            console.log(
              "FileExplorer: Found new files:",
              Array.from(addedFiles),
            );
            setNewFiles((prev) => {
              const prevArray = Array.from(prev);
              const addedArray = Array.from(addedFiles);
              return new Set([...prevArray, ...addedArray]);
            });

            // Clear new file highlights after 5 seconds
            setTimeout(() => {
              setNewFiles((prev) => {
                const updated = new Set(prev);
                addedFiles.forEach((path) => updated.delete(path));
                return updated;
              });
            }, 5000);
          }
        }

        setFiles(newFileStructure);
        setLoading(false);
      }
    },
    [files, highlightNewFiles],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Listen for streamToThorapiResult to refresh file list
  useEffect(() => {
    const handleStreamResult = (event: MessageEvent) => {
      const message = event.data;
      if (
        message.type === "streamToThorapiResult" &&
        message.streamToThorapiResult?.success
      ) {
        console.log(
          "FileExplorer: Received streamToThorapiResult, refreshing files",
        );
        // Refresh files after a brief delay to ensure file is written
        setTimeout(() => {
          fetchFiles();
        }, 500);
      }
    };

    window.addEventListener("message", handleStreamResult);
    return () => window.removeEventListener("message", handleStreamResult);
  }, [fetchFiles]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchFiles, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchFiles]);

  const getAllFilePaths = (fileItems: FileItem[]): string[] => {
    const paths: string[] = [];
    const traverse = (items: FileItem[]) => {
      items.forEach((item) => {
        paths.push(item.path);
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(fileItems);
    return paths;
  };

  const toggleDirectory = (path: string) => {
    setExpandedDirs((prev) => {
      const updated = new Set(prev);
      if (updated.has(path)) {
        updated.delete(path);
      } else {
        updated.add(path);
      }
      return updated;
    });
  };

  const detectServerType = (item: FileItem): "spring-boot" | "nestjs" | "typescript" | null => {
    if (item.type !== "directory" || !item.children) return null;

    const childNames = item.children.map(child => child.name.toLowerCase());
    
    // Check for Spring Boot server (has pom.xml and typically named spring-server)
    if (childNames.includes("pom.xml") || item.name.toLowerCase().includes("spring-server")) {
      return "spring-boot";
    }
    
    // Check for TypeScript client (has tsconfig.json and typically named typescript-client)
    if (childNames.includes("tsconfig.json") && item.name.toLowerCase().includes("typescript")) {
      return "typescript";
    }
    
    // Check for Nest.js server (has package.json and nest-cli.json or contains "nest" in name)
    if (childNames.includes("package.json") && 
        (childNames.includes("nest-cli.json") || item.name.toLowerCase().includes("nest"))) {
      return "nestjs";
    }
    
    return null;
  };

  const handleFileClick = (item: FileItem) => {
    if (item.type === "directory") {
      toggleDirectory(item.path);

      // Check if this is a server folder first
      const serverType = detectServerType(item);
      if (serverType) {
        setSelectedServer({ path: item.path, name: item.name, type: serverType });
        setServerModalOpen(true);
        return;
      }

      // If this directory looks like a generated ThorAPI project (has a src child),
      // show modal to ask user if they want to add it to their project
      const hasSrcChild = (item.children || []).some((c) => c.type === "directory" && c.name === "src");
      if (hasSrcChild) {
        setSelectedFolder({ path: item.path, name: item.name });
        setModalOpen(true);
      }
    } else {
      // Call the optional callback
      onFileSelect?.(item.path);
      
      // Send message to VSCode to open the file in editor
      vscode.postMessage({
        type: "openFile",
        text: item.path,
      });
    }
  };

  const handleModalConfirm = () => {
    if (selectedFolder) {
      // Send message to extension to add the folder to the project
      vscode.postMessage({
        type: "addGeneratedToProject",
        text: selectedFolder.path,
        folderName: selectedFolder.name,
      });
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedFolder(null);
  };

  const handleServerModalConfirm = () => {
    if (selectedServer) {
      // Send message to extension to start the server
      vscode.postMessage({
        type: "startServer",
        text: selectedServer.path,
        folderName: selectedServer.name,
        serverType: selectedServer.type,
      });
    }
  };

  const handleServerModalClose = () => {
    setServerModalOpen(false);
    setSelectedServer(null);
  };

  const renderFileItem = (item: FileItem, depth = 0) => {
    const isExpanded = expandedDirs.has(item.path);
    const isNew = newFiles.has(item.path);
    const paddingLeft = depth * 16 + 8;

    return (
      <div key={item.path} className="file-item-container">
        <div
          className={`file-item ${isNew ? "file-item-new" : ""} ${item.type === "directory" ? "file-item-directory" : "file-item-file"}`}
          style={{ paddingLeft }}
          onClick={() => handleFileClick(item)}
        >
          {item.type === "directory" && (
            <span className={`file-item-icon ${isExpanded ? "expanded" : ""}`}>
              {isExpanded ? "📂" : "📁"}
            </span>
          )}
          {item.type === "file" && <span className="file-item-icon">📄</span>}
          <span className="file-item-name">{item.name}</span>
          {isNew && <span className="file-item-new-badge">NEW</span>}
        </div>
        {item.type === "directory" && isExpanded && item.children && (
          <div className="file-item-children">
            {item.children.map((child) => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading && files.length === 0) {
    return (
      <>
        <SystemAlerts />
        <div className="file-explorer-loading">
          <VSCodeProgressRing />
          <span>Loading workspace files...</span>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SystemAlerts />
        <div className="file-explorer-error">
          <p>Error loading files: {error}</p>
          <VSCodeButton onClick={fetchFiles}>Retry</VSCodeButton>
        </div>
      </>
    );
  }

  return (
    <>
      <SystemAlerts />
      <div className="file-explorer">
        <div className="file-explorer-header">
          <h3>ThorAPI Generated Files</h3>
          <VSCodeButton appearance="icon" onClick={fetchFiles} title="Refresh">
            🔄
          </VSCodeButton>
        </div>
        <div className="file-explorer-location">
          <span>Output folder: </span>
          <code>{folderDisplayPath}</code>
          {showConfigHint && (
            <span className="file-explorer-config-hint">
              (configured as <code>{configuredThorapiFolder}</code>)
            </span>
          )}
        </div>
        <div className="file-explorer-content">
          {files.length === 0 ? (
            <div className="file-explorer-empty">
              <p>No files found in workspace</p>
            </div>
          ) : (
            <div className="file-explorer-tree">
              {files.map((item) => renderFileItem(item))}
            </div>
          )}
        </div>
      </div>
      
      <AddToProjectModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        folderPath={selectedFolder?.path || ""}
        folderName={selectedFolder?.name || ""}
      />
      
      <StartServerModal
        isOpen={serverModalOpen}
        onClose={handleServerModalClose}
        onConfirm={handleServerModalConfirm}
        folderPath={selectedServer?.path || ""}
        folderName={selectedServer?.name || ""}
        serverType={selectedServer?.type || "spring-boot"}
      />
    </>
  );
};

export default FileExplorer;
