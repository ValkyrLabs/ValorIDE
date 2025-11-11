import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Badge, Col, Form, Modal, OverlayTrigger, Row, Tooltip, } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaArrowCircleLeft, FaBan, FaBoxOpen, FaCalendar, FaCheck, FaFont, FaHashtag, FaInfoCircle, FaListUl, FaMinus, FaPlus, FaRegSave, } from "react-icons/fa";
import CoolButton from "../CoolButton";
const ObjectTreeView = ({ data, editable = true, onChange, collapsedByDefault = true, topSchemaName = "Workflow", }) => {
    const [collapsed, setCollapsed] = useState({});
    const [currentData, setCurrentData] = useState(data);
    const [openApiSpec, setOpenApiSpec] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalKey, setModalKey] = useState(null);
    const [modalValue, setModalValue] = useState(null);
    const [modalDetails, setModalDetails] = useState(null);
    const [hideExtraFields, setHideExtraFields] = useState(true);
    useEffect(() => {
        const fetchOpenApiSpec = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_basePath || "http://localhost:8080/v1"}/api-docs`);
                const spec = await response.json();
                setOpenApiSpec(spec);
            }
            catch (error) {
                console.error("Error fetching OpenAPI spec:", error);
            }
        };
        fetchOpenApiSpec();
    }, []);
    const toggleCollapse = (key) => {
        setCollapsed((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };
    const getSchemaForKey = (key) => {
        if (!openApiSpec)
            return null;
        const paths = openApiSpec.components?.schemas || {};
        const schema = paths[topSchemaName]?.properties?.[key];
        return schema || null;
    };
    const getFieldTypeAndDetails = (key) => {
        const schema = getSchemaForKey(key);
        if (!schema) {
            return { type: null, details: {} };
        }
        return {
            type: schema.type || null,
            details: schema,
        };
    };
    const inferTypeFromValue = (value) => {
        if (Array.isArray(value))
            return "array";
        if (value === null)
            return "null";
        const t = typeof value;
        if (t === "number" || t === "bigint")
            return "number";
        if (t === "string")
            return "string";
        if (t === "boolean")
            return "boolean";
        if (t === "object")
            return "object";
        return "string"; // fallback
    };
    const isDateField = (details) => {
        const fmt = details.format || "";
        return fmt.includes("date");
    };
    const formatDateValue = (value) => {
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
    const openEditModal = (key, value) => {
        if (!editable)
            return;
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
        if (!modalKey)
            return;
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
    const renderEditableModalField = (type) => {
        const isDate = type === "date" || modalDetails?.format?.includes("date");
        if (modalDetails?.enum) {
            return (_jsxs(Form.Select, { value: modalValue || "", onChange: (e) => setModalValue(e.target.value), children: [_jsx("option", { value: "", children: "Select..." }), modalDetails.enum.map((option) => (_jsx("option", { value: option, children: option }, option)))] }));
        }
        if (isDate) {
            const dateVal = modalValue ? new Date(modalValue) : new Date();
            return (_jsx(DatePicker, { selected: !isNaN(dateVal.getTime()) ? dateVal : new Date(), onChange: (date) => setModalValue(date.toISOString()), className: "form-control" }));
        }
        return (_jsx(Form.Control, { type: type === "number" ? "number" : "text", value: modalValue ?? "", onChange: (e) => setModalValue(e.target.value), placeholder: modalDetails?.pattern ? `Pattern: ${modalDetails.pattern}` : "" }));
    };
    const renderFieldTooltip = (key, type, details) => (_jsx(Tooltip, { children: _jsxs("h5", { children: [details.description && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Description:" }), " ", details.description, _jsx("br", {})] })), _jsx("h5", { children: "Type:" }), " ", type, _jsx("br", {}), details.pattern && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Pattern:" }), " ", details.pattern, _jsx("br", {})] })), details.secureField && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Secure Field" }), _jsx("br", {})] })), details.enum && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Enum:" }), " ", details.enum.join(", "), _jsx("br", {})] }))] }) }));
    const getTypeIcon = (type, details) => {
        if (type === "string" && isDateField(details)) {
            return _jsx(FaCalendar, {});
        }
        switch (type) {
            case "number":
            case "integer":
                return _jsx(FaHashtag, {});
            case "string":
                return _jsx(FaFont, {});
            case "boolean":
                return _jsx(FaCheck, {});
            case "array":
                return _jsx(FaListUl, {});
            case "object":
                return _jsx(FaBoxOpen, {});
            case "null":
                return _jsx(FaBan, {});
            case "date":
                return _jsx(FaCalendar, {});
            default:
                return _jsx(FaFont, {}); // fallback
        }
    };
    const renderProperty = (keyName, fullKey, value, canCollapse, isCollapsed, inferredType, details, tooltip) => {
        const isDate = (inferredType === "string" && isDateField(details)) ||
            inferredType === "date";
        let displayValue = value;
        if (isDate && value) {
            displayValue = formatDateValue(value);
        }
        return (_jsxs(Row, { style: { marginLeft: "-5em" }, className: "objectTreePropertyRow", children: [_jsx(Col, { md: 5, style: { whiteSpace: "nowrap" }, children: _jsxs("h5", { style: { float: "right" }, children: [keyName, " :"] }) }), _jsxs(Col, { md: 5, children: [canCollapse && (_jsx(CoolButton, { variant: "info", onClick: () => toggleCollapse(fullKey), children: isCollapsed ? (_jsx(FaPlus, { color: "#222", size: "18" })) : (_jsx(FaMinus, { color: "#000", size: "18" })) })), canCollapse ? (!isCollapsed && (_jsx("div", { style: {
                                paddingTop: "10px",
                                margin: "0px",
                                paddingLeft: "-1em",
                            }, children: renderChildren(value, fullKey) }))) : (_jsx("span", { style: { cursor: editable ? "pointer" : "default" }, onClick: () => editable && openEditModal(fullKey, value), onKeyDown: (e) => {
                                if ((e.key === "Enter" || e.key === " ") && editable) {
                                    openEditModal(fullKey, value);
                                }
                            }, children: displayValue === null
                                ? "null"
                                : displayValue === undefined
                                    ? "undefined"
                                    : String(displayValue) }))] }), _jsx(Col, { md: 1, children: _jsx(Badge, { bg: canCollapse ? "info" : "primary", children: getTypeIcon(isDate ? "date" : inferredType, details) }) }), _jsx(Col, { md: 1, children: _jsx(OverlayTrigger, { placement: "top", overlay: (props) => React.cloneElement(tooltip, props), children: _jsx("span", { style: { cursor: "help", marginRight: "5px" }, children: _jsx(FaInfoCircle, { color: "#777", size: 20 }) }) }) })] }, fullKey));
    };
    const renderChildren = (node, parentKey) => {
        const entries = Object.entries(node).filter(([k]) => {
            return !(hideExtraFields && fieldsToHide.includes(k));
        });
        return entries.map(([key, value]) => {
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            const { type, details } = getFieldTypeAndDetails(key);
            const inferredType = type || (Array.isArray(value) ? "array" : inferTypeFromValue(value));
            const isValObject = value && typeof value === "object" && !Array.isArray(value);
            const isValArray = Array.isArray(value);
            const canCollapse = isValObject || isValArray;
            const isCollapsed = collapsed[fullKey] ?? collapsedByDefault;
            const tooltip = renderFieldTooltip(key, inferredType, details);
            return renderProperty(key, fullKey, value, canCollapse, isCollapsed, inferredType, details, tooltip);
        });
    };
    const renderRoot = () => {
        if (currentData === null ||
            currentData === undefined ||
            typeof currentData !== "object") {
            // Root is a primitive
            const keyName = "root";
            const { type, details } = getFieldTypeAndDetails(keyName);
            const inferredType = type || inferTypeFromValue(currentData);
            const tooltip = renderFieldTooltip(keyName, inferredType, details);
            return (_jsx("ul", { children: renderProperty(keyName, keyName, currentData, false, false, inferredType, details, tooltip) }));
        }
        const entries = Object.entries(currentData).filter(([k]) => {
            return !(hideExtraFields && fieldsToHide.includes(k));
        });
        return (_jsx("ul", { style: { paddingLeft: "0" }, children: entries.map(([key, value]) => {
                const fullKey = key;
                const { type, details } = getFieldTypeAndDetails(key);
                const inferredType = type ||
                    (Array.isArray(value) ? "array" : inferTypeFromValue(value));
                const isValObject = value && typeof value === "object" && !Array.isArray(value);
                const isValArray = Array.isArray(value);
                const canCollapse = isValObject || isValArray;
                const isCollapsed = collapsed[fullKey] ?? collapsedByDefault;
                const tooltip = renderFieldTooltip(key, inferredType, details);
                return renderProperty(key, fullKey, value, canCollapse, isCollapsed, inferredType, details, tooltip);
            }) }));
    };
    return (_jsxs("div", { className: "text-light", children: [_jsxs("div", { className: "mb-2 d-flex align-items-center justify-content-between", style: { overflow: "hidden" }, children: [_jsx(Badge, { bg: openApiSpec ? "success" : "warning", children: openApiSpec ? "THORAPI SPEC FOUND" : "UNKNOWN OBJECT TYPE" }), _jsx(Form.Check, { type: "checkbox", id: "toggle-extra-fields", label: "Hide Last Modified Fields", className: "ms-3 text-light", checked: hideExtraFields, onChange: (e) => setHideExtraFields(e.target.checked) })] }), renderRoot(), _jsxs(Modal, { show: showModal, onHide: () => setShowModal(false), centered: true, children: [_jsx(Modal.Header, { closeButton: true, className: "text-light", style: { backgroundColor: "#333" }, children: _jsxs(Modal.Title, { className: "text-light", children: ["Editing: ", modalKey] }) }), _jsxs(Modal.Body, { style: { backgroundColor: "#222" }, children: [(modalDetails?.description ||
                                modalDetails?.pattern ||
                                modalDetails?.secure ||
                                modalDetails?.enum ||
                                modalDetails?.type) && (_jsxs(Form.Group, { className: "mb-3", children: [modalDetails?.description && (_jsxs(_Fragment, { children: [_jsx(Form.Label, { className: "text-light", children: _jsx("h5", { children: "Description" }) }), _jsx(Form.Text, { className: "d-block text-light", children: modalDetails.description }), _jsx("br", {})] })), modalDetails?.type && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Type:" }), " ", modalDetails.type, _jsx("br", {})] })), modalDetails?.pattern && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Pattern:" }), " ", modalDetails.pattern, _jsx("br", {})] })), modalDetails?.secure && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Secure Field" }), _jsx("br", {})] })), modalDetails?.enum && (_jsxs(_Fragment, { children: [_jsx("h5", { children: "Enum:" }), " ", modalDetails.enum.join(", "), _jsx("br", {})] }))] })), _jsxs(Form.Group, { children: [_jsx(Form.Label, { className: "text-light", children: "Value" }), renderEditableModalField(modalDetails?.type || "string")] })] }), _jsxs(Modal.Footer, { style: { backgroundColor: "#333" }, children: [_jsxs(CoolButton, { variant: "secondary", onClick: () => setShowModal(false), children: [_jsx(FaArrowCircleLeft, { size: 24, className: "me-1" }), " Cancel"] }), _jsxs(CoolButton, { variant: "primary", onClick: saveModalValue, children: [_jsx(FaRegSave, { size: 24, className: "me-1" }), " Save"] })] })] })] }));
};
export default ObjectTreeView;
//# sourceMappingURL=index.js.map