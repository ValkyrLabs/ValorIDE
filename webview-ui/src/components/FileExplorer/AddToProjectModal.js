import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeButton, } from "@vscode/webview-ui-toolkit/react";
import "./AddToProjectModal.css";
const AddToProjectModal = ({ isOpen, onClose, onConfirm, folderPath, folderName, }) => {
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
    return (_jsx("div", { className: "modal-backdrop", onClick: handleBackdropClick, children: _jsxs("div", { className: "modal-content", children: [_jsx("div", { className: "modal-header", children: _jsx("h3", { children: "Add Generated Code to Project" }) }), _jsxs("div", { className: "modal-body", children: [_jsxs("p", { children: ["Do you want to add the folder ", _jsx("strong", { children: folderName }), " to your project?"] }), _jsx("p", { className: "modal-path", children: _jsx("code", { children: folderPath }) }), _jsxs("div", { className: "modal-details", children: [_jsx("p", { children: "This will:" }), _jsxs("ul", { children: [_jsx("li", { children: "Locate existing tsconfig.json files in your project" }), _jsxs("li", { children: ["Add ", _jsx("code", { children: "@thor/*" }), " alias pointing to the generated TypeScript code"] }), _jsxs("li", { children: ["Add ", _jsx("code", { children: "@valkyr/component-library" }), " alias for components"] }), _jsx("li", { children: "Include the source folders in your TypeScript compilation" })] })] })] }), _jsxs("div", { className: "modal-footer", children: [_jsx(VSCodeButton, { appearance: "secondary", onClick: handleCancel, children: "Cancel" }), _jsx(VSCodeButton, { appearance: "primary", onClick: handleConfirm, children: "Add to Project" })] })] }) }));
};
export default AddToProjectModal;
//# sourceMappingURL=AddToProjectModal.js.map