// tslint:disable
import * as runtime from '../src/runtime';
import { LoginFromJSON, LoginToJSON, } from '../model';
/**
 * Deletes a specific Login.
 * Delete a Login.
 */
function deleteLoginRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteLogin.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Login/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Login.
* Delete a Login.
*/
export function deleteLogin(requestParameters, requestConfig) {
    return deleteLoginRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Login for a specific uid.
 * Retrieve a single Login
 */
function getLoginRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getLogin.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Login/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(LoginFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Login for a specific uid.
* Retrieve a single Login
*/
export function getLogin(requestParameters, requestConfig) {
    return getLoginRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Logins.
 * Retrieve a list of Logins
 */
function getLoginListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Login`,
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
        config.transform = (body, text) => requestTransform(body.map(LoginFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Logins.
* Retrieve a list of Logins
*/
export function getLoginList(requestParameters, requestConfig) {
    return getLoginListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Login.
 * Create a new Login
 */
function postLoginRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.login === null || requestParameters.login === undefined) {
        throw new runtime.RequiredError('login', 'Required parameter requestParameters.login was null or undefined when calling postLogin.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Login`,
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
        body: queryParameters || LoginToJSON(requestParameters.login),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LoginFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Login.
* Create a new Login
*/
export function postLogin(requestParameters, requestConfig) {
    return postLoginRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Login.
 * Update an existing Login
 */
function updateLoginRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateLogin.');
    }
    if (requestParameters.login === null || requestParameters.login === undefined) {
        throw new runtime.RequiredError('login', 'Required parameter requestParameters.login was null or undefined when calling updateLogin.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Login/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || LoginToJSON(requestParameters.login),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LoginFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Login.
* Update an existing Login
*/
export function updateLogin(requestParameters, requestConfig) {
    return updateLoginRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=LoginApi.js.map