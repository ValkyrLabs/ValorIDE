import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import SplitPane, { Divider, SplitPaneBottom, SplitPaneLeft, SplitPaneRight, SplitPaneTop, } from "./index";
import "./index.css";
const SplitPaneView = ({ children, }) => {
    // Ensure children is an array for consistent access
    const childrenArray = Array.isArray(children) ? children : [children];
    return (_jsx("div", { className: "split-pane", children: _jsxs(SplitPane, { className: "split-pane-row", children: [_jsx(SplitPaneLeft, { clientWidth: 100, children: childrenArray[0] }), _jsx(Divider, { className: "separator-col" }), _jsx(SplitPaneRight, { children: _jsxs(SplitPane, { className: "split-pane-col", children: [_jsx(SplitPaneTop, { children: childrenArray[1] }), _jsx(Divider, { className: "separator-row" }), _jsx(SplitPaneBottom, { children: childrenArray[2] })] }) })] }) }));
};
export default SplitPaneView;
//# sourceMappingURL=SplitPaneView.js.map