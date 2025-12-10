import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Modal from "react-bootstrap/Modal";
import CoolButton from "../CoolButton";
import "./index.css";
const ModalPicker = ({ title, toggle, showModal }) => {
    return (_jsxs(Modal, { show: showModal, backdrop: "static", keyboard: false, children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: title }) }), _jsx(Modal.Body, { children: "Select from the following items:" }), _jsx("div", { className: "grid-container{" }), _jsxs(Modal.Footer, { children: [_jsx(CoolButton, { variant: "primary", onClick: () => {
                            toggle();
                        }, children: "Cancel" }), _jsx(CoolButton, { variant: "secondary", onClick: () => {
                            toggle();
                        }, children: "Select" })] })] }));
};
export default ModalPicker;
//# sourceMappingURL=index.js.map