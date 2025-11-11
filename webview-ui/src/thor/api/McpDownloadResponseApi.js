// tslint:disable
import * as runtime from '../src/runtime';
import { McpDownloadResponseFromJSON, McpDownloadResponseToJSON, } from '../model';
/**
 * Deletes a specific McpDownloadResponse.
 * Delete a McpDownloadResponse.
 */
function deleteMcpDownloadResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpDownloadResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpDownloadResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpDownloadResponse.
* Delete a McpDownloadResponse.
*/
export function deleteMcpDownloadResponse(requestParameters, requestConfig) {
    return deleteMcpDownloadResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpDownloadResponse for a specific uid.
 * Retrieve a single McpDownloadResponse
 */
function getMcpDownloadResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpDownloadResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpDownloadResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpDownloadResponseFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpDownloadResponse for a specific uid.
* Retrieve a single McpDownloadResponse
*/
export function getMcpDownloadResponse(requestParameters, requestConfig) {
    return getMcpDownloadResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpDownloadResponses.
 * Retrieve a list of McpDownloadResponses
 */
function getMcpDownloadResponseListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpDownloadResponse`,
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
        config.transform = (body, text) => requestTransform(body.map(McpDownloadResponseFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpDownloadResponses.
* Retrieve a list of McpDownloadResponses
*/
export function getMcpDownloadResponseList(requestParameters, requestConfig) {
    return getMcpDownloadResponseListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpDownloadResponse.
 * Create a new McpDownloadResponse
 */
function postMcpDownloadResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpDownloadResponse === null || requestParameters.mcpDownloadResponse === undefined) {
        throw new runtime.RequiredError('mcpDownloadResponse', 'Required parameter requestParameters.mcpDownloadResponse was null or undefined when calling postMcpDownloadResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpDownloadResponse`,
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
        body: queryParameters || McpDownloadResponseToJSON(requestParameters.mcpDownloadResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpDownloadResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpDownloadResponse.
* Create a new McpDownloadResponse
*/
export function postMcpDownloadResponse(requestParameters, requestConfig) {
    return postMcpDownloadResponseRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpDownloadResponse.
 * Update an existing McpDownloadResponse
 */
function updateMcpDownloadResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpDownloadResponse.');
    }
    if (requestParameters.mcpDownloadResponse === null || requestParameters.mcpDownloadResponse === undefined) {
        throw new runtime.RequiredError('mcpDownloadResponse', 'Required parameter requestParameters.mcpDownloadResponse was null or undefined when calling updateMcpDownloadResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpDownloadResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpDownloadResponseToJSON(requestParameters.mcpDownloadResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpDownloadResponseFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpDownloadResponse.
* Update an existing McpDownloadResponse
*/
export function updateMcpDownloadResponse(requestParameters, requestConfig) {
    return updateMcpDownloadResponseRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpDownloadResponseApi.js.map