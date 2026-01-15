import React from "react";
import { CloseButton, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Form from "./form";
import { AuroraModal } from "../../utils/auroraDesignSystem";

interface LoginModalProps {
  visible: boolean;
  toggle: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, toggle }) => {
  const navigate = useNavigate();

  return (
    <Modal
      show={visible}
      dialogClassName="aurora-modal"
      style={{ background: AuroraModal.overlayBackground }}
    >
      <Modal.Header
        style={{
          background: AuroraModal.background,
          borderBottom: AuroraModal.border,
        }}
      >
        Sign into your Valkyr Labs user account
        <CloseButton onClick={() => toggle()} />
      </Modal.Header>

      <Modal.Body style={{ background: AuroraModal.background }}>
        <Form />
      </Modal.Body>
    </Modal>
  );
};

export default LoginModal;
