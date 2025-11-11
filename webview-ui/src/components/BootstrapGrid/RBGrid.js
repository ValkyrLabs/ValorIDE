import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Table, Form } from 'react-bootstrap';
/**
 * RBGrid: React Bootstrap Grid Component
 * Provides inline editing, sorting, pagination, reference picking, and object expansion
 */
const RBGrid = ({ data = [], columns = [], columnSchema = {}, selectedRows = new Set(), onToggleRow, onToggleAll, onRowPermissions, editCellId, formData = {}, onInputChange, onKeyDownEdit, onBlurEdit, onCellDoubleClick, activeCell, onCellFocus, onCellKeyDownNav, expandedObjects = {}, onToggleExpandObject, onObjectFieldChange, showAllFields = false, onToggleShowAllFields, storageKey, onReferencePick, onRequestMoreRows, }) => {
    const handleSelectAll = () => {
        onToggleAll?.();
    };
    const handleSelectRow = (id) => {
        onToggleRow?.(id);
    };
    const renderCell = (rowId, columnKey, value, rowIndex, colIndex) => {
        const editKey = `${rowId}~${columnKey}`;
        const isEditing = editCellId === editKey;
        const isActive = activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex;
        const schema = columnSchema?.[columnKey];
        if (isEditing && onInputChange && onKeyDownEdit && onBlurEdit) {
            return (_jsx("input", { type: "text", value: formData?.[columnKey] ?? '', onChange: (e) => onInputChange(columnKey, e.target.value), onKeyDown: (e) => onKeyDownEdit(e, editKey), onBlur: onBlurEdit, autoFocus: true, style: { width: '100%' } }));
        }
        if (schema?.refType && onReferencePick) {
            return (_jsx("a", { href: "#", onClick: (e) => {
                    e.preventDefault();
                    onReferencePick(rowId, columnKey, schema.refType);
                }, children: value ? String(value).substring(0, 30) : '(empty)' }));
        }
        if (typeof value === 'object' && value !== null) {
            const objKey = `${rowId}~${columnKey}`;
            const isExpanded = expandedObjects?.[objKey] || false;
            return (_jsxs("button", { onClick: () => onToggleExpandObject?.(rowId, columnKey), style: { cursor: 'pointer' }, children: [isExpanded ? '▼' : '▶', " ", columnKey] }));
        }
        return (_jsx("td", { onDoubleClick: () => onCellDoubleClick?.(rowId, columnKey, value), onFocus: () => onCellFocus?.(rowIndex, colIndex), onKeyDown: (e) => onCellKeyDownNav?.(e, rowIndex, colIndex, rowId, columnKey, value), tabIndex: isActive ? 0 : -1, style: {
                cursor: 'pointer',
                backgroundColor: isActive ? '#e7f3ff' : undefined,
                outline: isActive ? '2px solid #0066cc' : 'none',
            }, children: value == null ? '' : String(value).substring(0, 100) }));
    };
    return (_jsx("div", { style: { overflowX: 'auto', marginTop: '1em' }, children: _jsxs(Table, { striped: true, bordered: true, hover: true, size: "sm", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { width: '40px' }, children: _jsx(Form.Check, { type: "checkbox", checked: selectedRows.size === data.length && data.length > 0, onChange: handleSelectAll }) }), columns.map((col) => (_jsx("th", { children: col }, col))), _jsx("th", { style: { width: '60px' }, children: "Actions" })] }) }), _jsx("tbody", { children: data.map((row, rowIndex) => {
                        const rowId = row.id ?? String(rowIndex);
                        const isSelected = selectedRows.has(rowId);
                        return (_jsxs("tr", { style: { backgroundColor: isSelected ? '#f0f0f0' : undefined }, children: [_jsx("td", { children: _jsx(Form.Check, { type: "checkbox", checked: isSelected, onChange: () => handleSelectRow(rowId) }) }), columns.map((col, colIndex) => (_jsx("td", { onDoubleClick: () => onCellDoubleClick?.(rowId, col, row[col]), onFocus: () => onCellFocus?.(rowIndex, colIndex), onKeyDown: (e) => onCellKeyDownNav?.(e, rowIndex, colIndex, rowId, col, row[col]), tabIndex: activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex ? 0 : -1, style: {
                                        cursor: 'pointer',
                                        backgroundColor: activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex
                                            ? '#e7f3ff'
                                            : undefined,
                                        outline: activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex
                                            ? '2px solid #0066cc'
                                            : 'none',
                                    }, children: renderCell(rowId, col, row[col], rowIndex, colIndex) }, `${rowId}~${col}`))), _jsx("td", { children: _jsx("button", { onClick: () => onRowPermissions?.(rowId), title: "Manage permissions", children: "\uD83D\uDD12" }) })] }, rowId));
                    }) })] }) }));
};
export default RBGrid;
//# sourceMappingURL=RBGrid.js.map