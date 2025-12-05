import React, { useState, useEffect, useMemo } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { Application } from "../../thor/model";
import {
  useGetApplicationsQuery,
  useGenerateApplicationMutation,
  useDeployApplicationMutation,
} from "../../redux/services/ApplicationService";
import { vscode } from "../../utils/vscode";
import FileExplorer from "../FileExplorer/FileExplorer";
import { useExtensionState } from "../../context/ExtensionStateContext";
import VSCodeButtonLink from "../common/VSCodeButtonLink";
import { FaStar, FaUserFriends } from "react-icons/fa";

interface ApplicationsListProps {
  showTitle?: boolean;
  title?: string;
}

const ApplicationsList: React.FC<ApplicationsListProps> = ({
  showTitle = true,
  title = "Available Applications",
}) => {
  const { userInfo, jwtToken, authenticatedPrincipal, authenticatedUser } =
    useExtensionState();

  // Get the current user's ID for owner comparison
  const currentUserId =
    authenticatedUser?.id || authenticatedPrincipal?.id || userInfo?.id;

  // Check if user is authenticated - primarily check for JWT token in sessionStorage
  // as this is the most reliable indicator of authentication state
  const sessionToken = sessionStorage.getItem("jwtToken");
  const isAuthenticated = !!(
    sessionToken ||
    jwtToken ||
    authenticatedPrincipal ||
    userInfo
  );

  // Always fetch applications - don't skip the query
  // The API will handle authentication and return appropriate errors if not authenticated
  const {
    data: applications,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetApplicationsQuery(undefined, {
    skip: false, // Always attempt to fetch applications
  });

  // Separate applications into owned and shared, with owned first
  const { ownedApps, sharedApps } = useMemo(() => {
    if (!applications) return { ownedApps: [], sharedApps: [] };

    const owned: Application[] = [];
    const shared: Application[] = [];

    applications.forEach((app: Application) => {
      const isOwner = currentUserId && app.ownerId === currentUserId;
      if (isOwner) {
        owned.push(app);
      } else {
        shared.push(app);
      }
    });

    return { ownedApps: owned, sharedApps: shared };
  }, [applications, currentUserId]);

  // Helper to check if app is owned by current user
  const isOwnedByCurrentUser = (app: Application) => {
    return currentUserId && app.ownerId === currentUserId;
  };
  const [generateApplication, { isLoading: isGenerating }] =
    useGenerateApplicationMutation();
  const [deployApplication, { isLoading: isDeploying }] =
    useDeployApplicationMutation();
  const [loadingStates, setLoadingStates] = useState<
    Record<
      string,
      {
        generating: boolean;
        deploying: boolean;
        steps: {
          receiving: boolean;
          processing: boolean;
          extracting: boolean;
          finalizing: boolean;
        };
      }
    >
  >({});
  const [showFileExplorer, setShowFileExplorer] = useState(false); // Start with cards view by default
  const [completedApplications, setCompletedApplications] = useState<
    Set<string>
  >(new Set());

  // Listen for messages from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Only process relevant messages to prevent infinite loops
      if (!message || message.type !== "streamToThorapiResult") {
        return;
      }

      console.log(
        "ApplicationsList: Processing streamToThorapiResult:",
        message.streamToThorapiResult,
      );
      const { success, applicationId, error } = message.streamToThorapiResult;

      if (success && applicationId) {
        console.log(
          "ApplicationsList: Success! Completing steps for:",
          applicationId,
        );
        // Complete the final step and mark as done
        setLoadingStates((prev) => ({
          ...prev,
          [applicationId]: {
            ...prev[applicationId],
            generating: false,
            steps: {
              receiving: true,
              processing: true,
              extracting: true,
              finalizing: true,
            },
          },
        }));

        // Mark application as completed and show file explorer
        setCompletedApplications(
          (prev) => new Set([...Array.from(prev), applicationId]),
        );
        setShowFileExplorer(true);
      } else if (error && applicationId) {
        console.error(
          "ApplicationsList: Error in streamToThorapiResult:",
          error,
        );
        // Handle error case
        setLoadingStates((prev) => ({
          ...prev,
          [applicationId]: {
            ...prev[applicationId],
            generating: false,
            steps: {
              receiving: false,
              processing: false,
              extracting: false,
              finalizing: false,
            },
          },
        }));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const renderHeader = () => (
    <div
      className="applications-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: showTitle ? "space-between" : "flex-end",
        gap: "12px",
        marginBottom: "12px",
      }}
    >
      {showTitle && <h2 style={{ margin: 0 }}>{title}</h2>}
      <VSCodeButton
        appearance="secondary"
        onClick={() => refetch()}
        disabled={isLoading || isFetching}
        aria-label="Refresh applications"
        role="button"
        title="Refresh applications"
      >
        {isFetching ? "Refreshing..." : "Refresh"}
      </VSCodeButton>
    </div>
  );

  if (isLoading) {
    return (
      <div className="applications-list">
        {renderHeader()}
        <div className="loading-container">
          <VSCodeProgressRing />
          <span>Loading applications...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="applications-list">
        {renderHeader()}
        <div className="error-message">
          Failed to load applications:{" "}
          {error
            ? typeof error === "object" && "message" in error && error.message
              ? (error as any).message
              : typeof error === "object" && "status" in error && error.status
                ? `Status: ${(error as any).status}`
                : JSON.stringify(error)
            : "Unknown error"}
        </div>
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="applications-list">
        {renderHeader()}
        <div>No available applications found.</div>
      </div>
    );
  }

  const handleApplicationSelect = (application: Application) => {
    if (application.id) {
      // Use VSCode command to open external URL instead of window.open
      // This avoids the sandboxed webview popup blocking issue
      vscode.postMessage({
        type: "openInBrowser",
        url: application.id,
      });
    } else if (application.entrypointUrl) {
      // Fallback to entrypointUrl
      vscode.postMessage({
        type: "openInBrowser",
        url: application.entrypointUrl,
      });
    } else {
      alert(`Selected application: ${application.name || "Unknown"}`);
    }
  };

  const handleGenerate = async (applicationId: string) => {
    if (!applicationId) return;

    // Find the application to get its name
    const application = applications?.find((app) => app.id === applicationId);
    const applicationName = application?.name || applicationId;

    // Initialize loading state with all steps
    setLoadingStates((prev) => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        generating: true,
        steps: {
          receiving: false,
          processing: false,
          extracting: false,
          finalizing: false,
        },
      },
    }));

    try {
      // Step 1: Receiving Application - Start immediately
      setLoadingStates((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          steps: { ...prev[applicationId]?.steps, receiving: true },
        },
      }));

      // Make the actual API call
      const result = await generateApplication(applicationId).unwrap();
      console.log("ApplicationsList: API result:", result);

      // The filename is already extracted by the ApplicationService responseHandler
      const extractedFilename = result.filename;
      const mimeType =
        result.mimeType || result.blob?.type || "application/octet-stream";
      console.log(
        "ApplicationsList: Using filename from service:",
        extractedFilename,
      );

      // Step 2: Processing Data - Mark as complete after API call
      setLoadingStates((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          steps: { ...prev[applicationId]?.steps, processing: true },
        },
      }));

      // Step 3: Extracting Files - Start file processing
      setLoadingStates((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          steps: { ...prev[applicationId]?.steps, extracting: true },
        },
      }));

      // Convert blob to base64
      const arrayBuffer = await result.blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binaryString = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64String = btoa(binaryString);

      // Step 4: Finalizing Setup - Start file writing
      setLoadingStates((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          steps: { ...prev[applicationId]?.steps, finalizing: true },
        },
      }));

      console.log(
        "ApplicationsList: Sending to extension with filename:",
        extractedFilename,
        "and application name:",
        applicationName,
      );
      // Send to extension to stream to thorapi folder with application name for user-friendly folder naming
      vscode.postMessage({
        type: "streamToThorapi",
        blobData: base64String,
        applicationId: applicationId,
        applicationName: applicationName,
        filename: extractedFilename,
        mimeType,
      });

      // Note: We'll complete the final step when we receive the streamToThorapiResult message
    } catch (error) {
      console.error("Generate failed:", error);
      // Show error feedback
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error(`Generate failed for ${applicationId}: ${errorMessage}`);

      // Reset loading state on error
      setLoadingStates((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          generating: false,
          steps: {
            receiving: false,
            processing: false,
            extracting: false,
            finalizing: false,
          },
        },
      }));
    }
  };

  const handleDeploy = (applicationId: string) => {
    if (!applicationId) return;

    // Open File Explorer in a new tab - VSCode toast notification will be shown by the extension
    vscode.postMessage({
      type: "openFileExplorerTab",
      applicationId: applicationId,
    });
  };

  // Helper function to render loading steps for an application
  const renderLoadingSteps = (app: any) => {
    if (
      !(
        loadingStates[app.id]?.generating ||
        loadingStates[app.id]?.steps?.receiving ||
        loadingStates[app.id]?.steps?.processing ||
        loadingStates[app.id]?.steps?.extracting ||
        loadingStates[app.id]?.steps?.finalizing
      )
    ) {
      return null;
    }

    return (
      <div className="application-loading-steps">
        <div
          className="loading-steps"
          style={{
            marginTop: "16px",
            padding: "12px",
            border: "1px solid var(--vscode-panel-border)",
            borderRadius: "4px",
          }}
        >
          <div
            className="loading-step"
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            {loadingStates[app.id]?.steps?.receiving ? (
              <span
                style={{
                  color: "var(--vscode-charts-green)",
                  marginRight: "8px",
                }}
              >
                ✅
              </span>
            ) : (
              <VSCodeProgressRing
                style={{ width: "16px", height: "16px", marginRight: "8px" }}
              />
            )}
            <span>Receiving Application</span>
            {!loadingStates[app.id]?.steps?.receiving && (
              <span
                style={{ marginLeft: "8px", fontSize: "12px", opacity: 0.7 }}
              >
                Downloading application payload...
              </span>
            )}
          </div>
          <div
            className="loading-step"
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            {loadingStates[app.id]?.steps?.processing ? (
              <span
                style={{
                  color: "var(--vscode-charts-green)",
                  marginRight: "8px",
                }}
              >
                ✅
              </span>
            ) : loadingStates[app.id]?.steps?.receiving ? (
              <VSCodeProgressRing
                style={{ width: "16px", height: "16px", marginRight: "8px" }}
              />
            ) : (
              <span
                style={{
                  color: "var(--vscode-descriptionForeground)",
                  marginRight: "8px",
                }}
              >
                ⏳
              </span>
            )}
            <span>Processing Data</span>
            {loadingStates[app.id]?.steps?.receiving &&
              !loadingStates[app.id]?.steps?.processing && (
                <span
                  style={{ marginLeft: "8px", fontSize: "12px", opacity: 0.7 }}
                >
                  Analyzing application structure...
                </span>
              )}
          </div>
          <div
            className="loading-step"
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            {loadingStates[app.id]?.steps?.extracting ? (
              <span
                style={{
                  color: "var(--vscode-charts-green)",
                  marginRight: "8px",
                }}
              >
                ✅
              </span>
            ) : loadingStates[app.id]?.steps?.processing ? (
              <VSCodeProgressRing
                style={{ width: "16px", height: "16px", marginRight: "8px" }}
              />
            ) : (
              <span
                style={{
                  color: "var(--vscode-descriptionForeground)",
                  marginRight: "8px",
                }}
              >
                ⏳
              </span>
            )}
            <span>Extracting Files</span>
            {loadingStates[app.id]?.steps?.processing &&
              !loadingStates[app.id]?.steps?.extracting && (
                <span
                  style={{ marginLeft: "8px", fontSize: "12px", opacity: 0.7 }}
                >
                  Creating project structure...
                </span>
              )}
          </div>
          <div
            className="loading-step"
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            {loadingStates[app.id]?.steps?.finalizing ? (
              <span
                style={{
                  color: "var(--vscode-charts-green)",
                  marginRight: "8px",
                }}
              >
                ✅
              </span>
            ) : loadingStates[app.id]?.steps?.extracting ? (
              <VSCodeProgressRing
                style={{ width: "16px", height: "16px", marginRight: "8px" }}
              />
            ) : (
              <span
                style={{
                  color: "var(--vscode-descriptionForeground)",
                  marginRight: "8px",
                }}
              >
                ⏳
              </span>
            )}
            <span>Finalizing Setup</span>
            {loadingStates[app.id]?.steps?.extracting &&
              !loadingStates[app.id]?.steps?.finalizing && (
                <span
                  style={{ marginLeft: "8px", fontSize: "12px", opacity: 0.7 }}
                >
                  Preparing development environment...
                </span>
              )}
          </div>
          {loadingStates[app.id]?.generating ? (
            <div style={{ marginTop: "12px", fontSize: "12px", opacity: 0.8 }}>
              Please wait while your application is being generated...
            </div>
          ) : (
            <div
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "var(--vscode-charts-green)",
              }}
            >
              ✅ Application generated successfully!
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check if we have any completed applications to show their status
  const hasCompletedApplications = completedApplications.size > 0;

  return (
    <div className="applications-list">
      {renderHeader()}

      {/* Always show the applications container */}
      <div className="applications-container">
        {/* Owned Applications Section */}
        {ownedApps.length > 0 && (
          <div
            className="applications-section"
            style={{ marginBottom: "24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "2px solid #FFD700",
              }}
            >
              <FaStar style={{ color: "#FFD700", fontSize: "16px" }} />
              <h3
                style={{
                  margin: 0,
                  color: "var(--vscode-foreground)",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                My Applications
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--vscode-descriptionForeground)",
                  marginLeft: "auto",
                  fontWeight: 500,
                }}
              >
                {ownedApps.length}
              </span>
            </div>
            {ownedApps.map((app: any) => (
              <div
                key={app.id || app.name || JSON.stringify(app)}
                className="application-card"
                style={{
                  borderLeft: "3px solid #FFD700",
                  marginBottom: "12px",
                }}
              >
                <div className="application-card-content">
                  <div className="application-info">
                    <div
                      className="application-name"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <FaStar style={{ color: "#FFD700", fontSize: "14px" }} />
                      {app.name || app.title || app.id}
                    </div>
                    {app.description && (
                      <div className="application-description">
                        {app.description}
                      </div>
                    )}
                    <div className="application-meta">
                      {app.type && (
                        <span className="application-type">{app.type}</span>
                      )}
                      {app.status && (
                        <span
                          className={`application-status status-${app.status}`}
                        >
                          {app.status}
                        </span>
                      )}
                    </div>

                    {app.id && (
                      <div className="application-buttons">
                        <VSCodeButtonLink
                          href={
                            "http://localhost:5173/application-detail/" + app.id
                          }
                          appearance="secondary"
                          className="w-full"
                        >
                          Open
                        </VSCodeButtonLink>
                        <VSCodeButton
                          appearance="primary"
                          onClick={() => handleGenerate(app.id)}
                          disabled={loadingStates[app.id]?.generating}
                        >
                          {loadingStates[app.id]?.generating
                            ? "Generating..."
                            : "Generate"}
                        </VSCodeButton>
                        <VSCodeButton
                          appearance="secondary"
                          onClick={() => handleDeploy(app.id)}
                          disabled={loadingStates[app.id]?.deploying}
                        >
                          {loadingStates[app.id]?.deploying
                            ? "Deploying..."
                            : "Deploy"}
                        </VSCodeButton>
                      </div>
                    )}
                  </div>
                  {renderLoadingSteps(app)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Shared Applications Section */}
        {sharedApps.length > 0 && (
          <div className="applications-section">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "12px",
                paddingBottom: "12px",
                borderBottom: "2px solid var(--vscode-descriptionForeground)",
              }}
            >
              <FaUserFriends
                style={{
                  color: "var(--vscode-descriptionForeground)",
                  fontSize: "16px",
                }}
              />
              <h3
                style={{
                  margin: 0,
                  color: "var(--vscode-foreground)",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Shared Applications
              </h3>
              <span
                style={{
                  fontSize: "12px",
                  color: "var(--vscode-descriptionForeground)",
                  marginLeft: "auto",
                  fontWeight: 500,
                }}
              >
                {sharedApps.length}
              </span>
            </div>
            {sharedApps.map((app: any) => (
              <div
                key={app.id || app.name || JSON.stringify(app)}
                className="application-card"
                style={{ marginBottom: "12px" }}
              >
                <div className="application-card-content">
                  <div className="application-info">
                    <div className="application-name">
                      {app.name || app.title || app.id}
                    </div>
                    {app.description && (
                      <div className="application-description">
                        {app.description}
                      </div>
                    )}
                    <div className="application-meta">
                      {app.type && (
                        <span className="application-type">{app.type}</span>
                      )}
                      {app.status && (
                        <span
                          className={`application-status status-${app.status}`}
                        >
                          {app.status}
                        </span>
                      )}
                    </div>

                    {app.id && (
                      <div className="application-buttons">
                        <VSCodeButtonLink
                          href={
                            "http://localhost:5173/application-detail/" + app.id
                          }
                          appearance="secondary"
                          className="w-full"
                        >
                          Open
                        </VSCodeButtonLink>
                        <VSCodeButton
                          appearance="primary"
                          onClick={() => handleGenerate(app.id)}
                          disabled={loadingStates[app.id]?.generating}
                        >
                          {loadingStates[app.id]?.generating
                            ? "Generating..."
                            : "Generate"}
                        </VSCodeButton>
                        <VSCodeButton
                          appearance="secondary"
                          onClick={() => handleDeploy(app.id)}
                          disabled={loadingStates[app.id]?.deploying}
                        >
                          {loadingStates[app.id]?.deploying
                            ? "Deploying..."
                            : "Deploy"}
                        </VSCodeButton>
                      </div>
                    )}
                  </div>
                  {renderLoadingSteps(app)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Show file explorer when applications are completed */}
      {showFileExplorer && (
        <div style={{ marginTop: "20px" }}>
          <div
            className="file-explorer-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            <h3>Generated Files</h3>
            <VSCodeButton
              appearance="secondary"
              onClick={() => setShowFileExplorer(false)}
            >
              Hide Files
            </VSCodeButton>
          </div>

          {/* Show completed application status */}
          {hasCompletedApplications && (
            <div style={{ marginBottom: "20px" }}>
              <h4>Recently Generated Applications</h4>
              {Array.from(completedApplications).map((appId) => {
                const app = applications?.find((a) => a.id === appId);
                const appName = app?.name || appId;
                return (
                  <div
                    key={appId}
                    className="application-card"
                    style={{ marginBottom: "12px" }}
                  >
                    <div className="application-card-content">
                      <div className="application-info">
                        <div className="application-name">{appName}</div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--vscode-charts-green)",
                            marginTop: "4px",
                          }}
                        >
                          ✅ Generation completed successfully
                        </div>
                      </div>
                      <div
                        className="loading-steps"
                        style={{
                          marginTop: "12px",
                          padding: "12px",
                          border: "1px solid var(--vscode-panel-border)",
                          borderRadius: "4px",
                        }}
                      >
                        <div
                          className="loading-step"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--vscode-charts-green)",
                              marginRight: "8px",
                            }}
                          >
                            ✅
                          </span>
                          <span>Receiving Application</span>
                        </div>
                        <div
                          className="loading-step"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--vscode-charts-green)",
                              marginRight: "8px",
                            }}
                          >
                            ✅
                          </span>
                          <span>Processing Data</span>
                        </div>
                        <div
                          className="loading-step"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--vscode-charts-green)",
                              marginRight: "8px",
                            }}
                          >
                            ✅
                          </span>
                          <span>Extracting Files</span>
                        </div>
                        <div
                          className="loading-step"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--vscode-charts-green)",
                              marginRight: "8px",
                            }}
                          >
                            ✅
                          </span>
                          <span>Finalizing Setup</span>
                        </div>
                        <div
                          style={{
                            marginTop: "12px",
                            fontSize: "12px",
                            color: "var(--vscode-charts-green)",
                          }}
                        >
                          ✅ Application generated successfully!
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <FileExplorer
            onFileSelect={(filePath) => {
              console.log("Selected file:", filePath);
              // You can add additional file selection logic here
            }}
            highlightNewFiles={true}
            autoRefresh={true}
          />
        </div>
      )}
    </div>
  );
};

export default ApplicationsList;
