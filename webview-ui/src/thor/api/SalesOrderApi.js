// tslint:disable
import * as runtime from '../src/runtime';
import { SalesOrderFromJSON, SalesOrderToJSON, } from '../model';
/**
 * Deletes a specific SalesOrder.
 * Delete a SalesOrder.
 */
function deleteSalesOrderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSalesOrder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesOrder/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SalesOrder.
* Delete a SalesOrder.
*/
export function deleteSalesOrder(requestParameters, requestConfig) {
    return deleteSalesOrderRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SalesOrder for a specific uid.
 * Retrieve a single SalesOrder
 */
function getSalesOrderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSalesOrder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesOrder/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SalesOrderFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SalesOrder for a specific uid.
* Retrieve a single SalesOrder
*/
export function getSalesOrder(requestParameters, requestConfig) {
    return getSalesOrderRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SalesOrders.
 * Retrieve a list of SalesOrders
 */
function getSalesOrderListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SalesOrder`,
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
        config.transform = (body, text) => requestTransform(body.map(SalesOrderFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SalesOrders.
* Retrieve a list of SalesOrders
*/
export function getSalesOrderList(requestParameters, requestConfig) {
    return getSalesOrderListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SalesOrder.
 * Create a new SalesOrder
 */
function postSalesOrderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.salesOrder === null || requestParameters.salesOrder === undefined) {
        throw new runtime.RequiredError('salesOrder', 'Required parameter requestParameters.salesOrder was null or undefined when calling postSalesOrder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesOrder`,
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
        body: queryParameters || SalesOrderToJSON(requestParameters.salesOrder),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SalesOrderFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SalesOrder.
* Create a new SalesOrder
*/
export function postSalesOrder(requestParameters, requestConfig) {
    return postSalesOrderRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SalesOrder.
 * Update an existing SalesOrder
 */
function updateSalesOrderRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSalesOrder.');
    }
    if (requestParameters.salesOrder === null || requestParameters.salesOrder === undefined) {
        throw new runtime.RequiredError('salesOrder', 'Required parameter requestParameters.salesOrder was null or undefined when calling updateSalesOrder.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesOrder/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SalesOrderToJSON(requestParameters.salesOrder),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SalesOrderFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SalesOrder.
* Update an existing SalesOrder
*/
export function updateSalesOrder(requestParameters, requestConfig) {
    return updateSalesOrderRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SalesOrderApi.js.map