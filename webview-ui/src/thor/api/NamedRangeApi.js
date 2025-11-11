// tslint:disable
import * as runtime from '../src/runtime';
import { NamedRangeFromJSON, NamedRangeToJSON, } from '../model';
/**
 * Deletes a specific NamedRange.
 * Delete a NamedRange.
 */
function deleteNamedRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteNamedRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/NamedRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific NamedRange.
* Delete a NamedRange.
*/
export function deleteNamedRange(requestParameters, requestConfig) {
    return deleteNamedRangeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single NamedRange for a specific uid.
 * Retrieve a single NamedRange
 */
function getNamedRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getNamedRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/NamedRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(NamedRangeFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single NamedRange for a specific uid.
* Retrieve a single NamedRange
*/
export function getNamedRange(requestParameters, requestConfig) {
    return getNamedRangeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of NamedRanges.
 * Retrieve a list of NamedRanges
 */
function getNamedRangeListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/NamedRange`,
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
        config.transform = (body, text) => requestTransform(body.map(NamedRangeFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of NamedRanges.
* Retrieve a list of NamedRanges
*/
export function getNamedRangeList(requestParameters, requestConfig) {
    return getNamedRangeListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new NamedRange.
 * Create a new NamedRange
 */
function postNamedRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.namedRange === null || requestParameters.namedRange === undefined) {
        throw new runtime.RequiredError('namedRange', 'Required parameter requestParameters.namedRange was null or undefined when calling postNamedRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/NamedRange`,
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
        body: queryParameters || NamedRangeToJSON(requestParameters.namedRange),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(NamedRangeFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new NamedRange.
* Create a new NamedRange
*/
export function postNamedRange(requestParameters, requestConfig) {
    return postNamedRangeRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing NamedRange.
 * Update an existing NamedRange
 */
function updateNamedRangeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateNamedRange.');
    }
    if (requestParameters.namedRange === null || requestParameters.namedRange === undefined) {
        throw new runtime.RequiredError('namedRange', 'Required parameter requestParameters.namedRange was null or undefined when calling updateNamedRange.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/NamedRange/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || NamedRangeToJSON(requestParameters.namedRange),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(NamedRangeFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing NamedRange.
* Update an existing NamedRange
*/
export function updateNamedRange(requestParameters, requestConfig) {
    return updateNamedRangeRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=NamedRangeApi.js.map