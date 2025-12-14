import React, { useState, useRef } from "react";
import { Modal, Form, Button } from "react-bootstrap";

interface MarkdownEditorModalProps {
  show?: boolean;
  title?: string;
  initialValue?: string;
  onCancel?: () => void;
  onSave?: (content: string) => Promise<void> | void;
}

const MarkdownEditorModal: React.FC<MarkdownEditorModalProps> = ({
  show = false,
  title = "Edit Markdown",
  initialValue = "",
  onCancel,
  onSave,
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave?.(content);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const dataUrl = event.target.result as string;
            const imageName = file.name.replace(/\.[^.]+$/, "");
            const markdownImage = `![${imageName}](${dataUrl})`;
            const textarea = textareaRef.current;
            if (textarea) {
              const start = textarea.selectionStart;
              const end = textarea.selectionEnd;
              const newContent = content.substring(0, start) + markdownImage + content.substring(end);
              setContent(newContent);
            } else {
              setContent((prev) => prev + markdownImage);
            }
          }
        };
        reader.readAsDataURL(file);
      }
    });
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
            ref={textareaRef as any}
            as="textarea"
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            placeholder="Enter markdown content... (drag & drop images here)"
            style={{
              backgroundColor: isDragOver ? "var(--vscode-editor-hoverHighlightBackground)" : undefined,
              transition: "background-color 0.2s ease",
            }}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MarkdownEditorModal;
