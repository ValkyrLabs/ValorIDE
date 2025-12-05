import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useRef, useEffect } from "react";
import { getMatchingSlashCommands } from "@/utils/slash-commands";
const SlashCommandMenu = ({ onSelect, selectedIndex, setSelectedIndex, onMouseDown, query, }) => {
    const menuRef = useRef(null);
    const handleClick = useCallback((command) => {
        onSelect(command);
    }, [onSelect]);
    // Auto-scroll logic remains the same...
    useEffect(() => {
        if (menuRef.current) {
            const selectedElement = menuRef.current.children[selectedIndex];
            if (selectedElement) {
                const menuRect = menuRef.current.getBoundingClientRect();
                const selectedRect = selectedElement.getBoundingClientRect();
                if (selectedRect.bottom > menuRect.bottom) {
                    menuRef.current.scrollTop += selectedRect.bottom - menuRect.bottom;
                }
                else if (selectedRect.top < menuRect.top) {
                    menuRef.current.scrollTop -= menuRect.top - selectedRect.top;
                }
            }
        }
    }, [selectedIndex]);
    // Filter commands based on query
    const filteredCommands = getMatchingSlashCommands(query);
    return (_jsx("div", { className: "absolute bottom-[calc(100%-10px)] left-[15px] right-[15px] overflow-x-hidden z-[1000]", onMouseDown: onMouseDown, children: _jsx("div", { ref: menuRef, className: "bg-[var(--vscode-dropdown-background)] border border-[var(--vscode-editorGroup-border)] rounded-[3px] shadow-[0_4px_10px_rgba(0,0,0,0.25)] flex flex-col max-h-[200px] overflow-y-auto" // Corrected rounded and shadow
            , children: filteredCommands.length > 0 ? (filteredCommands.map((command, index) => (_jsxs("div", { className: `py-2 px-3 cursor-pointer flex flex-col border-b border-[var(--vscode-editorGroup-border)] ${
                // Corrected padding
                index === selectedIndex
                    ? "bg-[var(--vscode-quickInputList-focusBackground)] text-[var(--vscode-quickInputList-focusForeground)]"
                    : "" // Removed bg-transparent
                } hover:bg-[var(--vscode-list-hoverBackground)]`, onClick: () => handleClick(command), onMouseEnter: () => setSelectedIndex(index), children: [_jsxs("div", { className: "font-bold whitespace-nowrap overflow-hidden text-ellipsis", children: ["/", command.name] }), _jsx("div", { className: "text-[0.85em] text-[var(--vscode-descriptionForeground)] whitespace-normal overflow-hidden text-ellipsis", children: command.description })] }, command.name)))) : (_jsxs("div", { className: "py-2 px-3 cursor-default flex flex-col", children: [" ", _jsx("div", { className: "text-[0.85em] text-[var(--vscode-descriptionForeground)]", children: "No matching commands found" })] })) }) }));
};
export default SlashCommandMenu;
//# sourceMappingURL=SlashCommandMenu.js.map