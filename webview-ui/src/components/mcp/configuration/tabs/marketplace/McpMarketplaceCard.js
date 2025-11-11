import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useState, useRef, useMemo } from "react";
import styled from "styled-components";
import { vscode } from "@/utils/vscode";
import { useEvent } from "react-use";
import { FaGithub, FaStar, FaCloudDownloadAlt, FaKey } from "react-icons/fa";
const McpMarketplaceCard = ({ item, installedServers, }) => {
    const isInstalled = installedServers.some((server) => server.name === item.mcpId);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const githubLinkRef = useRef(null);
    const handleMessage = useCallback((event) => {
        const message = event.data;
        switch (message.type) {
            case "mcpDownloadDetails":
                setIsDownloading(false);
                break;
            case "relinquishControl":
                setIsLoading(false);
                break;
        }
    }, []);
    useEvent("message", handleMessage);
    const githubAuthorUrl = useMemo(() => {
        const url = new URL(item.githubUrl);
        const pathParts = url.pathname.split("/");
        if (pathParts.length >= 2) {
            return `${url.origin}/${pathParts[1]}`;
        }
        return item.githubUrl;
    }, [item.githubUrl]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
					.mcp-card {
						cursor: pointer;
						outline: none !important;
					}
					.mcp-card:hover {
						background-color: var(--vscode-list-hoverBackground);
					}
					.mcp-card:focus {
						outline: none !important;
					}
				` }), _jsxs("a", { href: item.githubUrl, className: "mcp-card", style: {
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    cursor: isLoading ? "wait" : "pointer",
                    textDecoration: "none",
                    color: "inherit",
                }, children: [_jsxs("div", { style: { display: "flex", gap: "12px" }, children: [item.logoUrl && (_jsx("img", { src: item.logoUrl, alt: `${item.name} logo`, style: {
                                    width: 42,
                                    height: 42,
                                    borderRadius: 4,
                                } })), _jsxs("div", { style: {
                                    flex: 1,
                                    minWidth: 0,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                }, children: [_jsxs("div", { style: {
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: "16px",
                                        }, children: [_jsx("h3", { style: {
                                                    margin: 0,
                                                    fontSize: "13px",
                                                    fontWeight: 600,
                                                }, children: item.name }), _jsx("div", { onClick: (e) => {
                                                    e.preventDefault(); // Prevent card click when clicking install
                                                    e.stopPropagation(); // Stop event from bubbling up to parent link
                                                    if (!isInstalled && !isDownloading) {
                                                        setIsDownloading(true);
                                                        vscode.postMessage({
                                                            type: "downloadMcp",
                                                            mcpId: item.mcpId,
                                                        });
                                                    }
                                                }, style: {}, children: _jsx(StyledInstallButton, { disabled: isInstalled || isDownloading, "$isInstalled": isInstalled, children: isInstalled
                                                        ? "Installed"
                                                        : isDownloading
                                                            ? "Installing..."
                                                            : "Install" }) })] }), _jsxs("div", { style: {
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            fontSize: "12px",
                                            color: "var(--vscode-descriptionForeground)",
                                            flexWrap: "wrap",
                                            minWidth: 0,
                                            rowGap: 0,
                                        }, children: [_jsx("a", { href: githubAuthorUrl, style: {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    color: "var(--vscode-foreground)",
                                                    minWidth: 0,
                                                    opacity: 0.7,
                                                    textDecoration: "none",
                                                    border: "none !important",
                                                }, className: "github-link", onMouseEnter: (e) => {
                                                    e.currentTarget.style.opacity = "1";
                                                    e.currentTarget.style.color = "var(--link-active-foreground)";
                                                }, onMouseLeave: (e) => {
                                                    e.currentTarget.style.opacity = "0.7";
                                                    e.currentTarget.style.color = "var(--vscode-foreground)";
                                                }, children: _jsxs("div", { style: { display: "flex", gap: "4px", alignItems: "center" }, ref: githubLinkRef, children: [_jsx(FaGithub, { style: { fontSize: "14px" } }), _jsx("span", { style: {
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                wordBreak: "break-all",
                                                                minWidth: 0,
                                                            }, children: item.author })] }) }), _jsxs("div", { style: {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    minWidth: 0,
                                                    flexShrink: 0,
                                                }, children: [_jsx(FaStar, {}), _jsx("span", { style: { wordBreak: "break-all" }, children: item.githubStars?.toLocaleString() ?? 0 })] }), _jsxs("div", { style: {
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "4px",
                                                    minWidth: 0,
                                                    flexShrink: 0,
                                                }, children: [_jsx(FaCloudDownloadAlt, {}), _jsx("span", { style: { wordBreak: "break-all" }, children: item.downloadCount?.toLocaleString() ?? 0 })] }), item.requiresApiKey && (_jsx(FaKey, { title: "Requires API key", style: { flexShrink: 0 } }))] })] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: [_jsx("p", { style: { fontSize: "13px", margin: 0 }, children: item.description }), _jsxs("div", { style: {
                                    display: "flex",
                                    gap: "6px",
                                    flexWrap: "nowrap",
                                    overflowX: "auto",
                                    scrollbarWidth: "none",
                                    position: "relative",
                                }, onScroll: (e) => {
                                    const target = e.currentTarget;
                                    const gradient = target.querySelector(".tags-gradient");
                                    if (gradient) {
                                        gradient.style.visibility =
                                            target.scrollLeft > 0 ? "hidden" : "visible";
                                    }
                                }, children: [_jsx("span", { style: {
                                            fontSize: "10px",
                                            padding: "1px 4px",
                                            borderRadius: "3px",
                                            border: "1px solid color-mix(in srgb, var(--vscode-descriptionForeground) 50%, transparent)",
                                            color: "var(--vscode-descriptionForeground)",
                                            whiteSpace: "nowrap",
                                        }, children: item.category }), item.tags.map((tag, index) => (_jsxs("span", { style: {
                                            fontSize: "10px",
                                            padding: "1px 4px",
                                            borderRadius: "3px",
                                            border: "1px solid color-mix(in srgb, var(--vscode-descriptionForeground) 50%, transparent)",
                                            color: "var(--vscode-descriptionForeground)",
                                            whiteSpace: "nowrap",
                                            display: "inline-flex",
                                        }, children: [tag, index === item.tags.length - 1 ? "" : ""] }, tag))), _jsx("div", { className: "tags-gradient", style: {
                                            position: "absolute",
                                            right: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: "32px",
                                            background: "linear-gradient(to right, transparent, var(--vscode-sideBar-background))",
                                            pointerEvents: "none",
                                        } })] })] })] })] }));
};
const StyledInstallButton = styled.button `
  font-size: 12px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 2px;
  border: none;
  cursor: pointer;
  background: ${(props) => props.$isInstalled
    ? "var(--vscode-button-secondaryBackground)"
    : "var(--vscode-button-background)"};
  color: var(--vscode-button-foreground);

  &:hover:not(:disabled) {
    background: ${(props) => props.$isInstalled
    ? "var(--vscode-button-secondaryHoverBackground)"
    : "var(--vscode-button-hoverBackground)"};
  }

  &:active:not(:disabled) {
    background: ${(props) => props.$isInstalled
    ? "var(--vscode-button-secondaryBackground)"
    : "var(--vscode-button-background)"};
    opacity: 0.7;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
export default McpMarketplaceCard;
//# sourceMappingURL=McpMarketplaceCard.js.map