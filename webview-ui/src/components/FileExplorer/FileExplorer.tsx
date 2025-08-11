import React, { useState, useEffect, useCallback } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { vscode } from "@/utils/vscode";
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
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [newFiles, setNewFiles] = useState<Set<string>>(new Set());

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

  const handleFileClick = (item: FileItem) => {
    if (item.type === "directory") {
      toggleDirectory(item.path);
    } else {
      onFileSelect?.(item.path);
    }
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
      <div className="file-explorer-loading">
        <VSCodeProgressRing />
        <span>Loading workspace files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-explorer-error">
        <p>Error loading files: {error}</p>
        <VSCodeButton onClick={fetchFiles}>Retry</VSCodeButton>
      </div>
    );
  }

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>ThorAPI Files</h3>
        <VSCodeButton appearance="icon" onClick={fetchFiles} title="Refresh">
          🔄
        </VSCodeButton>
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
  );
};

export default FileExplorer;
