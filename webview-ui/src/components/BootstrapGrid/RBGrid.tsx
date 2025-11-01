import React from 'react';
import { Table, Form } from 'react-bootstrap';
import { ColumnSchema } from './index';

export interface RBGridProps {
  data: any[];
  columns: string[];
  columnSchema?: Record<string, ColumnSchema>;
  selectedRows?: Set<string>;
  onToggleRow?: (id: string) => void;
  onToggleAll?: () => void;
  onRowPermissions?: (id: string) => void;
  editCellId?: string | null;
  formData?: Record<string, any>;
  onInputChange?: (field: string, value: any) => void;
  onKeyDownEdit?: (e: React.KeyboardEvent, editKey: string) => void;
  onBlurEdit?: () => void;
  onCellDoubleClick?: (id: string, key: string, value: any) => void;
  activeCell?: { rowIndex: number; colIndex: number } | null;
  onCellFocus?: (rowIndex: number, colIndex: number) => void;
  onCellKeyDownNav?: (
    e: React.KeyboardEvent<HTMLTableCellElement>,
    rowIndex: number,
    colIndex: number,
    itemId: string,
    columnKey: string,
    cellValue: any
  ) => void;
  expandedObjects?: Record<string, boolean>;
  onToggleExpandObject?: (id: string, key: string) => void;
  onObjectFieldChange?: (rowId: string, key: string, updatedObj: any) => void;
  showAllFields?: boolean;
  onToggleShowAllFields?: () => void;
  storageKey?: string;
  onReferencePick?: (rowId: string, columnKey: string, refType?: string) => Promise<any | null>;
  onRequestMoreRows?: (dir: 'up' | 'down') => void;
}

/**
 * RBGrid: React Bootstrap Grid Component
 * Provides inline editing, sorting, pagination, reference picking, and object expansion
 */
const RBGrid: React.FC<RBGridProps> = ({
  data = [],
  columns = [],
  columnSchema = {},
  selectedRows = new Set(),
  onToggleRow,
  onToggleAll,
  onRowPermissions,
  editCellId,
  formData = {},
  onInputChange,
  onKeyDownEdit,
  onBlurEdit,
  onCellDoubleClick,
  activeCell,
  onCellFocus,
  onCellKeyDownNav,
  expandedObjects = {},
  onToggleExpandObject,
  onObjectFieldChange,
  showAllFields = false,
  onToggleShowAllFields,
  storageKey,
  onReferencePick,
  onRequestMoreRows,
}) => {
  const handleSelectAll = () => {
    onToggleAll?.();
  };

  const handleSelectRow = (id: string) => {
    onToggleRow?.(id);
  };

  const renderCell = (rowId: string, columnKey: string, value: any, rowIndex: number, colIndex: number) => {
    const editKey = `${rowId}~${columnKey}`;
    const isEditing = editCellId === editKey;
    const isActive = activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex;

    const schema = columnSchema?.[columnKey];

    if (isEditing && onInputChange && onKeyDownEdit && onBlurEdit) {
      return (
        <input
          type="text"
          value={formData?.[columnKey] ?? ''}
          onChange={(e) => onInputChange(columnKey, e.target.value)}
          onKeyDown={(e) => onKeyDownEdit(e, editKey)}
          onBlur={onBlurEdit}
          autoFocus
          style={{ width: '100%' }}
        />
      );
    }

    if (schema?.refType && onReferencePick) {
      return (
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onReferencePick(rowId, columnKey, schema.refType);
          }}
        >
          {value ? String(value).substring(0, 30) : '(empty)'}
        </a>
      );
    }

    if (typeof value === 'object' && value !== null) {
      const objKey = `${rowId}~${columnKey}`;
      const isExpanded = expandedObjects?.[objKey] || false;
      return (
        <button
          onClick={() => onToggleExpandObject?.(rowId, columnKey)}
          style={{ cursor: 'pointer' }}
        >
          {isExpanded ? '▼' : '▶'} {columnKey}
        </button>
      );
    }

    return (
      <td
        onDoubleClick={() => onCellDoubleClick?.(rowId, columnKey, value)}
        onFocus={() => onCellFocus?.(rowIndex, colIndex)}
        onKeyDown={(e) => onCellKeyDownNav?.(e, rowIndex, colIndex, rowId, columnKey, value)}
        tabIndex={isActive ? 0 : -1}
        style={{
          cursor: 'pointer',
          backgroundColor: isActive ? '#e7f3ff' : undefined,
          outline: isActive ? '2px solid #0066cc' : 'none',
        }}
      >
        {value == null ? '' : String(value).substring(0, 100)}
      </td>
    );
  };

  return (
    <div style={{ overflowX: 'auto', marginTop: '1em' }}>
      <Table striped bordered hover size="sm">
        <thead>
          <tr>
            <th style={{ width: '40px' }}>
              <Form.Check
                type="checkbox"
                checked={selectedRows.size === data.length && data.length > 0}
                onChange={handleSelectAll}
              />
            </th>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
            <th style={{ width: '60px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => {
            const rowId = row.id ?? String(rowIndex);
            const isSelected = selectedRows.has(rowId);
            return (
              <tr key={rowId} style={{ backgroundColor: isSelected ? '#f0f0f0' : undefined }}>
                <td>
                  <Form.Check
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectRow(rowId)}
                  />
                </td>
                {columns.map((col, colIndex) => (
                  <td
                    key={`${rowId}~${col}`}
                    onDoubleClick={() => onCellDoubleClick?.(rowId, col, row[col])}
                    onFocus={() => onCellFocus?.(rowIndex, colIndex)}
                    onKeyDown={(e) => onCellKeyDownNav?.(e, rowIndex, colIndex, rowId, col, row[col])}
                    tabIndex={activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex ? 0 : -1}
                    style={{
                      cursor: 'pointer',
                      backgroundColor:
                        activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex
                          ? '#e7f3ff'
                          : undefined,
                      outline:
                        activeCell?.rowIndex === rowIndex && activeCell?.colIndex === colIndex
                          ? '2px solid #0066cc'
                          : 'none',
                    }}
                  >
                    {renderCell(rowId, col, row[col], rowIndex, colIndex)}
                  </td>
                ))}
                <td>
                  <button onClick={() => onRowPermissions?.(rowId)} title="Manage permissions">
                    🔒
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
};

export default RBGrid;
