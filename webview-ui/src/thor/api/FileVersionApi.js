// tslint:disable
import * as runtime from '../src/runtime';
import { FileVersionFromJSON, FileVersionToJSON, } from '../model';
/**
 * Deletes a specific FileVersion.
 * Delete a FileVersion.
 */
function deleteFileVersionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteFileVersion.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileVersion/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific FileVersion.
* Delete a FileVersion.
*/
export function deleteFileVersion(requestParameters, requestConfig) {
    return deleteFileVersionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single FileVersion for a specific uid.
 * Retrieve a single FileVersion
 */
function getFileVersionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getFileVersion.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileVersion/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(FileVersionFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single FileVersion for a specific uid.
* Retrieve a single FileVersion
*/
export function getFileVersion(requestParameters, requestConfig) {
    return getFileVersionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of FileVersions.
 * Retrieve a list of FileVersions
 */
function getFileVersionListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/FileVersion`,
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
        config.transform = (body, text) => requestTransform(body.map(FileVersionFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of FileVersions.
* Retrieve a list of FileVersions
*/
export function getFileVersionList(requestParameters, requestConfig) {
    return getFileVersionListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new FileVersion.
 * Create a new FileVersion
 */
function postFileVersionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.fileVersion === null || requestParameters.fileVersion === undefined) {
        throw new runtime.RequiredError('fileVersion', 'Required parameter requestParameters.fileVersion was null or undefined when calling postFileVersion.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileVersion`,
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
        body: queryParameters || FileVersionToJSON(requestParameters.fileVersion),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileVersionFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new FileVersion.
* Create a new FileVersion
*/
export function postFileVersion(requestParameters, requestConfig) {
    return postFileVersionRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing FileVersion.
 * Update an existing FileVersion
 */
function updateFileVersionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateFileVersion.');
    }
    if (requestParameters.fileVersion === null || requestParameters.fileVersion === undefined) {
        throw new runtime.RequiredError('fileVersion', 'Required parameter requestParameters.fileVersion was null or undefined when calling updateFileVersion.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileVersion/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || FileVersionToJSON(requestParameters.fileVersion),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileVersionFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing FileVersion.
* Update an existing FileVersion
*/
export function updateFileVersion(requestParameters, requestConfig) {
    return updateFileVersionRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=FileVersionApi.js.map