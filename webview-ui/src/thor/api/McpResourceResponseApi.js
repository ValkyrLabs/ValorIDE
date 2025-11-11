// tslint:disable
import * as runtime from '../src/runtime';
import { McpResourceResponseFromJSON, McpResourceResponseToJSON, } from '../model';
/**
 * Deletes a specific McpResourceResponse.
 * Delete a McpResourceResponse.
 */
function deleteMcpResourceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpResourceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpResourceResponse.
* Delete a McpResourceResponse.
*/
export function deleteMcpResourceResponse(requestParameters, requestConfig) {
    return deleteMcpResourceResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpResourceResponse for a specific uid.
 * Retrieve a single McpResourceResponse
 */
function getMcpResourceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpResourceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpResourceResponseFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpResourceResponse for a specific uid.
* Retrieve a single McpResourceResponse
*/
export function getMcpResourceResponse(requestParameters, requestConfig) {
    return getMcpResourceResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpResourceResponses.
 * Retrieve a list of McpResourceResponses
 */
function getMcpResourceResponseListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpResourceResponse`,
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
        config.transform = (body, text) => requestTransform(body.map(McpResourceResponseFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpResourceResponses.
* Retrieve a list of McpResourceResponses
*/
export function getMcpResourceResponseList(requestParameters, requestConfig) {
    return getMcpResourceResponseListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpResourceResponse.
 * Create a new McpResourceResponse
 */
function postMcpResourceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpResourceResponse === null || requestParameters.mcpResourceResponse === undefined) {
        throw new runtime.RequiredError('mcpResourceResponse', 'Required parameter requestParameters.mcpResourceResponse was null or undefined when calling postMcpResourceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceResponse`,
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
        body: queryParameters || McpResourceResponseToJSON(requestParameters.mcpResourceResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpResourceResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpResourceResponse.
* Create a new McpResourceResponse
*/
export function postMcpResourceResponse(requestParameters, requestConfig) {
    return postMcpResourceResponseRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpResourceResponse.
 * Update an existing McpResourceResponse
 */
function updateMcpResourceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpResourceResponse.');
    }
    if (requestParameters.mcpResourceResponse === null || requestParameters.mcpResourceResponse === undefined) {
        throw new runtime.RequiredError('mcpResourceResponse', 'Required parameter requestParameters.mcpResourceResponse was null or undefined when calling updateMcpResourceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpResourceResponseToJSON(requestParameters.mcpResourceResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpResourceResponseFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpResourceResponse.
* Update an existing McpResourceResponse
*/
export function updateMcpResourceResponse(requestParameters, requestConfig) {
    return updateMcpResourceResponseRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpResourceResponseApi.js.map