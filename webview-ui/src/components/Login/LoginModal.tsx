import React, { useState } from "react";
import { CloseButton, Modal } from "react-bootstrap";
import Form from "./form";
import "./index.css";
import { useLoginUserMutation } from "../../redux/services/AuthService";
import { Login } from "@thor/model";

interface LoginModalProps {
  visible: boolean;
  toggle: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ visible, toggle }) => {
  const [loginUser] = useLoginUserMutation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleSubmit = async (values: Login) => {
    try {
      const result = await loginUser(values).unwrap();
      if (result && result.token) {
        localStorage.setItem("authToken", result.token);
        localStorage.setItem("authenticatedUser", JSON.stringify(result.user || {}));
        setIsLoggedIn(true);
        // Hide the modal after successful login
        try { toggle(); } catch {}
      } else {
        alert("Login succeeded but no token returned.");
      }
    } catch (error) {
      // Error handled by Formik and RTK Query
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authenticatedUser");
    setIsLoggedIn(false);
  };

  return (
    <Modal show={visible}>
      <Modal.Header>
        Sign into your Valkyr Labs user account
        <CloseButton onClick={toggle} />
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit} isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      </Modal.Body>
    </Modal>
  );
};

export default LoginModal;
