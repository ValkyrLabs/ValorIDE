import React, { useMemo, useState } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
  VSCodeRadioGroup,
  VSCodeRadio,
  VSCodeDropdown,
  VSCodeOption,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import { FaExternalLinkAlt, FaSync, FaSearch, FaTimes } from "react-icons/fa";
import { McpMarketplaceItem } from "@shared/mcp";
import { vscode } from "@thorapi/utils/vscode";
import McpMarketplaceCard from "./McpMarketplaceCard";
import McpSubmitCard from "./McpSubmitCard";
import {
  formatError,
  getErrorTitle,
  isRetryableError,
} from "@thorapi/utils/errorHandling";
import Tooltip from "@thorapi/components/common/Tooltip";
import SystemAlerts from "@thorapi/components/SystemAlerts";
import { useExtensionState } from "@thorapi/context/ExtensionStateContext";

const MCP_MARKETPLACE_HELP_URL =
  "https://valkyrlabs.com/v1/docs/Products/ValorIDE/valoride-documentation";

const McpMarketplaceView = () => {
  const {
    mcpServers: extensionMcpServers,
    mcpMarketplaceCatalog,
    mcpServersLoading,
    mcpMarketplaceCatalogLoading,
    mcpMarketplaceCatalogError,
    refetchMcpData,
  } = useExtensionState();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "newest" | "stars" | "name" | "downloadCount"
  >("downloadCount");

  const extensionMarketplaceItems = mcpMarketplaceCatalog?.items || [];
  const items = extensionMarketplaceItems;
  const displayedMcpServers = extensionMcpServers;

  // Combined loading and error states
  const isLoading =
    (mcpServersLoading || mcpMarketplaceCatalogLoading) && items.length === 0;
  const error = items.length === 0 ? mcpMarketplaceCatalogError : undefined;

  const handleRefresh = React.useCallback(() => {
    try {
      refetchMcpData();
      vscode.postMessage({ type: "fetchMcpMarketplace", bool: true });
    } catch (error) {
      console.error("Failed to refresh marketplace:", error);
    }
  }, [refetchMcpData]);

  const handleOpenHelp = React.useCallback(() => {
    vscode.postMessage({
      type: "openInBrowser",
      url: MCP_MARKETPLACE_HELP_URL,
    });
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(items.map((item) => item.category));
    return Array.from(uniqueCategories).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          searchQuery === "" ||
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tags.some((tag) =>
            tag.toLowerCase().includes(searchQuery.toLowerCase()),
          );
        const matchesCategory =
          !selectedCategory || item.category === selectedCategory;
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
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
          default:
            return 0;
        }
      });
  }, [items, searchQuery, selectedCategory, sortBy]);

  if (isLoading) {
    return (
      <>
        <SystemAlerts />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            padding: "20px",
          }}
        >
          <VSCodeProgressRing />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SystemAlerts />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            padding: "20px",
            gap: "16px",
          }}
        >
          <div
            style={{
              color: "var(--vscode-errorForeground)",
              backgroundColor: "var(--vscode-inputValidation-errorBackground)",
              border: "1px solid var(--vscode-inputValidation-errorBorder)",
              borderRadius: "4px",
              padding: "16px",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                marginBottom: "8px",
                fontWeight: "bold",
                fontSize: "14px",
              }}
            >
              {getErrorTitle(error)}: Failed to load marketplace
            </div>
            <div
              style={{ fontSize: "12px", opacity: 0.9, marginBottom: "12px" }}
            >
              {formatError(error)}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {isRetryableError(error) && (
                <VSCodeButton
                  appearance="secondary"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  style={{ fontSize: "11px", padding: "4px 12px" }}
                >
                  <FaSync style={{ marginRight: "4px" }} />
                  {isLoading ? "Retrying..." : "Retry"}
                </VSCodeButton>
              )}
              <VSCodeButton
                appearance="secondary"
                onClick={handleOpenHelp}
                style={{ fontSize: "11px", padding: "4px 12px" }}
              >
                <FaExternalLinkAlt style={{ marginRight: "4px" }} />
                Help
              </VSCodeButton>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SystemAlerts />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <div
          style={{
            padding: "20px 20px 5px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Refresh Button */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Tooltip tipText="Refresh Marketplace">
              <VSCodeButton
                appearance="secondary"
                onClick={handleRefresh}
                disabled={isLoading}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                {isLoading ? (
                  <VSCodeProgressRing
                    style={{ width: "14px", height: "14px" }}
                  />
                ) : (
                  <FaSync />
                )}
                Refresh
              </VSCodeButton>
            </Tooltip>
          </div>

          {/* Search row */}
          <VSCodeTextField
            style={{ width: "100%" }}
            placeholder="Search MCPs..."
            value={searchQuery}
            onInput={(e) =>
              setSearchQuery((e.target as HTMLInputElement).value)
            }
          >
            <div slot="start">
              <FaSearch
                style={{
                  fontSize: 13,
                  opacity: 0.8,
                }}
              />
            </div>
            {searchQuery && (
              <div
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                slot="end"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  cursor: "pointer",
                }}
              >
                <FaTimes />
              </div>
            )}
          </VSCodeTextField>

          {/* Filter row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--vscode-descriptionForeground)",
                textTransform: "uppercase",
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              Filter:
            </span>
            <div
              style={{
                position: "relative",
                zIndex: 2,
                flex: 1,
              }}
            >
              <VSCodeDropdown
                style={{
                  width: "100%",
                }}
                value={selectedCategory || ""}
                onChange={(e) =>
                  setSelectedCategory(
                    (e.target as HTMLSelectElement).value || null,
                  )
                }
              >
                <VSCodeOption value="">All Categories</VSCodeOption>
                {categories.map((category) => (
                  <VSCodeOption key={category} value={category}>
                    {category}
                  </VSCodeOption>
                ))}
              </VSCodeDropdown>
            </div>
          </div>

          {/* Sort row */}
          <div
            style={{
              display: "flex",
              gap: "8px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                color: "var(--vscode-descriptionForeground)",
                textTransform: "uppercase",
                fontWeight: 500,
                marginTop: "3px",
              }}
            >
              Sort:
            </span>
            <VSCodeRadioGroup
              style={{
                display: "flex",
                flexWrap: "wrap",
                marginTop: "-2.5px",
              }}
              value={sortBy}
              onChange={(e) =>
                setSortBy((e.target as HTMLInputElement).value as typeof sortBy)
              }
            >
              <VSCodeRadio value="downloadCount">Most Installs</VSCodeRadio>
              <VSCodeRadio value="newest">Newest</VSCodeRadio>
              <VSCodeRadio value="stars">GitHub Stars</VSCodeRadio>
              <VSCodeRadio value="name">Name</VSCodeRadio>
            </VSCodeRadioGroup>
          </div>
        </div>

        <style>
          {`
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
			`}
        </style>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredItems.length === 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                padding: "20px",
                color: "var(--vscode-descriptionForeground)",
              }}
            >
              {searchQuery || selectedCategory
                ? "No matching MCP servers found"
                : "No MCP servers found in the marketplace"}
            </div>
          ) : (
            filteredItems.map((item) => (
              <McpMarketplaceCard
                key={item.mcpId}
                item={item}
                installedServers={displayedMcpServers}
              />
            ))
          )}
          <McpSubmitCard />
        </div>
      </div>
    </>
  );
};

export default McpMarketplaceView;
