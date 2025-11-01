import React, { useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

interface MarkdownEditorModalProps {
  show?: boolean;
  title?: string;
  initialValue?: string;
  onCancel?: () => void;
  onSave?: (content: string) => Promise<void> | void;
}

const MarkdownEditorModal: React.FC<MarkdownEditorModalProps> = ({
  show = false,
  title = 'Edit Markdown',
  initialValue = '',
  onCancel,
  onSave,
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(content);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onCancel} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Markdown Content</Form.Label>
          <Form.Control
            as="textarea"
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter markdown content..."
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MarkdownEditorModal;