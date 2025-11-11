// tslint:disable
import * as runtime from '../src/runtime';
import { FileRecordFromJSON, FileRecordToJSON, } from '../model';
/**
 * Deletes a specific FileRecord.
 * Delete a FileRecord.
 */
function deleteFileRecordRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteFileRecord.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileRecord/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific FileRecord.
* Delete a FileRecord.
*/
export function deleteFileRecord(requestParameters, requestConfig) {
    return deleteFileRecordRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single FileRecord for a specific uid.
 * Retrieve a single FileRecord
 */
function getFileRecordRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getFileRecord.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileRecord/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(FileRecordFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single FileRecord for a specific uid.
* Retrieve a single FileRecord
*/
export function getFileRecord(requestParameters, requestConfig) {
    return getFileRecordRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of FileRecords.
 * Retrieve a list of FileRecords
 */
function getFileRecordListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/FileRecord`,
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
        config.transform = (body, text) => requestTransform(body.map(FileRecordFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of FileRecords.
* Retrieve a list of FileRecords
*/
export function getFileRecordList(requestParameters, requestConfig) {
    return getFileRecordListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new FileRecord.
 * Create a new FileRecord
 */
function postFileRecordRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.fileRecord === null || requestParameters.fileRecord === undefined) {
        throw new runtime.RequiredError('fileRecord', 'Required parameter requestParameters.fileRecord was null or undefined when calling postFileRecord.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileRecord`,
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
        body: queryParameters || FileRecordToJSON(requestParameters.fileRecord),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileRecordFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new FileRecord.
* Create a new FileRecord
*/
export function postFileRecord(requestParameters, requestConfig) {
    return postFileRecordRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing FileRecord.
 * Update an existing FileRecord
 */
function updateFileRecordRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateFileRecord.');
    }
    if (requestParameters.fileRecord === null || requestParameters.fileRecord === undefined) {
        throw new runtime.RequiredError('fileRecord', 'Required parameter requestParameters.fileRecord was null or undefined when calling updateFileRecord.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileRecord/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || FileRecordToJSON(requestParameters.fileRecord),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileRecordFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing FileRecord.
* Update an existing FileRecord
*/
export function updateFileRecord(requestParameters, requestConfig) {
    return updateFileRecordRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=FileRecordApi.js.map