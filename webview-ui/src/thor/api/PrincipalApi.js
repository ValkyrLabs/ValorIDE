// tslint:disable
import * as runtime from '../src/runtime';
import { PrincipalFromJSON, PrincipalToJSON, } from '../model';
/**
 * Deletes a specific Principal.
 * Delete a Principal.
 */
function deletePrincipalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deletePrincipal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Principal/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Principal.
* Delete a Principal.
*/
export function deletePrincipal(requestParameters, requestConfig) {
    return deletePrincipalRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Principal for a specific uid.
 * Retrieve a single Principal
 */
function getPrincipalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getPrincipal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Principal/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(PrincipalFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Principal for a specific uid.
* Retrieve a single Principal
*/
export function getPrincipal(requestParameters, requestConfig) {
    return getPrincipalRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Principals.
 * Retrieve a list of Principals
 */
function getPrincipalListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Principal`,
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
        config.transform = (body, text) => requestTransform(body.map(PrincipalFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Principals.
* Retrieve a list of Principals
*/
export function getPrincipalList(requestParameters, requestConfig) {
    return getPrincipalListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Principal.
 * Create a new Principal
 */
function postPrincipalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.principal === null || requestParameters.principal === undefined) {
        throw new runtime.RequiredError('principal', 'Required parameter requestParameters.principal was null or undefined when calling postPrincipal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Principal`,
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
        body: queryParameters || PrincipalToJSON(requestParameters.principal),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PrincipalFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Principal.
* Create a new Principal
*/
export function postPrincipal(requestParameters, requestConfig) {
    return postPrincipalRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Principal.
 * Update an existing Principal
 */
function updatePrincipalRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updatePrincipal.');
    }
    if (requestParameters.principal === null || requestParameters.principal === undefined) {
        throw new runtime.RequiredError('principal', 'Required parameter requestParameters.principal was null or undefined when calling updatePrincipal.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Principal/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || PrincipalToJSON(requestParameters.principal),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(PrincipalFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Principal.
* Update an existing Principal
*/
export function updatePrincipal(requestParameters, requestConfig) {
    return updatePrincipalRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=PrincipalApi.js.map