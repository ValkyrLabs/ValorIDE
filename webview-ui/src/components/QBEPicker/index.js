import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
stop;
import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
const QBEPicker = ({ show = false, refType, onCancel, onPick }) => {
    const [selectedValue, setSelectedValue] = React.useState(null);
    return (_jsxs(Modal, { show: show, onHide: onCancel, centered: true, children: [_jsx(Modal.Header, { closeButton: true, children: _jsxs(Modal.Title, { children: ["Select ", refType || 'Item'] }) }), _jsx(Modal.Body, { children: _jsxs(Form.Group, { children: [_jsx(Form.Label, { children: "Search & Select" }), _jsx(Form.Control, { placeholder: `Search ${refType || 'items'}...`, onChange: (e) => setSelectedValue(e.target.value) })] }) }), _jsxs(Modal.Footer, { children: [_jsx(Button, { variant: "secondary", onClick: onCancel, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: () => onPick?.(selectedValue), children: "Select" })] })] }));
};
export default QBEPicker;
//# sourceMappingURL=index.js.map