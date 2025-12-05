import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from "react";
import DynamicTextArea from "react-textarea-autosize";
import "./ChatTextArea.css";
const GlowingTextArea = forwardRef(({ borderState, isStubborn, isExtendedThinking, ...props }, ref) => {
    let className = "chat-text-area";
    if (borderState === "happy") {
        className += " happy";
    }
    else if (borderState === "waiting") {
        className += " waiting";
    }
    else if (borderState === "sad") {
        className += " sad";
    }
    if (isStubborn) {
        className += " stubborn";
    }
    if (isExtendedThinking && borderState === "happy") {
        className += " extended-thinking";
    }
    return _jsx(DynamicTextArea, { ref: ref, className: className, ...props });
});
export default GlowingTextArea;
//# sourceMappingURL=GlowingTextArea.js.map