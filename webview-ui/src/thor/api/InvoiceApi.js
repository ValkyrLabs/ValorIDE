// tslint:disable
import * as runtime from '../src/runtime';
import { InvoiceFromJSON, InvoiceToJSON, } from '../model';
/**
 * Deletes a specific Invoice.
 * Delete a Invoice.
 */
function deleteInvoiceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteInvoice.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Invoice/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Invoice.
* Delete a Invoice.
*/
export function deleteInvoice(requestParameters, requestConfig) {
    return deleteInvoiceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Invoice for a specific uid.
 * Retrieve a single Invoice
 */
function getInvoiceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getInvoice.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Invoice/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(InvoiceFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Invoice for a specific uid.
* Retrieve a single Invoice
*/
export function getInvoice(requestParameters, requestConfig) {
    return getInvoiceRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Invoices.
 * Retrieve a list of Invoices
 */
function getInvoiceListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Invoice`,
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
        config.transform = (body, text) => requestTransform(body.map(InvoiceFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Invoices.
* Retrieve a list of Invoices
*/
export function getInvoiceList(requestParameters, requestConfig) {
    return getInvoiceListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Invoice.
 * Create a new Invoice
 */
function postInvoiceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.invoice === null || requestParameters.invoice === undefined) {
        throw new runtime.RequiredError('invoice', 'Required parameter requestParameters.invoice was null or undefined when calling postInvoice.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Invoice`,
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
        body: queryParameters || InvoiceToJSON(requestParameters.invoice),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(InvoiceFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Invoice.
* Create a new Invoice
*/
export function postInvoice(requestParameters, requestConfig) {
    return postInvoiceRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Invoice.
 * Update an existing Invoice
 */
function updateInvoiceRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateInvoice.');
    }
    if (requestParameters.invoice === null || requestParameters.invoice === undefined) {
        throw new runtime.RequiredError('invoice', 'Required parameter requestParameters.invoice was null or undefined when calling updateInvoice.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Invoice/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || InvoiceToJSON(requestParameters.invoice),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(InvoiceFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Invoice.
* Update an existing Invoice
*/
export function updateInvoice(requestParameters, requestConfig) {
    return updateInvoiceRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=InvoiceApi.js.map