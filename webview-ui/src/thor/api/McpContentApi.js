// tslint:disable
import * as runtime from '../src/runtime';
import { McpContentFromJSON, McpContentToJSON, } from '../model';
/**
 * Deletes a specific McpContent.
 * Delete a McpContent.
 */
function deleteMcpContentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpContent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpContent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpContent.
* Delete a McpContent.
*/
export function deleteMcpContent(requestParameters, requestConfig) {
    return deleteMcpContentRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpContent for a specific uid.
 * Retrieve a single McpContent
 */
function getMcpContentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpContent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpContent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpContentFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpContent for a specific uid.
* Retrieve a single McpContent
*/
export function getMcpContent(requestParameters, requestConfig) {
    return getMcpContentRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpContents.
 * Retrieve a list of McpContents
 */
function getMcpContentListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpContent`,
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
        config.transform = (body, text) => requestTransform(body.map(McpContentFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpContents.
* Retrieve a list of McpContents
*/
export function getMcpContentList(requestParameters, requestConfig) {
    return getMcpContentListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpContent.
 * Create a new McpContent
 */
function postMcpContentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpContent === null || requestParameters.mcpContent === undefined) {
        throw new runtime.RequiredError('mcpContent', 'Required parameter requestParameters.mcpContent was null or undefined when calling postMcpContent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpContent`,
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
        body: queryParameters || McpContentToJSON(requestParameters.mcpContent),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpContentFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpContent.
* Create a new McpContent
*/
export function postMcpContent(requestParameters, requestConfig) {
    return postMcpContentRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpContent.
 * Update an existing McpContent
 */
function updateMcpContentRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpContent.');
    }
    if (requestParameters.mcpContent === null || requestParameters.mcpContent === undefined) {
        throw new runtime.RequiredError('mcpContent', 'Required parameter requestParameters.mcpContent was null or undefined when calling updateMcpContent.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpContent/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpContentToJSON(requestParameters.mcpContent),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpContentFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpContent.
* Update an existing McpContent
*/
export function updateMcpContent(requestParameters, requestConfig) {
    return updateMcpContentRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpContentApi.js.map