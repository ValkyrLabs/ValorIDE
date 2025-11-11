// tslint:disable
import * as runtime from '../src/runtime';
import { IntegrationAccountFromJSON, IntegrationAccountToJSON, } from '../model';
/**
 * Deletes a specific IntegrationAccount.
 * Delete a IntegrationAccount.
 */
function deleteIntegrationAccountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteIntegrationAccount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/IntegrationAccount/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific IntegrationAccount.
* Delete a IntegrationAccount.
*/
export function deleteIntegrationAccount(requestParameters, requestConfig) {
    return deleteIntegrationAccountRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single IntegrationAccount for a specific uid.
 * Retrieve a single IntegrationAccount
 */
function getIntegrationAccountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getIntegrationAccount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/IntegrationAccount/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(IntegrationAccountFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single IntegrationAccount for a specific uid.
* Retrieve a single IntegrationAccount
*/
export function getIntegrationAccount(requestParameters, requestConfig) {
    return getIntegrationAccountRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of IntegrationAccounts.
 * Retrieve a list of IntegrationAccounts
 */
function getIntegrationAccountListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/IntegrationAccount`,
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
        config.transform = (body, text) => requestTransform(body.map(IntegrationAccountFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of IntegrationAccounts.
* Retrieve a list of IntegrationAccounts
*/
export function getIntegrationAccountList(requestParameters, requestConfig) {
    return getIntegrationAccountListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new IntegrationAccount.
 * Create a new IntegrationAccount
 */
function postIntegrationAccountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.integrationAccount === null || requestParameters.integrationAccount === undefined) {
        throw new runtime.RequiredError('integrationAccount', 'Required parameter requestParameters.integrationAccount was null or undefined when calling postIntegrationAccount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/IntegrationAccount`,
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
        body: queryParameters || IntegrationAccountToJSON(requestParameters.integrationAccount),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(IntegrationAccountFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new IntegrationAccount.
* Create a new IntegrationAccount
*/
export function postIntegrationAccount(requestParameters, requestConfig) {
    return postIntegrationAccountRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing IntegrationAccount.
 * Update an existing IntegrationAccount
 */
function updateIntegrationAccountRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateIntegrationAccount.');
    }
    if (requestParameters.integrationAccount === null || requestParameters.integrationAccount === undefined) {
        throw new runtime.RequiredError('integrationAccount', 'Required parameter requestParameters.integrationAccount was null or undefined when calling updateIntegrationAccount.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/IntegrationAccount/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || IntegrationAccountToJSON(requestParameters.integrationAccount),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(IntegrationAccountFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing IntegrationAccount.
* Update an existing IntegrationAccount
*/
export function updateIntegrationAccount(requestParameters, requestConfig) {
    return updateIntegrationAccountRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=IntegrationAccountApi.js.map