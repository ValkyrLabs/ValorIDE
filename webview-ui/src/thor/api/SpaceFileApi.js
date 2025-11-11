// tslint:disable
import * as runtime from '../src/runtime';
import { SpaceFileFromJSON, SpaceFileToJSON, } from '../model';
/**
 * Deletes a specific SpaceFile.
 * Delete a SpaceFile.
 */
function deleteSpaceFileRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteSpaceFile.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceFile/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific SpaceFile.
* Delete a SpaceFile.
*/
export function deleteSpaceFile(requestParameters, requestConfig) {
    return deleteSpaceFileRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single SpaceFile for a specific uid.
 * Retrieve a single SpaceFile
 */
function getSpaceFileRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getSpaceFile.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceFile/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(SpaceFileFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single SpaceFile for a specific uid.
* Retrieve a single SpaceFile
*/
export function getSpaceFile(requestParameters, requestConfig) {
    return getSpaceFileRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of SpaceFiles.
 * Retrieve a list of SpaceFiles
 */
function getSpaceFileListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/SpaceFile`,
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
        config.transform = (body, text) => requestTransform(body.map(SpaceFileFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of SpaceFiles.
* Retrieve a list of SpaceFiles
*/
export function getSpaceFileList(requestParameters, requestConfig) {
    return getSpaceFileListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new SpaceFile.
 * Create a new SpaceFile
 */
function postSpaceFileRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.spaceFile === null || requestParameters.spaceFile === undefined) {
        throw new runtime.RequiredError('spaceFile', 'Required parameter requestParameters.spaceFile was null or undefined when calling postSpaceFile.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceFile`,
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
        body: queryParameters || SpaceFileToJSON(requestParameters.spaceFile),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SpaceFileFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new SpaceFile.
* Create a new SpaceFile
*/
export function postSpaceFile(requestParameters, requestConfig) {
    return postSpaceFileRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing SpaceFile.
 * Update an existing SpaceFile
 */
function updateSpaceFileRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateSpaceFile.');
    }
    if (requestParameters.spaceFile === null || requestParameters.spaceFile === undefined) {
        throw new runtime.RequiredError('spaceFile', 'Required parameter requestParameters.spaceFile was null or undefined when calling updateSpaceFile.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/SpaceFile/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || SpaceFileToJSON(requestParameters.spaceFile),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(SpaceFileFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing SpaceFile.
* Update an existing SpaceFile
*/
export function updateSpaceFile(requestParameters, requestConfig) {
    return updateSpaceFileRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=SpaceFileApi.js.map