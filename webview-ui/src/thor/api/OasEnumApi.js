// tslint:disable
import * as runtime from '../src/runtime';
import { OasEnumFromJSON, OasEnumToJSON, } from '../model';
/**
 * Deletes a specific OasEnum.
 * Delete a OasEnum.
 */
function deleteOasEnumRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasEnum.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasEnum/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasEnum.
* Delete a OasEnum.
*/
export function deleteOasEnum(requestParameters, requestConfig) {
    return deleteOasEnumRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasEnum for a specific uid.
 * Retrieve a single OasEnum
 */
function getOasEnumRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasEnum.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasEnum/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasEnumFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasEnum for a specific uid.
* Retrieve a single OasEnum
*/
export function getOasEnum(requestParameters, requestConfig) {
    return getOasEnumRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasEnums.
 * Retrieve a list of OasEnums
 */
function getOasEnumListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasEnum`,
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
        config.transform = (body, text) => requestTransform(body.map(OasEnumFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasEnums.
* Retrieve a list of OasEnums
*/
export function getOasEnumList(requestParameters, requestConfig) {
    return getOasEnumListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasEnum.
 * Create a new OasEnum
 */
function postOasEnumRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasEnum === null || requestParameters.oasEnum === undefined) {
        throw new runtime.RequiredError('oasEnum', 'Required parameter requestParameters.oasEnum was null or undefined when calling postOasEnum.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasEnum`,
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
        body: queryParameters || OasEnumToJSON(requestParameters.oasEnum),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasEnumFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasEnum.
* Create a new OasEnum
*/
export function postOasEnum(requestParameters, requestConfig) {
    return postOasEnumRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasEnum.
 * Update an existing OasEnum
 */
function updateOasEnumRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasEnum.');
    }
    if (requestParameters.oasEnum === null || requestParameters.oasEnum === undefined) {
        throw new runtime.RequiredError('oasEnum', 'Required parameter requestParameters.oasEnum was null or undefined when calling updateOasEnum.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasEnum/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasEnumToJSON(requestParameters.oasEnum),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasEnumFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasEnum.
* Update an existing OasEnum
*/
export function updateOasEnum(requestParameters, requestConfig) {
    return updateOasEnumRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasEnumApi.js.map