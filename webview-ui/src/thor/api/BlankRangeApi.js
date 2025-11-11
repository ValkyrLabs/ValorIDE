// tslint:disable
import * as runtime from '../src/runtime';
import { BlankRangeFromJSON, BlankRangeToJSON, } from '../model';
/**
 * Deletes a specific BlankRange.
 * Delete a BlankRange.
 */
function deleteBlankRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteBlankRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BlankRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific BlankRange.
* Delete a BlankRange.
*/
export function deleteBlankRange(requestParameters, requestConfig) {
    return deleteBlankRangeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single BlankRange for a specific uid.
 * Retrieve a single BlankRange
 */
function getBlankRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getBlankRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BlankRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(BlankRangeFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single BlankRange for a specific uid.
* Retrieve a single BlankRange
*/
export function getBlankRange(requestParameters, requestConfig) {
    return getBlankRangeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of BlankRanges.
 * Retrieve a list of BlankRanges
 */
function getBlankRangeListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/BlankRange`,
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
        config.transform = (body, text) => requestTransform(body.map(BlankRangeFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of BlankRanges.
* Retrieve a list of BlankRanges
*/
export function getBlankRangeList(requestParameters, requestConfig) {
    return getBlankRangeListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new BlankRange.
 * Create a new BlankRange
 */
function postBlankRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.blankRange === null || requestParameters.blankRange === undefined) {
        throw new runtime.RequiredError('blankRange', 'Required parameter requestParameters.blankRange was null or undefined when calling postBlankRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BlankRange`,
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
        body: queryParameters || BlankRangeToJSON(requestParameters.blankRange),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BlankRangeFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new BlankRange.
* Create a new BlankRange
*/
export function postBlankRange(requestParameters, requestConfig) {
    return postBlankRangeRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing BlankRange.
 * Update an existing BlankRange
 */
function updateBlankRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateBlankRange.');
    }
    if (requestParameters.blankRange === null || requestParameters.blankRange === undefined) {
        throw new runtime.RequiredError('blankRange', 'Required parameter requestParameters.blankRange was null or undefined when calling updateBlankRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BlankRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || BlankRangeToJSON(requestParameters.blankRange),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BlankRangeFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing BlankRange.
* Update an existing BlankRange
*/
export function updateBlankRange(requestParameters, requestConfig) {
    return updateBlankRangeRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=BlankRangeApi.js.map