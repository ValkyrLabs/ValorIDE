// tslint:disable
import * as runtime from "../src/runtime";
import {
  ApplicationFromJSON,
  InvokeMcpToolRequestToJSON,
  McpServiceRegistryFromJSON,
  McpServiceRegistryToJSON,
  McpServiceResponseFromJSON,
  PublishRestEndpointRequestToJSON,
  PublishWorkflowRequestToJSON,
} from "../model";
/**
 * Retrieves detailed information about a published MCP service
 * Get MCP service details
 */
function getMcpServiceRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.slug === null || requestParameters.slug === undefined) {
    throw new runtime.RequiredError(
      "slug",
      "Required parameter requestParameters.slug was null or undefined when calling getMcpService.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/services/{slug}`.replace(
      `{${"slug"}}`,
      encodeURIComponent(String(requestParameters.slug)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "GET",
      headers: headerParameters,
    },
    body: queryParameters,
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(McpServiceRegistryFromJSON(body), text);
  }
  return config;
}
/**
 * Retrieves detailed information about a published MCP service
 * Get MCP service details
 */
export function getMcpService(requestParameters, requestConfig) {
  return getMcpServiceRaw(requestParameters, requestConfig);
}
/**
 * Returns the manifest.yaml file for a published MCP service (machine-readable format)
 * Download MCP service manifest
 */
function getMcpServiceManifestRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.slug === null || requestParameters.slug === undefined) {
    throw new runtime.RequiredError(
      "slug",
      "Required parameter requestParameters.slug was null or undefined when calling getMcpServiceManifest.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/services/{slug}/manifest.yaml`.replace(
      `{${"slug"}}`,
      encodeURIComponent(String(requestParameters.slug)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "GET",
      headers: headerParameters,
    },
    body: queryParameters,
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    throw "OH NO";
  }
  return config;
}
/**
 * Returns the manifest.yaml file for a published MCP service (machine-readable format)
 * Download MCP service manifest
 */
export function getMcpServiceManifest(requestParameters, requestConfig) {
  return getMcpServiceManifestRaw(requestParameters, requestConfig);
}
/**
 * Calls a specific tool within a published MCP service
 * Invoke an MCP tool within a service
 */
function invokeMcpToolRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.slug === null || requestParameters.slug === undefined) {
    throw new runtime.RequiredError(
      "slug",
      "Required parameter requestParameters.slug was null or undefined when calling invokeMcpTool.",
    );
  }
  if (
    requestParameters.invokeMcpToolRequest === null ||
    requestParameters.invokeMcpToolRequest === undefined
  ) {
    throw new runtime.RequiredError(
      "invokeMcpToolRequest",
      "Required parameter requestParameters.invokeMcpToolRequest was null or undefined when calling invokeMcpTool.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/services/{slug}/invoke`.replace(
      `{${"slug"}}`,
      encodeURIComponent(String(requestParameters.slug)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "POST",
      headers: headerParameters,
    },
    body:
      queryParameters ||
      InvokeMcpToolRequestToJSON(requestParameters.invokeMcpToolRequest),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
  }
  return config;
}
/**
 * Calls a specific tool within a published MCP service
 * Invoke an MCP tool within a service
 */
export function invokeMcpTool(requestParameters, requestConfig) {
  return invokeMcpToolRaw(requestParameters, requestConfig);
}
/**
 * Returns registry of all published MCP services available in marketplace
 * List all published MCP services
 */
function listMcpServicesRaw(requestParameters, requestConfig = {}) {
  let queryParameters = null;
  queryParameters = {};
  if (requestParameters.published !== undefined) {
    queryParameters["published"] = requestParameters.published;
  }
  if (requestParameters.category !== undefined) {
    queryParameters["category"] = requestParameters.category;
  }
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/services`,
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "GET",
      headers: headerParameters,
    },
    body: queryParameters,
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(body.map(McpServiceRegistryFromJSON), text);
  }
  return config;
}
/**
 * Returns registry of all published MCP services available in marketplace
 * List all published MCP services
 */
export function listMcpServices(requestParameters, requestConfig) {
  return listMcpServicesRaw(requestParameters, requestConfig);
}
/**
 * Scans a Spring controller and publishes its endpoints as MCP tools in the marketplace
 * Publish a Spring REST endpoint as an MCP tool
 */
function publishRestEndpointAsMcpRaw(requestParameters, requestConfig = {}) {
  if (
    requestParameters.publishRestEndpointRequest === null ||
    requestParameters.publishRestEndpointRequest === undefined
  ) {
    throw new runtime.RequiredError(
      "publishRestEndpointRequest",
      "Required parameter requestParameters.publishRestEndpointRequest was null or undefined when calling publishRestEndpointAsMcp.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/publish-rest-endpoint`,
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "POST",
      headers: headerParameters,
    },
    body:
      queryParameters ||
      PublishRestEndpointRequestToJSON(
        requestParameters.publishRestEndpointRequest,
      ),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(McpServiceResponseFromJSON(body), text);
  }
  return config;
}
/**
 * Scans a Spring controller and publishes its endpoints as MCP tools in the marketplace
 * Publish a Spring REST endpoint as an MCP tool
 */
