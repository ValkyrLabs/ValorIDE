// tslint:disable
import * as runtime from '../src/runtime';
import { AccountBalanceFromJSON, AccountBalanceToJSON, } from '../model';
/**
 * Deletes a specific AccountBalance.
 * Delete a AccountBalance.
 */
function deleteAccountBalanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteAccountBalance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AccountBalance/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific AccountBalance.
* Delete a AccountBalance.
*/
export function deleteAccountBalance(requestParameters, requestConfig) {
    return deleteAccountBalanceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single AccountBalance for a specific uid.
 * Retrieve a single AccountBalance
 */
function getAccountBalanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getAccountBalance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AccountBalance/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(AccountBalanceFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single AccountBalance for a specific uid.
* Retrieve a single AccountBalance
*/
export function getAccountBalance(requestParameters, requestConfig) {
    return getAccountBalanceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of AccountBalances.
 * Retrieve a list of AccountBalances
 */
function getAccountBalanceListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/AccountBalance`,
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
        config.transform = (body, text) => requestTransform(body.map(AccountBalanceFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of AccountBalances.
* Retrieve a list of AccountBalances
*/
export function getAccountBalanceList(requestParameters, requestConfig) {
    return getAccountBalanceListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new AccountBalance.
 * Create a new AccountBalance
 */
function postAccountBalanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.accountBalance === null || requestParameters.accountBalance === undefined) {
        throw new runtime.RequiredError('accountBalance', 'Required parameter requestParameters.accountBalance was null or undefined when calling postAccountBalance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AccountBalance`,
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
        body: queryParameters || AccountBalanceToJSON(requestParameters.accountBalance),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AccountBalanceFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new AccountBalance.
* Create a new AccountBalance
*/
export function postAccountBalance(requestParameters, requestConfig) {
    return postAccountBalanceRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing AccountBalance.
 * Update an existing AccountBalance
 */
function updateAccountBalanceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateAccountBalance.');
    }
    if (requestParameters.accountBalance === null || requestParameters.accountBalance === undefined) {
        throw new runtime.RequiredError('accountBalance', 'Required parameter requestParameters.accountBalance was null or undefined when calling updateAccountBalance.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AccountBalance/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || AccountBalanceToJSON(requestParameters.accountBalance),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AccountBalanceFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing AccountBalance.
* Update an existing AccountBalance
*/
export function updateAccountBalance(requestParameters, requestConfig) {
    return updateAccountBalanceRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=AccountBalanceApi.js.map