import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { Form as BSForm } from "react-bootstrap";
import SmartFkPicker from "./SmartFkPicker";
const METADATA_IDS = new Set([
    "ownerId",
    "lastModifiedById",
    "lastAccessedById",
    "workflowStateId",
    "keyHash",
]);
function inferEntityFromField(name) {
    if (!name)
        return null;
    if (!name.endsWith("Id"))
        return null;
    if (METADATA_IDS.has(name))
        return null;
    const base = name.substring(0, name.length - 2); // remove Id
    if (!base)
        return null;
    // simple PascalCase
    return base.charAt(0).toUpperCase() + base.slice(1);
}
export const SmartField = ({ name, value, error, placeholder, setFieldValue, setFieldTouched, }) => {
    const targetEntity = inferEntityFromField(name);
    if (targetEntity) {
        return (_jsx("div", { children: _jsx(SmartFkPicker, { entity: targetEntity, value: value, onChange: (id) => {
                    setFieldTouched(name, true);
                    setFieldValue(name, id);
                }, placeholder: placeholder }) }));
    }
    return (_jsx(_Fragment, { children: _jsx(BSForm.Control, { name: name, type: "text", value: value ?? "", onChange: (e) => {
                setFieldTouched(name, true);
                setFieldValue(name, e.target.value);
            } }) }));
};
export default SmartField;
//# sourceMappingURL=SmartField.js.map