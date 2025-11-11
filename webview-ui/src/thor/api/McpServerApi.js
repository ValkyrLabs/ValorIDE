// tslint:disable
import * as runtime from '../src/runtime';
import { McpServerFromJSON, McpServerToJSON, } from '../model';
/**
 * Deletes a specific McpServer.
 * Delete a McpServer.
 */
function deleteMcpServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpServer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpServer.
* Delete a McpServer.
*/
export function deleteMcpServer(requestParameters, requestConfig) {
    return deleteMcpServerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpServer for a specific uid.
 * Retrieve a single McpServer
 */
function getMcpServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpServer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpServerFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpServer for a specific uid.
* Retrieve a single McpServer
*/
export function getMcpServer(requestParameters, requestConfig) {
    return getMcpServerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpServers.
 * Retrieve a list of McpServers
 */
function getMcpServerListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpServer`,
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
        config.transform = (body, text) => requestTransform(body.map(McpServerFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpServers.
* Retrieve a list of McpServers
*/
export function getMcpServerList(requestParameters, requestConfig) {
    return getMcpServerListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpServer.
 * Create a new McpServer
 */
function postMcpServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpServer === null || requestParameters.mcpServer === undefined) {
        throw new runtime.RequiredError('mcpServer', 'Required parameter requestParameters.mcpServer was null or undefined when calling postMcpServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpServer`,
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
        body: queryParameters || McpServerToJSON(requestParameters.mcpServer),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpServerFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpServer.
* Create a new McpServer
*/
export function postMcpServer(requestParameters, requestConfig) {
    return postMcpServerRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpServer.
 * Update an existing McpServer
 */
function updateMcpServerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpServer.');
    }
    if (requestParameters.mcpServer === null || requestParameters.mcpServer === undefined) {
        throw new runtime.RequiredError('mcpServer', 'Required parameter requestParameters.mcpServer was null or undefined when calling updateMcpServer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpServer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpServerToJSON(requestParameters.mcpServer),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpServerFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpServer.
* Update an existing McpServer
*/
export function updateMcpServer(requestParameters, requestConfig) {
    return updateMcpServerRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpServerApi.js.map