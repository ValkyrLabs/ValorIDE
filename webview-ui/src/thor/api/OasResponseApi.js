// tslint:disable
import * as runtime from '../src/runtime';
import { OasResponseFromJSON, OasResponseToJSON, } from '../model';
/**
 * Deletes a specific OasResponse.
 * Delete a OasResponse.
 */
function deleteOasResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasResponse.
* Delete a OasResponse.
*/
export function deleteOasResponse(requestParameters, requestConfig) {
    return deleteOasResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasResponse for a specific uid.
 * Retrieve a single OasResponse
 */
function getOasResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasResponseFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasResponse for a specific uid.
* Retrieve a single OasResponse
*/
export function getOasResponse(requestParameters, requestConfig) {
    return getOasResponseRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasResponses.
 * Retrieve a list of OasResponses
 */
function getOasResponseListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasResponse`,
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
        config.transform = (body, text) => requestTransform(body.map(OasResponseFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasResponses.
* Retrieve a list of OasResponses
*/
export function getOasResponseList(requestParameters, requestConfig) {
    return getOasResponseListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasResponse.
 * Create a new OasResponse
 */
function postOasResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasResponse === null || requestParameters.oasResponse === undefined) {
        throw new runtime.RequiredError('oasResponse', 'Required parameter requestParameters.oasResponse was null or undefined when calling postOasResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasResponse`,
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
        body: queryParameters || OasResponseToJSON(requestParameters.oasResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasResponseFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasResponse.
* Create a new OasResponse
*/
export function postOasResponse(requestParameters, requestConfig) {
    return postOasResponseRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasResponse.
 * Update an existing OasResponse
 */
function updateOasResponseRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasResponse.');
    }
    if (requestParameters.oasResponse === null || requestParameters.oasResponse === undefined) {
        throw new runtime.RequiredError('oasResponse', 'Required parameter requestParameters.oasResponse was null or undefined when calling updateOasResponse.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasResponse/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasResponseToJSON(requestParameters.oasResponse),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasResponseFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasResponse.
* Update an existing OasResponse
*/
export function updateOasResponse(requestParameters, requestConfig) {
    return updateOasResponseRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasResponseApi.js.map