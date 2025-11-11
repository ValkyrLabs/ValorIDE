// tslint:disable
import * as runtime from '../src/runtime';
import { PaymentTransactionFromJSON, PaymentTransactionToJSON, } from '../model';
/**
 * Deletes a specific PaymentTransaction.
 * Delete a PaymentTransaction.
 */
function deletePaymentTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deletePaymentTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PaymentTransaction/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific PaymentTransaction.
* Delete a PaymentTransaction.
*/
export function deletePaymentTransaction(requestParameters, requestConfig) {
    return deletePaymentTransactionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single PaymentTransaction for a specific uid.
 * Retrieve a single PaymentTransaction
 */
function getPaymentTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getPaymentTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PaymentTransaction/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(PaymentTransactionFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single PaymentTransaction for a specific uid.
* Retrieve a single PaymentTransaction
*/
export function getPaymentTransaction(requestParameters, requestConfig) {
    return getPaymentTransactionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of PaymentTransactions.
 * Retrieve a list of PaymentTransactions
 */
function getPaymentTransactionListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/PaymentTransaction`,
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
        config.transform = (body, text) => requestTransform(body.map(PaymentTransactionFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of PaymentTransactions.
* Retrieve a list of PaymentTransactions
*/
export function getPaymentTransactionList(requestParameters, requestConfig) {
    return getPaymentTransactionListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new PaymentTransaction.
 * Create a new PaymentTransaction
 */
function postPaymentTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.paymentTransaction === null || requestParameters.paymentTransaction === undefined) {
        throw new runtime.RequiredError('paymentTransaction', 'Required parameter requestParameters.paymentTransaction was null or undefined when calling postPaymentTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PaymentTransaction`,
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
        body: queryParameters || PaymentTransactionToJSON(requestParameters.paymentTransaction),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PaymentTransactionFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new PaymentTransaction.
* Create a new PaymentTransaction
*/
export function postPaymentTransaction(requestParameters, requestConfig) {
    return postPaymentTransactionRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing PaymentTransaction.
 * Update an existing PaymentTransaction
 */
function updatePaymentTransactionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updatePaymentTransaction.');
    }
    if (requestParameters.paymentTransaction === null || requestParameters.paymentTransaction === undefined) {
        throw new runtime.RequiredError('paymentTransaction', 'Required parameter requestParameters.paymentTransaction was null or undefined when calling updatePaymentTransaction.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/PaymentTransaction/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || PaymentTransactionToJSON(requestParameters.paymentTransaction),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PaymentTransactionFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing PaymentTransaction.
* Update an existing PaymentTransaction
*/
export function updatePaymentTransaction(requestParameters, requestConfig) {
    return updatePaymentTransactionRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=PaymentTransactionApi.js.map