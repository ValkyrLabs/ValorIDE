import {
	McpServer as SharedMcpServer,
	McpMarketplaceCatalog as SharedMcpMarketplaceCatalog,
	McpMarketplaceItem as SharedMcpMarketplaceItem,
} from "../../../src/shared/mcp"
import {
	McpServer as ThorMcpServer,
	McpMarketplaceCatalog as ThorMcpMarketplaceCatalog,
	McpMarketplaceItem as ThorMcpMarketplaceItem,
	McpServerStatusEnum,
} from "../thor/model"

/**
 * Safely parse JSON string with error handling
 */
function safeJsonParse(jsonString: string | object | null | undefined): object {
	if (!jsonString) return {}
	if (typeof jsonString === "object") return jsonString

	try {
		return JSON.parse(jsonString)
	} catch (error) {
		console.warn("Failed to parse JSON schema:", error, "Input:", jsonString)
		return {}
	}
}

/**
 * Validate and normalize status enum
 */
function normalizeServerStatus(status: any): "connected" | "connecting" | "disconnected" {
	if (!status || typeof status !== "string") return "disconnected"

	const normalizedStatus = status.toLowerCase()
	if (normalizedStatus === "connected" || normalizedStatus === "connecting" || normalizedStatus === "disconnected") {
		return normalizedStatus as "connected" | "connecting" | "disconnected"
	}

	return "disconnected"
}

/**
 * Convert ThorAPI McpServer to shared MCP types with comprehensive error handling
 */
export function convertThorMcpServerToShared(thorServer: ThorMcpServer | null | undefined): SharedMcpServer | null {
	if (!thorServer) {
		console.warn("Attempted to convert null/undefined ThorMcpServer")
		return null
	}

	try {
		return {
			name: thorServer.name || "Unknown Server",
			config: thorServer.config || "",
			status: normalizeServerStatus(thorServer.status),
			error: thorServer.error || undefined,
			tools:
				thorServer.tools
					?.map((tool) => {
						if (!tool) return null
						try {
							return {
								name: tool.name || "Unknown Tool",
								description: tool.description || "",
								inputSchema: safeJsonParse(tool.inputSchema),
								autoApprove: Boolean(tool.autoApprove),
							}
						} catch (error) {
							console.warn("Failed to convert tool:", error, tool)
							return null
						}
					})
					.filter(Boolean) || [],
			resources:
				thorServer.resources
					?.map((resource) => {
						if (!resource) return null
						try {
							return {
								uri: resource.uri || "",
								name: resource.name || "Unknown Resource",
								mimeType: resource.mimeType || "",
								description: resource.description || "",
							}
						} catch (error) {
							console.warn("Failed to convert resource:", error, resource)
							return null
						}
					})
					.filter(Boolean) || [],
			resourceTemplates:
				thorServer.resourceTemplates
					?.map((template) => {
						if (!template) return null
						try {
							return {
								uriTemplate: template.uriTemplate || "",
								name: template.name || "Unknown Template",
								description: template.description || "",
								mimeType: template.mimeType || "",
							}
						} catch (error) {
							console.warn("Failed to convert resource template:", error, template)
							return null
						}
					})
					.filter(Boolean) || [],
			disabled: Boolean(thorServer.disabled),
		}
	} catch (error) {
		console.error("Failed to convert ThorMcpServer to SharedMcpServer:", error, thorServer)
		return null
	}
}

/**
 * Safely convert date to ISO string
 */
function safeDateToISOString(date: any): string {
	if (!date) return new Date().toISOString()
	if (date instanceof Date) return date.toISOString()

	try {
		const parsedDate = new Date(date)
		if (isNaN(parsedDate.getTime())) {
			console.warn("Invalid date provided:", date)
			return new Date().toISOString()
		}
		return parsedDate.toISOString()
	} catch (error) {
		console.warn("Failed to parse date:", error, date)
		return new Date().toISOString()
	}
}

/**
 * Convert ThorAPI McpMarketplaceItem to shared MCP types with error handling
 */
