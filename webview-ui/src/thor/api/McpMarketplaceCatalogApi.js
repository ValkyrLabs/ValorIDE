// tslint:disable
import * as runtime from '../src/runtime';
import { McpMarketplaceCatalogFromJSON, McpMarketplaceCatalogToJSON, } from '../model';
/**
 * Deletes a specific McpMarketplaceCatalog.
 * Delete a McpMarketplaceCatalog.
 */
function deleteMcpMarketplaceCatalogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpMarketplaceCatalog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceCatalog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'DELETE',
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
* Deletes a specific McpMarketplaceCatalog.
* Delete a McpMarketplaceCatalog.
*/
export function deleteMcpMarketplaceCatalog(requestParameters, requestConfig) {
    return deleteMcpMarketplaceCatalogRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpMarketplaceCatalog for a specific uid.
 * Retrieve a single McpMarketplaceCatalog
 */
function getMcpMarketplaceCatalogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpMarketplaceCatalog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceCatalog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'GET',
            headers: headerParameters,
        },
        body: queryParameters,
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpMarketplaceCatalogFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpMarketplaceCatalog for a specific uid.
* Retrieve a single McpMarketplaceCatalog
*/
export function getMcpMarketplaceCatalog(requestParameters, requestConfig) {
    return getMcpMarketplaceCatalogRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpMarketplaceCatalogs.
 * Retrieve a list of McpMarketplaceCatalogs
 */
function getMcpMarketplaceCatalogListRaw(requestParameters, requestConfig = {}) {
    let queryParameters = null;
    queryParameters = {};
    if (requestParameters.page !== undefined) {
        queryParameters['page'] = requestParameters.page;
    }
    if (requestParameters.size !== undefined) {
        queryParameters['size'] = requestParameters.size;
    }
    if (requestParameters.sort) {
        queryParameters['sort'] = requestParameters.sort;
    }
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceCatalog`,
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'GET',
            headers: headerParameters,
        },
        body: queryParameters,
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(body.map(McpMarketplaceCatalogFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpMarketplaceCatalogs.
* Retrieve a list of McpMarketplaceCatalogs
*/
export function getMcpMarketplaceCatalogList(requestParameters, requestConfig) {
    return getMcpMarketplaceCatalogListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpMarketplaceCatalog.
 * Create a new McpMarketplaceCatalog
 */
function postMcpMarketplaceCatalogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpMarketplaceCatalog === null || requestParameters.mcpMarketplaceCatalog === undefined) {
        throw new runtime.RequiredError('mcpMarketplaceCatalog', 'Required parameter requestParameters.mcpMarketplaceCatalog was null or undefined when calling postMcpMarketplaceCatalog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceCatalog`,
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'POST',
            headers: headerParameters,
        },
        body: queryParameters || McpMarketplaceCatalogToJSON(requestParameters.mcpMarketplaceCatalog),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpMarketplaceCatalogFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpMarketplaceCatalog.
* Create a new McpMarketplaceCatalog
*/
export function postMcpMarketplaceCatalog(requestParameters, requestConfig) {
    return postMcpMarketplaceCatalogRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpMarketplaceCatalog.
 * Update an existing McpMarketplaceCatalog
 */
function updateMcpMarketplaceCatalogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpMarketplaceCatalog.');
    }
    if (requestParameters.mcpMarketplaceCatalog === null || requestParameters.mcpMarketplaceCatalog === undefined) {
        throw new runtime.RequiredError('mcpMarketplaceCatalog', 'Required parameter requestParameters.mcpMarketplaceCatalog was null or undefined when calling updateMcpMarketplaceCatalog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceCatalog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
        meta,
        update: requestConfig.update,
        queryKey: requestConfig.queryKey,
        optimisticUpdate: requestConfig.optimisticUpdate,
        force: requestConfig.force,
        rollback: requestConfig.rollback,
        options: {
            method: 'PUT',
            headers: headerParameters,
        },
        body: queryParameters || McpMarketplaceCatalogToJSON(requestParameters.mcpMarketplaceCatalog),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpMarketplaceCatalogFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpMarketplaceCatalog.
* Update an existing McpMarketplaceCatalog
*/
export function updateMcpMarketplaceCatalog(requestParameters, requestConfig) {
    return updateMcpMarketplaceCatalogRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpMarketplaceCatalogApi.js.map