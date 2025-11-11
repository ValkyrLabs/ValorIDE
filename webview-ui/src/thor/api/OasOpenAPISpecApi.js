// tslint:disable
import * as runtime from '../src/runtime';
import { OasOpenAPISpecFromJSON, OasOpenAPISpecToJSON, } from '../model';
/**
 * Deletes a specific OasOpenAPISpec.
 * Delete a OasOpenAPISpec.
 */
function deleteOasOpenAPISpecRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasOpenAPISpec.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOpenAPISpec/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasOpenAPISpec.
* Delete a OasOpenAPISpec.
*/
export function deleteOasOpenAPISpec(requestParameters, requestConfig) {
    return deleteOasOpenAPISpecRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasOpenAPISpec for a specific uid.
 * Retrieve a single OasOpenAPISpec
 */
function getOasOpenAPISpecRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasOpenAPISpec.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOpenAPISpec/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasOpenAPISpecFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasOpenAPISpec for a specific uid.
* Retrieve a single OasOpenAPISpec
*/
export function getOasOpenAPISpec(requestParameters, requestConfig) {
    return getOasOpenAPISpecRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasOpenAPISpecs.
 * Retrieve a list of OasOpenAPISpecs
 */
function getOasOpenAPISpecListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasOpenAPISpec`,
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
        config.transform = (body, text) => requestTransform(body.map(OasOpenAPISpecFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasOpenAPISpecs.
* Retrieve a list of OasOpenAPISpecs
*/
export function getOasOpenAPISpecList(requestParameters, requestConfig) {
    return getOasOpenAPISpecListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasOpenAPISpec.
 * Create a new OasOpenAPISpec
 */
function postOasOpenAPISpecRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasOpenAPISpec === null || requestParameters.oasOpenAPISpec === undefined) {
        throw new runtime.RequiredError('oasOpenAPISpec', 'Required parameter requestParameters.oasOpenAPISpec was null or undefined when calling postOasOpenAPISpec.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOpenAPISpec`,
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
        body: queryParameters || OasOpenAPISpecToJSON(requestParameters.oasOpenAPISpec),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasOpenAPISpecFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasOpenAPISpec.
* Create a new OasOpenAPISpec
*/
export function postOasOpenAPISpec(requestParameters, requestConfig) {
    return postOasOpenAPISpecRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasOpenAPISpec.
 * Update an existing OasOpenAPISpec
 */
function updateOasOpenAPISpecRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasOpenAPISpec.');
    }
    if (requestParameters.oasOpenAPISpec === null || requestParameters.oasOpenAPISpec === undefined) {
        throw new runtime.RequiredError('oasOpenAPISpec', 'Required parameter requestParameters.oasOpenAPISpec was null or undefined when calling updateOasOpenAPISpec.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasOpenAPISpec/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasOpenAPISpecToJSON(requestParameters.oasOpenAPISpec),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasOpenAPISpecFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasOpenAPISpec.
* Update an existing OasOpenAPISpec
*/
export function updateOasOpenAPISpec(requestParameters, requestConfig) {
    return updateOasOpenAPISpecRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasOpenAPISpecApi.js.map