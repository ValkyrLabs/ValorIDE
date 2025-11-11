// tslint:disable
import * as runtime from '../src/runtime';
import { DiscountFromJSON, DiscountToJSON, } from '../model';
/**
 * Deletes a specific Discount.
 * Delete a Discount.
 */
function deleteDiscountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteDiscount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Discount/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Discount.
* Delete a Discount.
*/
export function deleteDiscount(requestParameters, requestConfig) {
    return deleteDiscountRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Discount for a specific uid.
 * Retrieve a single Discount
 */
function getDiscountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getDiscount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Discount/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(DiscountFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Discount for a specific uid.
* Retrieve a single Discount
*/
export function getDiscount(requestParameters, requestConfig) {
    return getDiscountRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Discounts.
 * Retrieve a list of Discounts
 */
function getDiscountListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Discount`,
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
        config.transform = (body, text) => requestTransform(body.map(DiscountFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Discounts.
* Retrieve a list of Discounts
*/
export function getDiscountList(requestParameters, requestConfig) {
    return getDiscountListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Discount.
 * Create a new Discount
 */
function postDiscountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.discount === null || requestParameters.discount === undefined) {
        throw new runtime.RequiredError('discount', 'Required parameter requestParameters.discount was null or undefined when calling postDiscount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Discount`,
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
        body: queryParameters || DiscountToJSON(requestParameters.discount),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(DiscountFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Discount.
* Create a new Discount
*/
export function postDiscount(requestParameters, requestConfig) {
    return postDiscountRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Discount.
 * Update an existing Discount
 */
function updateDiscountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateDiscount.');
    }
    if (requestParameters.discount === null || requestParameters.discount === undefined) {
        throw new runtime.RequiredError('discount', 'Required parameter requestParameters.discount was null or undefined when calling updateDiscount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Discount/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || DiscountToJSON(requestParameters.discount),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(DiscountFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Discount.
* Update an existing Discount
*/
export function updateDiscount(requestParameters, requestConfig) {
    return updateDiscountRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=DiscountApi.js.map