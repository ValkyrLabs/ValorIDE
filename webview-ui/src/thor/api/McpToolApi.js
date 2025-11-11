// tslint:disable
import * as runtime from '../src/runtime';
import { McpToolFromJSON, McpToolToJSON, } from '../model';
/**
 * Deletes a specific McpTool.
 * Delete a McpTool.
 */
function deleteMcpToolRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpTool.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpTool/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpTool.
* Delete a McpTool.
*/
export function deleteMcpTool(requestParameters, requestConfig) {
    return deleteMcpToolRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpTool for a specific uid.
 * Retrieve a single McpTool
 */
function getMcpToolRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpTool.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpTool/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpToolFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpTool for a specific uid.
* Retrieve a single McpTool
*/
export function getMcpTool(requestParameters, requestConfig) {
    return getMcpToolRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpTools.
 * Retrieve a list of McpTools
 */
function getMcpToolListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpTool`,
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
        config.transform = (body, text) => requestTransform(body.map(McpToolFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpTools.
* Retrieve a list of McpTools
*/
export function getMcpToolList(requestParameters, requestConfig) {
    return getMcpToolListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpTool.
 * Create a new McpTool
 */
function postMcpToolRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpTool === null || requestParameters.mcpTool === undefined) {
        throw new runtime.RequiredError('mcpTool', 'Required parameter requestParameters.mcpTool was null or undefined when calling postMcpTool.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpTool`,
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
        body: queryParameters || McpToolToJSON(requestParameters.mcpTool),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpToolFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpTool.
* Create a new McpTool
*/
export function postMcpTool(requestParameters, requestConfig) {
    return postMcpToolRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpTool.
 * Update an existing McpTool
 */
function updateMcpToolRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpTool.');
    }
    if (requestParameters.mcpTool === null || requestParameters.mcpTool === undefined) {
        throw new runtime.RequiredError('mcpTool', 'Required parameter requestParameters.mcpTool was null or undefined when calling updateMcpTool.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpTool/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpToolToJSON(requestParameters.mcpTool),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpToolFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpTool.
* Update an existing McpTool
*/
export function updateMcpTool(requestParameters, requestConfig) {
    return updateMcpToolRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpToolApi.js.map