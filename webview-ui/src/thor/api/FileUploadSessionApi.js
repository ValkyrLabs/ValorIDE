// tslint:disable
import * as runtime from '../src/runtime';
import { FileUploadSessionFromJSON, FileUploadSessionToJSON, } from '../model';
/**
 * Deletes a specific FileUploadSession.
 * Delete a FileUploadSession.
 */
function deleteFileUploadSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteFileUploadSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileUploadSession/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific FileUploadSession.
* Delete a FileUploadSession.
*/
export function deleteFileUploadSession(requestParameters, requestConfig) {
    return deleteFileUploadSessionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single FileUploadSession for a specific uid.
 * Retrieve a single FileUploadSession
 */
function getFileUploadSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getFileUploadSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileUploadSession/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(FileUploadSessionFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single FileUploadSession for a specific uid.
* Retrieve a single FileUploadSession
*/
export function getFileUploadSession(requestParameters, requestConfig) {
    return getFileUploadSessionRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of FileUploadSessions.
 * Retrieve a list of FileUploadSessions
 */
function getFileUploadSessionListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/FileUploadSession`,
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
        config.transform = (body, text) => requestTransform(body.map(FileUploadSessionFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of FileUploadSessions.
* Retrieve a list of FileUploadSessions
*/
export function getFileUploadSessionList(requestParameters, requestConfig) {
    return getFileUploadSessionListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new FileUploadSession.
 * Create a new FileUploadSession
 */
function postFileUploadSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.fileUploadSession === null || requestParameters.fileUploadSession === undefined) {
        throw new runtime.RequiredError('fileUploadSession', 'Required parameter requestParameters.fileUploadSession was null or undefined when calling postFileUploadSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileUploadSession`,
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
        body: queryParameters || FileUploadSessionToJSON(requestParameters.fileUploadSession),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileUploadSessionFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new FileUploadSession.
* Create a new FileUploadSession
*/
export function postFileUploadSession(requestParameters, requestConfig) {
    return postFileUploadSessionRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing FileUploadSession.
 * Update an existing FileUploadSession
 */
function updateFileUploadSessionRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateFileUploadSession.');
    }
    if (requestParameters.fileUploadSession === null || requestParameters.fileUploadSession === undefined) {
        throw new runtime.RequiredError('fileUploadSession', 'Required parameter requestParameters.fileUploadSession was null or undefined when calling updateFileUploadSession.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileUploadSession/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || FileUploadSessionToJSON(requestParameters.fileUploadSession),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileUploadSessionFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing FileUploadSession.
* Update an existing FileUploadSession
*/
export function updateFileUploadSession(requestParameters, requestConfig) {
    return updateFileUploadSessionRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=FileUploadSessionApi.js.map