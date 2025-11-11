// tslint:disable
import * as runtime from '../src/runtime';
import { FileDownloadTokenFromJSON, FileDownloadTokenToJSON, } from '../model';
/**
 * Deletes a specific FileDownloadToken.
 * Delete a FileDownloadToken.
 */
function deleteFileDownloadTokenRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteFileDownloadToken.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileDownloadToken/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific FileDownloadToken.
* Delete a FileDownloadToken.
*/
export function deleteFileDownloadToken(requestParameters, requestConfig) {
    return deleteFileDownloadTokenRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single FileDownloadToken for a specific uid.
 * Retrieve a single FileDownloadToken
 */
function getFileDownloadTokenRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getFileDownloadToken.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileDownloadToken/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(FileDownloadTokenFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single FileDownloadToken for a specific uid.
* Retrieve a single FileDownloadToken
*/
export function getFileDownloadToken(requestParameters, requestConfig) {
    return getFileDownloadTokenRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of FileDownloadTokens.
 * Retrieve a list of FileDownloadTokens
 */
function getFileDownloadTokenListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/FileDownloadToken`,
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
        config.transform = (body, text) => requestTransform(body.map(FileDownloadTokenFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of FileDownloadTokens.
* Retrieve a list of FileDownloadTokens
*/
export function getFileDownloadTokenList(requestParameters, requestConfig) {
    return getFileDownloadTokenListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new FileDownloadToken.
 * Create a new FileDownloadToken
 */
function postFileDownloadTokenRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.fileDownloadToken === null || requestParameters.fileDownloadToken === undefined) {
        throw new runtime.RequiredError('fileDownloadToken', 'Required parameter requestParameters.fileDownloadToken was null or undefined when calling postFileDownloadToken.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileDownloadToken`,
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
        body: queryParameters || FileDownloadTokenToJSON(requestParameters.fileDownloadToken),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileDownloadTokenFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new FileDownloadToken.
* Create a new FileDownloadToken
*/
export function postFileDownloadToken(requestParameters, requestConfig) {
    return postFileDownloadTokenRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing FileDownloadToken.
 * Update an existing FileDownloadToken
 */
function updateFileDownloadTokenRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateFileDownloadToken.');
    }
    if (requestParameters.fileDownloadToken === null || requestParameters.fileDownloadToken === undefined) {
        throw new runtime.RequiredError('fileDownloadToken', 'Required parameter requestParameters.fileDownloadToken was null or undefined when calling updateFileDownloadToken.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/FileDownloadToken/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || FileDownloadTokenToJSON(requestParameters.fileDownloadToken),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(FileDownloadTokenFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing FileDownloadToken.
* Update an existing FileDownloadToken
*/
export function updateFileDownloadToken(requestParameters, requestConfig) {
    return updateFileDownloadTokenRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=FileDownloadTokenApi.js.map