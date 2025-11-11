import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { VSCodeButton, VSCodeProgressRing, } from "@vscode/webview-ui-toolkit/react";
import { useGetApplicationsQuery, useGenerateApplicationMutation, useDeployApplicationMutation, } from "../../redux/services/ApplicationService";
import { vscode } from "../../utils/vscode";
import FileExplorer from "../FileExplorer/FileExplorer";
import { useExtensionState } from "../../context/ExtensionStateContext";
import VSCodeButtonLink from "../common/VSCodeButtonLink";
const ApplicationsList = ({ showTitle = true, title = "Available Applications", }) => {
    const { userInfo, jwtToken, authenticatedPrincipal } = useExtensionState();
    // Check if user is authenticated - primarily check for JWT token in sessionStorage
    // as this is the most reliable indicator of authentication state
    const sessionToken = sessionStorage.getItem("jwtToken");
    const isAuthenticated = !!(sessionToken ||
        jwtToken ||
        authenticatedPrincipal ||
        userInfo);
    // Always fetch applications - don't skip the query
    // The API will handle authentication and return appropriate errors if not authenticated
    const { data: applications, error, isLoading, } = useGetApplicationsQuery(undefined, {
        skip: false, // Always attempt to fetch applications
    });
    const [generateApplication, { isLoading: isGenerating }] = useGenerateApplicationMutation();
    const [deployApplication, { isLoading: isDeploying }] = useDeployApplicationMutation();
    const [loadingStates, setLoadingStates] = useState({});
    const [showFileExplorer, setShowFileExplorer] = useState(false); // Start with cards view by default
    const [completedApplications, setCompletedApplications] = useState(new Set());
    // Listen for messages from the extension
    useEffect(() => {
        const handleMessage = (event) => {
            const message = event.data;
            // Only process relevant messages to prevent infinite loops
            if (!message || message.type !== "streamToThorapiResult") {
                return;
            }
            console.log("ApplicationsList: Processing streamToThorapiResult:", message.streamToThorapiResult);
            const { success, applicationId, error } = message.streamToThorapiResult;
            if (success && applicationId) {
                console.log("ApplicationsList: Success! Completing steps for:", applicationId);
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
                setCompletedApplications((prev) => new Set([...Array.from(prev), applicationId]));
                setShowFileExplorer(true);
            }
            else if (error && applicationId) {
                console.error("ApplicationsList: Error in streamToThorapiResult:", error);
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
    if (isLoading) {
        return (_jsxs("div", { className: "applications-list", children: [showTitle && _jsx("h3", { children: title }), _jsxs("div", { className: "loading-container", children: [_jsx(VSCodeProgressRing, {}), _jsx("span", { children: "Loading applications..." })] })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "applications-list", children: [showTitle && _jsx("h2", { children: title }), _jsxs("div", { className: "error-message", children: ["Failed to load applications:", " ", error
                            ? typeof error === "object" && "message" in error && error.message
                                ? error.message
                                : typeof error === "object" && "status" in error && error.status
                                    ? `Status: ${error.status}`
                                    : JSON.stringify(error)
                            : "Unknown error"] })] }));
    }
    if (!applications || applications.length === 0) {
        return (_jsxs("div", { className: "applications-list", children: [showTitle && _jsx("h2", { children: title }), _jsx("div", { children: "No available applications found." })] }));
    }
    const handleApplicationSelect = (application) => {
        if (application.id) {
            // Use VSCode command to open external URL instead of window.open
            // This avoids the sandboxed webview popup blocking issue
            vscode.postMessage({
                type: "openInBrowser",
                url: application.id,
            });
        }
        else if (application.entrypointUrl) {
            // Fallback to entrypointUrl
            vscode.postMessage({
                type: "openInBrowser",
                url: application.entrypointUrl,
            });
        }
        else {
            alert(`Selected application: ${application.name || "Unknown"}`);
        }
    };
    const handleGenerate = async (applicationId) => {
        if (!applicationId)
            return;
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
            const mimeType = result.mimeType || result.blob?.type || "application/octet-stream";
            console.log("ApplicationsList: Using filename from service:", extractedFilename);
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
            console.log("ApplicationsList: Sending to extension with filename:", extractedFilename, "and application name:", applicationName);
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
        }
        catch (error) {
            console.error("Generate failed:", error);
            // Show error feedback
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
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
    const handleDeploy = (applicationId) => {
        if (!applicationId)
            return;
        // Open File Explorer in a new tab - VSCode toast notification will be shown by the extension
        vscode.postMessage({
            type: "openFileExplorerTab",
            applicationId: applicationId,
        });
    };
    // Check if we have any completed applications to show their status
    const hasCompletedApplications = completedApplications.size > 0;
    return (_jsxs("div", { className: "applications-list", children: [showTitle && _jsx("h2", { children: title }), _jsx("div", { className: "applications-container", children: applications.map((app) => (_jsx("div", { className: "application-card", children: _jsxs("div", { className: "application-card-content", children: [_jsxs("div", { className: "application-info", children: [_jsx("div", { className: "application-name", children: app.name || app.title || app.id }), app.description && (_jsx("div", { className: "application-description", children: app.description })), _jsxs("div", { className: "application-meta", children: [app.type && (_jsx("span", { className: "application-type", children: app.type })), app.status && (_jsx("span", { className: `application-status status-${app.status}`, children: app.status }))] }), app.id && (_jsxs("div", { className: "application-buttons", children: [_jsx(VSCodeButtonLink, { href: "http://localhost:5173/application-detail/" + app.id, appearance: "secondary", className: "w-full", children: "Open" }), _jsx(VSCodeButton, { appearance: "primary", onClick: () => handleGenerate(app.id), disabled: loadingStates[app.id]?.generating, children: loadingStates[app.id]?.generating
                                                    ? "Generating..."
                                                    : "Generate" }), _jsx(VSCodeButton, { appearance: "secondary", onClick: () => handleDeploy(app.id), disabled: loadingStates[app.id]?.deploying, children: loadingStates[app.id]?.deploying
                                                    ? "Deploying..."
                                                    : "Deploy" })] }))] }), _jsx("div", { className: "application-loading-steps", children: (loadingStates[app.id]?.generating ||
                                    loadingStates[app.id]?.steps?.receiving ||
                                    loadingStates[app.id]?.steps?.processing ||
                                    loadingStates[app.id]?.steps?.extracting ||
                                    loadingStates[app.id]?.steps?.finalizing) && (_jsxs("div", { className: "loading-steps", style: {
                                        marginTop: "16px",
                                        padding: "12px",
                                        border: "1px solid var(--vscode-panel-border)",
                                        borderRadius: "4px",
                                    }, children: [_jsxs("div", { className: "loading-step", style: {
                                                display: "flex",
                                                alignItems: "center",
                                                marginBottom: "8px",
                                            }, children: [loadingStates[app.id]?.steps?.receiving ? (_jsx("span", { style: {
                                                        color: "var(--vscode-charts-green)",
                                                        marginRight: "8px",
                                                    }, children: "\u2705" })) : (_jsx(VSCodeProgressRing, { style: {
                                                        width: "16px",
                                                        height: "16px",
                                                        marginRight: "8px",
                                                    } })), _jsx("span", { children: "Receiving Application" }), !loadingStates[app.id]?.steps?.receiving && (_jsx("span", { style: {
                                                        marginLeft: "8px",
                                                        fontSize: "12px",
                                                        opacity: 0.7,
                                                    }, children: "Downloading application payload..." }))] }), _jsxs("div", { className: "loading-step", style: {
                                                display: "flex",
                                                alignItems: "center",
                                                marginBottom: "8px",
                                            }, children: [loadingStates[app.id]?.steps?.processing ? (_jsx("span", { style: {
                                                        color: "var(--vscode-charts-green)",
                                                        marginRight: "8px",
                                                    }, children: "\u2705" })) : loadingStates[app.id]?.steps?.receiving ? (_jsx(VSCodeProgressRing, { style: {
                                                        width: "16px",
                                                        height: "16px",
                                                        marginRight: "8px",
                                                    } })) : (_jsx("span", { style: {
                                                        color: "var(--vscode-descriptionForeground)",
                                                        marginRight: "8px",
                                                    }, children: "\u23F3" })), _jsx("span", { children: "Processing Data" }), loadingStates[app.id]?.steps?.receiving &&
                                                    !loadingStates[app.id]?.steps?.processing && (_jsx("span", { style: {
                                                        marginLeft: "8px",
                                                        fontSize: "12px",
                                                        opacity: 0.7,
                                                    }, children: "Analyzing application structure..." }))] }), _jsxs("div", { className: "loading-step", style: {
                                                display: "flex",
                                                alignItems: "center",
                                                marginBottom: "8px",
                                            }, children: [loadingStates[app.id]?.steps?.extracting ? (_jsx("span", { style: {
                                                        color: "var(--vscode-charts-green)",
                                                        marginRight: "8px",
                                                    }, children: "\u2705" })) : loadingStates[app.id]?.steps?.processing ? (_jsx(VSCodeProgressRing, { style: {
                                                        width: "16px",
                                                        height: "16px",
                                                        marginRight: "8px",
                                                    } })) : (_jsx("span", { style: {
                                                        color: "var(--vscode-descriptionForeground)",
                                                        marginRight: "8px",
                                                    }, children: "\u23F3" })), _jsx("span", { children: "Extracting Files" }), loadingStates[app.id]?.steps?.processing &&
                                                    !loadingStates[app.id]?.steps?.extracting && (_jsx("span", { style: {
                                                        marginLeft: "8px",
                                                        fontSize: "12px",
                                                        opacity: 0.7,
                                                    }, children: "Creating project structure..." }))] }), _jsxs("div", { className: "loading-step", style: {
                                                display: "flex",
                                                alignItems: "center",
                                                marginBottom: "8px",
                                            }, children: [loadingStates[app.id]?.steps?.finalizing ? (_jsx("span", { style: {
                                                        color: "var(--vscode-charts-green)",
                                                        marginRight: "8px",
                                                    }, children: "\u2705" })) : loadingStates[app.id]?.steps?.extracting ? (_jsx(VSCodeProgressRing, { style: {
                                                        width: "16px",
                                                        height: "16px",
                                                        marginRight: "8px",
                                                    } })) : (_jsx("span", { style: {
                                                        color: "var(--vscode-descriptionForeground)",
                                                        marginRight: "8px",
                                                    }, children: "\u23F3" })), _jsx("span", { children: "Finalizing Setup" }), loadingStates[app.id]?.steps?.extracting &&
                                                    !loadingStates[app.id]?.steps?.finalizing && (_jsx("span", { style: {
                                                        marginLeft: "8px",
                                                        fontSize: "12px",
                                                        opacity: 0.7,
                                                    }, children: "Preparing development environment..." }))] }), loadingStates[app.id]?.generating ? (_jsx("div", { style: {
                                                marginTop: "12px",
                                                fontSize: "12px",
                                                opacity: 0.8,
                                            }, children: "Please wait while your application is being generated..." })) : (_jsx("div", { style: {
                                                marginTop: "12px",
                                                fontSize: "12px",
                                                color: "var(--vscode-charts-green)",
                                            }, children: "\u2705 Application generated successfully!" }))] })) })] }) }, app.id || app.name || JSON.stringify(app)))) }), showFileExplorer && (_jsxs("div", { style: { marginTop: "20px" }, children: [_jsxs("div", { className: "file-explorer-header", style: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "16px",
                        }, children: [_jsx("h3", { children: "Generated Files" }), _jsx(VSCodeButton, { appearance: "secondary", onClick: () => setShowFileExplorer(false), children: "Hide Files" })] }), hasCompletedApplications && (_jsxs("div", { style: { marginBottom: "20px" }, children: [_jsx("h4", { children: "Recently Generated Applications" }), Array.from(completedApplications).map((appId) => {
                                const app = applications?.find((a) => a.id === appId);
                                const appName = app?.name || appId;
                                return (_jsx("div", { className: "application-card", style: { marginBottom: "12px" }, children: _jsxs("div", { className: "application-card-content", children: [_jsxs("div", { className: "application-info", children: [_jsx("div", { className: "application-name", children: appName }), _jsx("div", { style: {
                                                            fontSize: "12px",
                                                            color: "var(--vscode-charts-green)",
                                                            marginTop: "4px",
                                                        }, children: "\u2705 Generation completed successfully" })] }), _jsxs("div", { className: "loading-steps", style: {
                                                    marginTop: "12px",
                                                    padding: "12px",
                                                    border: "1px solid var(--vscode-panel-border)",
                                                    borderRadius: "4px",
                                                }, children: [_jsxs("div", { className: "loading-step", style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            marginBottom: "8px",
                                                        }, children: [_jsx("span", { style: {
                                                                    color: "var(--vscode-charts-green)",
                                                                    marginRight: "8px",
                                                                }, children: "\u2705" }), _jsx("span", { children: "Receiving Application" })] }), _jsxs("div", { className: "loading-step", style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            marginBottom: "8px",
                                                        }, children: [_jsx("span", { style: {
                                                                    color: "var(--vscode-charts-green)",
                                                                    marginRight: "8px",
                                                                }, children: "\u2705" }), _jsx("span", { children: "Processing Data" })] }), _jsxs("div", { className: "loading-step", style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            marginBottom: "8px",
                                                        }, children: [_jsx("span", { style: {
                                                                    color: "var(--vscode-charts-green)",
                                                                    marginRight: "8px",
                                                                }, children: "\u2705" }), _jsx("span", { children: "Extracting Files" })] }), _jsxs("div", { className: "loading-step", style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            marginBottom: "8px",
                                                        }, children: [_jsx("span", { style: {
                                                                    color: "var(--vscode-charts-green)",
                                                                    marginRight: "8px",
                                                                }, children: "\u2705" }), _jsx("span", { children: "Finalizing Setup" })] }), _jsx("div", { style: {
                                                            marginTop: "12px",
                                                            fontSize: "12px",
                                                            color: "var(--vscode-charts-green)",
                                                        }, children: "\u2705 Application generated successfully!" })] })] }) }, appId));
                            })] })), _jsx(FileExplorer, { onFileSelect: (filePath) => {
                            console.log("Selected file:", filePath);
                            // You can add additional file selection logic here
                        }, highlightNewFiles: true, autoRefresh: true })] }))] }));
};
export default ApplicationsList;
//# sourceMappingURL=ApplicationsList.js.map