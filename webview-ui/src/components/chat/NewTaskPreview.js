import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MarkdownBlock from "../common/MarkdownBlock";
const NewTaskPreview = ({ context }) => {
    return (_jsxs("div", { className: "bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)] rounded-[3px] p-[14px] pb-[6px]", children: [_jsx("span", { style: { fontWeight: "bold" }, children: "Task" }), _jsx(MarkdownBlock, { markdown: context })] }));
};
export default NewTaskPreview;
//# sourceMappingURL=NewTaskPreview.js.map