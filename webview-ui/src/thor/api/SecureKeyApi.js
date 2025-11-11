// tslint:disable
import * as runtime from '../src/runtime';
import { SecureKeyFromJSON, SecureKeyToJSON, } from '../model';
/**
 * Deletes a specific SecureKey.
 * Delete a SecureKey.
 */
function deleteSecureKeyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSecureKey.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SecureKey/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SecureKey.
* Delete a SecureKey.
*/
export function deleteSecureKey(requestParameters, requestConfig) {
    return deleteSecureKeyRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SecureKey for a specific uid.
 * Retrieve a single SecureKey
 */
function getSecureKeyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSecureKey.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SecureKey/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SecureKeyFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SecureKey for a specific uid.
* Retrieve a single SecureKey
*/
export function getSecureKey(requestParameters, requestConfig) {
    return getSecureKeyRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SecureKeys.
 * Retrieve a list of SecureKeys
 */
function getSecureKeyListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SecureKey`,
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
        config.transform = (body, text) => requestTransform(body.map(SecureKeyFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SecureKeys.
* Retrieve a list of SecureKeys
*/
export function getSecureKeyList(requestParameters, requestConfig) {
    return getSecureKeyListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SecureKey.
 * Create a new SecureKey
 */
function postSecureKeyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.secureKey === null || requestParameters.secureKey === undefined) {
        throw new runtime.RequiredError('secureKey', 'Required parameter requestParameters.secureKey was null or undefined when calling postSecureKey.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SecureKey`,
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
        body: queryParameters || SecureKeyToJSON(requestParameters.secureKey),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SecureKeyFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SecureKey.
* Create a new SecureKey
*/
export function postSecureKey(requestParameters, requestConfig) {
    return postSecureKeyRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SecureKey.
 * Update an existing SecureKey
 */
function updateSecureKeyRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSecureKey.');
    }
    if (requestParameters.secureKey === null || requestParameters.secureKey === undefined) {
        throw new runtime.RequiredError('secureKey', 'Required parameter requestParameters.secureKey was null or undefined when calling updateSecureKey.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SecureKey/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SecureKeyToJSON(requestParameters.secureKey),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SecureKeyFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SecureKey.
* Update an existing SecureKey
*/
export function updateSecureKey(requestParameters, requestConfig) {
    return updateSecureKeyRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SecureKeyApi.js.map