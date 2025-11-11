// tslint:disable
import * as runtime from '../src/runtime';
import { LogoutFromJSON, LogoutToJSON, } from '../model';
/**
 * Deletes a specific Logout.
 * Delete a Logout.
 */
function deleteLogoutRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteLogout.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Logout/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Logout.
* Delete a Logout.
*/
export function deleteLogout(requestParameters, requestConfig) {
    return deleteLogoutRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Logout for a specific uid.
 * Retrieve a single Logout
 */
function getLogoutRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getLogout.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Logout/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(LogoutFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Logout for a specific uid.
* Retrieve a single Logout
*/
export function getLogout(requestParameters, requestConfig) {
    return getLogoutRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Logouts.
 * Retrieve a list of Logouts
 */
function getLogoutListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Logout`,
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
        config.transform = (body, text) => requestTransform(body.map(LogoutFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Logouts.
* Retrieve a list of Logouts
*/
export function getLogoutList(requestParameters, requestConfig) {
    return getLogoutListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Logout.
 * Create a new Logout
 */
function postLogoutRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.logout === null || requestParameters.logout === undefined) {
        throw new runtime.RequiredError('logout', 'Required parameter requestParameters.logout was null or undefined when calling postLogout.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Logout`,
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
        body: queryParameters || LogoutToJSON(requestParameters.logout),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LogoutFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Logout.
* Create a new Logout
*/
export function postLogout(requestParameters, requestConfig) {
    return postLogoutRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Logout.
 * Update an existing Logout
 */
function updateLogoutRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateLogout.');
    }
    if (requestParameters.logout === null || requestParameters.logout === undefined) {
        throw new runtime.RequiredError('logout', 'Required parameter requestParameters.logout was null or undefined when calling updateLogout.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Logout/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || LogoutToJSON(requestParameters.logout),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(LogoutFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Logout.
* Update an existing Logout
*/
export function updateLogout(requestParameters, requestConfig) {
    return updateLogoutRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=LogoutApi.js.map