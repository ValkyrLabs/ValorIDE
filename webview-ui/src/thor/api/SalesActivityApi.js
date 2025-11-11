// tslint:disable
import * as runtime from '../src/runtime';
import { SalesActivityFromJSON, SalesActivityToJSON, } from '../model';
/**
 * Deletes a specific SalesActivity.
 * Delete a SalesActivity.
 */
function deleteSalesActivityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSalesActivity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesActivity/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SalesActivity.
* Delete a SalesActivity.
*/
export function deleteSalesActivity(requestParameters, requestConfig) {
    return deleteSalesActivityRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SalesActivity for a specific uid.
 * Retrieve a single SalesActivity
 */
function getSalesActivityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSalesActivity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesActivity/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SalesActivityFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SalesActivity for a specific uid.
* Retrieve a single SalesActivity
*/
export function getSalesActivity(requestParameters, requestConfig) {
    return getSalesActivityRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SalesActivitys.
 * Retrieve a list of SalesActivitys
 */
function getSalesActivityListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SalesActivity`,
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
        config.transform = (body, text) => requestTransform(body.map(SalesActivityFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SalesActivitys.
* Retrieve a list of SalesActivitys
*/
export function getSalesActivityList(requestParameters, requestConfig) {
    return getSalesActivityListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SalesActivity.
 * Create a new SalesActivity
 */
function postSalesActivityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.salesActivity === null || requestParameters.salesActivity === undefined) {
        throw new runtime.RequiredError('salesActivity', 'Required parameter requestParameters.salesActivity was null or undefined when calling postSalesActivity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesActivity`,
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
        body: queryParameters || SalesActivityToJSON(requestParameters.salesActivity),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SalesActivityFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SalesActivity.
* Create a new SalesActivity
*/
export function postSalesActivity(requestParameters, requestConfig) {
    return postSalesActivityRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SalesActivity.
 * Update an existing SalesActivity
 */
function updateSalesActivityRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSalesActivity.');
    }
    if (requestParameters.salesActivity === null || requestParameters.salesActivity === undefined) {
        throw new runtime.RequiredError('salesActivity', 'Required parameter requestParameters.salesActivity was null or undefined when calling updateSalesActivity.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesActivity/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SalesActivityToJSON(requestParameters.salesActivity),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SalesActivityFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SalesActivity.
* Update an existing SalesActivity
*/
export function updateSalesActivity(requestParameters, requestConfig) {
    return updateSalesActivityRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SalesActivityApi.js.map