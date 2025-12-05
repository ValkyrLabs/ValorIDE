import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { VSCodeButton, VSCodeProgressRing, } from "@vscode/webview-ui-toolkit/react";
import { useExtensionState } from "@/context/ExtensionStateContext";
import SystemAlerts from "@/components/SystemAlerts";
import "./ApplicationProgress.css";
const ApplicationProgress = ({ applicationId, applicationName, onClose, }) => {
    const { valorideMessages } = useExtensionState();
    const [steps, setSteps] = useState([
        {
            id: "receiving",
            title: "Generating Application",
            description: "Generating application payload...",
            status: "pending",
        },
        {
            id: "processing",
            title: "Receiving Data",
            description: "Receiving application payload...",
            status: "pending",
        },
        {
            id: "extracting",
            title: "Extracting Files",
            description: "Creating project structure...",
            status: "pending",
        },
        {
            id: "finalizing",
            title: "Finalizing Setup",
            description: "Preparing development environment...",
            status: "pending",
        },
    ]);
    const [currentStep, setCurrentStep] = useState("receiving");
    const [isComplete, setIsComplete] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [resultDetails, setResultDetails] = useState({});
    useEffect(() => {
        // Listen for streamToThorapiResult messages
        const handleMessage = (event) => {
            const message = event.data;
            if (message.type === "streamToThorapiResult" &&
                message.streamToThorapiResult) {
                const result = message.streamToThorapiResult;
                if (result.applicationId === applicationId) {
                    updateProgress(result);
                }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [applicationId]);
    const updateProgress = (result) => {
        const { step, success, error, message, filePath, extractedPath, readmePath, } = result;
        if (error) {
            setHasError(true);
            setErrorMessage(error);
            setSteps((prev) => prev.map((s) => s.id === step ? { ...s, status: "error", details: error } : s));
            return;
        }
        if (success && step === "completed") {
            setIsComplete(true);
            setResultDetails({ filePath, extractedPath, readmePath });
            setSteps((prev) => prev.map((s) => ({ ...s, status: "completed" })));
            return;
        }
        // Update current step
        setCurrentStep(step);
        setSteps((prev) => prev.map((s) => {
            if (s.id === step) {
                return { ...s, status: "active", details: message };
            }
            else if (getStepIndex(s.id) < getStepIndex(step)) {
                return { ...s, status: "completed" };
            }
            return s;
        }));
    };
    const getStepIndex = (stepId) => {
        const stepOrder = [
            "receiving",
            "processing",
            "extracting",
            "finalizing",
            "completed",
        ];
        return stepOrder.indexOf(stepId);
    };
    const getStepIcon = (status) => {
        switch (status) {
            case "completed":
                return "✅";
            case "active":
                return _jsx(VSCodeProgressRing, { style: { width: "16px", height: "16px" } });
            case "error":
                return "❌";
            default:
                return "⏳";
        }
    };
    const handleOpenFolder = () => {
        if (resultDetails.extractedPath) {
            // Send message to extension to open the folder
            window.postMessage({
                type: "openFolder",
                path: resultDetails.extractedPath,
            }, "*");
        }
    };
    const handleOpenReadme = () => {
        if (resultDetails.readmePath) {
            // Send message to extension to open the README
            window.postMessage({
                type: "openFile",
                path: resultDetails.readmePath,
            }, "*");
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(SystemAlerts, {}), _jsxs("div", { className: "application-progress", children: [_jsxs("div", { className: "application-progress-header", children: [_jsx("h2", { children: "Application Generation" }), applicationId && (_jsxs("div", { className: "application-id", children: [_jsx("span", { children: applicationName }), _jsxs("span", { children: ["ID: ", applicationId] })] }))] }), _jsx("div", { className: "application-progress-content", children: hasError ? (_jsxs("div", { className: "application-progress-error", children: [_jsx("div", { className: "error-icon", children: "\u274C" }), _jsx("h3", { children: "Generation Failed" }), _jsx("p", { children: errorMessage }), _jsx(VSCodeButton, { onClick: onClose, children: "Close" })] })) : isComplete ? (_jsxs("div", { className: "application-progress-success", children: [_jsx("div", { className: "success-icon", children: "\uD83C\uDF89" }), _jsx("h3", { children: "Application Generated Successfully!" }), _jsx("p", { children: "Your application has been created and is ready for development." }), _jsxs("div", { className: "result-actions", children: [resultDetails.extractedPath && (_jsx(VSCodeButton, { appearance: "primary", onClick: handleOpenFolder, children: "Open Project Folder" })), resultDetails.readmePath && (_jsx(VSCodeButton, { onClick: handleOpenReadme, children: "View Documentation" })), _jsx(VSCodeButton, { appearance: "secondary", onClick: onClose, children: "Close" })] }), resultDetails.extractedPath && (_jsxs("div", { className: "result-details", children: [_jsx("h4", { children: "Project Details:" }), _jsxs("ul", { children: [_jsxs("li", { children: [_jsx("strong", { children: "Location:" }), " ", resultDetails.extractedPath] }), resultDetails.readmePath && (_jsxs("li", { children: [_jsx("strong", { children: "Documentation:" }), " ", resultDetails.readmePath] }))] })] }))] })) : (_jsx("div", { className: "application-progress-steps", children: steps.map((step, index) => (_jsxs("div", { className: `progress-step ${step.status}`, children: [_jsx("div", { className: "step-icon", children: getStepIcon(step.status) }), _jsxs("div", { className: "step-content", children: [_jsx("h4", { children: step.title }), _jsx("p", { children: step.details || step.description })] }), index < steps.length - 1 && (_jsx("div", { className: `step-connector ${step.status === "completed" ? "completed" : ""}` }))] }, step.id))) })) }), !isComplete && !hasError && (_jsx("div", { className: "application-progress-footer", children: _jsx("p", { children: "Please wait while your application is being generated..." }) }))] })] }));
};
export default ApplicationProgress;
//# sourceMappingURL=ApplicationProgress.js.map