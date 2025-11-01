import React from "react";
import {
  VSCodeButton,
} from "@vscode/webview-ui-toolkit/react";
import "./StartServerModal.css";

interface StartServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  folderPath: string;
  folderName: string;
  serverType: "spring-boot" | "nestjs" | "typescript";
}

const StartServerModal: React.FC<StartServerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  folderPath,
  folderName,
  serverType,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Handle backdrop click to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
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

  return (
    <div className="start-server-modal-backdrop" onClick={handleBackdropClick}>
      <div className="start-server-modal-content">
        <div className="start-server-modal-header">
          <h3>{serverInfo.title}</h3>
        </div>
        <div className="start-server-modal-body">
          <p>
            Do you want to start <strong>{folderName}</strong> for testing?
          </p>
          <p className="start-server-modal-path">
            <code>{folderPath}</code>
          </p>
          <div className="start-server-modal-details">
            <p>{serverInfo.description}</p>
            <div className="start-server-modal-command">
              <strong>Command:</strong> <code>{serverInfo.command}</code>
            </div>
            {serverInfo.port && (
              <div className="start-server-modal-port">
                <strong>Port:</strong> <code>http://localhost:{serverInfo.port}</code>
              </div>
            )}
            <div className="start-server-modal-features">
              <p><strong>This will:</strong></p>
              <ul>
                {serverInfo.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="start-server-modal-footer">
          <VSCodeButton appearance="secondary" onClick={handleCancel}>
            Cancel
          </VSCodeButton>
          <VSCodeButton appearance="primary" onClick={handleConfirm}>
            Start Server
          </VSCodeButton>
        </div>
      </div>
    </div>
  );
};

export default StartServerModal;
