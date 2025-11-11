// tslint:disable
import * as runtime from '../src/runtime';
import { MergeRangeFromJSON, MergeRangeToJSON, } from '../model';
/**
 * Deletes a specific MergeRange.
 * Delete a MergeRange.
 */
function deleteMergeRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteMergeRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MergeRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific MergeRange.
* Delete a MergeRange.
*/
export function deleteMergeRange(requestParameters, requestConfig) {
    return deleteMergeRangeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single MergeRange for a specific uid.
 * Retrieve a single MergeRange
 */
function getMergeRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getMergeRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MergeRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(MergeRangeFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single MergeRange for a specific uid.
* Retrieve a single MergeRange
*/
export function getMergeRange(requestParameters, requestConfig) {
    return getMergeRangeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of MergeRanges.
 * Retrieve a list of MergeRanges
 */
function getMergeRangeListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/MergeRange`,
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
        config.transform = (body, text) => requestTransform(body.map(MergeRangeFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of MergeRanges.
* Retrieve a list of MergeRanges
*/
export function getMergeRangeList(requestParameters, requestConfig) {
    return getMergeRangeListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new MergeRange.
 * Create a new MergeRange
 */
function postMergeRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.mergeRange === null || requestParameters.mergeRange === undefined) {
        throw new runtime.RequiredError('mergeRange', 'Required parameter requestParameters.mergeRange was null or undefined when calling postMergeRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MergeRange`,
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
        body: queryParameters || MergeRangeToJSON(requestParameters.mergeRange),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(MergeRangeFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new MergeRange.
* Create a new MergeRange
*/
export function postMergeRange(requestParameters, requestConfig) {
    return postMergeRangeRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing MergeRange.
 * Update an existing MergeRange
 */
function updateMergeRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateMergeRange.');
    }
    if (requestParameters.mergeRange === null || requestParameters.mergeRange === undefined) {
        throw new runtime.RequiredError('mergeRange', 'Required parameter requestParameters.mergeRange was null or undefined when calling updateMergeRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/MergeRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || MergeRangeToJSON(requestParameters.mergeRange),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(MergeRangeFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing MergeRange.
* Update an existing MergeRange
*/
export function updateMergeRange(requestParameters, requestConfig) {
    return updateMergeRangeRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=MergeRangeApi.js.map