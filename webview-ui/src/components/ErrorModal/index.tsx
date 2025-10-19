import React, { useEffect, useMemo, useState } from "react";
import { Alert, Card, Modal, Toast } from "react-bootstrap";
import { FiAlertTriangle, FiInfo, FiCheckCircle } from "react-icons/fi";
import CoolButton from "@valkyr/component-library/CoolButton";

type Severity =
  | "info"
  | "warning"
  | "danger"
  | "success"
  | "error"
  | "critical";
type Variant = "modal" | "toast" | "inline";

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: string;
}

interface EnhancedErrorModalProps {
  // New props
  show?: boolean;
  variant?: Variant; // modal | toast | inline
  severity?: Severity; // maps to bootstrap variants
  title?: string;
  message?: any;
  details?: any;
  actions?: ActionButton[];
  onClose?: () => void;
  autoHideMs?: number; // for toasts
  position?: "top-start" | "top-end" | "bottom-start" | "bottom-end";
  // Back-compat props
  errorMessage?: any;
  callback?: any;
}

const pickIcon = (severity: Severity) => {
  switch (severity) {
    case "info":
      return <FiInfo size={22} />;
    case "success":
      return <FiCheckCircle size={22} />;
    case "warning":
    case "error":
    case "critical":
    case "danger":
    default:
      return <FiAlertTriangle size={22} />;
  }
};

const normalizeSeverity = (
  s?: Severity,
): "primary" | "success" | "warning" | "danger" | "info" => {
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

const extractMessage = (val: any): string => {
  if (!val) return "Unexpected error";
  if (typeof val === "string") return val;
  // RTK Query style
  if (val?.data?.message) return String(val.data.message);
  if (val?.error) return String(val.error);
  if (val?.status && val?.data)
    return `${val.status}: ${JSON.stringify(val.data)}`;
  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
};

const ErrorModal: React.FC<EnhancedErrorModalProps> = (props) => {
  const {
    // new props
    show = true,
    variant = "modal",
    severity = "danger",
    title,
    message,
    details,
    actions,
    onClose,
    autoHideMs = 5000,
    position = "top-end",
    // back-compat
    errorMessage,
    callback,
  } = props;

  const resolvedMessage = useMemo(
    () => extractMessage(message ?? errorMessage),
    [message, errorMessage],
  );
  const bsVariant = normalizeSeverity(severity);
  const resolvedTitle =
    title ??
    (bsVariant === "danger"
      ? "Error"
      : bsVariant === "warning"
        ? "Warning"
        : "Notice");
  const handleClose = () => {
    if (onClose) onClose();
    else if (callback) callback();
  };

  // For toast auto-hide
  const [toastShow, setToastShow] = useState(show);
  useEffect(() => setToastShow(show), [show]);

  if (!show && variant !== "toast") return null;

  if (variant === "inline") {
    return (
      <Card className={`mb-3 border-${bsVariant}`} data-testid="error-inline">
        <Card.Header className={`text-${bsVariant}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {pickIcon(severity)}
            <strong>{resolvedTitle}</strong>
          </div>
        </Card.Header>
        <Card.Body>
          <div style={{ whiteSpace: "pre-wrap" }}>{resolvedMessage}</div>
          {details && (
            <Alert variant="light" className="mt-2">
              <code>
                {typeof details === "string"
                  ? details
                  : JSON.stringify(details, null, 2)}
              </code>
            </Alert>
          )}
          {(actions?.length || callback || onClose) && (
            <div className="mt-2" style={{ display: "flex", gap: 8 }}>
              {actions?.map((a, idx) => (
                <CoolButton
                  key={idx}
                  variant={a.variant || "outline-secondary"}
                  onClick={a.onClick}
                >
                  {a.label}
                </CoolButton>
              ))}
              {(callback || onClose) && (
                <CoolButton variant="secondary" onClick={handleClose}>
                  Close
                </CoolButton>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  }

  if (variant === "toast") {
    const posToStyle: Record<string, React.CSSProperties> = {
      "top-start": { position: "fixed", top: 16, left: 16, zIndex: 1060 },
      "top-end": { position: "fixed", top: 16, right: 16, zIndex: 1060 },
      "bottom-start": { position: "fixed", bottom: 16, left: 16, zIndex: 1060 },
      "bottom-end": { position: "fixed", bottom: 16, right: 16, zIndex: 1060 },
    };
    return (
      <div style={posToStyle[position]} data-testid="error-toast">
        <Toast
          bg={bsVariant === "danger" ? "danger" : bsVariant}
          onClose={() => {
            setToastShow(false);
            handleClose();
          }}
          show={toastShow}
          delay={autoHideMs}
          autohide
        >
          <Toast.Header closeButton>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {pickIcon(severity)}
              <strong className="me-auto">{resolvedTitle}</strong>
            </div>
          </Toast.Header>
          <Toast.Body>
            <div style={{ whiteSpace: "pre-wrap" }}>{resolvedMessage}</div>
          </Toast.Body>
        </Toast>
      </div>
    );
  }

  // default: modal
  return (
    <Modal
      show={show}
      className={"errorDialog"}
      title={resolvedTitle}
      size="sm"
      aria-labelledby="contained-modal-title-vcenter"
      centered
      onHide={handleClose}
      data-testid="error-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {pickIcon(severity)} {resolvedTitle}
          </div>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className={"errorDialogMessage"}>
        <Alert variant={bsVariant} className="mb-0">
          <div style={{ whiteSpace: "pre-wrap" }}>{resolvedMessage}</div>
        </Alert>
        {details && (
          <Alert variant="light" className="mt-2">
            <code>
              {typeof details === "string"
                ? details
                : JSON.stringify(details, null, 2)}
            </code>
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        {actions?.map((a, idx) => (
          <CoolButton
            key={idx}
            variant={a.variant || "secondary"}
            onClick={a.onClick}
          >
            {a.label}
          </CoolButton>
        ))}
        <CoolButton variant={"info"} onClick={handleClose}>
          Ok
        </CoolButton>
      </Modal.Footer>
    </Modal>
  );
};

export default ErrorModal;
