import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo, useMemo } from "react";
import { getLanguageFromPath } from "@/utils/getLanguageFromPath";
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import { VscFeedback, VscOutput, VscDiff, VscChevronUp, VscChevronDown } from "react-icons/vsc";
/*
We need to remove leading non-alphanumeric characters from the path in order for our leading ellipses trick to work.
^: Anchors the match to the start of the string.
[^a-zA-Z0-9]+: Matches one or more characters that are not alphanumeric.
The replace method removes these matched characters, effectively trimming the string up to the first alphanumeric character.
*/
export const cleanPathPrefix = (path) => path.replace(/^[^\u4e00-\u9fa5a-zA-Z0-9]+/, "");
const CodeAccordian = ({ code, diff, language, path, isFeedback, isConsoleLogs, isExpanded, onToggleExpand, isLoading, }) => {
    const inferredLanguage = useMemo(() => code && (language ?? (path ? getLanguageFromPath(path) : undefined)), [path, language, code]);
    const numberOfEdits = useMemo(() => {
        if (code) {
            return (code.match(/>>>>>>> REPLACE/g) || []).length || undefined;
        }
        return undefined;
    }, [code]);
    return (_jsxs("div", { style: {
            borderRadius: 3,
            backgroundColor: CODE_BLOCK_BG_COLOR,
            overflow: "hidden", // This ensures the inner scrollable area doesn't overflow the rounded corners
            border: "1px solid var(--vscode-editorGroup-border)",
        }, children: [(path || isFeedback || isConsoleLogs) && (_jsxs("div", { style: {
                    color: "var(--vscode-descriptionForeground)",
                    display: "flex",
                    alignItems: "center",
                    padding: "9px 10px",
                    cursor: isLoading ? "wait" : "pointer",
                    opacity: isLoading ? 0.7 : 1,
                    // pointerEvents: isLoading ? "none" : "auto",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                }, onClick: isLoading ? undefined : onToggleExpand, children: [isFeedback || isConsoleLogs ? (_jsxs("div", { style: { display: "flex", alignItems: "center" }, children: [isFeedback ? (_jsx(VscFeedback, { style: { marginRight: "6px" } })) : (_jsx(VscOutput, { style: { marginRight: "6px" } })), _jsx("span", { style: {
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    marginRight: "8px",
                                }, children: isFeedback ? "User Edits" : "Console Logs" })] })) : (_jsxs(_Fragment, { children: [path?.startsWith(".") && _jsx("span", { children: "." }), _jsx("span", { style: {
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    marginRight: "8px",
                                    // trick to get ellipsis at beginning of string
                                    direction: "rtl",
                                    textAlign: "left",
                                }, children: cleanPathPrefix(path ?? "") + "\u200E" })] })), _jsx("div", { style: { flexGrow: 1 } }), numberOfEdits !== undefined && (_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            marginRight: "8px",
                            color: "var(--vscode-descriptionForeground)",
                        }, children: [_jsx(VscDiff, { style: { marginRight: "4px" } }), _jsx("span", { children: numberOfEdits })] })), isExpanded ? (_jsx(VscChevronUp, {})) : (_jsx(VscChevronDown, {}))] })), (!(path || isFeedback || isConsoleLogs) || isExpanded) && (_jsx("div", { 
                //className="code-block-scrollable" this doesn't seem to be necessary anymore, on silicon macs it shows the native mac scrollbar instead of the vscode styled one
                style: {
                    overflowX: "auto",
                    overflowY: "hidden",
                    maxWidth: "100%",
                }, children: _jsx(CodeBlock, { source: `${"```"}${diff !== undefined ? "diff" : inferredLanguage}\n${(code ??
                        diff ??
                        "").trim()}\n${"```"}` }) }))] }));
};
// memo does shallow comparison of props, so if you need it to re-render when a nested object changes, you need to pass a custom comparison function
export default memo(CodeAccordian);
//# sourceMappingURL=CodeAccordian.js.map