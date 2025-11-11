// tslint:disable
import * as runtime from '../src/runtime';
import { ExecModuleFromJSON, ExecModuleToJSON, } from '../model';
/**
 * Deletes a specific ExecModule.
 * Delete a ExecModule.
 */
function deleteExecModuleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteExecModule.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ExecModule/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ExecModule.
* Delete a ExecModule.
*/
export function deleteExecModule(requestParameters, requestConfig) {
    return deleteExecModuleRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ExecModule for a specific uid.
 * Retrieve a single ExecModule
 */
function getExecModuleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getExecModule.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ExecModule/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ExecModuleFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ExecModule for a specific uid.
* Retrieve a single ExecModule
*/
export function getExecModule(requestParameters, requestConfig) {
    return getExecModuleRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ExecModules.
 * Retrieve a list of ExecModules
 */
function getExecModuleListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ExecModule`,
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
        config.transform = (body, text) => requestTransform(body.map(ExecModuleFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ExecModules.
* Retrieve a list of ExecModules
*/
export function getExecModuleList(requestParameters, requestConfig) {
    return getExecModuleListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ExecModule.
 * Create a new ExecModule
 */
function postExecModuleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.execModule === null || requestParameters.execModule === undefined) {
        throw new runtime.RequiredError('execModule', 'Required parameter requestParameters.execModule was null or undefined when calling postExecModule.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ExecModule`,
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
        body: queryParameters || ExecModuleToJSON(requestParameters.execModule),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ExecModuleFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ExecModule.
* Create a new ExecModule
*/
export function postExecModule(requestParameters, requestConfig) {
    return postExecModuleRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ExecModule.
 * Update an existing ExecModule
 */
function updateExecModuleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateExecModule.');
    }
    if (requestParameters.execModule === null || requestParameters.execModule === undefined) {
        throw new runtime.RequiredError('execModule', 'Required parameter requestParameters.execModule was null or undefined when calling updateExecModule.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ExecModule/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ExecModuleToJSON(requestParameters.execModule),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ExecModuleFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ExecModule.
* Update an existing ExecModule
*/
export function updateExecModule(requestParameters, requestConfig) {
    return updateExecModuleRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ExecModuleApi.js.map