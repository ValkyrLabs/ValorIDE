import { jsx as _jsx } from "react/jsx-runtime";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
const SuccessButtonTW = (props) => {
    return (_jsx(VSCodeButton, { ...props, className: `
				!bg-[#176f2c] 
				!border-[#176f2c] 
				!text-white
				hover:!bg-[#197f31] 
				hover:!border-[#197f31]
				active:!bg-[#156528] 
				active:!border-[#156528]
				${props.className || ""}
			`
            .replace(/\s+/g, " ")
            .trim() }));
};
export default SuccessButtonTW;
//# sourceMappingURL=SuccessButton.js.map