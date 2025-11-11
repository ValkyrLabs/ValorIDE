import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { Form as BSForm, ButtonGroup, Modal } from 'react-bootstrap';
import LoadingSpinner from '@valkyr/component-library/LoadingSpinner';
import { FaFilter, FaSync, FaChevronRight, FaChevronLeft, FaChevronDown, FaPlus, FaTrash, FaCopy, FaPaste, FaUserShield } from 'react-icons/fa';
import RequeueDeadLetterEntryRequestForm from '@thor/redux/components/form/RequeueDeadLetterEntryRequestForm';
import CoolButton from '@valkyr/component-library/CoolButton';
// Removed SplitPane usage; using floating toolbar for edit form
// ** Import the LAZY paged hook only **
import { useLazyGetRequeueDeadLetterEntryRequestsPagedQuery, useAddRequeueDeadLetterEntryRequestMutation, useUpdateRequeueDeadLetterEntryRequestMutation, useDeleteRequeueDeadLetterEntryRequestMutation } from '@thor/redux/services/RequeueDeadLetterEntryRequestService';
import { RBGrid } from '@valkyr/component-library/BootstrapGrid';
import QBEPicker from '@valkyr/component-library/QBEPicker';
import MarkdownEditorModal from '@valkyr/component-library/MarkdownEditorModal';
import { PermissionDialog } from '@valkyr/component-library/PermissionDialog';
import FloatingControlPanel from '@valkyr/component-library/OpenAPIViz/FloatingControlPanel';
// Fields to hide by default
const fieldSkipList = [
    'keyHash', 'workflowStateId', 'createdDate', 'lastAccessedById', 'lastAccessedDate', 'lastModifiedDate', 'lastModifiedById'
];
// Column schema hard-coded from model metadata (enums, dates, booleans)
const columnSchema = {
    'createdDate': { type: 'datetime' },
    'lastAccessedDate': { type: 'datetime' },
    'lastModifiedDate': { type: 'datetime' },
};
const stringFieldCandidates = [
    'inputOverrides',
    'notes',
    'id',
    'ownerId',
    'keyHash',
    'lastAccessedById',
    'lastModifiedById',
];
const computeRefType = (field) => {
    if (!field)
        return null;
    if (/^id$/i.test(field))
        return null;
    if (/id$/i.test(field)) {
        const base = field.replace(/id$/i, '');
        return base ? base.charAt(0).toUpperCase() + base.slice(1) : null;
    }
    if (/uuid$/i.test(field)) {
        const base = field.replace(/uuid$/i, '');
        return base ? base.charAt(0).toUpperCase() + base.slice(1) : null;
    }
    return null;
};
const RequeueDeadLetterEntryRequestTable = () => {
    // -------------------------------------------------------------------
    // 1) "Lazy" RTK Query Hook: We manually trigger page fetches
    // -------------------------------------------------------------------
    // destructure: [triggerFn, { data, isFetching, isError }]
    const [triggerGetPage, { data: fetchedPageData = [], isFetching, isError }] = useLazyGetRequeueDeadLetterEntryRequestsPagedQuery();
    // We track the current page number in state
    const [page, setPage] = useState(1);
    // A local array accumulating all results from pages 1..N
    const [allData, setAllData] = useState([]);
    // Keep track if there's more data to load
    const [hasMore, setHasMore] = useState(true);
    // -------------------------------------------------------------------
    // 2) Load first page on user action (no auto-load)
    // -------------------------------------------------------------------
    const [dataLoaded, setDataLoaded] = useState(false);
    const handleLoadData = () => {
        setPage(1);
        setAllData([]);
        setHasMore(true);
        const arg = { page: 1 };
        if (qbeExample)
            arg.example = qbeExample;
        triggerGetPage(arg);
        setDataLoaded(true);
    };
    // Whenever `fetchedPageData` changes, merge into `allData` by id (replace in place)
    useEffect(() => {
        if (fetchedPageData.length === 0 && page > 1) {
            // We tried to load a subsequent page but got no items => end
            setHasMore(false);
            return;
        }
        if (fetchedPageData.length > 0) {
            // Merge newly fetched data: replace existing rows by id; append new ones
            setAllData((prev) => {
                const updated = [...prev];
                for (const item of fetchedPageData) {
                    const id = item.id ?? item.keyHash;
                    if (id == null)
                        continue;
                    const idx = updated.findIndex((r) => (r.id ?? r.keyHash) === id);
                    if (idx >= 0)
                        updated[idx] = item;
                    else
                        updated.push(item);
                }
                return updated;
            });
            // Update loaded timestamp (HH:MM)
            try {
                const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                setLastLoadedAt(t);
            }
            catch (e) {
                setLastLoadedAt(new Date().toISOString());
            }
        }
    }, [fetchedPageData, page]);
    // -------------------------------------------------------------------
    // Mutations (Add, Update, etc.)
    // -------------------------------------------------------------------
    const [addRequeueDeadLetterEntryRequest] = useAddRequeueDeadLetterEntryRequestMutation();
    const [updateRequeueDeadLetterEntryRequest] = useUpdateRequeueDeadLetterEntryRequestMutation();
    const [deleteRequeueDeadLetterEntryRequest] = useDeleteRequeueDeadLetterEntryRequestMutation();
    // -------------------------------------------------------------------
    // UI states (editing, modals, etc.)
    // -------------------------------------------------------------------
    const [editRowId, setEditRowId] = useState(null);
    const [formData, setFormData] = useState({});
    const [modalVisible, setModalVisible] = useState(false);
    const [modalData, setModalData] = useState({});
    const [richModal, setRichModal] = useState({ show: false, content: '' });
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showQbeModal, setShowQbeModal] = useState(false);
    const [qbeText, setQbeText] = useState('');
    const [qbeExample, setQbeExample] = useState(null);
    const [copiedRow, setCopiedRow] = useState(null);
    const inputRef = useRef(null);
    const [showAllFields, setShowAllFields] = useState(false);
    const [lastLoadedAt, setLastLoadedAt] = useState(null);
    // QBE reference picker state
    const [qbePicker, setQbePicker] = useState({ show: false });
    // Sorting state
    const [sortColumn, setSortColumn] = useState();
    const [sortDirection, setSortDirection] = useState("asc");
    // Floating toolbar state/measurements
    const [toolbarOpen, setToolbarOpen] = useState(false);
    const panelRef = useRef(null);
    const [panelWidth, setPanelWidth] = useState(360);
    useEffect(() => {
        const w = panelRef.current?.offsetWidth;
        if (w && w !== panelWidth)
            setPanelWidth(w);
    }, [panelRef.current]);
    // For object expansions
    const [expandedObjects, setExpandedObjects] = useState({});
    // For keyboard navigation
    const [activeCell, setActiveCell] = useState(null);
    // Track whether the initial load already ran
    const autoLoadRef = useRef(false);
    // -------------------------------------------------------------------
    // Permission Management State
    // -------------------------------------------------------------------
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [selectedObjectForPermissions, setSelectedObjectForPermissions] = useState(null);
    // const token: string = sessionStorage.getItem("jwtToken"); // for testing
    const currentUser = JSON.parse(sessionStorage.getItem("authenticatedPrincipal"));
    // -------------------------------------------------------------------
    // Ensure grid rows always have a required `id: string`
    // (Some generated model types declare `id?: string`)
    // -------------------------------------------------------------------
    const tableData = React.useMemo(() => {
        return (allData ?? []).map((row, idx) => ({
            id: row.id ?? row.keyHash ?? String(idx),
            ...row,
        }));
    }, [allData]);
    // -------------------------------------------------------------------
    // Derive the columns from the first row (unless empty)
    // -------------------------------------------------------------------
    const columns = React.useMemo(() => {
        if (!tableData.length)
            return [];
        return Object.keys(tableData[0]).filter((key) => showAllFields || !fieldSkipList.includes(key));
    }, [tableData, showAllFields]);
    const resolvedColumnSchema = React.useMemo(() => {
        const schema = { ...columnSchema };
        stringFieldCandidates.forEach((field) => {
            const refType = computeRefType(field);
            if (refType) {
                schema[field] = { ...(schema[field] ?? {}), refType };
            }
        });
        return schema;
    }, []);
    // Reference picker bridge used by RBGrid
    const onReferencePick = async (rowId, columnKey, refType) => {
        return new Promise((resolve) => {
            setQbePicker({ show: true, refType, resolve });
        });
    };
    // Auto-load on mount after this table renders
    useEffect(() => {
        if (!autoLoadRef.current) {
            autoLoadRef.current = true;
            handleLoadData();
        }
    }, []);
    // -------------------------------------------------------------------
    // Row selection & delete
    // -------------------------------------------------------------------
    const handleRowSelect = (id) => {
        setSelectedRows((prev) => {
            const updated = new Set(prev);
            if (updated.has(id))
                updated.delete(id);
            else
                updated.add(id);
            return updated;
        });
    };
    const handleDelete = () => setShowDeleteModal(true);
    const confirmDelete = async () => {
        try {
            const ids = Array.from(selectedRows);
            await Promise.all(ids.map(async (id) => {
                try {
                    await deleteRequeueDeadLetterEntryRequest(id).unwrap();
                }
                catch (e) {
                    console.error('Failed to delete id', id, e);
                }
            }));
            setAllData((prev) => prev.filter((item) => !selectedRows.has(item.id)));
        }
        finally {
            setSelectedRows(new Set());
            setShowDeleteModal(false);
        }
    };
    // AddressToJSON(value?: Address)
    // -------------------------------------------------------------------
    // Add, Copy, Paste
    // -------------------------------------------------------------------
    const handleAddRow = async () => {
        try {
            if (selectedRows.size !== 1) {
                alert('Select exactly one row to duplicate.');
                return;
            }
            const rowId = Array.from(selectedRows)[0];
            const source = allData.find((item) => item.id === rowId);
            if (!source) {
                alert('Could not find selected row.');
                return;
            }
            const payload = { ...source };
            delete payload.id;
            const created = await addRequeueDeadLetterEntryRequest(payload).unwrap();
            setAllData((prev) => [created, ...prev]);
        }
        catch (error) {
            console.error('Failed to add RequeueDeadLetterEntryRequest:', error);
            alert('Failed to add. See console for details.');
        }
    };
    const handleCopyRow = () => {
        if (selectedRows.size === 1) {
            const rowId = Array.from(selectedRows)[0];
            const rowToCopy = allData.find((item) => item.id === rowId) || null;
            setCopiedRow(rowToCopy);
        }
        else {
            alert('Select exactly one row to copy.');
        }
    };
    const handlePasteRow = async () => {
        if (!copiedRow) {
            alert('No row copied. Please copy a row first.');
            return;
        }
        try {
            const payload = { ...copiedRow };
            delete payload.id;
            const created = await addRequeueDeadLetterEntryRequest(payload).unwrap();
            setAllData((prev) => [created, ...prev]);
        }
        catch (error) {
            console.error('Failed to paste (create) RequeueDeadLetterEntryRequest:', error);
            alert('Failed to paste. See console for details.');
        }
    };
    // -------------------------------------------------------------------
    // Editing (inline & modal)
    // -------------------------------------------------------------------
    const handleDoubleClick = (id, key, value) => {
        let val = value ?? '';
        if (typeof val === 'string') {
            // Long text -> optionally open markdown rich view
            if (val.length > 1000) {
                try {
                    const askPref = localStorage.getItem('UX:AskRichText') ?? 'ask';
                    if (askPref === 'ask') {
                        const open = window.confirm('Open in rich text (Markdown) editor? Click Cancel to use plain text and do not ask again.');
                        if (open) {
                            setRichModal({ show: true, content: val, title: key, rowId: id, field: key });
                            return;
                        }
                        else {
                            localStorage.setItem('UX:AskRichText', 'never');
                        }
                    }
                }
                catch { }
            }
            // short => inline
            if (val.length <= 20) {
                setEditRowId(`${id}~${key}`);
                const row = allData.find((item) => item.id === id);
                if (row)
                    setFormData({ [key]: row[key] });
            }
            else {
                // big => modal
                setModalData({ id, key, value: val });
                setModalVisible(true);
            }
        }
        else if (typeof val === 'object') {
            // expand/collapse
            const objKey = `${id}~${key}`;
            setExpandedObjects((prev) => ({ ...prev, [objKey]: !prev[objKey] }));
        }
        else {
            // numeric or boolean
            const sVal = String(val);
            if (sVal.length <= 20) {
                setEditRowId(`${id}~${key}`);
                const row = allData.find((r) => r.id === id);
                if (row)
                    setFormData({ [key]: row[key] });
            }
            else {
                setModalData({ id, key, value: sVal });
                setModalVisible(true);
            }
        }
    };
    const handleSave = async (editKey) => {
        const [id, key] = editKey.split('~');
        const row = allData.find((item) => item.id === id);
        if (!row)
            return;
        const updatedItem = { ...row, [key]: formData[key] };
        try {
            await updateRequeueDeadLetterEntryRequest(updatedItem).unwrap();
            setAllData((prev) => prev.map((i) => (i.id === id ? updatedItem : i)));
        }
        catch (error) {
            console.error('Failed to update RequeueDeadLetterEntryRequest:', error);
        }
        setEditRowId(null);
        setFormData({});
    };
    const handleCancel = () => {
        setEditRowId(null);
        setFormData({});
    };
    const handleInputChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };
    const handleKeyDownEdit = (e, editKey) => {
        if (e.key === 'Enter')
            handleSave(editKey);
        else if (e.key === 'Escape')
            handleCancel();
    };
    const handleBlur = () => {
        if (editRowId)
            handleSave(editRowId);
    };
    // Toggle object field expansion (for RBGrid)
    const handleToggleExpandObject = (id, key) => {
        const objKey = `${id}~${key}`;
        setExpandedObjects((prev) => ({ ...prev, [objKey]: !prev[objKey] }));
    };
    // Apply object field change to local state (RBGrid expanded panel)
    const handleObjectFieldChange = (rowId, key, updatedObj) => {
        setAllData((prev) => prev.map((d) => (d.id === rowId ? { ...d, [key]: updatedObj } : d)));
    };
    // Select/Deselect all visible rows
    const handleToggleAll = () => {
        if (selectedRows.size === tableData.length) {
            setSelectedRows(new Set());
        }
        else {
            setSelectedRows(new Set(tableData.map((d) => d.id)));
        }
    };
    // -------------------------------------------------------------------
    // Keyboard navigation
    // -------------------------------------------------------------------
    const handleCellFocus = (rowIndex, colIndex) => {
        setActiveCell({ rowIndex, colIndex });
    };
    const handleCellKeyDownNav = (e, rowIndex, colIndex, itemId, columnKey, cellValue) => {
        if (editRowId)
            return;
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                setActiveCell({ rowIndex, colIndex: Math.min(colIndex + 1, columns.length - 1) });
                break;
            case 'ArrowLeft':
                e.preventDefault();
                setActiveCell({ rowIndex, colIndex: Math.max(colIndex - 1, 0) });
                break;
            case 'ArrowDown':
                e.preventDefault();
                setActiveCell({ rowIndex: Math.min(rowIndex + 1, allData.length - 1), colIndex });
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveCell({ rowIndex: Math.max(rowIndex - 1, 0), colIndex });
                break;
            case 'Enter':
                e.preventDefault();
                handleDoubleClick(itemId, columnKey, cellValue);
                break;
            default:
                break;
        }
    };
    // -------------------------------------------------------------------
    // Render helpers
    // -------------------------------------------------------------------
    const renderValue = (value, itemId, key) => {
        if (value == null)
            return '';
        if (typeof value === 'object') {
            const objKey = `${itemId}~${key}`;
            const isExpanded = expandedObjects[objKey] || false;
            return (_jsxs(CoolButton, { variant: "info", onClick: () => handleDoubleClick(itemId, key, value), children: [isExpanded ? _jsx(FaChevronDown, {}) : _jsx(FaChevronRight, {}), " ", key] }));
        }
        return value;
    };
    const handleModalSave = async () => {
        const { id, key, value } = modalData;
        if (!id || !key) {
            setModalVisible(false);
            return;
        }
        const row = allData.find((r) => r.id === id);
        if (!row) {
            setModalVisible(false);
            return;
        }
        const updatedItem = { ...row, [key]: value };
        try {
            await updateRequeueDeadLetterEntryRequest(updatedItem).unwrap();
            setAllData((prev) => prev.map((d) => (d.id === id ? updatedItem : d)));
        }
        catch (error) {
            console.error('Failed to update from modal:', error);
        }
        setModalVisible(false);
    };
    const handleModalChange = (newValue) => {
        setModalData((prev) => ({ ...prev, value: newValue }));
    };
    // -------------------------------------------------------------------
    // Permission Management Functions
    // -------------------------------------------------------------------
    const handleManagePermissions = () => {
        if (selectedRows.size === 1) {
            const rowId = Array.from(selectedRows)[0];
            setSelectedObjectForPermissions({
                objectType: 'com.valkyrlabs.model.RequeueDeadLetterEntryRequest',
                objectId: rowId,
            });
            setShowPermissionDialog(true);
        }
        else {
            alert('Select exactly one row to manage permissions.');
        }
    };
    // Handle permissions for a specific row (direct click)
    const handleRowPermissions = (itemId) => {
        setSelectedObjectForPermissions({
            objectType: 'com.valkyrlabs.model.RequeueDeadLetterEntryRequest',
            objectId: itemId,
        });
        setShowPermissionDialog(true);
    };
    const handlePermissionDialogClose = () => {
        setShowPermissionDialog(false);
        setSelectedObjectForPermissions(null);
    };
    const handlePermissionsSave = (grants) => {
        console.log('Permissions saved:', grants);
        // Optionally refresh data or show success message
    };
    // -------------------------------------------------------------------
    // Component render
    // -------------------------------------------------------------------
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "tableContainer", children: [_jsxs("div", { className: "spreadsheet-container", children: [_jsx(RBGrid, { data: tableData, columns: columns, columnSchema: resolvedColumnSchema, selectedRows: selectedRows, onToggleRow: handleRowSelect, onToggleAll: handleToggleAll, onRowPermissions: handleRowPermissions, editCellId: editRowId, formData: formData, onInputChange: handleInputChange, onKeyDownEdit: handleKeyDownEdit, onBlurEdit: handleBlur, onCellDoubleClick: handleDoubleClick, activeCell: activeCell, onCellFocus: handleCellFocus, onCellKeyDownNav: handleCellKeyDownNav, expandedObjects: expandedObjects, onToggleExpandObject: handleToggleExpandObject, onObjectFieldChange: handleObjectFieldChange, showAllFields: showAllFields, onToggleShowAllFields: () => setShowAllFields(!showAllFields), storageKey: "RequeueDeadLetterEntryRequestTable", onReferencePick: onReferencePick, onRequestMoreRows: (dir) => {
                                    if (dir === 'down' && hasMore && !isFetching && dataLoaded) {
                                        const nextPage = page + 1;
                                        setPage(nextPage);
                                        const arg = { page: nextPage };
                                        if (qbeExample)
                                            arg.example = qbeExample;
                                        triggerGetPage(arg);
                                    }
                                } }), isFetching && _jsx(LoadingSpinner, { style: { margin: "2em" } })] }), _jsx("div", { ref: panelRef, style: {
                            position: 'fixed',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            right: toolbarOpen ? 20 : `-${Math.max(panelWidth - 100, 0)}px`,
                            zIndex: 9999,
                            pointerEvents: 'auto',
                        }, children: _jsxs(FloatingControlPanel, { description: "RequeueDeadLetterEntryRequest Actions", className: "grid-toolbar", style: {
                                pointerEvents: 'auto',
                                width: 360,
                                maxWidth: 420,
                                boxShadow: '0 6px 20px rgba(0,0,0,0.3)'
                            }, children: [_jsx("div", { role: "button", "aria-label": toolbarOpen ? 'Hide actions' : 'Show actions', onClick: () => setToolbarOpen(!toolbarOpen), style: {
                                        position: 'absolute',
                                        left: -0,
                                        top: '50%',
                                        transform: 'translate(-100%, -50%)',
                                        width: 48,
                                        height: 64,
                                        borderRadius: '8px 0 0 8px',
                                        background: 'rgba(0,0,0,0.6)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.35)'
                                    }, children: toolbarOpen ? _jsx(FaChevronRight, {}) : _jsx(FaChevronLeft, {}) }), _jsx("div", { children: _jsxs(ButtonGroup, { children: [_jsx(CoolButton, { variant: "secondary", onClick: handleLoadData, children: _jsx(FaSync, {}) }), _jsx(CoolButton, { variant: "primary", onClick: () => setShowCreateModal(true), children: _jsx(FaPlus, {}) }), _jsx(CoolButton, { disabled: selectedRows.size !== 1, variant: "secondary", onClick: handleCopyRow, children: _jsx(FaCopy, {}) }), _jsx(CoolButton, { variant: "secondary", onClick: handlePasteRow, children: _jsx(FaPaste, {}) }), _jsxs(CoolButton, { variant: "secondary", onClick: () => setShowQbeModal(true), children: [_jsx(FaFilter, {}), " Filter (QBE)"] }), _jsx(CoolButton, { variant: "warning", onClick: handleDelete, disabled: selectedRows.size !== 1, children: _jsx(FaTrash, {}) }), _jsx(CoolButton, { variant: "info", onClick: handleManagePermissions, disabled: selectedRows.size !== 1, children: _jsx(FaUserShield, {}) })] }) })] }) }), _jsxs(Modal, { show: showCreateModal, onHide: () => setShowCreateModal(false), centered: true, size: "lg", children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: "Create RequeueDeadLetterEntryRequest" }) }), _jsx(Modal.Body, { children: _jsx(RequeueDeadLetterEntryRequestForm, {}) })] }), _jsxs(Modal, { show: showQbeModal, onHide: () => setShowQbeModal(false), centered: true, size: "lg", children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: "Filter RequeueDeadLetterEntryRequest (Query By Example)" }) }), _jsxs(Modal.Body, { children: [_jsx("p", { children: "Enter a JSON example. Non-null fields will be matched. Strings use case-insensitive contains; exact match for non-strings." }), _jsx(BSForm.Control, { as: "textarea", rows: 10, value: qbeText, onChange: (e) => setQbeText(e.target.value), placeholder: '{"name":"acme","status":"active"}' })] }), _jsxs(Modal.Footer, { children: [_jsx(CoolButton, { variant: "secondary", onClick: () => { setQbeText(''); setQbeExample(null); setShowQbeModal(false); }, children: "Clear" }), _jsx(CoolButton, { variant: "primary", onClick: () => {
                                            try {
                                                const obj = qbeText ? JSON.parse(qbeText) : null;
                                                setQbeExample(obj);
                                                setShowQbeModal(false);
                                                setPage(1);
                                                setAllData([]);
                                                setHasMore(true);
                                                const arg = { page: 1 };
                                                if (obj)
                                                    arg.example = obj;
                                                triggerGetPage(arg);
                                                setDataLoaded(true);
                                            }
                                            catch (err) {
                                                alert('Invalid JSON');
                                            }
                                        }, children: "Apply" })] })] }), _jsxs(Modal, { show: showDeleteModal, onHide: () => setShowDeleteModal(false), centered: true, children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: "Confirm Deletion" }) }), _jsx(Modal.Body, { children: "Are you sure you want to delete the selected rows?" }), _jsxs(Modal.Footer, { children: [_jsx(CoolButton, { variant: "secondary", onClick: () => setShowDeleteModal(false), children: "Cancel" }), _jsx(CoolButton, { variant: "danger", onClick: confirmDelete, children: "Delete" })] })] }), _jsxs(Modal, { show: modalVisible, onHide: () => setModalVisible(false), centered: true, children: [_jsx(Modal.Header, { closeButton: true, children: _jsx(Modal.Title, { children: "Editing RequeueDeadLetterEntryRequest" }) }), _jsx(Modal.Body, { children: modalData.value && typeof modalData.value === 'string' ? (_jsx(BSForm.Control, { as: "textarea", rows: 10, value: modalData.value, onChange: (e) => handleModalChange(e.target.value) })) : (_jsx("div", { children: "No large text data available or unsupported type." })) }), _jsxs(Modal.Footer, { children: [_jsx(CoolButton, { variant: "secondary", onClick: () => setModalVisible(false), children: "Cancel" }), _jsx(CoolButton, { variant: "primary", onClick: handleModalSave, children: "Save" })] })] }), _jsx(MarkdownEditorModal, { show: richModal.show, title: `Rich Text: ${richModal.title || ''}`, initialValue: richModal.content, onCancel: () => setRichModal({ show: false, content: '' }), onSave: async (updatedText) => {
                            try {
                                const rid = richModal.rowId;
                                const field = richModal.field;
                                if (!rid || !field) {
                                    setRichModal({ show: false, content: '' });
                                    return;
                                }
                                const row = allData.find(r => r.id === rid);
                                if (!row) {
                                    setRichModal({ show: false, content: '' });
                                    return;
                                }
                                const updated = { ...row, [field]: updatedText };
                                await updateRequeueDeadLetterEntryRequest(updated).unwrap();
                                setAllData(prev => prev.map(r => r.id === rid ? updated : r));
                            }
                            catch (e) {
                                console.error('Failed to save markdown field', e);
                            }
                            setRichModal({ show: false, content: '' });
                        } }), selectedObjectForPermissions && (_jsx(PermissionDialog, { objectType: selectedObjectForPermissions.objectType, objectId: selectedObjectForPermissions.objectId, isVisible: showPermissionDialog, onClose: handlePermissionDialogClose, onSave: handlePermissionsSave, currentUser: currentUser })), isError && (_jsxs("div", { style: { color: 'red', marginTop: 12 }, children: ["Error fetching page ", page, " of RequeueDeadLetterEntryRequests."] }))] }), _jsx(QBEPicker, { show: qbePicker.show, refType: qbePicker.refType || 'RequeueDeadLetterEntryRequest', onCancel: () => setQbePicker({ show: false }), onPick: (val) => {
                    const r = qbePicker.resolve;
                    setQbePicker({ show: false });
                    r && r(val);
                } })] }));
};
export default RequeueDeadLetterEntryRequestTable;
//# sourceMappingURL=RequeueDeadLetterEntryRequestTable.js.map