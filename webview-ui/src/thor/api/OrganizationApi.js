// tslint:disable
import * as runtime from '../src/runtime';
import { OrganizationFromJSON, OrganizationToJSON, } from '../model';
/**
 * Deletes a specific Organization.
 * Delete a Organization.
 */
function deleteOrganizationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOrganization.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Organization/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific Organization.
* Delete a Organization.
*/
export function deleteOrganization(requestParameters, requestConfig) {
    return deleteOrganizationRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single Organization for a specific uid.
 * Retrieve a single Organization
 */
function getOrganizationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOrganization.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Organization/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OrganizationFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single Organization for a specific uid.
* Retrieve a single Organization
*/
export function getOrganization(requestParameters, requestConfig) {
    return getOrganizationRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of Organizations.
 * Retrieve a list of Organizations
 */
function getOrganizationListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/Organization`,
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
        config.transform = (body, text) => requestTransform(body.map(OrganizationFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of Organizations.
* Retrieve a list of Organizations
*/
export function getOrganizationList(requestParameters, requestConfig) {
    return getOrganizationListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new Organization.
 * Create a new Organization
 */
function postOrganizationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.organization === null || requestParameters.organization === undefined) {
        throw new runtime.RequiredError('organization', 'Required parameter requestParameters.organization was null or undefined when calling postOrganization.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Organization`,
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
        body: queryParameters || OrganizationToJSON(requestParameters.organization),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OrganizationFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new Organization.
* Create a new Organization
*/
export function postOrganization(requestParameters, requestConfig) {
    return postOrganizationRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing Organization.
 * Update an existing Organization
 */
function updateOrganizationRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOrganization.');
    }
    if (requestParameters.organization === null || requestParameters.organization === undefined) {
        throw new runtime.RequiredError('organization', 'Required parameter requestParameters.organization was null or undefined when calling updateOrganization.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/Organization/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OrganizationToJSON(requestParameters.organization),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OrganizationFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing Organization.
* Update an existing Organization
*/
export function updateOrganization(requestParameters, requestConfig) {
    return updateOrganizationRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OrganizationApi.js.map