import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useState, useCallback, useMemo } from "react";
import { UserPreferencePreferenceTypeEnum } from "@thor/model";
import { useGetUserPreferencesQuery, useAddUserPreferenceMutation, useUpdateUserPreferenceMutation, useDeleteUserPreferenceMutation } from "@thor/redux/services/UserPreferenceService";
import { useGetSalesOrdersQuery } from "@thor/redux/services/SalesOrderService";
import { useGetCustomersQuery } from "@thor/redux/services/CustomerService";
import { useGetInvoicesQuery } from "@thor/redux/services/InvoiceService";
import { useGetPrincipalsQuery } from "@thor/redux/services/PrincipalService";
import { useExtensionState } from "@/context/ExtensionStateContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import CoolButton from "@valkyr/component-library/CoolButton";
import { VSCodeButton, VSCodeDivider, VSCodeLink } from "@vscode/webview-ui-toolkit/react";
import { Card, Badge, Tab, Tabs, Form, Row, Col, Alert, Modal, Table } from "react-bootstrap";
import { FaEdit, FaTrash, FaPlus, FaUser, FaShoppingCart, FaFileInvoice, FaCog, FaChartLine, FaSave, FaTimes } from "react-icons/fa";
import { format } from "date-fns";
/**
 * Production-ready UserPreferences component using ThorAPI generated models and services.
 * Provides comprehensive user preference management with drill-down capabilities for
 * related data including SalesOrders, Customers, Principals, and Invoices.
 *
 * Features:
 * - Real-time data fetching from ThorAPI services
 * - CRUD operations for user preferences
 * - Tabbed interface for different preference categories
 * - Data drill-down with modal views
 * - Responsive design with VSCode theming
 * - Production-ready error handling and loading states
 */
