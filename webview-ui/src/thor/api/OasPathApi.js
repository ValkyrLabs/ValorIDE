// tslint:disable
import * as runtime from '../src/runtime';
import { OasPathFromJSON, OasPathToJSON, } from '../model';
/**
 * Deletes a specific OasPath.
 * Delete a OasPath.
 */
function deleteOasPathRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasPath.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasPath/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasPath.
* Delete a OasPath.
*/
export function deleteOasPath(requestParameters, requestConfig) {
    return deleteOasPathRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasPath for a specific uid.
 * Retrieve a single OasPath
 */
function getOasPathRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasPath.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasPath/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasPathFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasPath for a specific uid.
* Retrieve a single OasPath
*/
export function getOasPath(requestParameters, requestConfig) {
    return getOasPathRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasPaths.
 * Retrieve a list of OasPaths
 */
function getOasPathListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasPath`,
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
        config.transform = (body, text) => requestTransform(body.map(OasPathFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasPaths.
* Retrieve a list of OasPaths
*/
export function getOasPathList(requestParameters, requestConfig) {
    return getOasPathListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasPath.
 * Create a new OasPath
 */
function postOasPathRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasPath === null || requestParameters.oasPath === undefined) {
        throw new runtime.RequiredError('oasPath', 'Required parameter requestParameters.oasPath was null or undefined when calling postOasPath.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasPath`,
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
        body: queryParameters || OasPathToJSON(requestParameters.oasPath),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasPathFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasPath.
* Create a new OasPath
*/
export function postOasPath(requestParameters, requestConfig) {
    return postOasPathRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasPath.
 * Update an existing OasPath
 */
function updateOasPathRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasPath.');
    }
    if (requestParameters.oasPath === null || requestParameters.oasPath === undefined) {
        throw new runtime.RequiredError('oasPath', 'Required parameter requestParameters.oasPath was null or undefined when calling updateOasPath.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasPath/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasPathToJSON(requestParameters.oasPath),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasPathFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasPath.
* Update an existing OasPath
*/
export function updateOasPath(requestParameters, requestConfig) {
    return updateOasPathRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasPathApi.js.map