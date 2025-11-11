// tslint:disable
import * as runtime from '../src/runtime';
import { LineItemFromJSON, LineItemToJSON, } from '../model';
/**
 * Deletes a specific LineItem.
 * Delete a LineItem.
 */
function deleteLineItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteLineItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LineItem/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific LineItem.
* Delete a LineItem.
*/
export function deleteLineItem(requestParameters, requestConfig) {
    return deleteLineItemRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single LineItem for a specific uid.
 * Retrieve a single LineItem
 */
function getLineItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getLineItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LineItem/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(LineItemFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single LineItem for a specific uid.
* Retrieve a single LineItem
*/
export function getLineItem(requestParameters, requestConfig) {
    return getLineItemRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of LineItems.
 * Retrieve a list of LineItems
 */
function getLineItemListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/LineItem`,
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
        config.transform = (body, text) => requestTransform(body.map(LineItemFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of LineItems.
* Retrieve a list of LineItems
*/
export function getLineItemList(requestParameters, requestConfig) {
    return getLineItemListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new LineItem.
 * Create a new LineItem
 */
function postLineItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.lineItem === null || requestParameters.lineItem === undefined) {
        throw new runtime.RequiredError('lineItem', 'Required parameter requestParameters.lineItem was null or undefined when calling postLineItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LineItem`,
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
        body: queryParameters || LineItemToJSON(requestParameters.lineItem),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LineItemFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new LineItem.
* Create a new LineItem
*/
export function postLineItem(requestParameters, requestConfig) {
    return postLineItemRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing LineItem.
 * Update an existing LineItem
 */
function updateLineItemRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateLineItem.');
    }
    if (requestParameters.lineItem === null || requestParameters.lineItem === undefined) {
        throw new runtime.RequiredError('lineItem', 'Required parameter requestParameters.lineItem was null or undefined when calling updateLineItem.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/LineItem/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || LineItemToJSON(requestParameters.lineItem),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LineItemFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing LineItem.
* Update an existing LineItem
*/
export function updateLineItem(requestParameters, requestConfig) {
    return updateLineItemRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=LineItemApi.js.map