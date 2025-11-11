// tslint:disable
import * as runtime from '../src/runtime';
import { OasParameterFromJSON, OasParameterToJSON, } from '../model';
/**
 * Deletes a specific OasParameter.
 * Delete a OasParameter.
 */
function deleteOasParameterRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasParameter.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasParameter/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasParameter.
* Delete a OasParameter.
*/
export function deleteOasParameter(requestParameters, requestConfig) {
    return deleteOasParameterRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasParameter for a specific uid.
 * Retrieve a single OasParameter
 */
function getOasParameterRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasParameter.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasParameter/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasParameterFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasParameter for a specific uid.
* Retrieve a single OasParameter
*/
export function getOasParameter(requestParameters, requestConfig) {
    return getOasParameterRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasParameters.
 * Retrieve a list of OasParameters
 */
function getOasParameterListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasParameter`,
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
        config.transform = (body, text) => requestTransform(body.map(OasParameterFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasParameters.
* Retrieve a list of OasParameters
*/
export function getOasParameterList(requestParameters, requestConfig) {
    return getOasParameterListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasParameter.
 * Create a new OasParameter
 */
function postOasParameterRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasParameter === null || requestParameters.oasParameter === undefined) {
        throw new runtime.RequiredError('oasParameter', 'Required parameter requestParameters.oasParameter was null or undefined when calling postOasParameter.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasParameter`,
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
        body: queryParameters || OasParameterToJSON(requestParameters.oasParameter),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasParameterFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasParameter.
* Create a new OasParameter
*/
export function postOasParameter(requestParameters, requestConfig) {
    return postOasParameterRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasParameter.
 * Update an existing OasParameter
 */
function updateOasParameterRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasParameter.');
    }
    if (requestParameters.oasParameter === null || requestParameters.oasParameter === undefined) {
        throw new runtime.RequiredError('oasParameter', 'Required parameter requestParameters.oasParameter was null or undefined when calling updateOasParameter.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasParameter/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasParameterToJSON(requestParameters.oasParameter),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasParameterFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasParameter.
* Update an existing OasParameter
*/
export function updateOasParameter(requestParameters, requestConfig) {
    return updateOasParameterRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasParameterApi.js.map