export function publishRestEndpointAsMcp(requestParameters, requestConfig) {
  return publishRestEndpointAsMcpRaw(requestParameters, requestConfig);
}
/**
 * Creates an MCP tool that invokes a workflow when called
 * Publish a ValkyrAI workflow as an MCP tool
 */
function publishWorkflowAsMcpRaw(requestParameters, requestConfig = {}) {
  if (
    requestParameters.publishWorkflowRequest === null ||
    requestParameters.publishWorkflowRequest === undefined
  ) {
    throw new runtime.RequiredError(
      "publishWorkflowRequest",
      "Required parameter requestParameters.publishWorkflowRequest was null or undefined when calling publishWorkflowAsMcp.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/publish-workflow`,
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "POST",
      headers: headerParameters,
    },
    body:
      queryParameters ||
      PublishWorkflowRequestToJSON(requestParameters.publishWorkflowRequest),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(McpServiceResponseFromJSON(body), text);
  }
  return config;
}
/**
 * Creates an MCP tool that invokes a workflow when called
 * Publish a ValkyrAI workflow as an MCP tool
 */
export function publishWorkflowAsMcp(requestParameters, requestConfig) {
  return publishWorkflowAsMcpRaw(requestParameters, requestConfig);
}
/**
 * Removes a service from the marketplace and stops it from being discoverable
 * Unpublish MCP service
 */
function unpublishMcpServiceRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.slug === null || requestParameters.slug === undefined) {
    throw new runtime.RequiredError(
      "slug",
      "Required parameter requestParameters.slug was null or undefined when calling unpublishMcpService.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/services/{slug}`.replace(
      `{${"slug"}}`,
      encodeURIComponent(String(requestParameters.slug)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "DELETE",
      headers: headerParameters,
    },
    body: queryParameters,
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
  }
  return config;
}
/**
 * Removes a service from the marketplace and stops it from being discoverable
 * Unpublish MCP service
 */
export function unpublishMcpService(requestParameters, requestConfig) {
  return unpublishMcpServiceRaw(requestParameters, requestConfig);
}
/**
 * Updates metadata and configuration for a published MCP service
 * Update MCP service
 */
function updateMcpServiceRaw(requestParameters, requestConfig = {}) {
  if (requestParameters.slug === null || requestParameters.slug === undefined) {
    throw new runtime.RequiredError(
      "slug",
      "Required parameter requestParameters.slug was null or undefined when calling updateMcpService.",
    );
  }
  if (
    requestParameters.mcpServiceRegistry === null ||
    requestParameters.mcpServiceRegistry === undefined
  ) {
    throw new runtime.RequiredError(
      "mcpServiceRegistry",
      "Required parameter requestParameters.mcpServiceRegistry was null or undefined when calling updateMcpService.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  headerParameters["Content-Type"] = "application/json";
  const { meta = {} } = requestConfig;
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/services/{slug}`.replace(
      `{${"slug"}}`,
      encodeURIComponent(String(requestParameters.slug)),
    ),
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "PUT",
      headers: headerParameters,
    },
    body:
      queryParameters ||
      McpServiceRegistryToJSON(requestParameters.mcpServiceRegistry),
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(McpServiceRegistryFromJSON(body), text);
  }
  return config;
}
/**
 * Updates metadata and configuration for a published MCP service
 * Update MCP service
 */
export function updateMcpService(requestParameters, requestConfig) {
  return updateMcpServiceRaw(requestParameters, requestConfig);
}
/**
 * Uploads an OpenAPI specification file (YAML or JSON), validates it, and creates a new Application record with all metadata fields populated from the spec. Returns the created Application object.
 * Upload OpenAPI spec and create Application
 */
function uploadOpenAPIAndCreateApplicationRaw(
  requestParameters,
  requestConfig = {},
) {
  if (
    requestParameters.specification === null ||
    requestParameters.specification === undefined
  ) {
    throw new runtime.RequiredError(
      "specification",
      "Required parameter requestParameters.specification was null or undefined when calling uploadOpenAPIAndCreateApplication.",
    );
  }
  let queryParameters = null;
  const headerParameters = {};
  const { meta = {} } = requestConfig;
  const formData = new FormData();
  if (requestParameters.specification !== undefined) {
    formData.append("specification", requestParameters.specification);
  }
  const config = {
    url: `${runtime.Configuration.basePath}/mcp/openapi/upload`,
    meta,
    update: requestConfig.update,
    queryKey: requestConfig.queryKey,
    optimisticUpdate: requestConfig.optimisticUpdate,
    force: requestConfig.force,
    rollback: requestConfig.rollback,
    options: {
      method: "POST",
      headers: headerParameters,
    },
    body: formData,
  };
  const { transform: requestTransform } = requestConfig;
  if (requestTransform) {
    config.transform = (body, text) =>
      requestTransform(ApplicationFromJSON(body), text);
  }
  return config;
}
/**
 * Uploads an OpenAPI specification file (YAML or JSON), validates it, and creates a new Application record with all metadata fields populated from the spec. Returns the created Application object.
 * Upload OpenAPI spec and create Application
 */
export function uploadOpenAPIAndCreateApplication(
  requestParameters,
  requestConfig,
) {
  return uploadOpenAPIAndCreateApplicationRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpApi.js.map
