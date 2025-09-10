import React from "react";
import {
  VSCodeButton,
} from "@vscode/webview-ui-toolkit/react";
import "./AddToProjectModal.css";

interface AddToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  folderPath: string;
  folderName: string;
}

const AddToProjectModal: React.FC<AddToProjectModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  folderPath,
  folderName,
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

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Add Generated Code to Project</h3>
        </div>
        <div className="modal-body">
          <p>
            Do you want to add the folder <strong>{folderName}</strong> to your project?
          </p>
          <p className="modal-path">
            <code>{folderPath}</code>
          </p>
          <div className="modal-details">
            <p>This will:</p>
            <ul>
              <li>Locate existing tsconfig.json files in your project</li>
              <li>Add <code>@thor/*</code> alias pointing to the generated TypeScript code</li>
              <li>Add <code>@valkyr/component-library</code> alias for components</li>
              <li>Include the source folders in your TypeScript compilation</li>
            </ul>
          </div>
        </div>
        <div className="modal-footer">
          <VSCodeButton appearance="secondary" onClick={handleCancel}>
            Cancel
          </VSCodeButton>
          <VSCodeButton appearance="primary" onClick={handleConfirm}>
            Add to Project
          </VSCodeButton>
        </div>
      </div>
    </div>
  );
};

export default AddToProjectModal;
