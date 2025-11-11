// tslint:disable
import * as runtime from '../src/runtime';
import { SolutionFromJSON, SolutionToJSON, } from '../model';
/**
 * Deletes a specific Solution.
 * Delete a Solution.
 */
function deleteSolutionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSolution.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Solution/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Solution.
* Delete a Solution.
*/
export function deleteSolution(requestParameters, requestConfig) {
    return deleteSolutionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Solution for a specific uid.
 * Retrieve a single Solution
 */
function getSolutionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSolution.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Solution/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SolutionFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Solution for a specific uid.
* Retrieve a single Solution
*/
export function getSolution(requestParameters, requestConfig) {
    return getSolutionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Solutions.
 * Retrieve a list of Solutions
 */
function getSolutionListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Solution`,
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
        config.transform = (body, text) => requestTransform(body.map(SolutionFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Solutions.
* Retrieve a list of Solutions
*/
export function getSolutionList(requestParameters, requestConfig) {
    return getSolutionListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Solution.
 * Create a new Solution
 */
function postSolutionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.solution === null || requestParameters.solution === undefined) {
        throw new runtime.RequiredError('solution', 'Required parameter requestParameters.solution was null or undefined when calling postSolution.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Solution`,
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
        body: queryParameters || SolutionToJSON(requestParameters.solution),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SolutionFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Solution.
* Create a new Solution
*/
export function postSolution(requestParameters, requestConfig) {
    return postSolutionRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Solution.
 * Update an existing Solution
 */
function updateSolutionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSolution.');
    }
    if (requestParameters.solution === null || requestParameters.solution === undefined) {
        throw new runtime.RequiredError('solution', 'Required parameter requestParameters.solution was null or undefined when calling updateSolution.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Solution/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SolutionToJSON(requestParameters.solution),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SolutionFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Solution.
* Update an existing Solution
*/
export function updateSolution(requestParameters, requestConfig) {
    return updateSolutionRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SolutionApi.js.map