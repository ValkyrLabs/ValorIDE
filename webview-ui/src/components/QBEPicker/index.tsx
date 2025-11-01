stop
import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

interface QBEPickerProps {
  show?: boolean;
  refType?: string;
  onCancel?: () => void;
  onPick?: (value: any) => void;
}

const QBEPicker: React.FC<QBEPickerProps> = ({ show = false, refType, onCancel, onPick }) => {
  const [selectedValue, setSelectedValue] = React.useState<any>(null);

  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>Select {refType || 'Item'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group>
          <Form.Label>Search & Select</Form.Label>
          <Form.Control
            placeholder={`Search ${refType || 'items'}...`}
            onChange={(e) => setSelectedValue(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={() => onPick?.(selectedValue)}>
          Select
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QBEPicker;