// tslint:disable
import * as runtime from '../src/runtime';
import { SalesPipelineFromJSON, SalesPipelineToJSON, } from '../model';
/**
 * Deletes a specific SalesPipeline.
 * Delete a SalesPipeline.
 */
function deleteSalesPipelineRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSalesPipeline.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesPipeline/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SalesPipeline.
* Delete a SalesPipeline.
*/
export function deleteSalesPipeline(requestParameters, requestConfig) {
    return deleteSalesPipelineRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SalesPipeline for a specific uid.
 * Retrieve a single SalesPipeline
 */
function getSalesPipelineRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSalesPipeline.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesPipeline/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SalesPipelineFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SalesPipeline for a specific uid.
* Retrieve a single SalesPipeline
*/
export function getSalesPipeline(requestParameters, requestConfig) {
    return getSalesPipelineRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SalesPipelines.
 * Retrieve a list of SalesPipelines
 */
function getSalesPipelineListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SalesPipeline`,
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
        config.transform = (body, text) => requestTransform(body.map(SalesPipelineFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SalesPipelines.
* Retrieve a list of SalesPipelines
*/
export function getSalesPipelineList(requestParameters, requestConfig) {
    return getSalesPipelineListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SalesPipeline.
 * Create a new SalesPipeline
 */
function postSalesPipelineRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.salesPipeline === null || requestParameters.salesPipeline === undefined) {
        throw new runtime.RequiredError('salesPipeline', 'Required parameter requestParameters.salesPipeline was null or undefined when calling postSalesPipeline.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesPipeline`,
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
        body: queryParameters || SalesPipelineToJSON(requestParameters.salesPipeline),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SalesPipelineFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SalesPipeline.
* Create a new SalesPipeline
*/
export function postSalesPipeline(requestParameters, requestConfig) {
    return postSalesPipelineRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SalesPipeline.
 * Update an existing SalesPipeline
 */
function updateSalesPipelineRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSalesPipeline.');
    }
    if (requestParameters.salesPipeline === null || requestParameters.salesPipeline === undefined) {
        throw new runtime.RequiredError('salesPipeline', 'Required parameter requestParameters.salesPipeline was null or undefined when calling updateSalesPipeline.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SalesPipeline/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SalesPipelineToJSON(requestParameters.salesPipeline),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SalesPipelineFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SalesPipeline.
* Update an existing SalesPipeline
*/
export function updateSalesPipeline(requestParameters, requestConfig) {
    return updateSalesPipelineRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SalesPipelineApi.js.map