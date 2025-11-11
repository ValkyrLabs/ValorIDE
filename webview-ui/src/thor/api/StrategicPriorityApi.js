// tslint:disable
import * as runtime from '../src/runtime';
import { StrategicPriorityFromJSON, StrategicPriorityToJSON, } from '../model';
/**
 * Deletes a specific StrategicPriority.
 * Delete a StrategicPriority.
 */
function deleteStrategicPriorityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteStrategicPriority.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/StrategicPriority/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific StrategicPriority.
* Delete a StrategicPriority.
*/
export function deleteStrategicPriority(requestParameters, requestConfig) {
    return deleteStrategicPriorityRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single StrategicPriority for a specific uid.
 * Retrieve a single StrategicPriority
 */
function getStrategicPriorityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getStrategicPriority.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/StrategicPriority/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(StrategicPriorityFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single StrategicPriority for a specific uid.
* Retrieve a single StrategicPriority
*/
export function getStrategicPriority(requestParameters, requestConfig) {
    return getStrategicPriorityRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of StrategicPrioritys.
 * Retrieve a list of StrategicPrioritys
 */
function getStrategicPriorityListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/StrategicPriority`,
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
        config.transform = (body, text) => requestTransform(body.map(StrategicPriorityFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of StrategicPrioritys.
* Retrieve a list of StrategicPrioritys
*/
export function getStrategicPriorityList(requestParameters, requestConfig) {
    return getStrategicPriorityListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new StrategicPriority.
 * Create a new StrategicPriority
 */
function postStrategicPriorityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.strategicPriority === null || requestParameters.strategicPriority === undefined) {
        throw new runtime.RequiredError('strategicPriority', 'Required parameter requestParameters.strategicPriority was null or undefined when calling postStrategicPriority.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/StrategicPriority`,
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
        body: queryParameters || StrategicPriorityToJSON(requestParameters.strategicPriority),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(StrategicPriorityFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new StrategicPriority.
* Create a new StrategicPriority
*/
export function postStrategicPriority(requestParameters, requestConfig) {
    return postStrategicPriorityRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing StrategicPriority.
 * Update an existing StrategicPriority
 */
function updateStrategicPriorityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateStrategicPriority.');
    }
    if (requestParameters.strategicPriority === null || requestParameters.strategicPriority === undefined) {
        throw new runtime.RequiredError('strategicPriority', 'Required parameter requestParameters.strategicPriority was null or undefined when calling updateStrategicPriority.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/StrategicPriority/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || StrategicPriorityToJSON(requestParameters.strategicPriority),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(StrategicPriorityFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing StrategicPriority.
* Update an existing StrategicPriority
*/
export function updateStrategicPriority(requestParameters, requestConfig) {
    return updateStrategicPriorityRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=StrategicPriorityApi.js.map