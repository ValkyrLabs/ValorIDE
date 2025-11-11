// tslint:disable
import * as runtime from '../src/runtime';
import { ProductFromJSON, ProductToJSON, } from '../model';
/**
 * Deletes a specific Product.
 * Delete a Product.
 */
function deleteProductRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteProduct.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Product/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Product.
* Delete a Product.
*/
export function deleteProduct(requestParameters, requestConfig) {
    return deleteProductRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Product for a specific uid.
 * Retrieve a single Product
 */
function getProductRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getProduct.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Product/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ProductFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Product for a specific uid.
* Retrieve a single Product
*/
export function getProduct(requestParameters, requestConfig) {
    return getProductRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Products.
 * Retrieve a list of Products
 */
function getProductListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Product`,
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
        config.transform = (body, text) => requestTransform(body.map(ProductFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Products.
* Retrieve a list of Products
*/
export function getProductList(requestParameters, requestConfig) {
    return getProductListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Product.
 * Create a new Product
 */
function postProductRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.product === null || requestParameters.product === undefined) {
        throw new runtime.RequiredError('product', 'Required parameter requestParameters.product was null or undefined when calling postProduct.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Product`,
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
        body: queryParameters || ProductToJSON(requestParameters.product),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ProductFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Product.
* Create a new Product
*/
export function postProduct(requestParameters, requestConfig) {
    return postProductRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Product.
 * Update an existing Product
 */
function updateProductRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateProduct.');
    }
    if (requestParameters.product === null || requestParameters.product === undefined) {
        throw new runtime.RequiredError('product', 'Required parameter requestParameters.product was null or undefined when calling updateProduct.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Product/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ProductToJSON(requestParameters.product),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ProductFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Product.
* Update an existing Product
*/
export function updateProduct(requestParameters, requestConfig) {
    return updateProductRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ProductApi.js.map