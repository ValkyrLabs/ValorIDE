import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import SplitPane, { Divider, SplitPaneBottom, SplitPaneRight, SplitPaneTop, } from "./index";
import "./index.css";
const SplitPaneViewVert2 = ({ children }) => {
    return (_jsx("div", { className: "split-pane", children: _jsx(SplitPane, { className: "split-pane-row", children: _jsx(SplitPaneRight, { children: _jsxs(SplitPane, { className: "split-pane-col", children: [_jsx(SplitPaneTop, { children: children[1] }), _jsx(Divider, { className: "separator-row" }), _jsx(SplitPaneBottom, { children: children[0] })] }) }) }) }));
};
export default SplitPaneViewVert2;
//# sourceMappingURL=SplitPaneViewVert2.js.map