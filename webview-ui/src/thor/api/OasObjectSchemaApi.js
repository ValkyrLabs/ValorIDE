// tslint:disable
import * as runtime from '../src/runtime';
import { OasObjectSchemaFromJSON, OasObjectSchemaToJSON, } from '../model';
/**
 * Deletes a specific OasObjectSchema.
 * Delete a OasObjectSchema.
 */
function deleteOasObjectSchemaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling deleteOasObjectSchema.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasObjectSchema/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
* Deletes a specific OasObjectSchema.
* Delete a OasObjectSchema.
*/
export function deleteOasObjectSchema(requestParameters, requestConfig) {
    return deleteOasObjectSchemaRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a single OasObjectSchema for a specific uid.
 * Retrieve a single OasObjectSchema
 */
function getOasObjectSchemaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling getOasObjectSchema.');
    }
    let queryParameters = null;
    const headerParameters = {};
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasObjectSchema/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        config.transform = (body, text) => requestTransform(OasObjectSchemaFromJSON(body), text);
    }
    return config;
}
/**
* Retrieves a single OasObjectSchema for a specific uid.
* Retrieve a single OasObjectSchema
*/
export function getOasObjectSchema(requestParameters, requestConfig) {
    return getOasObjectSchemaRaw(requestParameters, requestConfig);
}
/**
 * Retrieves a list of OasObjectSchemas.
 * Retrieve a list of OasObjectSchemas
 */
function getOasObjectSchemaListRaw(requestParameters, requestConfig = {}) {
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
        url: `${runtime.Configuration.basePath}/OasObjectSchema`,
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
        config.transform = (body, text) => requestTransform(body.map(OasObjectSchemaFromJSON), text);
    }
    return config;
}
/**
* Retrieves a list of OasObjectSchemas.
* Retrieve a list of OasObjectSchemas
*/
export function getOasObjectSchemaList(requestParameters, requestConfig) {
    return getOasObjectSchemaListRaw(requestParameters, requestConfig);
}
/**
 * Creates a new OasObjectSchema.
 * Create a new OasObjectSchema
 */
function postOasObjectSchemaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.oasObjectSchema === null || requestParameters.oasObjectSchema === undefined) {
        throw new runtime.RequiredError('oasObjectSchema', 'Required parameter requestParameters.oasObjectSchema was null or undefined when calling postOasObjectSchema.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasObjectSchema`,
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
        body: queryParameters || OasObjectSchemaToJSON(requestParameters.oasObjectSchema),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasObjectSchemaFromJSON(body), text);
    }
    return config;
}
/**
* Creates a new OasObjectSchema.
* Create a new OasObjectSchema
*/
export function postOasObjectSchema(requestParameters, requestConfig) {
    return postOasObjectSchemaRaw(requestParameters, requestConfig);
}
/**
 * Updates an existing OasObjectSchema.
 * Update an existing OasObjectSchema
 */
function updateOasObjectSchemaRaw(requestParameters, requestConfig = {}) {
    if (requestParameters.id === null || requestParameters.id === undefined) {
        throw new runtime.RequiredError('id', 'Required parameter requestParameters.id was null or undefined when calling updateOasObjectSchema.');
    }
    if (requestParameters.oasObjectSchema === null || requestParameters.oasObjectSchema === undefined) {
        throw new runtime.RequiredError('oasObjectSchema', 'Required parameter requestParameters.oasObjectSchema was null or undefined when calling updateOasObjectSchema.');
    }
    let queryParameters = null;
    const headerParameters = {};
    headerParameters['Content-Type'] = 'application/json';
    const { meta = {} } = requestConfig;
    const config = {
        url: `${runtime.Configuration.basePath}/OasObjectSchema/{id}`.replace(`{${"id"}}`, encodeURIComponent(String(requestParameters.id))),
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
        body: queryParameters || OasObjectSchemaToJSON(requestParameters.oasObjectSchema),
    };
    const { transform: requestTransform } = requestConfig;
    if (requestTransform) {
        config.transform = (body, text) => requestTransform(OasObjectSchemaFromJSON(body), text);
    }
    return config;
}
/**
* Updates an existing OasObjectSchema.
* Update an existing OasObjectSchema
*/
export function updateOasObjectSchema(requestParameters, requestConfig) {
    return updateOasObjectSchemaRaw(requestParameters, requestConfig);
}
//# sourceMappingURL=OasObjectSchemaApi.js.map