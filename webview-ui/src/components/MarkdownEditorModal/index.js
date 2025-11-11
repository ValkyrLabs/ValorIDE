import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
const MarkdownEditorModal = ({ show = false, title = 'Edit Markdown', initialValue = '', onCancel, onSave, }) => {
    const [content, setContent] = useState(initialValue);
    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave?.(content);
        }
        finally {
            setIsSaving(false);
        }
    };
    return (_jsxs(Modal, { show: show, onHide: onCancel, centered: true, size: "lg", children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: title }) }), _jsx(Modal.Body, { children: _jsxs(Form.Group, { children: [_jsx(Form.Label, { children: "Markdown Content" }), _jsx(Form.Control, { as: "textarea", rows: 12, value: content, onChange: (e) => setContent(e.target.value), placeholder: "Enter markdown content..." })] }) }), _jsxs(Modal.Footer, { children: [_jsx(Button, { variant: "secondary", onClick: onCancel, disabled: isSaving, children: "Cancel" }), _jsx(Button, { variant: "primary", onClick: handleSave, disabled: isSaving, children: isSaving ? 'Saving...' : 'Save' })] })] }));
};
export default MarkdownEditorModal;
//# sourceMappingURL=index.js.map