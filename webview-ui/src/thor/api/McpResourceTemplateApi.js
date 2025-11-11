// tslint:disable
import * as runtime from '../src/runtime';
import { McpResourceTemplateFromJSON, McpResourceTemplateToJSON, } from '../model';
/**
 * Deletes a specific McpResourceTemplate.
 * Delete a McpResourceTemplate.
 */
function deleteMcpResourceTemplateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMcpResourceTemplate.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceTemplate/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific McpResourceTemplate.
* Delete a McpResourceTemplate.
*/
export function deleteMcpResourceTemplate(requestParameters, requestConfig) {
    return deleteMcpResourceTemplateRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single McpResourceTemplate for a specific uid.
 * Retrieve a single McpResourceTemplate
 */
function getMcpResourceTemplateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMcpResourceTemplate.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceTemplate/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(McpResourceTemplateFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single McpResourceTemplate for a specific uid.
* Retrieve a single McpResourceTemplate
*/
export function getMcpResourceTemplate(requestParameters, requestConfig) {
    return getMcpResourceTemplateRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of McpResourceTemplates.
 * Retrieve a list of McpResourceTemplates
 */
function getMcpResourceTemplateListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/McpResourceTemplate`,
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
        config.transform = (body, text) => requestTransform(body.map(McpResourceTemplateFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of McpResourceTemplates.
* Retrieve a list of McpResourceTemplates
*/
export function getMcpResourceTemplateList(requestParameters, requestConfig) {
    return getMcpResourceTemplateListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new McpResourceTemplate.
 * Create a new McpResourceTemplate
 */
function postMcpResourceTemplateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mcpResourceTemplate === null || requestParameters.mcpResourceTemplate === undefined) {
        throw new runtime.RequiredError('mcpResourceTemplate', 'Required parameter requestParameters.mcpResourceTemplate was null or undefined when calling postMcpResourceTemplate.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceTemplate`,
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
        body: queryParameters || McpResourceTemplateToJSON(requestParameters.mcpResourceTemplate),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpResourceTemplateFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new McpResourceTemplate.
* Create a new McpResourceTemplate
*/
export function postMcpResourceTemplate(requestParameters, requestConfig) {
    return postMcpResourceTemplateRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing McpResourceTemplate.
 * Update an existing McpResourceTemplate
 */
function updateMcpResourceTemplateRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMcpResourceTemplate.');
    }
    if (requestParameters.mcpResourceTemplate === null || requestParameters.mcpResourceTemplate === undefined) {
        throw new runtime.RequiredError('mcpResourceTemplate', 'Required parameter requestParameters.mcpResourceTemplate was null or undefined when calling updateMcpResourceTemplate.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/McpResourceTemplate/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || McpResourceTemplateToJSON(requestParameters.mcpResourceTemplate),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(McpResourceTemplateFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing McpResourceTemplate.
* Update an existing McpResourceTemplate
*/
export function updateMcpResourceTemplate(requestParameters, requestConfig) {
    return updateMcpResourceTemplateRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=McpResourceTemplateApi.js.map