// tslint:disable
import * as runtime from '../src/runtime';
import { McpResourceFromJSON, McpResourceToJSON, } from '../model';
/**
 * Deletes a specific McpResource.
 * Delete a McpResource.
 */
function deleteMcpResourceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpResource.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResource/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpResource.
* Delete a McpResource.
*/
export function deleteMcpResource(requestParameters, requestConfig) {
    return deleteMcpResourceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpResource for a specific uid.
 * Retrieve a single McpResource
 */
function getMcpResourceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpResource.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResource/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpResourceFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpResource for a specific uid.
* Retrieve a single McpResource
*/
export function getMcpResource(requestParameters, requestConfig) {
    return getMcpResourceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpResources.
 * Retrieve a list of McpResources
 */
function getMcpResourceListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpResource`,
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
        config.transform = (body, text) => requestTransform(body.map(McpResourceFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpResources.
* Retrieve a list of McpResources
*/
export function getMcpResourceList(requestParameters, requestConfig) {
    return getMcpResourceListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpResource.
 * Create a new McpResource
 */
function postMcpResourceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpResource === null || requestParameters.mcpResource === undefined) {
        throw new runtime.RequiredError('mcpResource', 'Required parameter requestParameters.mcpResource was null or undefined when calling postMcpResource.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResource`,
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
        body: queryParameters || McpResourceToJSON(requestParameters.mcpResource),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpResourceFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpResource.
* Create a new McpResource
*/
export function postMcpResource(requestParameters, requestConfig) {
    return postMcpResourceRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpResource.
 * Update an existing McpResource
 */
function updateMcpResourceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpResource.');
    }
    if (requestParameters.mcpResource === null || requestParameters.mcpResource === undefined) {
        throw new runtime.RequiredError('mcpResource', 'Required parameter requestParameters.mcpResource was null or undefined when calling updateMcpResource.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResource/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpResourceToJSON(requestParameters.mcpResource),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpResourceFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpResource.
* Update an existing McpResource
*/
export function updateMcpResource(requestParameters, requestConfig) {
    return updateMcpResourceRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpResourceApi.js.map