import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CloseButton, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Form from "./form";
const LoginModal = ({ visible, toggle }) => {
    const navigate = useNavigate();
    return (_jsxs(Modal, { show: visible, children: [_jsxs(Modal.Header, { children: ["Sign into your Valkyr Labs user account", _jsx(CloseButton, { onClick: () => toggle() })] }), _jsx(Modal.Body, { children: _jsx(Form, {}) })] }));
};
export default LoginModal;
//# sourceMappingURL=LoginModal.js.map