// tslint:disable
import * as runtime from '../src/runtime';
import { McpToolCallResponseFromJSON, McpToolCallResponseToJSON, } from '../model';
/**
 * Deletes a specific McpToolCallResponse.
 * Delete a McpToolCallResponse.
 */
function deleteMcpToolCallResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpToolCallResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpToolCallResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpToolCallResponse.
* Delete a McpToolCallResponse.
*/
export function deleteMcpToolCallResponse(requestParameters, requestConfig) {
    return deleteMcpToolCallResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpToolCallResponse for a specific uid.
 * Retrieve a single McpToolCallResponse
 */
function getMcpToolCallResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpToolCallResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpToolCallResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpToolCallResponseFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpToolCallResponse for a specific uid.
* Retrieve a single McpToolCallResponse
*/
export function getMcpToolCallResponse(requestParameters, requestConfig) {
    return getMcpToolCallResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpToolCallResponses.
 * Retrieve a list of McpToolCallResponses
 */
function getMcpToolCallResponseListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpToolCallResponse`,
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
        config.transform = (body, text) => requestTransform(body.map(McpToolCallResponseFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpToolCallResponses.
* Retrieve a list of McpToolCallResponses
*/
export function getMcpToolCallResponseList(requestParameters, requestConfig) {
    return getMcpToolCallResponseListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpToolCallResponse.
 * Create a new McpToolCallResponse
 */
function postMcpToolCallResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpToolCallResponse === null || requestParameters.mcpToolCallResponse === undefined) {
        throw new runtime.RequiredError('mcpToolCallResponse', 'Required parameter requestParameters.mcpToolCallResponse was null or undefined when calling postMcpToolCallResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpToolCallResponse`,
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
        body: queryParameters || McpToolCallResponseToJSON(requestParameters.mcpToolCallResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpToolCallResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpToolCallResponse.
* Create a new McpToolCallResponse
*/
export function postMcpToolCallResponse(requestParameters, requestConfig) {
    return postMcpToolCallResponseRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpToolCallResponse.
 * Update an existing McpToolCallResponse
 */
function updateMcpToolCallResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpToolCallResponse.');
    }
    if (requestParameters.mcpToolCallResponse === null || requestParameters.mcpToolCallResponse === undefined) {
        throw new runtime.RequiredError('mcpToolCallResponse', 'Required parameter requestParameters.mcpToolCallResponse was null or undefined when calling updateMcpToolCallResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpToolCallResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpToolCallResponseToJSON(requestParameters.mcpToolCallResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpToolCallResponseFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpToolCallResponse.
* Update an existing McpToolCallResponse
*/
export function updateMcpToolCallResponse(requestParameters, requestConfig) {
    return updateMcpToolCallResponseRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpToolCallResponseApi.js.map