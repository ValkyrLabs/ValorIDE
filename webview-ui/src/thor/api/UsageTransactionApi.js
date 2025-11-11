// tslint:disable
import * as runtime from '../src/runtime';
import { UsageTransactionFromJSON, UsageTransactionToJSON, } from '../model';
/**
 * Deletes a specific UsageTransaction.
 * Delete a UsageTransaction.
 */
function deleteUsageTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteUsageTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UsageTransaction/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific UsageTransaction.
* Delete a UsageTransaction.
*/
export function deleteUsageTransaction(requestParameters, requestConfig) {
    return deleteUsageTransactionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single UsageTransaction for a specific uid.
 * Retrieve a single UsageTransaction
 */
function getUsageTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getUsageTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UsageTransaction/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(UsageTransactionFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single UsageTransaction for a specific uid.
* Retrieve a single UsageTransaction
*/
export function getUsageTransaction(requestParameters, requestConfig) {
    return getUsageTransactionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of UsageTransactions.
 * Retrieve a list of UsageTransactions
 */
function getUsageTransactionListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/UsageTransaction`,
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
        config.transform = (body, text) => requestTransform(body.map(UsageTransactionFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of UsageTransactions.
* Retrieve a list of UsageTransactions
*/
export function getUsageTransactionList(requestParameters, requestConfig) {
    return getUsageTransactionListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new UsageTransaction.
 * Create a new UsageTransaction
 */
function postUsageTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.usageTransaction === null || requestParameters.usageTransaction === undefined) {
        throw new runtime.RequiredError('usageTransaction', 'Required parameter requestParameters.usageTransaction was null or undefined when calling postUsageTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UsageTransaction`,
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
        body: queryParameters || UsageTransactionToJSON(requestParameters.usageTransaction),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(UsageTransactionFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new UsageTransaction.
* Create a new UsageTransaction
*/
export function postUsageTransaction(requestParameters, requestConfig) {
    return postUsageTransactionRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing UsageTransaction.
 * Update an existing UsageTransaction
 */
function updateUsageTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateUsageTransaction.');
    }
    if (requestParameters.usageTransaction === null || requestParameters.usageTransaction === undefined) {
        throw new runtime.RequiredError('usageTransaction', 'Required parameter requestParameters.usageTransaction was null or undefined when calling updateUsageTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/UsageTransaction/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || UsageTransactionToJSON(requestParameters.usageTransaction),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(UsageTransactionFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing UsageTransaction.
* Update an existing UsageTransaction
*/
export function updateUsageTransaction(requestParameters, requestConfig) {
    return updateUsageTransactionRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=UsageTransactionApi.js.map