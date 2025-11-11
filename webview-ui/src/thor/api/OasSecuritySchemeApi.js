// tslint:disable
import * as runtime from '../src/runtime';
import { OasSecuritySchemeFromJSON, OasSecuritySchemeToJSON, } from '../model';
/**
 * Deletes a specific OasSecurityScheme.
 * Delete a OasSecurityScheme.
 */
function deleteOasSecuritySchemeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasSecurityScheme.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasSecurityScheme/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasSecurityScheme.
* Delete a OasSecurityScheme.
*/
export function deleteOasSecurityScheme(requestParameters, requestConfig) {
    return deleteOasSecuritySchemeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasSecurityScheme for a specific uid.
 * Retrieve a single OasSecurityScheme
 */
function getOasSecuritySchemeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasSecurityScheme.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasSecurityScheme/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasSecuritySchemeFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasSecurityScheme for a specific uid.
* Retrieve a single OasSecurityScheme
*/
export function getOasSecurityScheme(requestParameters, requestConfig) {
    return getOasSecuritySchemeRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasSecuritySchemes.
 * Retrieve a list of OasSecuritySchemes
 */
function getOasSecuritySchemeListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasSecurityScheme`,
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
        config.transform = (body, text) => requestTransform(body.map(OasSecuritySchemeFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasSecuritySchemes.
* Retrieve a list of OasSecuritySchemes
*/
export function getOasSecuritySchemeList(requestParameters, requestConfig) {
    return getOasSecuritySchemeListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasSecurityScheme.
 * Create a new OasSecurityScheme
 */
function postOasSecuritySchemeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasSecurityScheme === null || requestParameters.oasSecurityScheme === undefined) {
        throw new runtime.RequiredError('oasSecurityScheme', 'Required parameter requestParameters.oasSecurityScheme was null or undefined when calling postOasSecurityScheme.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasSecurityScheme`,
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
        body: queryParameters || OasSecuritySchemeToJSON(requestParameters.oasSecurityScheme),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasSecuritySchemeFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasSecurityScheme.
* Create a new OasSecurityScheme
*/
export function postOasSecurityScheme(requestParameters, requestConfig) {
    return postOasSecuritySchemeRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasSecurityScheme.
 * Update an existing OasSecurityScheme
 */
function updateOasSecuritySchemeRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasSecurityScheme.');
    }
    if (requestParameters.oasSecurityScheme === null || requestParameters.oasSecurityScheme === undefined) {
        throw new runtime.RequiredError('oasSecurityScheme', 'Required parameter requestParameters.oasSecurityScheme was null or undefined when calling updateOasSecurityScheme.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasSecurityScheme/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasSecuritySchemeToJSON(requestParameters.oasSecurityScheme),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasSecuritySchemeFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasSecurityScheme.
* Update an existing OasSecurityScheme
*/
export function updateOasSecurityScheme(requestParameters, requestConfig) {
    return updateOasSecuritySchemeRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasSecuritySchemeApi.js.map