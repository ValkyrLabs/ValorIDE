import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import FullSizeContainer from "../FullSizeContainer";
import SplitPane, { Divider, SplitPaneLeft, SplitPaneRight, SplitPaneTop, } from "./index";
import "./index.css";
const SplitPaneView2 = ({ children }) => {
    return (_jsx(FullSizeContainer, { className: "split-pane", children: _jsxs(SplitPane, { className: "split-pane-row", children: [_jsx(SplitPaneLeft, { className: "split-pane-left", children: children[0] }), _jsx(Divider, { className: "separator-col" }), _jsxs(SplitPaneRight, { children: [_jsx(SplitPaneTop, { children: children[1] }), _jsx(Divider, { className: "separator-row" })] })] }) }));
};
export default SplitPaneView2;
//# sourceMappingURL=SplitPaneView2.js.map