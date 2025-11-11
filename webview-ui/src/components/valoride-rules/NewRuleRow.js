import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { vscode } from "@/utils/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { FaPlus } from "react-icons/fa";
import { useClickAway } from "react-use";
const NewRuleRow = ({ isGlobal }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [filename, setFilename] = useState("");
    const inputRef = useRef(null);
    const [error, setError] = useState(null);
    const componentRef = useRef(null);
    // Focus the input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);
    useClickAway(componentRef, () => {
        if (isExpanded) {
            setIsExpanded(false);
            setFilename("");
            setError(null);
        }
    });
    const getExtension = (filename) => {
        if (filename.startsWith(".") && !filename.includes(".", 1))
            return "";
        const match = filename.match(/\.[^.]+$/);
        return match ? match[0].toLowerCase() : "";
    };
    const isValidExtension = (ext) => {
        return ext === "" || ext === ".md" || ext === ".txt";
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (filename.trim()) {
            const trimmedFilename = filename.trim();
            const extension = getExtension(trimmedFilename);
            if (!isValidExtension(extension)) {
                setError("Only .md, .txt, or no file extension allowed");
                return;
            }
            let finalFilename = trimmedFilename;
            if (extension === "") {
                finalFilename = `${trimmedFilename}.md`;
            }
            vscode.postMessage({
                type: "createRuleFile",
                isGlobal,
                filename: finalFilename,
            });
            setFilename("");
            setError(null);
            setIsExpanded(false);
        }
    };
    const handleKeyDown = (e) => {
        if (e.key === "Escape") {
            setIsExpanded(false);
            setFilename("");
        }
    };
    return (_jsxs("div", { ref: componentRef, className: `mb-2.5 transition-all duration-300 ease-in-out ${isExpanded ? "opacity-100" : "opacity-70 hover:opacity-100"}`, onClick: () => !isExpanded && setIsExpanded(true), children: [_jsx("div", { className: `flex items-center p-2 rounded bg-[var(--vscode-input-background)] transition-all duration-300 ease-in-out h-[18px] ${isExpanded ? "shadow-sm" : ""}`, children: isExpanded ? (_jsxs("form", { onSubmit: handleSubmit, className: "flex flex-1 items-center", children: [_jsx("input", { ref: inputRef, type: "text", placeholder: "rule-name (.md, .txt, or no extension)", value: filename, onChange: (e) => setFilename(e.target.value), onKeyDown: handleKeyDown, className: "flex-1 bg-[var(--vscode-input-background)] text-[var(--vscode-input-foreground)] border-0 outline-0 rounded focus:outline-none focus:ring-0 focus:border-transparent", style: {
                                outline: "none",
                            } }), _jsx("div", { className: "flex items-center ml-2 space-x-2", children: _jsx(VSCodeButton, { appearance: "icon", type: "submit", "aria-label": "Create rule file", title: "Create rule file", style: { padding: "0px" }, children: _jsx(FaPlus, { style: { fontSize: "14px" } }) }) })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "flex-1 text-[var(--vscode-descriptionForeground)] bg-[var(--vscode-input-background)] italic text-xs", children: "New rule file..." }), _jsx("div", { className: "flex items-center ml-2 space-x-2", children: _jsx(VSCodeButton, { appearance: "icon", "aria-label": "New rule file", title: "New rule file", onClick: (e) => {
                                    e.stopPropagation();
                                    setIsExpanded(true);
                                }, style: { padding: "0px" }, children: _jsx(FaPlus, { style: { fontSize: "14px" } }) }) })] })) }), isExpanded && error && (_jsx("div", { className: "text-[var(--vscode-errorForeground)] text-xs mt-1 ml-2", children: error }))] }));
};
export default NewRuleRow;
//# sourceMappingURL=NewRuleRow.js.map