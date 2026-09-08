import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";
import { Application } from "@thorapi/model";
import { useGetApplicationsQuery } from "../../redux/services/ApplicationService";
import { useGetObjectPermissionsQuery } from "../../redux/services/AclService";
import { vscode } from "../../utils/vscode";
import FileExplorer from "../FileExplorer/FileExplorer";
import { useExtensionState } from "../../context/ExtensionStateContext";
import {
  FaCalendarAlt,
  FaCloudUploadAlt,
  FaUser,
  FaUserFriends,
} from "react-icons/fa";

interface ApplicationsListProps {
  showTitle?: boolean;
  title?: string;
}

type ApplicationGenerationStep =
  | "receiving"
  | "processing"
  | "extracting"
  | "finalizing";

const GENERATION_STEPS: Array<{
  id: ApplicationGenerationStep;
  label: string;
  description: string;
}> = [
  {
    id: "receiving",
    label: "Generate application",
    description: "Creating your project from its Blueprint...",
  },
  {
    id: "processing",
    label: "Check archive",
    description: "Checking the generated project...",
  },
  {
    id: "extracting",
    label: "Extract project",
    description: "Writing your project files...",
  },
  {
    id: "finalizing",
    label: "Prepare workspace",
    description: "Recording the application and Blueprint source...",
  },
];

interface ApplicationLoadingState {
  generating: boolean;
  deploying: boolean;
  publishing?: boolean;
  sourceStatus?: string;
  currentStep?: ApplicationGenerationStep;
  statusMessage?: string;
  error?: string;
  steps: {
    receiving: boolean;
    processing: boolean;
    extracting: boolean;
    finalizing: boolean;
  };
}

const isGenerationStep = (value: unknown): value is ApplicationGenerationStep =>
  GENERATION_STEPS.some((step) => step.id === value);

const generationStepLabel = (
  value: ApplicationGenerationStep | undefined,
): string =>
  GENERATION_STEPS.find((step) => step.id === value)?.label || "generation";

const stepsCompletedBefore = (
  currentStep: ApplicationGenerationStep,
): ApplicationLoadingState["steps"] => {
  const currentIndex = GENERATION_STEPS.findIndex(
    (step) => step.id === currentStep,
  );
  return Object.fromEntries(
    GENERATION_STEPS.map((step, index) => [step.id, index < currentIndex]),
  ) as ApplicationLoadingState["steps"];
};

export const formatApplicationGenerationError = (value: unknown): string => {
  if (value instanceof Error && value.message.trim()) {
    return value.message;
  }
  if (value && typeof value === "object") {
    const candidate = value as {
      error?: unknown;
      data?: unknown;
      status?: unknown;
    };
    const data = candidate.data as
      | { message?: unknown; error?: unknown }
      | string
      | undefined;
    const message =
      candidate.error ||
      (typeof data === "string" ? data : data?.message || data?.error);
    if (message) {
      return String(message);
    }
    if (candidate.status) {
      return `Generation request failed (${String(candidate.status)}).`;
    }
  }
  return "Unknown error occurred";
};

interface ApplicationWriteActionsProps {
  application: Application;
  isOwned: boolean;
  loadingState?: ApplicationLoadingState;
  onBlueprint: (application: Application) => void;
  onPublishSource: (application: Application) => void;
}

const ApplicationWriteActions: React.FC<ApplicationWriteActionsProps> = ({
  application,
  isOwned,
  loadingState,
  onBlueprint,
  onPublishSource,
}) => {
  const applicationId = String(application.id || "");
  const { data: access } = useGetObjectPermissionsQuery(
    {
      objectType: "com.valkyrlabs.model.Application",
      objectId: applicationId,
    },
    { skip: !applicationId },
  );
  const permissions = Array.isArray(access?.permissions)
    ? access.permissions
        .filter(
          (permission): permission is string => typeof permission === "string",
        )
        .map((permission) => permission.toUpperCase())
    : [];
  const canWrite =
    isOwned ||
    access?.isOwner ||
    access?.isAdmin ||
    permissions?.includes("WRITE") ||
    permissions?.includes("ADMINISTRATION");

  if (!canWrite) return null;

  return (
    <>
      <VSCodeButton
        appearance="secondary"
        aria-label="Open Blueprint"
        role="button"
        onClick={() => onBlueprint(application)}
      >
        Blueprint
      </VSCodeButton>
      <VSCodeButton
        appearance="secondary"
        aria-label="Publish source"
        role="button"
        onClick={() => onPublishSource(application)}
        disabled={loadingState?.publishing}
        title="Publish developer source for the next deployment"
      >
        <span slot="start">
          <FaCloudUploadAlt aria-hidden />
        </span>
        {loadingState?.publishing ? "Publishing..." : "Publish Source"}
      </VSCodeButton>
    </>
  );
};

