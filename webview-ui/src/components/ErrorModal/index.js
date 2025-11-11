import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Modal, Toast } from "react-bootstrap";
import { FiAlertTriangle, FiInfo, FiCheckCircle } from "react-icons/fi";
import CoolButton from "@valkyr/component-library/CoolButton";
const pickIcon = (severity) => {
    switch (severity) {
        case "info":
            return _jsx(FiInfo, { size: 22 });
        case "success":
            return _jsx(FiCheckCircle, { size: 22 });
        case "warning":
        case "error":
        case "critical":
        case "danger":
        default:
            return _jsx(FiAlertTriangle, { size: 22 });
    }
};
const normalizeSeverity = (s) => {
    switch (s) {
        case "success":
            return "success";
        case "warning":
            return "warning";
        case "info":
            return "info";
        case "error":
        case "critical":
        case "danger":
        default:
            return "danger";
    }
};
const extractMessage = (val) => {
    if (!val)
        return "Unexpected error";
    if (typeof val === "string")
        return val;
    // RTK Query style
    if (val?.data?.message)
        return String(val.data.message);
    if (val?.error)
        return String(val.error);
    if (val?.status && val?.data)
        return `${val.status}: ${JSON.stringify(val.data)}`;
    try {
        return JSON.stringify(val);
    }
    catch {
        return String(val);
    }
};
const ErrorModal = (props) => {
    const { 
    // new props
    show = true, variant = "modal", severity = "danger", title, message, details, actions, onClose, autoHideMs = 5000, position = "top-end", 
    // back-compat
    errorMessage, callback, } = props;
    const resolvedMessage = useMemo(() => extractMessage(message ?? errorMessage), [message, errorMessage]);
    const bsVariant = normalizeSeverity(severity);
    const resolvedTitle = title ??
        (bsVariant === "danger"
            ? "Error"
            : bsVariant === "warning"
                ? "Warning"
                : "Notice");
    const handleClose = () => {
        if (onClose)
            onClose();
        else if (callback)
            callback();
    };
    // For toast auto-hide
    const [toastShow, setToastShow] = useState(show);
    useEffect(() => setToastShow(show), [show]);
    if (!show && variant !== "toast")
        return null;
    if (variant === "inline") {
        return (_jsxs(Card, { className: `mb-3 border-${bsVariant}`, "data-testid": "error-inline", children: [_jsx(Card.Header, { className: `text-${bsVariant}`, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [pickIcon(severity), _jsx("strong", { children: resolvedTitle })] }) }), _jsxs(Card.Body, { children: [_jsx("div", { style: { whiteSpace: "pre-wrap" }, children: resolvedMessage }), details && (_jsx(Alert, { variant: "light", className: "mt-2", children: _jsx("code", { children: typeof details === "string"
                                    ? details
                                    : JSON.stringify(details, null, 2) }) })), (actions?.length || callback || onClose) && (_jsxs("div", { className: "mt-2", style: { display: "flex", gap: 8 }, children: [actions?.map((a, idx) => (_jsx(CoolButton, { variant: a.variant || "outline-secondary", onClick: a.onClick, children: a.label }, idx))), (callback || onClose) && (_jsx(CoolButton, { variant: "secondary", onClick: handleClose, children: "Close" }))] }))] })] }));
    }
    if (variant === "toast") {
        const posToStyle = {
            "top-start": { position: "fixed", top: 16, left: 16, zIndex: 1060 },
            "top-end": { position: "fixed", top: 16, right: 16, zIndex: 1060 },
            "bottom-start": { position: "fixed", bottom: 16, left: 16, zIndex: 1060 },
            "bottom-end": { position: "fixed", bottom: 16, right: 16, zIndex: 1060 },
        };
        return (_jsx("div", { style: posToStyle[position], "data-testid": "error-toast", children: _jsxs(Toast, { bg: bsVariant === "danger" ? "danger" : bsVariant, onClose: () => {
                    setToastShow(false);
                    handleClose();
                }, show: toastShow, delay: autoHideMs, autohide: true, children: [_jsx(Toast.Header, { closeButton: true, children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [pickIcon(severity), _jsx("strong", { className: "me-auto", children: resolvedTitle })] }) }), _jsx(Toast.Body, { children: _jsx("div", { style: { whiteSpace: "pre-wrap" }, children: resolvedMessage }) })] }) }));
    }
    // default: modal
    return (_jsxs(Modal, { show: show, className: "errorDialog", title: resolvedTitle, size: "sm", "aria-labelledby": "contained-modal-title-vcenter", centered: true, onHide: handleClose, "data-testid": "error-modal", children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { id: "contained-modal-title-vcenter", children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [pickIcon(severity), " ", resolvedTitle] }) }) }), _jsxs(Modal.Body, { className: "errorDialogMessage", children: [_jsx(Alert, { variant: bsVariant, className: "mb-0", children: _jsx("div", { style: { whiteSpace: "pre-wrap" }, children: resolvedMessage }) }), details && (_jsx(Alert, { variant: "light", className: "mt-2", children: _jsx("code", { children: typeof details === "string"
                                ? details
                                : JSON.stringify(details, null, 2) }) }))] }), _jsxs(Modal.Footer, { children: [actions?.map((a, idx) => (_jsx(CoolButton, { variant: a.variant || "secondary", onClick: a.onClick, children: a.label }, idx))), _jsx(CoolButton, { variant: "info", onClick: handleClose, children: "Ok" })] })] }));
};
export default ErrorModal;
//# sourceMappingURL=index.js.map