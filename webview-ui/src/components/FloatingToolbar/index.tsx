import { ButtonGroup, ButtonToolbar, Modal } from "react-bootstrap";

// import AreaChart from "../../../components/Charts";

import { useState } from "react";
import {
  FaBrain,
  FaCalculator,
  FaCalendar,
  FaCogs,
  FaEdit,
  FaGithubAlt,
  FaRegTrashAlt,
  FaRegWindowClose,
  FaSave,
} from "react-icons/fa";
import { DataObject } from "../../thor/model";
import CoolButton from "../CoolButton";

import ModalPicker from "../ModalPicker";
import "./index.css";

interface FloatingToolbarProps {
  data?: DataObject;
  description: string;
}

export const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  data,
  description,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const [showModal, setShowModal] = useState(true);

  const togglePicker = () => {
    setShowPicker(!showPicker);
  };
  const toggleToolbar = () => {
    setShowModal(!showModal);
  };
  return (
    <>
      <ModalPicker
        toggle={togglePicker}
        title="Select a Spec to Load"
        showModal={showPicker}
      />

      <Modal show={showModal} onHide={toggleToolbar}>
        <Modal.Header closeButton>
          <Modal.Title>{description}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <FaRegWindowClose
            className="close-button"
            size={24}
            onClick={() => toggleToolbar()}
          />
          <div className="floating-toolbar">
            <ButtonToolbar aria-label="Toolbar with button groups">
              <ButtonGroup className="me-2" aria-label="First group">
                <CoolButton onClick={() => togglePicker()} variant="dark">
                  <FaSave size={36} color="#ff9900" />
                </CoolButton>
                <CoolButton
                  onClick={() => {
                    alert("ya");
                  }}
                  variant="dark"
                >
                  <FaGithubAlt size={36} color="#ff9900" />
                </CoolButton>
                <CoolButton
                  onClick={() => {
                    alert("ya");
                  }}
                  variant="dark"
                >
                  <FaCalendar size={36} color="#ff9900" />
                </CoolButton>
              </ButtonGroup>
              <ButtonGroup className="me-2" aria-label="Second group">
                <CoolButton
                  onClick={() => {
                    alert("ya");
                  }}
                  variant="dark"
                >
                  <FaCalculator size={36} color="#ff9900" />
                </CoolButton>
                <CoolButton
                  onClick={() => {
                    alert("ya");
                  }}
                  variant="dark"
                >
                  <FaBrain size={36} color="#ff9900" />
                </CoolButton>
                <CoolButton
                  onClick={() => {
                    alert("ya");
                  }}
                  variant="dark"
                >
                  <FaEdit size={36} color="#ff9900" />
                </CoolButton>
              </ButtonGroup>
              <ButtonGroup aria-label="Third group">
                <CoolButton
                  onClick={() => {
                    alert("ya");
                  }}
                  variant="dark"
                >
                  <FaCogs size={36} color="#ff9900" />
                </CoolButton>

                <CoolButton
                  onClick={() => {
                    alert("ya");
                  }}
                  variant="dark"
                >
                  <FaRegTrashAlt size={36} color="#ff9900" />
                </CoolButton>
              </ButtonGroup>
            </ButtonToolbar>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default FloatingToolbar;
