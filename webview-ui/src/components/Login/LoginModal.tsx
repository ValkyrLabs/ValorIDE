import React from "react";
import { CloseButton, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Form from "./form";

interface LoginModalProps {
  visible: boolean;
  toggle: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, toggle }) => {
  const navigate = useNavigate();

  return (
    <Modal show={visible}>
      <Modal.Header>
        Sign into your Valkyr Labs user account
        <CloseButton onClick={() => toggle()} />
      </Modal.Header>

      <Modal.Body>
        <Form />
      </Modal.Body>
    </Modal>
  );
};

export default LoginModal;