const DEFAULT_VALKYRAI_WEB_BASE_URL = "https://valkyrlabs.com";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const getValkyraiWebBaseUrl = () => {
  const windowBase =
    typeof window !== "undefined"
      ? (window as any).__valorideValkyraiWebBaseUrl
      : undefined;
  const envBase = import.meta.env?.VITE_VALKYRAI_WEB_BASE_URL;
  const rawBase =
    (typeof windowBase === "string" && windowBase.trim()) ||
    (typeof envBase === "string" && envBase.trim()) ||
    DEFAULT_VALKYRAI_WEB_BASE_URL;
  return trimTrailingSlashes(rawBase);
};

export const getApplicationOpenUrl = (application: Application): string => {
  const applicationId = String(application.id || "").trim();
  if (!applicationId) {
    return getValkyraiWebBaseUrl();
  }

  return `${getValkyraiWebBaseUrl()}/application-detail/${encodeURIComponent(applicationId)}`;
};

export const getApplicationDeployUrl = (
  applicationId: string,
  applicationName?: string,
  applicationSlug?: string,
): string => {
  const normalizedId = String(applicationId || "").trim();
  if (!normalizedId) {
    return getValkyraiWebBaseUrl();
  }

  const query = new URLSearchParams({
    open: "deployment",
    applicationId: normalizedId,
  });
  if (applicationName?.trim())
    query.set("applicationName", applicationName.trim());
  if (applicationSlug?.trim())
    query.set("applicationSlug", applicationSlug.trim());
  return `${getValkyraiWebBaseUrl()}/dashboard?${query.toString()}`;
};

