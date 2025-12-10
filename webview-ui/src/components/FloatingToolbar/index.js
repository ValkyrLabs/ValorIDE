import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { ButtonGroup, ButtonToolbar, Modal } from "react-bootstrap";
// import AreaChart from "../../../components/Charts";
import { useState } from "react";
import { FaBrain, FaCalculator, FaCalendar, FaCogs, FaEdit, FaGithubAlt, FaRegTrashAlt, FaRegWindowClose, FaSave, } from "react-icons/fa";
import CoolButton from "../CoolButton";
import ModalPicker from "../ModalPicker";
import "./index.css";
export const FloatingToolbar = ({ data, description, }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [showModal, setShowModal] = useState(true);
    const togglePicker = () => {
        setShowPicker(!showPicker);
    };
    const toggleToolbar = () => {
        setShowModal(!showModal);
    };
    return (_jsxs(_Fragment, { children: [_jsx(ModalPicker, { toggle: togglePicker, title: "Select a Spec to Load", showModal: showPicker }), _jsxs(Modal, { show: showModal, onHide: toggleToolbar, children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: description }) }), _jsxs(Modal.Body, { children: [_jsx(FaRegWindowClose, { className: "close-button", size: 24, onClick: () => toggleToolbar() }), _jsx("div", { className: "floating-toolbar", children: _jsxs(ButtonToolbar, { "aria-label": "Toolbar with button groups", children: [_jsxs(ButtonGroup, { className: "me-2", "aria-label": "First group", children: [_jsx(CoolButton, { onClick: () => togglePicker(), variant: "dark", children: _jsx(FaSave, { size: 36, color: "#ff9900" }) }), _jsx(CoolButton, { onClick: () => {
                                                        alert("ya");
                                                    }, variant: "dark", children: _jsx(FaGithubAlt, { size: 36, color: "#ff9900" }) }), _jsx(CoolButton, { onClick: () => {
                                                        alert("ya");
                                                    }, variant: "dark", children: _jsx(FaCalendar, { size: 36, color: "#ff9900" }) })] }), _jsxs(ButtonGroup, { className: "me-2", "aria-label": "Second group", children: [_jsx(CoolButton, { onClick: () => {
                                                        alert("ya");
                                                    }, variant: "dark", children: _jsx(FaCalculator, { size: 36, color: "#ff9900" }) }), _jsx(CoolButton, { onClick: () => {
                                                        alert("ya");
                                                    }, variant: "dark", children: _jsx(FaBrain, { size: 36, color: "#ff9900" }) }), _jsx(CoolButton, { onClick: () => {
                                                        alert("ya");
                                                    }, variant: "dark", children: _jsx(FaEdit, { size: 36, color: "#ff9900" }) })] }), _jsxs(ButtonGroup, { "aria-label": "Third group", children: [_jsx(CoolButton, { onClick: () => {
                                                        alert("ya");
                                                    }, variant: "dark", children: _jsx(FaCogs, { size: 36, color: "#ff9900" }) }), _jsx(CoolButton, { onClick: () => {
                                                        alert("ya");
                                                    }, variant: "dark", children: _jsx(FaRegTrashAlt, { size: 36, color: "#ff9900" }) })] })] }) })] })] })] }));
};
export default FloatingToolbar;
//# sourceMappingURL=index.js.map