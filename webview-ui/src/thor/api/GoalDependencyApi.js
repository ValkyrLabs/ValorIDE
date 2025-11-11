// tslint:disable
import * as runtime from '../src/runtime';
import { GoalDependencyFromJSON, GoalDependencyToJSON, } from '../model';
/**
 * Deletes a specific GoalDependency.
 * Delete a GoalDependency.
 */
function deleteGoalDependencyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteGoalDependency.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/GoalDependency/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific GoalDependency.
* Delete a GoalDependency.
*/
export function deleteGoalDependency(requestParameters, requestConfig) {
    return deleteGoalDependencyRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single GoalDependency for a specific uid.
 * Retrieve a single GoalDependency
 */
function getGoalDependencyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getGoalDependency.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/GoalDependency/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(GoalDependencyFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single GoalDependency for a specific uid.
* Retrieve a single GoalDependency
*/
export function getGoalDependency(requestParameters, requestConfig) {
    return getGoalDependencyRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of GoalDependencys.
 * Retrieve a list of GoalDependencys
 */
function getGoalDependencyListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/GoalDependency`,
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
        config.transform = (body, text) => requestTransform(body.map(GoalDependencyFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of GoalDependencys.
* Retrieve a list of GoalDependencys
*/
export function getGoalDependencyList(requestParameters, requestConfig) {
    return getGoalDependencyListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new GoalDependency.
 * Create a new GoalDependency
 */
function postGoalDependencyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.goalDependency === null || requestParameters.goalDependency === undefined) {
        throw new runtime.RequiredError('goalDependency', 'Required parameter requestParameters.goalDependency was null or undefined when calling postGoalDependency.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/GoalDependency`,
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
        body: queryParameters || GoalDependencyToJSON(requestParameters.goalDependency),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(GoalDependencyFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new GoalDependency.
* Create a new GoalDependency
*/
export function postGoalDependency(requestParameters, requestConfig) {
    return postGoalDependencyRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing GoalDependency.
 * Update an existing GoalDependency
 */
function updateGoalDependencyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateGoalDependency.');
    }
    if (requestParameters.goalDependency === null || requestParameters.goalDependency === undefined) {
        throw new runtime.RequiredError('goalDependency', 'Required parameter requestParameters.goalDependency was null or undefined when calling updateGoalDependency.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/GoalDependency/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || GoalDependencyToJSON(requestParameters.goalDependency),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(GoalDependencyFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing GoalDependency.
* Update an existing GoalDependency
*/
export function updateGoalDependency(requestParameters, requestConfig) {
    return updateGoalDependencyRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=GoalDependencyApi.js.map