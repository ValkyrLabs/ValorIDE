// tslint:disable
import * as runtime from '../src/runtime';
import { McpMarketplaceItemFromJSON, McpMarketplaceItemToJSON, } from '../model';
/**
 * Deletes a specific McpMarketplaceItem.
 * Delete a McpMarketplaceItem.
 */
function deleteMcpMarketplaceItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpMarketplaceItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceItem/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpMarketplaceItem.
* Delete a McpMarketplaceItem.
*/
export function deleteMcpMarketplaceItem(requestParameters, requestConfig) {
    return deleteMcpMarketplaceItemRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpMarketplaceItem for a specific uid.
 * Retrieve a single McpMarketplaceItem
 */
function getMcpMarketplaceItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpMarketplaceItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceItem/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpMarketplaceItemFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpMarketplaceItem for a specific uid.
* Retrieve a single McpMarketplaceItem
*/
export function getMcpMarketplaceItem(requestParameters, requestConfig) {
    return getMcpMarketplaceItemRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpMarketplaceItems.
 * Retrieve a list of McpMarketplaceItems
 */
function getMcpMarketplaceItemListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpMarketplaceItem`,
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
        config.transform = (body, text) => requestTransform(body.map(McpMarketplaceItemFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpMarketplaceItems.
* Retrieve a list of McpMarketplaceItems
*/
export function getMcpMarketplaceItemList(requestParameters, requestConfig) {
    return getMcpMarketplaceItemListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpMarketplaceItem.
 * Create a new McpMarketplaceItem
 */
function postMcpMarketplaceItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpMarketplaceItem === null || requestParameters.mcpMarketplaceItem === undefined) {
        throw new runtime.RequiredError('mcpMarketplaceItem', 'Required parameter requestParameters.mcpMarketplaceItem was null or undefined when calling postMcpMarketplaceItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceItem`,
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
        body: queryParameters || McpMarketplaceItemToJSON(requestParameters.mcpMarketplaceItem),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpMarketplaceItemFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpMarketplaceItem.
* Create a new McpMarketplaceItem
*/
export function postMcpMarketplaceItem(requestParameters, requestConfig) {
    return postMcpMarketplaceItemRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpMarketplaceItem.
 * Update an existing McpMarketplaceItem
 */
function updateMcpMarketplaceItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpMarketplaceItem.');
    }
    if (requestParameters.mcpMarketplaceItem === null || requestParameters.mcpMarketplaceItem === undefined) {
        throw new runtime.RequiredError('mcpMarketplaceItem', 'Required parameter requestParameters.mcpMarketplaceItem was null or undefined when calling updateMcpMarketplaceItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpMarketplaceItem/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpMarketplaceItemToJSON(requestParameters.mcpMarketplaceItem),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpMarketplaceItemFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpMarketplaceItem.
* Update an existing McpMarketplaceItem
*/
export function updateMcpMarketplaceItem(requestParameters, requestConfig) {
    return updateMcpMarketplaceItemRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpMarketplaceItemApi.js.map