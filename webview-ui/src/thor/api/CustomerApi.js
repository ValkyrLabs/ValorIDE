// tslint:disable
import * as runtime from '../src/runtime';
import { CustomerFromJSON, CustomerToJSON, } from '../model';
/**
 * Deletes a specific Customer.
 * Delete a Customer.
 */
function deleteCustomerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteCustomer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Customer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Customer.
* Delete a Customer.
*/
export function deleteCustomer(requestParameters, requestConfig) {
    return deleteCustomerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Customer for a specific uid.
 * Retrieve a single Customer
 */
function getCustomerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getCustomer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Customer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(CustomerFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Customer for a specific uid.
* Retrieve a single Customer
*/
export function getCustomer(requestParameters, requestConfig) {
    return getCustomerRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Customers.
 * Retrieve a list of Customers
 */
function getCustomerListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Customer`,
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
        config.transform = (body, text) => requestTransform(body.map(CustomerFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Customers.
* Retrieve a list of Customers
*/
export function getCustomerList(requestParameters, requestConfig) {
    return getCustomerListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Customer.
 * Create a new Customer
 */
function postCustomerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.customer === null || requestParameters.customer === undefined) {
        throw new runtime.RequiredError('customer', 'Required parameter requestParameters.customer was null or undefined when calling postCustomer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Customer`,
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
        body: queryParameters || CustomerToJSON(requestParameters.customer),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(CustomerFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Customer.
* Create a new Customer
*/
export function postCustomer(requestParameters, requestConfig) {
    return postCustomerRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Customer.
 * Update an existing Customer
 */
function updateCustomerRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateCustomer.');
    }
    if (requestParameters.customer === null || requestParameters.customer === undefined) {
        throw new runtime.RequiredError('customer', 'Required parameter requestParameters.customer was null or undefined when calling updateCustomer.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Customer/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || CustomerToJSON(requestParameters.customer),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(CustomerFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Customer.
* Update an existing Customer
*/
export function updateCustomer(requestParameters, requestConfig) {
    return updateCustomerRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=CustomerApi.js.map