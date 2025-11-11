// tslint:disable
import * as runtime from '../src/runtime';
import { ApplicationFromJSON, ApplicationToJSON, } from '../model';
/**
 * Deletes a specific Application.
 * Delete a Application.
 */
function deleteApplicationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteApplication.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Application/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Application.
* Delete a Application.
*/
export function deleteApplication(requestParameters, requestConfig) {
    return deleteApplicationRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Application for a specific uid.
 * Retrieve a single Application
 */
function getApplicationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getApplication.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Application/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ApplicationFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Application for a specific uid.
* Retrieve a single Application
*/
export function getApplication(requestParameters, requestConfig) {
    return getApplicationRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Applications.
 * Retrieve a list of Applications
 */
function getApplicationListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Application`,
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
        config.transform = (body, text) => requestTransform(body.map(ApplicationFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Applications.
* Retrieve a list of Applications
*/
export function getApplicationList(requestParameters, requestConfig) {
    return getApplicationListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Application.
 * Create a new Application
 */
function postApplicationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.application === null || requestParameters.application === undefined) {
        throw new runtime.RequiredError('application', 'Required parameter requestParameters.application was null or undefined when calling postApplication.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Application`,
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
        body: queryParameters || ApplicationToJSON(requestParameters.application),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ApplicationFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Application.
* Create a new Application
*/
export function postApplication(requestParameters, requestConfig) {
    return postApplicationRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Application.
 * Update an existing Application
 */
function updateApplicationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateApplication.');
    }
    if (requestParameters.application === null || requestParameters.application === undefined) {
        throw new runtime.RequiredError('application', 'Required parameter requestParameters.application was null or undefined when calling updateApplication.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Application/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ApplicationToJSON(requestParameters.application),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ApplicationFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Application.
* Update an existing Application
*/
export function updateApplication(requestParameters, requestConfig) {
    return updateApplicationRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ApplicationApi.js.map