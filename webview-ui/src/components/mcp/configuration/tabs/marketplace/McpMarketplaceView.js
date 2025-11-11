import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { VSCodeButton, VSCodeProgressRing, VSCodeRadioGroup, VSCodeRadio, VSCodeDropdown, VSCodeOption, VSCodeTextField, } from "@vscode/webview-ui-toolkit/react";
import { FaSync, FaSearch, FaTimes } from "react-icons/fa";
import { vscode } from "@/utils/vscode";
import McpMarketplaceCard from "./McpMarketplaceCard";
import McpSubmitCard from "./McpSubmitCard";
import { useGetMcpServersQuery } from "@/thor/redux/services/McpServerService";
import { useGetMcpMarketplaceCatalogsQuery } from "@/thor/redux/services/McpMarketplaceCatalogService";
import { useGetMcpMarketplaceItemsQuery } from "@/thor/redux/services/McpMarketplaceItemService";
import { convertThorMcpServersToShared, convertThorMcpMarketplaceCatalogsToShared, convertThorMcpMarketplaceItemsToShared, } from "@/utils/mcpTypeConversions";
import { formatError, getErrorTitle, isRetryableError, safeConvert, } from "@/utils/errorHandling";
import Tooltip from "@/components/common/Tooltip";
import SystemAlerts from "@/components/SystemAlerts";
const McpMarketplaceView = () => {
    const { data: mcpServers, error: serversError, isLoading: serversLoading, refetch: refetchServers, } = useGetMcpServersQuery();
    const { data: marketplaceCatalogs, error: catalogError, isLoading: catalogLoading, refetch: refetchCatalog, } = useGetMcpMarketplaceCatalogsQuery();
    const { data: marketplaceItems, error: itemsError, isLoading: itemsLoading, refetch: refetchItems, } = useGetMcpMarketplaceItemsQuery();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sortBy, setSortBy] = useState("downloadCount");
    // Convert Thor data to shared format with error handling
    const sharedMcpServers = React.useMemo(() => {
        return safeConvert(mcpServers, convertThorMcpServersToShared, [], "McpMarketplaceView - MCP Servers");
    }, [mcpServers]);
    const sharedMarketplaceCatalog = React.useMemo(() => {
        return safeConvert(marketplaceCatalogs, convertThorMcpMarketplaceCatalogsToShared, { items: [] }, "McpMarketplaceView - Marketplace Catalog");
    }, [marketplaceCatalogs]);
    // Convert marketplace items directly
    const sharedMarketplaceItems = React.useMemo(() => {
        return safeConvert(marketplaceItems, convertThorMcpMarketplaceItemsToShared, [], "McpMarketplaceView - Marketplace Items");
    }, [marketplaceItems]);
    // Use direct marketplace items if available, otherwise fall back to catalog items
    const items = sharedMarketplaceItems.length > 0 ? sharedMarketplaceItems : sharedMarketplaceCatalog.items;
    // Combined loading and error states
    const isLoading = serversLoading || catalogLoading || itemsLoading;
    const error = serversError || catalogError || itemsError;
    const handleRefresh = React.useCallback(() => {
        try {
            refetchServers();
            refetchCatalog();
            refetchItems();
            vscode.postMessage({ type: "fetchMcpMarketplace", bool: true });
        }
        catch (error) {
            console.error("Failed to refresh marketplace:", error);
        }
    }, [refetchServers, refetchCatalog, refetchItems]);
    const categories = useMemo(() => {
        const uniqueCategories = new Set(items.map((item) => item.category));
        return Array.from(uniqueCategories).sort();
    }, [items]);
    const filteredItems = useMemo(() => {
        return items
            .filter((item) => {
            const matchesSearch = searchQuery === "" ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = !selectedCategory || item.category === selectedCategory;
            return matchesSearch && matchesCategory;
        })
            .sort((a, b) => {
            switch (sortBy) {
                case "downloadCount":
                    return b.downloadCount - a.downloadCount;
                case "stars":
                    return b.githubStars - a.githubStars;
                case "name":
                    return a.name.localeCompare(b.name);
                case "newest":
                    return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                default:
                    return 0;
            }
        });
    }, [items, searchQuery, selectedCategory, sortBy]);
    if (isLoading) {
        return (_jsxs(_Fragment, { children: [_jsx(SystemAlerts, {}), _jsx("div", { style: {
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                        padding: "20px",
                    }, children: _jsx(VSCodeProgressRing, {}) })] }));
    }
    if (error) {
        return (_jsxs(_Fragment, { children: [_jsx(SystemAlerts, {}), _jsx("div", { style: {
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100%",
                        padding: "20px",
                        gap: "16px",
                    }, children: _jsxs("div", { style: {
                            color: "var(--vscode-errorForeground)",
                            backgroundColor: "var(--vscode-inputValidation-errorBackground)",
                            border: "1px solid var(--vscode-inputValidation-errorBorder)",
                            borderRadius: "4px",
                            padding: "16px",
                            maxWidth: "400px",
                            textAlign: "center",
                        }, children: [_jsxs("div", { style: {
                                    marginBottom: "8px",
                                    fontWeight: "bold",
                                    fontSize: "14px",
                                }, children: [getErrorTitle(error), ": Failed to load marketplace"] }), _jsx("div", { style: { fontSize: "12px", opacity: 0.9, marginBottom: "12px" }, children: formatError(error) }), isRetryableError(error) && (_jsxs(VSCodeButton, { appearance: "secondary", onClick: handleRefresh, disabled: isLoading, style: { fontSize: "11px", padding: "4px 12px" }, children: [_jsx(FaSync, { style: { marginRight: "4px" } }), isLoading ? "Retrying..." : "Retry"] }))] }) })] }));
    }
    return (_jsxs(_Fragment, { children: [_jsx(SystemAlerts, {}), _jsxs("div", { style: {
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                }, children: [_jsxs("div", { style: {
                            padding: "20px 20px 5px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                        }, children: [_jsx("div", { style: { display: "flex", justifyContent: "flex-end" }, children: _jsx(Tooltip, { tipText: "Refresh Marketplace", children: _jsxs(VSCodeButton, { appearance: "secondary", onClick: handleRefresh, disabled: isLoading, style: { display: "flex", alignItems: "center", gap: "6px" }, children: [isLoading ? (_jsx(VSCodeProgressRing, { style: { width: "14px", height: "14px" } })) : (_jsx(FaSync, {})), "Refresh"] }) }) }), _jsxs(VSCodeTextField, { style: { width: "100%" }, placeholder: "Search MCPs...", value: searchQuery, onInput: (e) => setSearchQuery(e.target.value), children: [_jsx("div", { slot: "start", children: _jsx(FaSearch, { style: {
                                                fontSize: 13,
                                                opacity: 0.8,
                                            } }) }), searchQuery && (_jsx("div", { "aria-label": "Clear search", onClick: () => setSearchQuery(""), slot: "end", style: {
                                            display: "flex",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            height: "100%",
                                            cursor: "pointer",
                                        }, children: _jsx(FaTimes, {}) }))] }), _jsxs("div", { style: {
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }, children: [_jsx("span", { style: {
                                            fontSize: "11px",
                                            color: "var(--vscode-descriptionForeground)",
                                            textTransform: "uppercase",
                                            fontWeight: 500,
                                            flexShrink: 0,
                                        }, children: "Filter:" }), _jsx("div", { style: {
                                            position: "relative",
                                            zIndex: 2,
                                            flex: 1,
                                        }, children: _jsxs(VSCodeDropdown, { style: {
                                                width: "100%",
                                            }, value: selectedCategory || "", onChange: (e) => setSelectedCategory(e.target.value || null), children: [_jsx(VSCodeOption, { value: "", children: "All Categories" }), categories.map((category) => (_jsx(VSCodeOption, { value: category, children: category }, category)))] }) })] }), _jsxs("div", { style: {
                                    display: "flex",
                                    gap: "8px",
                                }, children: [_jsx("span", { style: {
                                            fontSize: "11px",
                                            color: "var(--vscode-descriptionForeground)",
                                            textTransform: "uppercase",
                                            fontWeight: 500,
                                            marginTop: "3px",
                                        }, children: "Sort:" }), _jsxs(VSCodeRadioGroup, { style: {
                                            display: "flex",
                                            flexWrap: "wrap",
                                            marginTop: "-2.5px",
                                        }, value: sortBy, onChange: (e) => setSortBy(e.target.value), children: [_jsx(VSCodeRadio, { value: "downloadCount", children: "Most Installs" }), _jsx(VSCodeRadio, { value: "newest", children: "Newest" }), _jsx(VSCodeRadio, { value: "stars", children: "GitHub Stars" }), _jsx(VSCodeRadio, { value: "name", children: "Name" })] })] })] }), _jsx("style", { children: `
				.mcp-search-input,
				.mcp-select {
				box-sizing: border-box;
				}
				.mcp-search-input {
				min-width: 140px;
				}
				.mcp-search-input:focus,
				.mcp-select:focus {
				border-color: var(--vscode-focusBorder) !important;
				}
				.mcp-search-input:hover,
				.mcp-select:hover {
				opacity: 0.9;
				}
			` }), _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [filteredItems.length === 0 ? (_jsx("div", { style: {
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                    height: "100%",
                                    padding: "20px",
                                    color: "var(--vscode-descriptionForeground)",
                                }, children: searchQuery || selectedCategory
                                    ? "No matching MCP servers found"
                                    : "No MCP servers found in the marketplace" })) : (filteredItems.map((item) => (_jsx(McpMarketplaceCard, { item: item, installedServers: sharedMcpServers }, item.mcpId)))), _jsx(McpSubmitCard, {})] })] })] }));
};
export default McpMarketplaceView;
//# sourceMappingURL=McpMarketplaceView.js.map