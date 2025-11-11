// tslint:disable
import * as runtime from '../src/runtime';
import { KeyMetricFromJSON, KeyMetricToJSON, } from '../model';
/**
 * Deletes a specific KeyMetric.
 * Delete a KeyMetric.
 */
function deleteKeyMetricRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteKeyMetric.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/KeyMetric/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific KeyMetric.
* Delete a KeyMetric.
*/
export function deleteKeyMetric(requestParameters, requestConfig) {
    return deleteKeyMetricRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single KeyMetric for a specific uid.
 * Retrieve a single KeyMetric
 */
function getKeyMetricRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getKeyMetric.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/KeyMetric/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(KeyMetricFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single KeyMetric for a specific uid.
* Retrieve a single KeyMetric
*/
export function getKeyMetric(requestParameters, requestConfig) {
    return getKeyMetricRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of KeyMetrics.
 * Retrieve a list of KeyMetrics
 */
function getKeyMetricListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/KeyMetric`,
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
        config.transform = (body, text) => requestTransform(body.map(KeyMetricFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of KeyMetrics.
* Retrieve a list of KeyMetrics
*/
export function getKeyMetricList(requestParameters, requestConfig) {
    return getKeyMetricListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new KeyMetric.
 * Create a new KeyMetric
 */
function postKeyMetricRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.keyMetric === null || requestParameters.keyMetric === undefined) {
        throw new runtime.RequiredError('keyMetric', 'Required parameter requestParameters.keyMetric was null or undefined when calling postKeyMetric.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/KeyMetric`,
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
        body: queryParameters || KeyMetricToJSON(requestParameters.keyMetric),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(KeyMetricFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new KeyMetric.
* Create a new KeyMetric
*/
export function postKeyMetric(requestParameters, requestConfig) {
    return postKeyMetricRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing KeyMetric.
 * Update an existing KeyMetric
 */
function updateKeyMetricRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateKeyMetric.');
    }
    if (requestParameters.keyMetric === null || requestParameters.keyMetric === undefined) {
        throw new runtime.RequiredError('keyMetric', 'Required parameter requestParameters.keyMetric was null or undefined when calling updateKeyMetric.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/KeyMetric/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || KeyMetricToJSON(requestParameters.keyMetric),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(KeyMetricFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing KeyMetric.
* Update an existing KeyMetric
*/
export function updateKeyMetric(requestParameters, requestConfig) {
    return updateKeyMetricRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=KeyMetricApi.js.map