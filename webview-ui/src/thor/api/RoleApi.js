// tslint:disable
import * as runtime from '../src/runtime';
import { RoleFromJSON, RoleToJSON, } from '../model';
/**
 * Deletes a specific Role.
 * Delete a Role.
 */
function deleteRoleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteRole.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Role/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Role.
* Delete a Role.
*/
export function deleteRole(requestParameters, requestConfig) {
    return deleteRoleRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Role for a specific uid.
 * Retrieve a single Role
 */
function getRoleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getRole.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Role/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(RoleFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Role for a specific uid.
* Retrieve a single Role
*/
export function getRole(requestParameters, requestConfig) {
    return getRoleRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Roles.
 * Retrieve a list of Roles
 */
function getRoleListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Role`,
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
        config.transform = (body, text) => requestTransform(body.map(RoleFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Roles.
* Retrieve a list of Roles
*/
export function getRoleList(requestParameters, requestConfig) {
    return getRoleListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Role.
 * Create a new Role
 */
function postRoleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.role === null || requestParameters.role === undefined) {
        throw new runtime.RequiredError('role', 'Required parameter requestParameters.role was null or undefined when calling postRole.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Role`,
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
        body: queryParameters || RoleToJSON(requestParameters.role),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(RoleFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Role.
* Create a new Role
*/
export function postRole(requestParameters, requestConfig) {
    return postRoleRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Role.
 * Update an existing Role
 */
function updateRoleRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateRole.');
    }
    if (requestParameters.role === null || requestParameters.role === undefined) {
        throw new runtime.RequiredError('role', 'Required parameter requestParameters.role was null or undefined when calling updateRole.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Role/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || RoleToJSON(requestParameters.role),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(RoleFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Role.
* Update an existing Role
*/
export function updateRole(requestParameters, requestConfig) {
    return updateRoleRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=RoleApi.js.map