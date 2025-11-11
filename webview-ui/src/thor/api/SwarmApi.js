// tslint:disable
import * as runtime from '../src/runtime';
import { SwarmFromJSON, SwarmToJSON, } from '../model';
/**
 * Deletes a specific Swarm.
 * Delete a Swarm.
 */
function deleteSwarmRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSwarm.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Swarm/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Swarm.
* Delete a Swarm.
*/
export function deleteSwarm(requestParameters, requestConfig) {
    return deleteSwarmRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Swarm for a specific uid.
 * Retrieve a single Swarm
 */
function getSwarmRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSwarm.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Swarm/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SwarmFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Swarm for a specific uid.
* Retrieve a single Swarm
*/
export function getSwarm(requestParameters, requestConfig) {
    return getSwarmRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Swarms.
 * Retrieve a list of Swarms
 */
function getSwarmListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Swarm`,
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
        config.transform = (body, text) => requestTransform(body.map(SwarmFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Swarms.
* Retrieve a list of Swarms
*/
export function getSwarmList(requestParameters, requestConfig) {
    return getSwarmListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Swarm.
 * Create a new Swarm
 */
function postSwarmRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.swarm === null || requestParameters.swarm === undefined) {
        throw new runtime.RequiredError('swarm', 'Required parameter requestParameters.swarm was null or undefined when calling postSwarm.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Swarm`,
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
        body: queryParameters || SwarmToJSON(requestParameters.swarm),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SwarmFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Swarm.
* Create a new Swarm
*/
export function postSwarm(requestParameters, requestConfig) {
    return postSwarmRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Swarm.
 * Update an existing Swarm
 */
function updateSwarmRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSwarm.');
    }
    if (requestParameters.swarm === null || requestParameters.swarm === undefined) {
        throw new runtime.RequiredError('swarm', 'Required parameter requestParameters.swarm was null or undefined when calling updateSwarm.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Swarm/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SwarmToJSON(requestParameters.swarm),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SwarmFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Swarm.
* Update an existing Swarm
*/
export function updateSwarm(requestParameters, requestConfig) {
    return updateSwarmRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SwarmApi.js.map