export function convertThorMcpMarketplaceItemToShared(
	thorItem: ThorMcpMarketplaceItem | null | undefined,
): SharedMcpMarketplaceItem | null {
	if (!thorItem) {
		console.warn("Attempted to convert null/undefined ThorMcpMarketplaceItem")
		return null
	}

	try {
		return {
			mcpId: thorItem.id || "",
			githubUrl: thorItem.githubUrl || "",
			name: thorItem.name || "Unknown Item",
			author: thorItem.author || "Unknown Author",
			description: thorItem.description || "",
			codiconIcon: thorItem.codiconIcon || "",
			logoUrl: thorItem.logoUrl || "",
			category: thorItem.category || "Uncategorized",
			tags:
				thorItem.tags
					?.map((tag) => {
						if (!tag) return ""
						return typeof tag === "string" ? tag : tag.name || ""
					})
					.filter(Boolean) || [],
			requiresApiKey: Boolean(thorItem.requiresApiKey),
			readmeContent: thorItem.readmeContent || undefined,
			llmsInstallationContent: thorItem.llmsInstallationContent || undefined,
			isRecommended: Boolean(thorItem.isRecommended),
			githubStars: Math.max(0, Number(thorItem.githubStars) || 0),
			downloadCount: Math.max(0, Number(thorItem.downloadCount) || 0),
			createdAt: safeDateToISOString(thorItem.createdAt),
			updatedAt: safeDateToISOString(thorItem.updatedAt),
			lastGithubSync: safeDateToISOString(thorItem.lastGithubSync),
		}
	} catch (error) {
		console.error("Failed to convert ThorMcpMarketplaceItem to SharedMcpMarketplaceItem:", error, thorItem)
		return null
	}
}

/**
 * Convert ThorAPI McpMarketplaceCatalog to shared MCP types with error handling
 */
export function convertThorMcpMarketplaceCatalogToShared(
	thorCatalog: ThorMcpMarketplaceCatalog | null | undefined,
): SharedMcpMarketplaceCatalog {
	if (!thorCatalog) {
		console.warn("Attempted to convert null/undefined ThorMcpMarketplaceCatalog")
		return { items: [] }
	}

	try {
		return {
			items: thorCatalog.items?.map(convertThorMcpMarketplaceItemToShared).filter(Boolean) || [],
		}
	} catch (error) {
		console.error("Failed to convert ThorMcpMarketplaceCatalog to SharedMcpMarketplaceCatalog:", error, thorCatalog)
		return { items: [] }
	}
}

/**
 * Convert array of ThorAPI McpServers to shared MCP types with error handling
 */
export function convertThorMcpServersToShared(thorServers: ThorMcpServer[] | null | undefined): SharedMcpServer[] {
	if (!thorServers || !Array.isArray(thorServers)) {
		console.warn("Attempted to convert null/undefined/invalid ThorMcpServer array")
		return []
	}

	try {
		return thorServers.map(convertThorMcpServerToShared).filter(Boolean)
	} catch (error) {
		console.error("Failed to convert ThorMcpServer array to SharedMcpServer array:", error, thorServers)
		return []
	}
}

/**
 * Convert array of ThorAPI McpMarketplaceCatalogs to shared MCP types with error handling
 */
export function convertThorMcpMarketplaceCatalogsToShared(
	thorCatalogs: ThorMcpMarketplaceCatalog[] | null | undefined,
): SharedMcpMarketplaceCatalog {
	if (!thorCatalogs || !Array.isArray(thorCatalogs)) {
		console.warn("Attempted to convert null/undefined/invalid ThorMcpMarketplaceCatalog array")
		return { items: [] }
	}

	try {
		// Merge all catalogs into one, filtering out null items
		const allItems = thorCatalogs.flatMap((catalog) => {
			if (!catalog) return []
			return catalog.items?.map(convertThorMcpMarketplaceItemToShared).filter(Boolean) || []
		})

		return {
			items: allItems,
		}
	} catch (error) {
		console.error("Failed to convert ThorMcpMarketplaceCatalog array to SharedMcpMarketplaceCatalog:", error, thorCatalogs)
		return { items: [] }
	}
}
