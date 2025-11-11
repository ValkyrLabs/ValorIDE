import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { VSCodeBadge, VSCodeButton, VSCodeCheckbox, VSCodeDataGrid, VSCodeDataGridCell, VSCodeDataGridRow, VSCodeDivider, VSCodeDropdown, VSCodeLink, VSCodeOption, VSCodePanels, VSCodePanelTab, VSCodePanelView, VSCodeProgressRing, VSCodeRadio, VSCodeRadioGroup, VSCodeTag, VSCodeTextArea, VSCodeTextField, } from "@vscode/webview-ui-toolkit/react";
import { VscCaseSensitive, VscWholeWord, VscRegex, VscChevronRight } from "react-icons/vsc";
function Demo() {
    // function handleHowdyClick() {
    // 	vscode.postMessage({
    // 		command: "hello",
    // 		text: "Hey there partner! 🤠",
    // 	})
    // }
    const rowData = [
        {
            cell1: "Cell Data",
            cell2: "Cell Data",
            cell3: "Cell Data",
            cell4: "Cell Data",
        },
        {
            cell1: "Cell Data",
            cell2: "Cell Data",
            cell3: "Cell Data",
            cell4: "Cell Data",
        },
        {
            cell1: "Cell Data",
            cell2: "Cell Data",
            cell3: "Cell Data",
            cell4: "Cell Data",
        },
    ];
    return (_jsxs("main", { children: [_jsx("h1", { children: "Hello World!" }), _jsx(VSCodeButton, { children: "Howdy!" }), _jsxs("div", { className: "grid gap-3 p-2 place-items-start", children: [_jsxs(VSCodeDataGrid, { children: [_jsxs(VSCodeDataGridRow, { "row-type": "header", children: [_jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "1", children: "A Custom Header Title" }), _jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "2", children: "Another Custom Title" }), _jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "3", children: "Title Is Custom" }), _jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "4", children: "Custom Title" })] }), rowData.map((row, index) => (_jsxs(VSCodeDataGridRow, { children: [_jsx(VSCodeDataGridCell, { "grid-column": "1", children: row.cell1 }), _jsx(VSCodeDataGridCell, { "grid-column": "2", children: row.cell2 }), _jsx(VSCodeDataGridCell, { "grid-column": "3", children: row.cell3 }), _jsx(VSCodeDataGridCell, { "grid-column": "4", children: row.cell4 })] }, index)))] }), _jsx(VSCodeTextField, { children: _jsxs("section", { slot: "end", style: { display: "flex", alignItems: "center" }, children: [_jsx(VSCodeButton, { appearance: "icon", "aria-label": "Match Case", children: _jsx(VscCaseSensitive, {}) }), _jsx(VSCodeButton, { appearance: "icon", "aria-label": "Match Whole Word", children: _jsx(VscWholeWord, {}) }), _jsx(VSCodeButton, { appearance: "icon", "aria-label": "Use Regular Expression", children: _jsx(VscRegex, {}) })] }) }), _jsx(VscChevronRight, {}), _jsxs("span", { className: "flex gap-3", children: [_jsx(VSCodeProgressRing, {}), _jsx(VSCodeTextField, {}), _jsx(VSCodeButton, { children: "Add" }), _jsx(VSCodeButton, { appearance: "secondary", children: "Remove" })] }), _jsx(VSCodeBadge, { children: "Badge" }), _jsx(VSCodeCheckbox, { children: "Checkbox" }), _jsx(VSCodeDivider, {}), _jsxs(VSCodeDropdown, { children: [_jsx(VSCodeOption, { children: "Option 1" }), _jsx(VSCodeOption, { children: "Option 2" })] }), _jsx(VSCodeLink, { href: "#", children: "Link" }), _jsxs(VSCodePanels, { children: [_jsx(VSCodePanelTab, { id: "tab-1", children: "Tab 1" }), _jsx(VSCodePanelTab, { id: "tab-2", children: "Tab 2" }), _jsx(VSCodePanelView, { id: "view-1", children: "Panel View 1" }), _jsx(VSCodePanelView, { id: "view-2", children: "Panel View 2" })] }), _jsxs(VSCodeRadioGroup, { children: [_jsx(VSCodeRadio, { children: "Radio 1" }), _jsx(VSCodeRadio, { children: "Radio 2" })] }), _jsx(VSCodeTag, { children: "Tag" }), _jsx(VSCodeTextArea, { placeholder: "Text Area" })] })] }));
}
export default Demo;
//# sourceMappingURL=Demo.js.map