// tslint:disable
import * as runtime from '../src/runtime';
import { GoalFromJSON, GoalToJSON, } from '../model';
/**
 * Deletes a specific Goal.
 * Delete a Goal.
 */
function deleteGoalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteGoal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Goal/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Goal.
* Delete a Goal.
*/
export function deleteGoal(requestParameters, requestConfig) {
    return deleteGoalRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Goal for a specific uid.
 * Retrieve a single Goal
 */
function getGoalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getGoal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Goal/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(GoalFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Goal for a specific uid.
* Retrieve a single Goal
*/
export function getGoal(requestParameters, requestConfig) {
    return getGoalRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Goals.
 * Retrieve a list of Goals
 */
function getGoalListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Goal`,
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
        config.transform = (body, text) => requestTransform(body.map(GoalFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Goals.
* Retrieve a list of Goals
*/
export function getGoalList(requestParameters, requestConfig) {
    return getGoalListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Goal.
 * Create a new Goal
 */
function postGoalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.goal === null || requestParameters.goal === undefined) {
        throw new runtime.RequiredError('goal', 'Required parameter requestParameters.goal was null or undefined when calling postGoal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Goal`,
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
        body: queryParameters || GoalToJSON(requestParameters.goal),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(GoalFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Goal.
* Create a new Goal
*/
export function postGoal(requestParameters, requestConfig) {
    return postGoalRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Goal.
 * Update an existing Goal
 */
function updateGoalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateGoal.');
    }
    if (requestParameters.goal === null || requestParameters.goal === undefined) {
        throw new runtime.RequiredError('goal', 'Required parameter requestParameters.goal was null or undefined when calling updateGoal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Goal/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || GoalToJSON(requestParameters.goal),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(GoalFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Goal.
* Update an existing Goal
*/
export function updateGoal(requestParameters, requestConfig) {
    return updateGoalRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=GoalApi.js.map