const formatApplicationDate = (value: unknown): string | undefined => {
  if (!value) return undefined;

  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const ApplicationsList: React.FC<ApplicationsListProps> = ({
  showTitle = true,
  title = "Applications",
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
  const authSessionKey =
    jwtToken ||
    currentUserId ||
    (isAuthenticated ? "authenticated" : "anonymous");

  // Always fetch applications - don't skip the query
  // The API will handle authentication and return appropriate errors if not authenticated
  const {
    data: applications,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useGetApplicationsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    skip: false, // Always attempt to fetch applications
  });

  useEffect(() => {
    refetch();
  }, [authSessionKey, refetch]);

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

  const activeRequests = useRef(new Map<string, string>());
  const generationScope = `${currentUserId || "anonymous"}:${authenticatedPrincipal?.organizationId || authenticatedPrincipal?.organization?.id || ""}:${jwtToken || ""}`;
  const [loadingStates, setLoadingStates] = useState<
    Record<string, ApplicationLoadingState>
  >({});
  const [showFileExplorer, setShowFileExplorer] = useState(false); // Start with cards view by default
  const [completedApplications, setCompletedApplications] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    activeRequests.current.clear();
    setLoadingStates({});
    setCompletedApplications(new Set());
    setShowFileExplorer(false);
    return () => {
      activeRequests.current.clear();
    };
  }, [generationScope]);

  // Listen for messages from the extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message?.type === "applicationSourcePublishProgress") {
        const applicationId = message.applicationId;
        if (applicationId) {
          setLoadingStates((prev) => ({
            ...prev,
            [applicationId]: {
              ...prev[applicationId],
              publishing: true,
              sourceStatus:
                message.sourcePublishStatus || "Publishing source...",
            },
          }));
        }
        return;
      }

      if (message?.type === "applicationSourcePublishResult") {
        const result = message.sourcePublishResult;
        if (result?.applicationId) {
          setLoadingStates((prev) => ({
            ...prev,
            [result.applicationId]: {
              ...prev[result.applicationId],
              publishing: false,
              sourceStatus: result.success
                ? `Source ready: ${result.revisionRef}`
                : result.error || "Source publish failed",
            },
          }));
        }
        return;
      }

      // Only process relevant messages to prevent infinite loops
      if (!message || message.type !== "streamToThorapiResult") {
        return;
      }

      const {
        success,
        applicationId,
        requestId,
        error,
        step,
        message: progressMessage,
      } = message.streamToThorapiResult || {};
      if (
        !applicationId ||
        !requestId ||
        activeRequests.current.get(applicationId) !== requestId
      )
        return;
      if (step === "completed" || success === false || error)
        activeRequests.current.delete(applicationId);

      if (success && step === "completed") {
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
            currentStep: "finalizing",
            statusMessage: progressMessage,
            error: undefined,
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
      } else if (success && isGenerationStep(step)) {
        setLoadingStates((prev) => {
          const completedSteps = stepsCompletedBefore(step);
          const existingSteps = prev[applicationId]?.steps;
          return {
            ...prev,
            [applicationId]: {
              ...prev[applicationId],
              generating: true,
              currentStep: step,
              statusMessage: progressMessage,
              error: undefined,
              steps: {
                receiving:
                  Boolean(existingSteps?.receiving) || completedSteps.receiving,
                processing:
                  Boolean(existingSteps?.processing) ||
                  completedSteps.processing,
                extracting:
                  Boolean(existingSteps?.extracting) ||
                  completedSteps.extracting,
                finalizing:
                  Boolean(existingSteps?.finalizing) ||
                  completedSteps.finalizing,
              },
            },
          };
        });
      } else if (error || success === false) {
        console.error(
          "ApplicationsList: Error in streamToThorapiResult:",
          error || "Unknown stream failure",
        );
        setLoadingStates((prev) => ({
          ...prev,
          [applicationId]: {
            ...prev[applicationId],
            generating: false,
            currentStep: prev[applicationId]?.currentStep || "finalizing",
            statusMessage: undefined,
            error: error || "Failed to stream generated application.",
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

  const formatApplicationsError = (value: unknown) => {
    const candidate = value as
      | { status?: unknown; error?: unknown; data?: unknown }
      | undefined;
    const status = candidate?.status;
    const data = candidate?.data as any;
    const message =
      candidate?.error ||
      (typeof data === "string" ? data : data?.message || data?.error);
    return [
      status ? `Status ${String(status)}` : "Request failed",
      message ? String(message) : undefined,
    ]
      .filter(Boolean)
      .join(": ");
  };

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
        <div
          role="alert"
          style={{
            border: "1px solid var(--vscode-inputValidation-errorBorder)",
            background: "var(--vscode-inputValidation-errorBackground)",
            color: "var(--vscode-inputValidation-errorForeground)",
            padding: "10px 12px",
            borderRadius: 4,
            marginBottom: 12,
          }}
        >
          Failed to load applications. {formatApplicationsError(error)}
        </div>
      </div>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <div className="applications-list">
        {renderHeader()}
        <div>No Applications Available</div>
      </div>
    );
  }

  const handleApplicationSelect = (application: Application) => {
    const openUrl = getApplicationOpenUrl(application);
    if (openUrl) {
      // Use VSCode command to open external URL instead of window.open.
      vscode.postMessage({
        type: "openInBrowser",
        url: openUrl,
      });
    } else {
      alert(`Selected application: ${application.name || "Unknown"}`);
    }
  };

  const handleGenerate = (applicationId: string) => {
    if (!applicationId || activeRequests.current.has(applicationId)) return;
    const requestId = crypto.randomUUID();
    activeRequests.current.set(applicationId, requestId);
    const applicationName =
      applications?.find((app) => app.id === applicationId)?.name ||
      applicationId;
    setLoadingStates((prev) => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        generating: true,
        currentStep: "receiving",
        statusMessage: "Generating your application in ValkyrAI...",
        error: undefined,
        steps: {
          receiving: false,
          processing: false,
          extracting: false,
          finalizing: false,
        },
      },
    }));
    try {
      vscode.postMessage({
        type: "generateApplicationArtifact",
        applicationId,
        applicationName,
        requestId,
      });
    } catch (error) {
      activeRequests.current.delete(applicationId);
      setLoadingStates((prev) => ({
        ...prev,
        [applicationId]: {
          ...prev[applicationId],
          generating: false,
          statusMessage: undefined,
          error: formatApplicationGenerationError(error),
        },
      }));
    }
  };

  const handleDeploy = (application: Application) => {
    const applicationId = String(application.id || "");
    if (!applicationId) return;

    vscode.postMessage({
      type: "openInBrowser",
      url: getApplicationDeployUrl(
        applicationId,
        application.name,
        (application as any).slug,
      ),
    });
  };

  const handleBlueprint = (application: Application) => {
    const applicationId = String(application.id || "");
    if (!applicationId) return;
    vscode.postMessage({
      type: "openOpenAPIEditor",
      applicationId,
      applicationName: application.name || applicationId,
      deploymentUrl: getApplicationDeployUrl(
        applicationId,
        application.name,
        (application as any).slug,
      ),
    });
  };

  const handlePublishSource = (application: Application) => {
    const applicationId = String(application.id || "");
    if (!applicationId) return;
    setLoadingStates((prev) => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        publishing: true,
        sourceStatus: "Preparing developer source...",
      },
    }));
    vscode.postMessage({
      type: "publishApplicationSource",
      applicationId,
      applicationName: application.name || applicationId,
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
        loadingStates[app.id]?.steps?.finalizing ||
        loadingStates[app.id]?.error
      )
    ) {
      return null;
    }

    return (
      <div className="application-loading-steps" aria-live="polite">
        <div className="loading-steps">
          {GENERATION_STEPS.map(({ id, label, description }) => {
            const state = loadingStates[app.id];
            const complete = state?.steps?.[id];
            const active = state?.currentStep === id;
            return (
              <div
                key={id}
                className="loading-step"
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                {complete ? (
                  <span
                    aria-label="Completed"
                    style={{
                      color: "var(--vscode-charts-green)",
                      marginRight: 8,
                    }}
                  >
                    ✅
                  </span>
                ) : state?.error && active ? (
                  <span
                    aria-label="Failed"
                    style={{
                      color: "var(--vscode-errorForeground)",
                      marginRight: 8,
                    }}
                  >
                    ❌
                  </span>
                ) : state?.generating && active ? (
                  <VSCodeProgressRing
                    style={{ width: 16, height: 16, marginRight: 8 }}
                  />
                ) : (
                  <span
                    aria-label="Waiting"
                    style={{
                      color: "var(--vscode-descriptionForeground)",
                      marginRight: 8,
                    }}
                  >
                    ⏳
                  </span>
                )}
                <span>{label}</span>
                {active && !complete && (
                  <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                    {description}
                  </span>
                )}
              </div>
            );
          })}
          {loadingStates[app.id]?.error ? (
            <div
              role="alert"
              aria-label="Application generation failed"
              style={{
                marginTop: "12px",
                fontSize: "12px",
                color: "var(--vscode-errorForeground)",
                overflowWrap: "anywhere",
              }}
            >
              ❌ Generation failed during{" "}
              {generationStepLabel(loadingStates[app.id]?.currentStep)}:{" "}
              {loadingStates[app.id]?.error}
            </div>
          ) : loadingStates[app.id]?.generating ? (
            <div style={{ marginTop: "12px", fontSize: "12px", opacity: 0.8 }}>
              {loadingStates[app.id]?.statusMessage ||
                "Please wait while your application is being generated..."}
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

  const renderApplicationCard = (
    app: Application,
    section: "owned" | "shared",
  ) => {
    const appId = String(app.id || "");
    const isOwned = section === "owned";
    const createdDate = formatApplicationDate(app.createdDate);

    return (
      <div
        key={app.id || app.name || JSON.stringify(app)}
        className="application-row"
      >
        <div
          className={`application-card ${isOwned ? "application-card-owned" : ""}`}
        >
          <div className="application-card-content">
            <div className="application-info">
              <div className="application-heading-row">
                <h3 className="application-name">
                  {app.name || (app as any).title || app.id}
                </h3>
              </div>
              <div className="application-marketplace-meta">
                <span>
                  <FaUser aria-hidden />
                  {isOwned ? "You" : "Shared"}
                </span>
                {createdDate && (
                  <span>
                    <FaCalendarAlt aria-hidden />
                    {createdDate}
                  </span>
                )}
              </div>
              {app.description && (
                <div className="application-description">{app.description}</div>
              )}
              <div className="application-tags">
                {app.type && (
                  <span className="application-type">{app.type}</span>
                )}
                {app.status && (
                  <span className={`application-status status-${app.status}`}>
                    {app.status}
                  </span>
                )}
              </div>

              {app.id && (
                <div className="application-buttons">
                  <VSCodeButton
                    appearance="secondary"
                    aria-label="Open"
                    role="button"
                    onClick={() => handleApplicationSelect(app)}
                  >
                    Open
                  </VSCodeButton>
                  <ApplicationWriteActions
                    application={app}
                    isOwned={isOwned}
                    loadingState={loadingStates[appId]}
                    onBlueprint={handleBlueprint}
                    onPublishSource={handlePublishSource}
                  />
                  <VSCodeButton
                    appearance="primary"
                    aria-label="Generate"
                    role="button"
                    onClick={() => handleGenerate(appId)}
                    disabled={loadingStates[appId]?.generating}
                  >
                    {loadingStates[appId]?.generating
                      ? "Generating..."
                      : "Generate"}
                  </VSCodeButton>
                  <VSCodeButton
                    appearance="secondary"
                    aria-label="Deploy"
                    role="button"
                    onClick={() => handleDeploy(app)}
                    disabled={loadingStates[appId]?.deploying}
                  >
                    {loadingStates[appId]?.deploying
                      ? "Deploying..."
                      : "Deploy"}
                  </VSCodeButton>
                </div>
              )}
              {loadingStates[appId]?.sourceStatus && (
                <div
                  aria-live="polite"
                  style={{
                    color: "var(--vscode-descriptionForeground)",
                    fontSize: 12,
                    marginTop: 8,
                    overflowWrap: "anywhere",
                  }}
                >
                  {loadingStates[appId]?.sourceStatus}
                </div>
              )}
            </div>
          </div>
        </div>
        {renderLoadingSteps(app)}
      </div>
    );
  };

  return (
    <div className="applications-list">
      {renderHeader()}

      {/* Always show the applications container */}
      <div className="applications-container">
        {/* Owned Applications Section */}
        {ownedApps.length > 0 && (
          <section className="applications-section">
            <div className="applications-section-header applications-section-header-owned">
              <FaUser aria-hidden />
              <h3>My Applications</h3>
              <span>{ownedApps.length}</span>
            </div>
            <div className="applications-section-list">
              {ownedApps.map((app: any) => renderApplicationCard(app, "owned"))}
            </div>
          </section>
        )}

        {/* Shared Applications Section */}
        {sharedApps.length > 0 && (
          <section className="applications-section">
            <div className="applications-section-header">
              <FaUserFriends aria-hidden />
              <h3>Shared Applications</h3>
              <span>{sharedApps.length}</span>
            </div>
            <div className="applications-section-list">
              {sharedApps.map((app: any) =>
                renderApplicationCard(app, "shared"),
              )}
            </div>
          </section>
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
                          <span>{GENERATION_STEPS[0].label}</span>
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
                          <span>{GENERATION_STEPS[1].label}</span>
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
                          <span>{GENERATION_STEPS[2].label}</span>
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
                          <span>{GENERATION_STEPS[3].label}</span>
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
