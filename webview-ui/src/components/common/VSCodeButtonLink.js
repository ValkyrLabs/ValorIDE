import { jsx as _jsx } from "react/jsx-runtime";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
const VSCodeButtonLink = ({ href, children, ...props }) => {
    return (_jsx("a", { href: href, style: {
            textDecoration: "none",
            color: "inherit",
        }, children: _jsx(VSCodeButton, { ...props, children: children }) }));
};
export default VSCodeButtonLink;
//# sourceMappingURL=VSCodeButtonLink.js.map