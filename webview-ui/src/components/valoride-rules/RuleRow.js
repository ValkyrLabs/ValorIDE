import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { vscode } from "@/utils/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { FileServiceClient } from "@/services/grpc-client";
import { FaEdit, FaTrash } from "react-icons/fa";
const RuleRow = ({ rulePath, enabled, isGlobal, toggleRule }) => {
    // Get the filename from the path for display
    const username = rulePath.split("/").pop() || rulePath;
    const handleEditClick = () => {
        FileServiceClient.openFile({ value: rulePath }).catch((err) => console.error("Failed to open file:", err));
    };
    const handleDeleteClick = () => {
        vscode.postMessage({
            type: "deleteValorIDERule",
            rulePath: rulePath,
            isGlobal: isGlobal,
        });
    };
    return (_jsx("div", { className: "mb-2.5", children: _jsxs("div", { className: `flex items-center p-2 rounded bg-[var(--vscode-textCodeBlock-background)] h-[18px] ${enabled ? "opacity-100" : "opacity-60"}`, children: [_jsx("span", { className: "flex-1 overflow-hidden break-all whitespace-normal flex items-center mr-1", title: rulePath, children: username }), _jsxs("div", { className: "flex items-center ml-2 space-x-2", children: [_jsx("div", { role: "switch", "aria-checked": enabled, tabIndex: 0, className: `w-[20px] h-[10px] rounded-[5px] relative cursor-pointer transition-colors duration-200 ${enabled
                                ? "bg-[var(--vscode-testing-iconPassed)] opacity-90"
                                : "bg-[var(--vscode-titleBar-inactiveForeground)] opacity-50"}`, onClick: () => toggleRule(rulePath, !enabled), onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleRule(rulePath, !enabled);
                                }
                            }, children: _jsx("div", { className: `w-[6px] h-[6px] bg-white border border-[#66666699] rounded-full absolute top-[1px] transition-all duration-200 ${enabled ? "left-[12px]" : "left-[2px]"}` }) }), _jsx(VSCodeButton, { appearance: "icon", "aria-label": "Edit rule file", title: "Edit rule file", onClick: handleEditClick, style: { height: "20px" }, children: _jsx(FaEdit, { style: { fontSize: "14px" } }) }), _jsx(VSCodeButton, { appearance: "icon", "aria-label": "Delete rule file", title: "Delete rule file", onClick: handleDeleteClick, style: { height: "20px" }, children: _jsx(FaTrash, { style: { fontSize: "14px" } }) })] })] }) }));
};
export default RuleRow;
//# sourceMappingURL=RuleRow.js.map