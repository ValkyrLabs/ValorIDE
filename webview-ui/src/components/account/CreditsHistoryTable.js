import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { VSCodeDataGrid, VSCodeDataGridRow, VSCodeDataGridCell, } from "@vscode/webview-ui-toolkit/react";
import { useState, useCallback } from "react";
import { TabButton } from "../mcp/configuration/McpConfigurationView";
import { formatDollars, formatTimestamp } from "@/utils/format";
const CreditsHistoryTable = ({ isLoading, usageData, paymentsData, }) => {
    const [activeTab, setActiveTab] = useState("usage");
    const [selectedUsageRow, setSelectedUsageRow] = useState(null);
    const [selectedPaymentRow, setSelectedPaymentRow] = useState(null);
    const handleUsageRowClick = useCallback((index, event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedUsageRow(selectedUsageRow === index ? null : index);
    }, [selectedUsageRow]);
    const handlePaymentRowClick = useCallback((index, event) => {
        event.preventDefault();
        event.stopPropagation();
        setSelectedPaymentRow(selectedPaymentRow === index ? null : index);
    }, [selectedPaymentRow]);
    return (_jsxs("div", { className: "flex flex-col flex-grow h-full", children: [_jsxs("div", { className: "flex border-b border-[var(--vscode-panel-border)]", children: [_jsx(TabButton, { isActive: activeTab === "usage", onClick: () => setActiveTab("usage"), children: "USAGE HISTORY" }), _jsx(TabButton, { isActive: activeTab === "payments", onClick: () => setActiveTab("payments"), children: "PAYMENTS HISTORY" })] }), _jsx("div", { className: "mt-[15px] mb-[0px] rounded-md overflow-auto flex-grow", children: isLoading ? (_jsx("div", { className: "flex justify-center items-center p-4", children: _jsx("div", { className: "text-[var(--vscode-descriptionForeground)]", children: "Loading..." }) })) : (_jsxs(_Fragment, { children: [activeTab === "usage" && (_jsx(_Fragment, { children: usageData.length > 0 ? (_jsxs(VSCodeDataGrid, { children: [_jsxs(VSCodeDataGridRow, { "row-type": "header", children: [_jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "1", children: "Date" }), _jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "2", children: "Model" }), _jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "3", children: "Credits Used" })] }), usageData.map((row, index) => (_jsxs(VSCodeDataGridRow, { onClick: (event) => handleUsageRowClick(index, event), style: {
                                            cursor: 'pointer',
                                            backgroundColor: selectedUsageRow === index ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'
                                        }, children: [_jsx(VSCodeDataGridCell, { "grid-column": "1", children: row.spentAt ? formatTimestamp(String(row.spentAt)) : "" }), _jsx(VSCodeDataGridCell, { "grid-column": "2", children: `${row.modelProvider}/${row.model}` }), _jsx(VSCodeDataGridCell, { "grid-column": "3", children: `$${Number(row.credits).toFixed(7)}` })] }, index)))] })) : (_jsx("div", { className: "flex justify-center items-center p-4", children: _jsx("div", { className: "text-[var(--vscode-descriptionForeground)]", children: "No usage history" }) })) })), activeTab === "payments" && (_jsx(_Fragment, { children: paymentsData.length > 0 ? (_jsxs(VSCodeDataGrid, { children: [_jsxs(VSCodeDataGridRow, { "row-type": "header", children: [_jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "1", children: "Date" }), _jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "2", children: "Total Cost" }), _jsx(VSCodeDataGridCell, { "cell-type": "columnheader", "grid-column": "3", children: "Credits" })] }), paymentsData.map((row, index) => (_jsxs(VSCodeDataGridRow, { onClick: (event) => handlePaymentRowClick(index, event), style: {
                                            cursor: 'pointer',
                                            backgroundColor: selectedPaymentRow === index ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent'
                                        }, children: [_jsx(VSCodeDataGridCell, { "grid-column": "1", children: row.paidAt ? formatTimestamp(String(row.paidAt)) : "" }), _jsx(VSCodeDataGridCell, { "grid-column": "2", children: `$${formatDollars(row.amountCents)}` }), _jsx(VSCodeDataGridCell, { "grid-column": "3", children: `${row.credits}` })] }, index)))] })) : (_jsx("div", { className: "flex justify-center items-center p-4", children: _jsx("div", { className: "text-[var(--vscode-descriptionForeground)]", children: "No payment history" }) })) }))] })) })] }));
};
export default CreditsHistoryTable;
//# sourceMappingURL=CreditsHistoryTable.js.map