import React, { useEffect, useState } from "react";
import {
  Badge,
  Col,
  Form,
  Modal,
  OverlayTrigger,
  Row,
  Tooltip,
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  FaArrowCircleLeft,
  FaBan,
  FaBoxOpen,
  FaCalendar,
  FaCheck,
  FaFont,
  FaHashtag,
  FaInfoCircle,
  FaListUl,
  FaMinus,
  FaPlus,
  FaRegSave,
} from "react-icons/fa";
import CoolButton from "../CoolButton";

interface ObjectTreeViewProps {
  data: any;
  editable?: boolean;
  onChange?: (updatedData: any) => void;
  collapsedByDefault?: boolean;
  topSchemaName?: string;
}

const ObjectTreeView: React.FC<ObjectTreeViewProps> = ({
  data,
  editable = true,
  onChange,
  collapsedByDefault = true,
  topSchemaName = "Workflow",
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [currentData, setCurrentData] = useState<any>(data);
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [modalValue, setModalValue] = useState<any>(null);
  const [modalDetails, setModalDetails] = useState<any>(null);

  const [hideExtraFields, setHideExtraFields] = useState(true);

  useEffect(() => {
    const fetchOpenApiSpec = async () => {
      try {
        const response = await fetch("http://localhost:8080/v1/api-docs");
        const spec = await response.json();
        setOpenApiSpec(spec);
      } catch (error) {
        console.error("Error fetching OpenAPI spec:", error);
      }
    };
    fetchOpenApiSpec();
  }, []);

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getSchemaForKey = (key: string): any => {
    if (!openApiSpec) return null;
    const paths = openApiSpec.components?.schemas || {};
    const schema = paths[topSchemaName]?.properties?.[key];
    return schema || null;
  };

  const getFieldTypeAndDetails = (key: string) => {
    const schema = getSchemaForKey(key);
    if (!schema) {
      return { type: null, details: {} };
    }
    return {
      type: schema.type || null,
      details: schema,
    };
  };

  const inferTypeFromValue = (value: any): string => {
    if (Array.isArray(value)) return "array";
    if (value === null) return "null";
    const t = typeof value;
    if (t === "number" || t === "bigint") return "number";
    if (t === "string") return "string";
    if (t === "boolean") return "boolean";
    if (t === "object") return "object";
    return "string"; // fallback
  };

  const isDateField = (details: any): boolean => {
    const fmt = details.format || "";
    return fmt.includes("date");
  };

  const formatDateValue = (value: any): string => {
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return String(value);
    }
    return d.toISOString();
  };

  const fieldsToHide = [
    "lastModifiedDate",
    "lastModifiedById",
    "workflowStateId",
  ];

  const openEditModal = (key: string, value: any) => {
    if (!editable) return;
    const lastSegment = key.split(".").pop() || key;
    const { type, details } = getFieldTypeAndDetails(lastSegment);
    const finalType = type || inferTypeFromValue(value);

    setModalKey(key);
    setModalValue(value);
    setModalDetails({
      type: finalType,
      description: details.description || "",
      secure: details.secureField || false,
      enum: details.enum || null,
      pattern: details.pattern || null,
      format: details.format || null,
    });
    setShowModal(true);
  };

  const saveModalValue = () => {
    if (!modalKey) return;
    const updatedData = { ...currentData };
    const keys = modalKey.split(".");
    let ref = updatedData;
    for (let i = 0; i < keys.length - 1; i++) {
      ref = ref[keys[i]];
    }
    ref[keys[keys.length - 1]] = modalValue;
    setCurrentData(updatedData);
    setShowModal(false);

    if (onChange) {
      onChange(updatedData);
    }
  };

  const renderEditableModalField = (type: string) => {
    const isDate = type === "date" || modalDetails?.format?.includes("date");

    if (modalDetails?.enum) {
      return (
        <Form.Select
          value={modalValue || ""}
          onChange={(e) => setModalValue(e.target.value)}
        >
          <option value="">Select...</option>
          {modalDetails.enum.map((option: string) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Form.Select>
      );
    }

    if (isDate) {
      const dateVal = modalValue ? new Date(modalValue) : new Date();
      return (
        <DatePicker
          selected={!isNaN(dateVal.getTime()) ? dateVal : new Date()}
          onChange={(date: Date) => setModalValue(date.toISOString())}
          className="form-control"
        />
      );
    }

    return (
      <Form.Control
        type={type === "number" ? "number" : "text"}
        value={modalValue ?? ""}
        onChange={(e) => setModalValue(e.target.value)}
        placeholder={
          modalDetails?.pattern ? `Pattern: ${modalDetails.pattern}` : ""
        }
      />
    );
  };

  const renderFieldTooltip = (key: string, type: string, details: any) => (
    <Tooltip>
      <h5>
        {details.description && (
          <>
            <h5>Description:</h5> {details.description}
            <br />
          </>
        )}
        <h5>Type:</h5> {type}
        <br />
        {details.pattern && (
          <>
            <h5>Pattern:</h5> {details.pattern}
            <br />
          </>
        )}
        {details.secureField && (
          <>
            <h5>Secure Field</h5>
            <br />
          </>
        )}
        {details.enum && (
          <>
            <h5>Enum:</h5> {details.enum.join(", ")}
            <br />
          </>
        )}
      </h5>
    </Tooltip>
  );

  const getTypeIcon = (type: string | null, details: any) => {
    if (type === "string" && isDateField(details)) {
      return <FaCalendar />;
    }

    switch (type) {
      case "number":
      case "integer":
        return <FaHashtag />;
      case "string":
        return <FaFont />;
      case "boolean":
        return <FaCheck />;
      case "array":
        return <FaListUl />;
      case "object":
        return <FaBoxOpen />;
      case "null":
        return <FaBan />;
      case "date":
        return <FaCalendar />;
      default:
        return <FaFont />; // fallback
    }
  };

  const renderProperty = (
    keyName: string,
    fullKey: string,
    value: any,
    canCollapse: boolean,
    isCollapsed: boolean,
    inferredType: string,
    details: any,
    tooltip: React.ReactElement,
  ): React.ReactElement => {
    const isDate =
      (inferredType === "string" && isDateField(details)) ||
      inferredType === "date";
    let displayValue = value;
    if (isDate && value) {
      displayValue = formatDateValue(value);
    }

    return (
      <Row
        key={fullKey}
        style={{ marginLeft: "-5em" }}
        className="objectTreePropertyRow"
      >
        {/* Info icon + Name */}
        <Col md={5} style={{ whiteSpace: "nowrap" }}>
          <h5 style={{ float: "right" }}>{keyName} :</h5>
        </Col>

        {/* Value or Nested */}
        <Col md={5}>
          {canCollapse && (
            <CoolButton variant="info" onClick={() => toggleCollapse(fullKey)}>
              {isCollapsed ? (
                <FaPlus color="#222" size="18" />
              ) : (
                <FaMinus color="#000" size="18" />
              )}
            </CoolButton>
          )}
          {canCollapse ? (
            !isCollapsed && (
              <div
                style={{
                  paddingTop: "10px",
                  margin: "0px",
                  paddingLeft: "-1em",
                }}
              >
                {renderChildren(value, fullKey)}
              </div>
            )
          ) : (
            <span
              style={{ cursor: editable ? "pointer" : "default" }}
              onClick={() => editable && openEditModal(fullKey, value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && editable) {
                  openEditModal(fullKey, value);
                }
              }}
            >
              {displayValue === null
                ? "null"
                : displayValue === undefined
                  ? "undefined"
                  : String(displayValue)}
            </span>
          )}
        </Col>

        {/* Type Icon */}
        <Col md={1}>
          <Badge bg={canCollapse ? "info" : "primary"}>
            {getTypeIcon(isDate ? "date" : inferredType, details)}
          </Badge>
        </Col>
        <Col md={1}>
          <OverlayTrigger placement="top" overlay={(props) => React.cloneElement(tooltip, props)}>
            <span style={{ cursor: "help", marginRight: "5px" }}>
              <FaInfoCircle color="#777" size={20} />
            </span>
          </OverlayTrigger>
        </Col>
      </Row>
    );
  };

  const renderChildren = (node: any, parentKey: string): React.ReactElement[] => {
    const entries = Object.entries(node).filter(([k]) => {
      return !(hideExtraFields && fieldsToHide.includes(k));
    });

    return entries.map(([key, value]) => {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      const { type, details } = getFieldTypeAndDetails(key);
      const inferredType =
        type || (Array.isArray(value) ? "array" : inferTypeFromValue(value));
      const isValObject =
        value && typeof value === "object" && !Array.isArray(value);
      const isValArray = Array.isArray(value);
      const canCollapse = isValObject || isValArray;
      const isCollapsed = collapsed[fullKey] ?? collapsedByDefault;
      const tooltip = renderFieldTooltip(key, inferredType, details);

      return renderProperty(
        key,
        fullKey,
        value,
        canCollapse,
        isCollapsed,
        inferredType,
        details,
        tooltip,
      );
    });
  };

  const renderRoot = () => {
    if (
      currentData === null ||
      currentData === undefined ||
      typeof currentData !== "object"
    ) {
      // Root is a primitive
      const keyName = "root";
      const { type, details } = getFieldTypeAndDetails(keyName);
      const inferredType = type || inferTypeFromValue(currentData);
      const tooltip = renderFieldTooltip(keyName, inferredType, details);
      return (
        <ul>
          {renderProperty(
            keyName,
            keyName,
            currentData,
            false,
            false,
            inferredType,
            details,
            tooltip,
          )}
        </ul>
      );
    }

    const entries = Object.entries(currentData).filter(([k]) => {
      return !(hideExtraFields && fieldsToHide.includes(k));
    });

    return (
      <ul style={{ paddingLeft: "0" }}>
        {entries.map(([key, value]) => {
          const fullKey = key;
          const { type, details } = getFieldTypeAndDetails(key);
          const inferredType =
            type ||
            (Array.isArray(value) ? "array" : inferTypeFromValue(value));
          const isValObject =
            value && typeof value === "object" && !Array.isArray(value);
          const isValArray = Array.isArray(value);
          const canCollapse = isValObject || isValArray;
          const isCollapsed = collapsed[fullKey] ?? collapsedByDefault;
          const tooltip = renderFieldTooltip(key, inferredType, details);

          return renderProperty(
            key,
            fullKey,
            value,
            canCollapse,
            isCollapsed,
            inferredType,
            details,
            tooltip,
          );
        })}
      </ul>
    );
  };

  return (
    <div className="text-light">
      <div
        className="mb-2 d-flex align-items-center justify-content-between"
        style={{ overflow: "hidden" }}
      >
        <Badge bg={openApiSpec ? "success" : "warning"}>
          {openApiSpec ? "THORAPI SPEC FOUND" : "UNKNOWN OBJECT TYPE"}
        </Badge>
        <Form.Check
          type="checkbox"
          id="toggle-extra-fields"
          label="Hide Last Modified Fields"
          className="ms-3 text-light"
          checked={hideExtraFields}
          onChange={(e) => setHideExtraFields(e.target.checked)}
        />
      </div>
      {renderRoot()}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header
          closeButton
          className="text-light"
          style={{ backgroundColor: "#333" }}
        >
          <Modal.Title className="text-light">Editing: {modalKey}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: "#222" }}>
          {(modalDetails?.description ||
            modalDetails?.pattern ||
            modalDetails?.secure ||
            modalDetails?.enum ||
            modalDetails?.type) && (
            <Form.Group className="mb-3">
              {modalDetails?.description && (
                <>
                  <Form.Label className="text-light">
                    <h5>Description</h5>
                  </Form.Label>
                  <Form.Text className="d-block text-light">
                    {modalDetails.description}
                  </Form.Text>
                  <br />
                </>
              )}
              {modalDetails?.type && (
                <>
                  <h5>Type:</h5> {modalDetails.type}
                  <br />
                </>
              )}
              {modalDetails?.pattern && (
                <>
                  <h5>Pattern:</h5> {modalDetails.pattern}
                  <br />
                </>
              )}
              {modalDetails?.secure && (
                <>
                  <h5>Secure Field</h5>
                  <br />
                </>
              )}
              {modalDetails?.enum && (
                <>
                  <h5>Enum:</h5> {modalDetails.enum.join(", ")}
                  <br />
                </>
              )}
            </Form.Group>
          )}
          <Form.Group>
            <Form.Label className="text-light">Value</Form.Label>
            {renderEditableModalField(modalDetails?.type || "string")}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer style={{ backgroundColor: "#333" }}>
          <CoolButton variant="secondary" onClick={() => setShowModal(false)}>
            <FaArrowCircleLeft size={24} className="me-1" /> Cancel
          </CoolButton>
          <CoolButton variant="primary" onClick={saveModalValue}>
            <FaRegSave size={24} className="me-1" /> Save
          </CoolButton>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ObjectTreeView;
