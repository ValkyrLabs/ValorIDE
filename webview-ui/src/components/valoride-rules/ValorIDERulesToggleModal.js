import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useEffect } from "react";
import { useClickAway, useWindowSize } from "react-use";
import { useExtensionState } from "@/context/ExtensionStateContext";
import { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock";
import { vscode } from "@/utils/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import RulesToggleList from "./RulesToggleList";
import Tooltip from "@/components/common/Tooltip";
import { FaGavel } from "react-icons/fa";
const ValorIDERulesToggleModal = () => {
    const { globalValorIDERulesToggles = {}, localValorIDERulesToggles = {} } = useExtensionState();
    const [isVisible, setIsVisible] = useState(false);
    const buttonRef = useRef(null);
    const modalRef = useRef(null);
    const { width: viewportWidth, height: viewportHeight } = useWindowSize();
    const [arrowPosition, setArrowPosition] = useState(0);
    const [menuPosition, setMenuPosition] = useState(0);
    useEffect(() => {
        if (isVisible) {
            vscode.postMessage({ type: "refreshValorIDERules" });
        }
    }, [isVisible]);
    // Format global rules for display with proper typing
    const globalRules = Object.entries(globalValorIDERulesToggles || {})
        .map(([path, enabled]) => [path, enabled])
        .sort(([a], [b]) => a.localeCompare(b));
    // Format local rules for display with proper typing
    const localRules = Object.entries(localValorIDERulesToggles || {})
        .map(([path, enabled]) => [path, enabled])
        .sort(([a], [b]) => a.localeCompare(b));
    // Handle toggle rule
    const toggleRule = (isGlobal, rulePath, enabled) => {
        vscode.postMessage({
            type: "toggleValorIDERule",
            isGlobal,
            rulePath,
            enabled,
        });
    };
    // Close modal when clicking outside
    useClickAway(modalRef, () => {
        setIsVisible(false);
    });
    // Calculate positions for modal and arrow
    useEffect(() => {
        if (isVisible && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const buttonCenter = buttonRect.left + buttonRect.width / 2;
            const rightPosition = document.documentElement.clientWidth - buttonCenter - 5;
            setArrowPosition(rightPosition);
            setMenuPosition(buttonRect.top + 1);
        }
    }, [isVisible, viewportWidth, viewportHeight]);
    return (_jsxs("div", { ref: modalRef, children: [_jsx("div", { ref: buttonRef, className: "inline-flex min-w-0 max-w-full", children: _jsx(Tooltip, { tipText: "Manage ValorIDE Rules", children: _jsx(VSCodeButton, { appearance: "icon", "aria-label": "ValorIDE Rules", onClick: () => setIsVisible(!isVisible), style: { padding: "0px 0px", height: "20px" }, children: _jsx("div", { className: "flex items-center gap-1 text-xs whitespace-nowrap min-w-0 w-full", children: _jsx(FaGavel, { style: { fontSize: "12.5px", marginBottom: 1 } }) }) }) }) }), isVisible && (_jsxs("div", { className: "fixed left-[15px] right-[15px] border border-[var(--vscode-editorGroup-border)] p-3 rounded z-[1000] overflow-y-auto", style: {
                    bottom: `calc(100vh - ${menuPosition}px + 6px)`,
                    background: CODE_BLOCK_BG_COLOR,
                    maxHeight: "calc(100vh - 100px)",
                    overscrollBehavior: "contain",
                }, children: [_jsx("div", { className: "fixed w-[10px] h-[10px] z-[-1] rotate-45 border-r border-b border-[var(--vscode-editorGroup-border)]", style: {
                            bottom: `calc(100vh - ${menuPosition}px)`,
                            right: arrowPosition,
                            background: CODE_BLOCK_BG_COLOR,
                        } }), _jsxs("div", { className: "flex justify-between items-center mb-2.5", children: [_jsx("div", { className: "m-0 text-base font-semibold", children: "ValorIDE Rules" }), _jsx(VSCodeButton, { appearance: "icon", onClick: () => {
                                    vscode.postMessage({
                                        type: "openExtensionSettings",
                                    });
                                    setIsVisible(false);
                                }, children: _jsx(FaGavel, {}) })] }), _jsxs("div", { className: "mb-3", children: [_jsx("div", { className: "text-sm font-normal mb-2", children: "Global Rules" }), _jsx(RulesToggleList, { rules: globalRules, toggleRule: (rulePath, enabled) => toggleRule(true, rulePath, enabled), listGap: "small", isGlobal: true })] }), _jsxs("div", { style: { marginBottom: -10 }, children: [_jsx("div", { className: "text-sm font-normal mb-2", children: "Workspace Rules" }), _jsx(RulesToggleList, { rules: localRules, toggleRule: (rulePath, enabled) => toggleRule(false, rulePath, enabled), listGap: "small", isGlobal: false })] })] }))] }));
};
export default ValorIDERulesToggleModal;
//# sourceMappingURL=ValorIDERulesToggleModal.js.map