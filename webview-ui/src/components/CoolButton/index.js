import { jsx as _jsx } from "react/jsx-runtime";
const CoolButton = ({ disabled, children, variant, className, onClick, type, size, customStyle, }) => {
    let classx = "btnx btn btn-" + variant;
    if (size === "tiny") {
        classx = "btnx btn tinyButton btn-" + variant;
    }
    if (className) {
        classx += " " + className;
    }
    return (_jsx("button", { style: customStyle, type: type, disabled: disabled, onClick: (event) => onClick(event), className: classx, children: children }));
};
export default CoolButton;
//# sourceMappingURL=index.js.map