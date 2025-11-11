// tslint:disable
import * as runtime from '../src/runtime';
import { AclEntryFromJSON, AclEntryToJSON, } from '../model';
/**
 * Deletes a specific AclEntry.
 * Delete a AclEntry.
 */
function deleteAclEntryRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteAclEntry.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AclEntry/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific AclEntry.
* Delete a AclEntry.
*/
export function deleteAclEntry(requestParameters, requestConfig) {
    return deleteAclEntryRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single AclEntry for a specific uid.
 * Retrieve a single AclEntry
 */
function getAclEntryRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getAclEntry.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AclEntry/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(AclEntryFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single AclEntry for a specific uid.
* Retrieve a single AclEntry
*/
export function getAclEntry(requestParameters, requestConfig) {
    return getAclEntryRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of AclEntrys.
 * Retrieve a list of AclEntrys
 */
function getAclEntryListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/AclEntry`,
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
        config.transform = (body, text) => requestTransform(body.map(AclEntryFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of AclEntrys.
* Retrieve a list of AclEntrys
*/
export function getAclEntryList(requestParameters, requestConfig) {
    return getAclEntryListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new AclEntry.
 * Create a new AclEntry
 */
function postAclEntryRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.aclEntry === null || requestParameters.aclEntry === undefined) {
        throw new runtime.RequiredError('aclEntry', 'Required parameter requestParameters.aclEntry was null or undefined when calling postAclEntry.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AclEntry`,
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
        body: queryParameters || AclEntryToJSON(requestParameters.aclEntry),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AclEntryFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new AclEntry.
* Create a new AclEntry
*/
export function postAclEntry(requestParameters, requestConfig) {
    return postAclEntryRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing AclEntry.
 * Update an existing AclEntry
 */
function updateAclEntryRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateAclEntry.');
    }
    if (requestParameters.aclEntry === null || requestParameters.aclEntry === undefined) {
        throw new runtime.RequiredError('aclEntry', 'Required parameter requestParameters.aclEntry was null or undefined when calling updateAclEntry.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/AclEntry/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || AclEntryToJSON(requestParameters.aclEntry),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(AclEntryFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing AclEntry.
* Update an existing AclEntry
*/
export function updateAclEntry(requestParameters, requestConfig) {
    return updateAclEntryRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=AclEntryApi.js.map