// tslint:disable
import * as runtime from '../src/runtime';
import { FileAuditLogFromJSON, FileAuditLogToJSON, } from '../model';
/**
 * Deletes a specific FileAuditLog.
 * Delete a FileAuditLog.
 */
function deleteFileAuditLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteFileAuditLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileAuditLog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific FileAuditLog.
* Delete a FileAuditLog.
*/
export function deleteFileAuditLog(requestParameters, requestConfig) {
    return deleteFileAuditLogRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single FileAuditLog for a specific uid.
 * Retrieve a single FileAuditLog
 */
function getFileAuditLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getFileAuditLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileAuditLog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(FileAuditLogFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single FileAuditLog for a specific uid.
* Retrieve a single FileAuditLog
*/
export function getFileAuditLog(requestParameters, requestConfig) {
    return getFileAuditLogRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of FileAuditLogs.
 * Retrieve a list of FileAuditLogs
 */
function getFileAuditLogListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/FileAuditLog`,
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
        config.transform = (body, text) => requestTransform(body.map(FileAuditLogFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of FileAuditLogs.
* Retrieve a list of FileAuditLogs
*/
export function getFileAuditLogList(requestParameters, requestConfig) {
    return getFileAuditLogListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new FileAuditLog.
 * Create a new FileAuditLog
 */
function postFileAuditLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.fileAuditLog === null || requestParameters.fileAuditLog === undefined) {
        throw new runtime.RequiredError('fileAuditLog', 'Required parameter requestParameters.fileAuditLog was null or undefined when calling postFileAuditLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileAuditLog`,
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
        body: queryParameters || FileAuditLogToJSON(requestParameters.fileAuditLog),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileAuditLogFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new FileAuditLog.
* Create a new FileAuditLog
*/
export function postFileAuditLog(requestParameters, requestConfig) {
    return postFileAuditLogRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing FileAuditLog.
 * Update an existing FileAuditLog
 */
function updateFileAuditLogRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateFileAuditLog.');
    }
    if (requestParameters.fileAuditLog === null || requestParameters.fileAuditLog === undefined) {
        throw new runtime.RequiredError('fileAuditLog', 'Required parameter requestParameters.fileAuditLog was null or undefined when calling updateFileAuditLog.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileAuditLog/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || FileAuditLogToJSON(requestParameters.fileAuditLog),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileAuditLogFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing FileAuditLog.
* Update an existing FileAuditLog
*/
export function updateFileAuditLog(requestParameters, requestConfig) {
    return updateFileAuditLogRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=FileAuditLogApi.js.map