import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeButton, } from "@vscode/webview-ui-toolkit/react";
import "./StartServerModal.css";
const StartServerModal = ({ isOpen, onClose, onConfirm, folderPath, folderName, serverType, }) => {
    if (!isOpen)
        return null;
    const handleConfirm = () => {
        onConfirm();
        onClose();
    };
    const handleCancel = () => {
        onClose();
    };
    // Handle backdrop click to close modal
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    const getServerTypeInfo = () => {
        switch (serverType) {
            case "spring-boot":
                return {
                    title: "Start Spring Boot Server",
                    description: "Start the Java Spring Boot development server for testing",
                    command: "mvn spring-boot:run",
                    port: "8080",
                    features: [
                        "Starts the Spring Boot application on localhost:8080",
                        "Enables auto-reload on code changes",
                        "Opens Swagger UI documentation",
                        "Configures development database connections"
                    ]
                };
            case "nestjs":
                return {
                    title: "Start Nest.js Server",
                    description: "Start the Nest.js development server for testing",
                    command: "npm run start:dev",
                    port: "3000",
                    features: [
                        "Starts the Nest.js application on localhost:3000",
                        "Enables hot module reload",
                        "Opens API documentation",
                        "Configures development environment"
                    ]
                };
            case "typescript":
                return {
                    title: "Build TypeScript Client",
                    description: "Build and test the TypeScript client library",
                    command: "npm run build",
                    port: null,
                    features: [
                        "Compiles TypeScript to JavaScript",
                        "Runs type checking and linting",
                        "Generates client library for integration",
                        "Creates distributable package",
                        "Updates tsconfig path aliases (@thor/* and @valkyr/component-library/*)"
                    ]
                };
            default:
                return {
                    title: "Start Server",
                    description: "Start the development server for testing",
                    command: "npm start",
                    port: "3000",
                    features: []
                };
        }
    };
    const serverInfo = getServerTypeInfo();
    return (_jsx("div", { className: "start-server-modal-backdrop", onClick: handleBackdropClick, children: _jsxs("div", { className: "start-server-modal-content", children: [_jsx("div", { className: "start-server-modal-header", children: _jsx("h3", { children: serverInfo.title }) }), _jsxs("div", { className: "start-server-modal-body", children: [_jsxs("p", { children: ["Do you want to start ", _jsx("strong", { children: folderName }), " for testing?"] }), _jsx("p", { className: "start-server-modal-path", children: _jsx("code", { children: folderPath }) }), _jsxs("div", { className: "start-server-modal-details", children: [_jsx("p", { children: serverInfo.description }), _jsxs("div", { className: "start-server-modal-command", children: [_jsx("strong", { children: "Command:" }), " ", _jsx("code", { children: serverInfo.command })] }), serverInfo.port && (_jsxs("div", { className: "start-server-modal-port", children: [_jsx("strong", { children: "Port:" }), " ", _jsxs("code", { children: ["http://localhost:", serverInfo.port] })] })), _jsxs("div", { className: "start-server-modal-features", children: [_jsx("p", { children: _jsx("strong", { children: "This will:" }) }), _jsx("ul", { children: serverInfo.features.map((feature, index) => (_jsx("li", { children: feature }, index))) })] })] })] }), _jsxs("div", { className: "start-server-modal-footer", children: [_jsx(VSCodeButton, { appearance: "secondary", onClick: handleCancel, children: "Cancel" }), _jsx(VSCodeButton, { appearance: "primary", onClick: handleConfirm, children: "Start Server" })] })] }) }));
};
export default StartServerModal;
//# sourceMappingURL=StartServerModal.js.map