const UserPreferences = memo(({ className }) => {
    const { userInfo, authenticatedUser } = useExtensionState();
    const [activePreferenceTab, setActivePreferenceTab] = useState("uxlayout");
    const [selectedPreference, setSelectedPreference] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [editingPreference, setEditingPreference] = useState({});
    const [errorMessage, setErrorMessage] = useState("");
    // ThorAPI Service Hooks - Production Ready Data Fetching
    const { data: userPreferences = [], isLoading: preferencesLoading, error: preferencesError, refetch: refetchPreferences } = useGetUserPreferencesQuery();
    const { data: salesOrders = [], isLoading: salesOrdersLoading, error: salesOrdersError } = useGetSalesOrdersQuery();
    const { data: customers = [], isLoading: customersLoading, error: customersError } = useGetCustomersQuery();
    const { data: invoices = [], isLoading: invoicesLoading, error: invoicesError } = useGetInvoicesQuery();
    const { data: principals = [], isLoading: principalsLoading, error: principalsError } = useGetPrincipalsQuery();
    // ThorAPI Mutation Hooks
    const [addUserPreference, { isLoading: isAdding }] = useAddUserPreferenceMutation();
    const [updateUserPreference, { isLoading: isUpdating }] = useUpdateUserPreferenceMutation();
    const [deleteUserPreference, { isLoading: isDeleting }] = useDeleteUserPreferenceMutation();
    // Filtered preferences by type for tabbed interface
    const preferencesByType = useMemo(() => {
        return {
            'ux-layout': userPreferences.filter(p => p.preferenceType === UserPreferencePreferenceTypeEnum.UXLAYOUT),
            'ux-mode': userPreferences.filter(p => p.preferenceType === UserPreferencePreferenceTypeEnum.UXMODE),
            'ux-theme': userPreferences.filter(p => p.preferenceType === UserPreferencePreferenceTypeEnum.UXTHEME),
            'measurement': userPreferences.filter(p => p.preferenceType === UserPreferencePreferenceTypeEnum.MEASUREMENT)
        };
    }, [userPreferences]);
    // Combined loading state
    const isLoading = preferencesLoading || salesOrdersLoading || customersLoading || invoicesLoading || principalsLoading;
    // Get current user's principal ID for filtering
    const currentPrincipalId = userInfo?.id || authenticatedUser?.id;
    // Filter user preferences for current user
    const currentUserPreferences = useMemo(() => {
        return userPreferences.filter(pref => pref.principalId === currentPrincipalId);
    }, [userPreferences, currentPrincipalId]);
    // Statistics calculations
    const stats = useMemo(() => {
        return {
            totalPreferences: currentUserPreferences.length,
            totalSalesOrders: salesOrders.length,
            totalCustomers: customers.length,
            totalInvoices: invoices.length,
            recentOrders: salesOrders.slice(0, 5),
            recentInvoices: invoices.slice(0, 5)
        };
    }, [currentUserPreferences, salesOrders, customers, invoices]);
    // Handle preference operations
    const handleSavePreference = useCallback(async () => {
        try {
            setErrorMessage("");
            if (selectedPreference?.id) {
                // Update existing preference
                await updateUserPreference({
                    id: selectedPreference.id,
                    ...editingPreference
                }).unwrap();
            }
            else {
                // Create new preference
                await addUserPreference({
                    ...editingPreference,
                    principalId: currentPrincipalId
                }).unwrap();
            }
            setShowEditModal(false);
            setEditingPreference({});
            setSelectedPreference(null);
            refetchPreferences();
        }
        catch (error) {
            console.error("Error saving preference:", error);
            setErrorMessage(error?.data?.message || "Failed to save preference");
        }
    }, [selectedPreference, editingPreference, currentPrincipalId, updateUserPreference, addUserPreference, refetchPreferences]);
    const handleDeletePreference = useCallback(async (preference) => {
        if (!preference.id)
            return;
        try {
            setErrorMessage("");
            await deleteUserPreference(Number(preference.id)).unwrap();
            refetchPreferences();
        }
        catch (error) {
            console.error("Error deleting preference:", error);
            setErrorMessage(error?.data?.message || "Failed to delete preference");
        }
    }, [deleteUserPreference, refetchPreferences]);
    const handleEditPreference = useCallback((preference) => {
        setSelectedPreference(preference);
        setEditingPreference(preference || { preferenceType: UserPreferencePreferenceTypeEnum.UXLAYOUT });
        setShowEditModal(true);
    }, []);
    const handleViewDetails = useCallback((preference) => {
        setSelectedPreference(preference);
        setShowDetailModal(true);
    }, []);
    // Render preference type tabs
    const renderPreferenceTabs = () => (_jsxs(Tabs, { activeKey: activePreferenceTab, onSelect: (key) => key && setActivePreferenceTab(key), className: "mb-3", children: [_jsx(Tab, { eventKey: "uxlayout", title: _jsxs(_Fragment, { children: [_jsx(FaCog, { className: "me-2" }), "Layout (", preferencesByType['ux-layout'].length, ")"] }), children: renderPreferenceList(preferencesByType['ux-layout']) }), _jsx(Tab, { eventKey: "uxmode", title: _jsxs(_Fragment, { children: [_jsx(FaUser, { className: "me-2" }), "Mode (", preferencesByType['ux-mode'].length, ")"] }), children: renderPreferenceList(preferencesByType['ux-mode']) }), _jsx(Tab, { eventKey: "uxtheme", title: _jsxs(_Fragment, { children: [_jsx(FaCog, { className: "me-2" }), "Theme (", preferencesByType['ux-theme'].length, ")"] }), children: renderPreferenceList(preferencesByType['ux-theme']) }), _jsx(Tab, { eventKey: "measurement", title: _jsxs(_Fragment, { children: [_jsx(FaChartLine, { className: "me-2" }), "Measurements (", preferencesByType['measurement'].length, ")"] }), children: renderPreferenceList(preferencesByType['measurement']) })] }));
    // Render preference list for each tab
    const renderPreferenceList = (preferences) => (_jsxs(Card, { children: [_jsxs(Card.Header, { className: "d-flex justify-content-between align-items-center", children: [_jsxs("h6", { className: "mb-0", children: ["Preferences (", preferences.length, ")"] }), _jsxs(CoolButton, { variant: "primary", size: "sm", onClick: () => handleEditPreference(null), disabled: isAdding, children: [_jsx(FaPlus, { className: "me-1" }), "Add Preference"] })] }), _jsx(Card.Body, { children: preferences.length === 0 ? (_jsxs("div", { className: "text-center text-muted py-3", children: [_jsx("p", { children: "No preferences found for this category." }), _jsxs(CoolButton, { variant: "outline-primary", onClick: () => handleEditPreference(null), children: [_jsx(FaPlus, { className: "me-1" }), "Create First Preference"] })] })) : (_jsx("div", { className: "row", children: preferences.map((pref) => (_jsx("div", { className: "col-md-6 col-lg-4 mb-3", children: _jsx(Card, { className: "h-100", children: _jsxs(Card.Body, { children: [_jsxs("div", { className: "d-flex justify-content-between align-items-start mb-2", children: [_jsx(Badge, { bg: "info", className: "mb-2", children: pref.preferenceType?.replace('-', ' ').toUpperCase() }), _jsxs("div", { className: "btn-group btn-group-sm", children: [_jsx(VSCodeButton, { appearance: "icon", onClick: () => handleViewDetails(pref), title: "View Details", children: _jsx(FaUser, {}) }), _jsx(VSCodeButton, { appearance: "icon", onClick: () => handleEditPreference(pref), title: "Edit", children: _jsx(FaEdit, {}) }), _jsx(VSCodeButton, { appearance: "icon", onClick: () => handleDeletePreference(pref), disabled: isDeleting, title: "Delete", children: _jsx(FaTrash, {}) })] })] }), _jsx("h6", { className: "card-title", children: pref.preference || "Untitled Preference" }), _jsxs("small", { className: "text-muted", children: ["Created: ", pref.createdDate ? format(new Date(pref.createdDate), "MMM dd, yyyy") : "N/A", _jsx("br", {}), "Modified: ", pref.lastModifiedDate ? format(new Date(pref.lastModifiedDate), "MMM dd, yyyy") : "N/A"] })] }) }) }, pref.id))) })) })] }));
    // Render stats overview
    const renderStatsOverview = () => (_jsxs(Row, { className: "mb-4", children: [_jsx(Col, { md: 3, children: _jsx(Card, { className: "text-center", children: _jsxs(Card.Body, { children: [_jsx(FaCog, { size: 24, className: "text-primary mb-2" }), _jsx("h5", { children: stats.totalPreferences }), _jsx("small", { className: "text-muted", children: "User Preferences" })] }) }) }), _jsx(Col, { md: 3, children: _jsx(Card, { className: "text-center", children: _jsxs(Card.Body, { children: [_jsx(FaShoppingCart, { size: 24, className: "text-success mb-2" }), _jsx("h5", { children: stats.totalSalesOrders }), _jsx("small", { className: "text-muted", children: "Sales Orders" })] }) }) }), _jsx(Col, { md: 3, children: _jsx(Card, { className: "text-center", children: _jsxs(Card.Body, { children: [_jsx(FaUser, { size: 24, className: "text-info mb-2" }), _jsx("h5", { children: stats.totalCustomers }), _jsx("small", { className: "text-muted", children: "Customers" })] }) }) }), _jsx(Col, { md: 3, children: _jsx(Card, { className: "text-center", children: _jsxs(Card.Body, { children: [_jsx(FaFileInvoice, { size: 24, className: "text-warning mb-2" }), _jsx("h5", { children: stats.totalInvoices }), _jsx("small", { className: "text-muted", children: "Invoices" })] }) }) })] }));
    // Render recent activity section
    const renderRecentActivity = () => (_jsxs(Row, { className: "mb-4", children: [_jsx(Col, { md: 6, children: _jsxs(Card, { children: [_jsxs(Card.Header, { children: [_jsx(FaShoppingCart, { className: "me-2" }), "Recent Sales Orders", _jsx(VSCodeLink, { href: "#view-all-orders", className: "float-end", onClick: (e) => {
                                        e.preventDefault();
                                        // TODO: Navigate to sales orders view
                                        console.log("Navigate to sales orders");
                                    }, children: "View All" })] }), _jsx(Card.Body, { children: salesOrdersLoading ? (_jsx(LoadingSpinner, { label: "Loading orders...", size: 16 })) : stats.recentOrders.length > 0 ? (_jsxs(Table, { size: "sm", hover: true, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Order Date" }), _jsx("th", { children: "Customer" }), _jsx("th", { children: "Total" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: stats.recentOrders.map((order) => (_jsxs("tr", { style: { cursor: 'pointer' }, children: [_jsx("td", { children: order.orderDate ? format(new Date(order.orderDate), "MMM dd") : "N/A" }), _jsx("td", { children: order.customer?.principal?.firstName || "Unknown" }), _jsxs("td", { children: ["$", order.totalAmount?.toFixed(2) || "0.00"] }), _jsx("td", { children: _jsx(Badge, { bg: order.status === 'delivered' ? 'success' : 'warning', children: order.status }) })] }, order.id))) })] })) : (_jsx("div", { className: "text-center text-muted py-3", children: _jsx("p", { children: "No recent sales orders found." }) })) })] }) }), _jsx(Col, { md: 6, children: _jsxs(Card, { children: [_jsxs(Card.Header, { children: [_jsx(FaFileInvoice, { className: "me-2" }), "Recent Invoices", _jsx(VSCodeLink, { href: "#view-all-invoices", className: "float-end", onClick: (e) => {
                                        e.preventDefault();
                                        // TODO: Navigate to invoices view
                                        console.log("Navigate to invoices");
                                    }, children: "View All" })] }), _jsx(Card.Body, { children: invoicesLoading ? (_jsx(LoadingSpinner, { label: "Loading invoices...", size: 16 })) : stats.recentInvoices.length > 0 ? (_jsxs(Table, { size: "sm", hover: true, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Invoice Date" }), _jsx("th", { children: "Customer" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: stats.recentInvoices.map((invoice) => (_jsxs("tr", { style: { cursor: 'pointer' }, children: [_jsx("td", { children: invoice.createdDate ? format(new Date(invoice.createdDate), "MMM dd") : "N/A" }), _jsx("td", { children: "N/A" /* TODO: Add customer relationship */ }), _jsxs("td", { children: ["$", invoice.amount?.toFixed(2) || "0.00"] }), _jsx("td", { children: _jsx(Badge, { bg: "info", children: "N/A" /* TODO: Add status field */ }) })] }, invoice.id))) })] })) : (_jsx("div", { className: "text-center text-muted py-3", children: _jsx("p", { children: "No recent invoices found." }) })) })] }) })] }));
    // Render edit modal
    const renderEditModal = () => (_jsxs(Modal, { show: showEditModal, onHide: () => setShowEditModal(false), size: "lg", children: [_jsx(Modal.Header, { closeButton: true, children: _jsxs(Modal.Title, { children: [_jsx(FaEdit, { className: "me-2" }), selectedPreference ? "Edit Preference" : "Add New Preference"] }) }), _jsxs(Modal.Body, { children: [errorMessage && (_jsx(Alert, { variant: "danger", dismissible: true, onClose: () => setErrorMessage(""), children: errorMessage })), _jsxs(Form, { children: [_jsxs(Row, { children: [_jsx(Col, { md: 6, children: _jsxs(Form.Group, { className: "mb-3", children: [_jsx(Form.Label, { children: "Preference Type" }), _jsxs(Form.Select, { value: editingPreference.preferenceType || "", onChange: (e) => setEditingPreference({
                                                        ...editingPreference,
                                                        preferenceType: e.target.value
                                                    }), children: [_jsx("option", { value: "", children: "Select Type..." }), _jsx("option", { value: UserPreferencePreferenceTypeEnum.UXLAYOUT, children: "UX Layout" }), _jsx("option", { value: UserPreferencePreferenceTypeEnum.UXMODE, children: "UX Mode" }), _jsx("option", { value: UserPreferencePreferenceTypeEnum.UXTHEME, children: "UX Theme" }), _jsx("option", { value: UserPreferencePreferenceTypeEnum.MEASUREMENT, children: "Measurement" })] })] }) }), _jsx(Col, { md: 6, children: _jsxs(Form.Group, { className: "mb-3", children: [_jsx(Form.Label, { children: "Principal ID" }), _jsx(Form.Control, { type: "text", value: editingPreference.principalId || currentPrincipalId || "", onChange: (e) => setEditingPreference({
                                                        ...editingPreference,
                                                        principalId: e.target.value
                                                    }), placeholder: "Enter Principal ID" })] }) })] }), _jsx(Row, { children: _jsx(Col, { children: _jsxs(Form.Group, { className: "mb-3", children: [_jsx(Form.Label, { children: "Preference Value" }), _jsx(Form.Control, { as: "textarea", rows: 3, value: editingPreference.preference || "", onChange: (e) => setEditingPreference({
                                                    ...editingPreference,
                                                    preference: e.target.value
                                                }), placeholder: "Enter preference value (JSON, string, etc.)" }), _jsx(Form.Text, { className: "text-muted", children: "This can be JSON configuration, simple string values, or any preference data." })] }) }) })] })] }), _jsxs(Modal.Footer, { children: [_jsxs(VSCodeButton, { appearance: "secondary", onClick: () => setShowEditModal(false), children: [_jsx(FaTimes, { className: "me-1" }), "Cancel"] }), _jsxs(CoolButton, { variant: "primary", onClick: handleSavePreference, disabled: isAdding || isUpdating || !editingPreference.preferenceType, children: [_jsx(FaSave, { className: "me-1" }), isAdding || isUpdating ? "Saving..." : "Save Preference"] })] })] }));
    // Render detail modal
    const renderDetailModal = () => (_jsxs(Modal, { show: showDetailModal, onHide: () => setShowDetailModal(false), size: "lg", children: [_jsx(Modal.Header, { closeButton: true, children: _jsxs(Modal.Title, { children: [_jsx(FaUser, { className: "me-2" }), "Preference Details"] }) }), _jsx(Modal.Body, { children: selectedPreference && (_jsxs(Row, { children: [_jsx(Col, { md: 6, children: _jsxs(Card, { children: [_jsx(Card.Header, { children: "Basic Information" }), _jsx(Card.Body, { children: _jsxs("dl", { className: "row", children: [_jsx("dt", { className: "col-sm-4", children: "ID:" }), _jsx("dd", { className: "col-sm-8", children: selectedPreference.id || "N/A" }), _jsx("dt", { className: "col-sm-4", children: "Type:" }), _jsx("dd", { className: "col-sm-8", children: _jsx(Badge, { bg: "primary", children: selectedPreference.preferenceType }) }), _jsx("dt", { className: "col-sm-4", children: "Principal ID:" }), _jsx("dd", { className: "col-sm-8", children: selectedPreference.principalId || "N/A" }), _jsx("dt", { className: "col-sm-4", children: "Owner ID:" }), _jsx("dd", { className: "col-sm-8", children: selectedPreference.ownerId || "N/A" })] }) })] }) }), _jsx(Col, { md: 6, children: _jsxs(Card, { children: [_jsx(Card.Header, { children: "Audit Information" }), _jsx(Card.Body, { children: _jsxs("dl", { className: "row", children: [_jsx("dt", { className: "col-sm-5", children: "Created:" }), _jsx("dd", { className: "col-sm-7", children: selectedPreference.createdDate
                                                        ? format(new Date(selectedPreference.createdDate), "MMM dd, yyyy HH:mm")
                                                        : "N/A" }), _jsx("dt", { className: "col-sm-5", children: "Last Modified:" }), _jsx("dd", { className: "col-sm-7", children: selectedPreference.lastModifiedDate
                                                        ? format(new Date(selectedPreference.lastModifiedDate), "MMM dd, yyyy HH:mm")
                                                        : "N/A" }), _jsx("dt", { className: "col-sm-5", children: "Last Modified By:" }), _jsx("dd", { className: "col-sm-7", children: selectedPreference.lastModifiedById || "N/A" }), _jsx("dt", { className: "col-sm-5", children: "Last Accessed:" }), _jsx("dd", { className: "col-sm-7", children: selectedPreference.lastAccessedDate
                                                        ? format(new Date(selectedPreference.lastAccessedDate), "MMM dd, yyyy HH:mm")
                                                        : "N/A" })] }) })] }) }), _jsx(Col, { xs: 12, className: "mt-3", children: _jsxs(Card, { children: [_jsx(Card.Header, { children: "Preference Value" }), _jsx(Card.Body, { children: _jsx("pre", { className: "bg-light p-3 rounded", children: selectedPreference.preference || "No preference value set" }) })] }) })] })) }), _jsxs(Modal.Footer, { children: [_jsx(VSCodeButton, { appearance: "secondary", onClick: () => setShowDetailModal(false), children: "Close" }), _jsxs(CoolButton, { variant: "primary", onClick: () => {
                            setShowDetailModal(false);
                            handleEditPreference(selectedPreference);
                        }, children: [_jsx(FaEdit, { className: "me-1" }), "Edit Preference"] })] })] }));
    // Error handling
    if (preferencesError || salesOrdersError || customersError || invoicesError || principalsError) {
        return (_jsx("div", { className: `user-preferences-error ${className}`, children: _jsxs(Alert, { variant: "danger", children: [_jsx("h5", { children: "Error Loading Data" }), _jsx("p", { children: "There was an error loading the user preferences and related data:" }), _jsxs("ul", { children: [preferencesError && _jsxs("li", { children: ["User Preferences: ", String(preferencesError)] }), salesOrdersError && _jsxs("li", { children: ["Sales Orders: ", String(salesOrdersError)] }), customersError && _jsxs("li", { children: ["Customers: ", String(customersError)] }), invoicesError && _jsxs("li", { children: ["Invoices: ", String(invoicesError)] }), principalsError && _jsxs("li", { children: ["Principals: ", String(principalsError)] })] }), _jsx(CoolButton, { variant: "outline-danger", onClick: () => window.location.reload(), children: "Retry" })] }) }));
    }
    // Loading state
    if (isLoading) {
        return (_jsx("div", { className: `user-preferences-loading ${className}`, style: {
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px"
            }, children: _jsxs("div", { className: "text-center", children: [_jsx(LoadingSpinner, { label: "Loading user preferences and related data...", size: 32 }), _jsx("div", { className: "mt-3", children: _jsx("small", { className: "text-muted", children: "Fetching preferences, sales orders, customers, and invoices..." }) })] }) }));
    }
    return (_jsxs("div", { className: `user-preferences ${className}`, children: [_jsxs("div", { className: "d-flex justify-content-between align-items-center mb-4", children: [_jsxs("div", { children: [_jsxs("h3", { children: [_jsx(FaUser, { className: "me-2" }), "User Preferences"] }), _jsx("p", { className: "text-muted mb-0", children: "Manage your preferences and view related data including sales orders, customers, and invoices." })] }), _jsx("div", { children: _jsxs(CoolButton, { variant: "primary", onClick: () => handleEditPreference(null), disabled: isAdding, children: [_jsx(FaPlus, { className: "me-1" }), "Add Preference"] }) })] }), renderStatsOverview(), renderRecentActivity(), _jsx(VSCodeDivider, {}), _jsxs("div", { className: "mt-4", children: [_jsxs("h4", { className: "mb-3", children: [_jsx(FaCog, { className: "me-2" }), "Your Preferences"] }), renderPreferenceTabs()] }), renderEditModal(), renderDetailModal()] }));
});
UserPreferences.displayName = "UserPreferences";
export default UserPreferences;
//# sourceMappingURL=UserPreferences.js.map