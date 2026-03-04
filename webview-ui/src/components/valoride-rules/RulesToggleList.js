import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import NewRuleRow from "./NewRuleRow";
import RuleRow from "./RuleRow";
const RulesToggleList = ({ rules, toggleRule, listGap = "medium", isGlobal, }) => {
    const gapClasses = {
        small: "gap-0",
        medium: "gap-2.5",
        large: "gap-5",
    };
    const gapClass = gapClasses[listGap];
    return (_jsx("div", { className: `flex flex-col ${gapClass}`, children: rules.length > 0 ? (_jsxs(_Fragment, { children: [rules.map(([rulePath, enabled]) => (_jsx(RuleRow, { rulePath: rulePath, enabled: enabled, isGlobal: isGlobal, toggleRule: toggleRule }, rulePath))), _jsx(NewRuleRow, { isGlobal: isGlobal })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex flex-col items-center gap-3 my-3 text-[var(--vscode-descriptionForeground)]", children: "No rules found" }), _jsx(NewRuleRow, { isGlobal: isGlobal })] })) }));
};
export default RulesToggleList;
//# sourceMappingURL=RulesToggleList.js.map