// tslint:disable
import * as runtime from '../src/runtime';
import { OasInfoFromJSON, OasInfoToJSON, } from '../model';
/**
 * Deletes a specific OasInfo.
 * Delete a OasInfo.
 */
function deleteOasInfoRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasInfo.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasInfo/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasInfo.
* Delete a OasInfo.
*/
export function deleteOasInfo(requestParameters, requestConfig) {
    return deleteOasInfoRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasInfo for a specific uid.
 * Retrieve a single OasInfo
 */
function getOasInfoRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasInfo.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasInfo/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasInfoFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasInfo for a specific uid.
* Retrieve a single OasInfo
*/
export function getOasInfo(requestParameters, requestConfig) {
    return getOasInfoRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasInfos.
 * Retrieve a list of OasInfos
 */
function getOasInfoListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasInfo`,
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
        config.transform = (body, text) => requestTransform(body.map(OasInfoFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasInfos.
* Retrieve a list of OasInfos
*/
export function getOasInfoList(requestParameters, requestConfig) {
    return getOasInfoListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasInfo.
 * Create a new OasInfo
 */
function postOasInfoRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasInfo === null || requestParameters.oasInfo === undefined) {
        throw new runtime.RequiredError('oasInfo', 'Required parameter requestParameters.oasInfo was null or undefined when calling postOasInfo.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasInfo`,
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
        body: queryParameters || OasInfoToJSON(requestParameters.oasInfo),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasInfoFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasInfo.
* Create a new OasInfo
*/
export function postOasInfo(requestParameters, requestConfig) {
    return postOasInfoRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasInfo.
 * Update an existing OasInfo
 */
function updateOasInfoRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasInfo.');
    }
    if (requestParameters.oasInfo === null || requestParameters.oasInfo === undefined) {
        throw new runtime.RequiredError('oasInfo', 'Required parameter requestParameters.oasInfo was null or undefined when calling updateOasInfo.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasInfo/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasInfoToJSON(requestParameters.oasInfo),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasInfoFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasInfo.
* Update an existing OasInfo
*/
export function updateOasInfo(requestParameters, requestConfig) {
    return updateOasInfoRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasInfoApi.js.map