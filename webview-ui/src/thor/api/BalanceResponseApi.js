// tslint:disable
import * as runtime from '../src/runtime';
import { BalanceResponseFromJSON, BalanceResponseToJSON, } from '../model';
/**
 * Deletes a specific BalanceResponse.
 * Delete a BalanceResponse.
 */
function deleteBalanceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteBalanceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BalanceResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific BalanceResponse.
* Delete a BalanceResponse.
*/
export function deleteBalanceResponse(requestParameters, requestConfig) {
    return deleteBalanceResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single BalanceResponse for a specific uid.
 * Retrieve a single BalanceResponse
 */
function getBalanceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getBalanceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BalanceResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(BalanceResponseFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single BalanceResponse for a specific uid.
* Retrieve a single BalanceResponse
*/
export function getBalanceResponse(requestParameters, requestConfig) {
    return getBalanceResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of BalanceResponses.
 * Retrieve a list of BalanceResponses
 */
function getBalanceResponseListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/BalanceResponse`,
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
        config.transform = (body, text) => requestTransform(body.map(BalanceResponseFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of BalanceResponses.
* Retrieve a list of BalanceResponses
*/
export function getBalanceResponseList(requestParameters, requestConfig) {
    return getBalanceResponseListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new BalanceResponse.
 * Create a new BalanceResponse
 */
function postBalanceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.balanceResponse === null || requestParameters.balanceResponse === undefined) {
        throw new runtime.RequiredError('balanceResponse', 'Required parameter requestParameters.balanceResponse was null or undefined when calling postBalanceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BalanceResponse`,
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
        body: queryParameters || BalanceResponseToJSON(requestParameters.balanceResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BalanceResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new BalanceResponse.
* Create a new BalanceResponse
*/
export function postBalanceResponse(requestParameters, requestConfig) {
    return postBalanceResponseRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing BalanceResponse.
 * Update an existing BalanceResponse
 */
function updateBalanceResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateBalanceResponse.');
    }
    if (requestParameters.balanceResponse === null || requestParameters.balanceResponse === undefined) {
        throw new runtime.RequiredError('balanceResponse', 'Required parameter requestParameters.balanceResponse was null or undefined when calling updateBalanceResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/BalanceResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || BalanceResponseToJSON(requestParameters.balanceResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(BalanceResponseFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing BalanceResponse.
* Update an existing BalanceResponse
*/
export function updateBalanceResponse(requestParameters, requestConfig) {
    return updateBalanceResponseRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=BalanceResponseApi.js.map