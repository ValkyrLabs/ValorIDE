// tslint:disable
import * as runtime from '../src/runtime';
import { HostInstanceFromJSON, HostInstanceToJSON, } from '../model';
/**
 * Deletes a specific HostInstance.
 * Delete a HostInstance.
 */
function deleteHostInstanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteHostInstance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/HostInstance/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific HostInstance.
* Delete a HostInstance.
*/
export function deleteHostInstance(requestParameters, requestConfig) {
    return deleteHostInstanceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single HostInstance for a specific uid.
 * Retrieve a single HostInstance
 */
function getHostInstanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getHostInstance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/HostInstance/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(HostInstanceFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single HostInstance for a specific uid.
* Retrieve a single HostInstance
*/
export function getHostInstance(requestParameters, requestConfig) {
    return getHostInstanceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of HostInstances.
 * Retrieve a list of HostInstances
 */
function getHostInstanceListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/HostInstance`,
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
        config.transform = (body, text) => requestTransform(body.map(HostInstanceFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of HostInstances.
* Retrieve a list of HostInstances
*/
export function getHostInstanceList(requestParameters, requestConfig) {
    return getHostInstanceListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new HostInstance.
 * Create a new HostInstance
 */
function postHostInstanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.hostInstance === null || requestParameters.hostInstance === undefined) {
        throw new runtime.RequiredError('hostInstance', 'Required parameter requestParameters.hostInstance was null or undefined when calling postHostInstance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/HostInstance`,
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
        body: queryParameters || HostInstanceToJSON(requestParameters.hostInstance),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(HostInstanceFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new HostInstance.
* Create a new HostInstance
*/
export function postHostInstance(requestParameters, requestConfig) {
    return postHostInstanceRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing HostInstance.
 * Update an existing HostInstance
 */
function updateHostInstanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateHostInstance.');
    }
    if (requestParameters.hostInstance === null || requestParameters.hostInstance === undefined) {
        throw new runtime.RequiredError('hostInstance', 'Required parameter requestParameters.hostInstance was null or undefined when calling updateHostInstance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/HostInstance/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || HostInstanceToJSON(requestParameters.hostInstance),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(HostInstanceFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing HostInstance.
* Update an existing HostInstance
*/
export function updateHostInstance(requestParameters, requestConfig) {
    return updateHostInstanceRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=HostInstanceApi.js.map