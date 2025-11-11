// tslint:disable
import * as runtime from '../src/runtime';
import { ProductFeatureFromJSON, ProductFeatureToJSON, } from '../model';
/**
 * Deletes a specific ProductFeature.
 * Delete a ProductFeature.
 */
function deleteProductFeatureRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteProductFeature.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ProductFeature/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific ProductFeature.
* Delete a ProductFeature.
*/
export function deleteProductFeature(requestParameters, requestConfig) {
    return deleteProductFeatureRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single ProductFeature for a specific uid.
 * Retrieve a single ProductFeature
 */
function getProductFeatureRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getProductFeature.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ProductFeature/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(ProductFeatureFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single ProductFeature for a specific uid.
* Retrieve a single ProductFeature
*/
export function getProductFeature(requestParameters, requestConfig) {
    return getProductFeatureRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of ProductFeatures.
 * Retrieve a list of ProductFeatures
 */
function getProductFeatureListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/ProductFeature`,
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
        config.transform = (body, text) => requestTransform(body.map(ProductFeatureFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of ProductFeatures.
* Retrieve a list of ProductFeatures
*/
export function getProductFeatureList(requestParameters, requestConfig) {
    return getProductFeatureListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new ProductFeature.
 * Create a new ProductFeature
 */
function postProductFeatureRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.productFeature === null || requestParameters.productFeature === undefined) {
        throw new runtime.RequiredError('productFeature', 'Required parameter requestParameters.productFeature was null or undefined when calling postProductFeature.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ProductFeature`,
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
        body: queryParameters || ProductFeatureToJSON(requestParameters.productFeature),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ProductFeatureFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new ProductFeature.
* Create a new ProductFeature
*/
export function postProductFeature(requestParameters, requestConfig) {
    return postProductFeatureRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing ProductFeature.
 * Update an existing ProductFeature
 */
function updateProductFeatureRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateProductFeature.');
    }
    if (requestParameters.productFeature === null || requestParameters.productFeature === undefined) {
        throw new runtime.RequiredError('productFeature', 'Required parameter requestParameters.productFeature was null or undefined when calling updateProductFeature.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/ProductFeature/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || ProductFeatureToJSON(requestParameters.productFeature),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(ProductFeatureFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing ProductFeature.
* Update an existing ProductFeature
*/
export function updateProductFeature(requestParameters, requestConfig) {
    return updateProductFeatureRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=ProductFeatureApi.js.map